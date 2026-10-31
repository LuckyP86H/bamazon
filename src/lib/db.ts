/**
 * All SQL lives here. Routes call these functions and never write SQL themselves.
 * The same queries run on D1 in production and on bun:sqlite in tests (see tests/support.ts).
 */

export interface Statement {
  sql: string;
  params: unknown[];
}

/** The small surface the app needs from a database. D1 and bun:sqlite both fit it. */
export interface Db {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  first<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  /** Runs every statement or none of them. */
  batch(statements: Statement[]): Promise<void>;
}

const statement = (sql: string, ...params: unknown[]): Statement => ({ sql, params });

export interface ProductRow {
  id: string;
  name: string;
  description: string;
  emoji: string;
  department_id: number;
  department: string;
  price_cents: number;
  stock: number;
  product_sales_cents: number;
  active: number;
}

const PRODUCT_COLUMNS = `
  p.id, p.name, p.description, p.emoji, p.department_id, d.name AS department,
  p.price_cents, p.stock, p.product_sales_cents, p.active`;

const SORTS = {
  featured: "p.name COLLATE NOCASE ASC",
  "price-asc": "p.price_cents ASC, p.name COLLATE NOCASE ASC",
  "price-desc": "p.price_cents DESC, p.name COLLATE NOCASE ASC",
  "stock-asc": "p.stock ASC, p.name COLLATE NOCASE ASC",
} as const;

export type SortKey = keyof typeof SORTS;
export const isSortKey = (value: string): value is SortKey => value in SORTS;

/** Escapes LIKE wildcards so a search for "100%" matches that text, not everything. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export interface CatalogQuery {
  search?: string;
  departmentId?: number;
  sort?: SortKey;
  includeInactive?: boolean;
}

export async function listProducts(db: Db, query: CatalogQuery = {}): Promise<ProductRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!query.includeInactive) where.push("p.active = 1");
  if (query.search?.trim()) {
    where.push("(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");
    const pattern = likePattern(query.search.trim());
    params.push(pattern, pattern);
  }
  if (query.departmentId !== undefined) {
    where.push("p.department_id = ?");
    params.push(query.departmentId);
  }
  const order = SORTS[query.sort ?? "featured"];
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.all<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     ${clause} ORDER BY ${order}`,
    params,
  );
}

export async function getProduct(db: Db, id: string): Promise<ProductRow | null> {
  return db.first<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id WHERE p.id = ?`,
    [id],
  );
}

export async function productsByIds(db: Db, ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const marks = ids.map(() => "?").join(", ");
  return db.all<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     WHERE p.id IN (${marks})`,
    ids,
  );
}

export interface DepartmentRow {
  id: number;
  name: string;
  overhead_cents: number;
  sales_cents: number;
  profit_cents: number;
  product_count: number;
}

export async function listDepartments(db: Db): Promise<{ id: number; name: string }[]> {
  return db.all<{ id: number; name: string }>("SELECT id, name FROM departments ORDER BY name");
}

/** Profit is worked out at read time from sales and overhead. It is never stored. */
export async function departmentSummary(db: Db): Promise<DepartmentRow[]> {
  return db.all<DepartmentRow>(
    `SELECT d.id, d.name, d.overhead_cents,
            COALESCE(SUM(p.product_sales_cents), 0) AS sales_cents,
            COALESCE(SUM(p.product_sales_cents), 0) - d.overhead_cents AS profit_cents,
            COUNT(p.id) AS product_count
     FROM departments d LEFT JOIN products p ON p.department_id = d.id
     GROUP BY d.id ORDER BY d.name`,
  );
}

export async function lowStock(db: Db, threshold: number): Promise<ProductRow[]> {
  return db.all<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     WHERE p.active = 1 AND p.stock < ? ORDER BY p.stock ASC, p.name COLLATE NOCASE ASC`,
    [threshold],
  );
}

export interface NewOrderLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface NewOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  lines: NewOrderLine[];
  totalCents: number;
}

/**
 * Places an order in one atomic batch. Stock and sales are updated in the same batch as the order.
 * Two guards live in the SQL itself, so a race can't oversell:
 *  - `stock >= 0` (a CHECK constraint): an order that would take stock negative fails the batch.
 *  - an inactive product sets stock to -1 on purpose, which trips the same constraint.
 * Any failure rolls back the whole batch, including the order row.
 */
export async function placeOrder(db: Db, order: NewOrder): Promise<void> {
  const statements: Statement[] = order.lines.map((line) =>
    statement(
      `UPDATE products
         SET stock = CASE WHEN active = 1 THEN stock - ? ELSE -1 END,
             product_sales_cents = product_sales_cents + CASE WHEN active = 1 THEN ? ELSE 0 END
       WHERE id = ?`,
      line.quantity,
      line.unitPriceCents * line.quantity,
      line.productId,
    ),
  );
  statements.push(
    statement(
      "INSERT INTO orders (id, customer_name, customer_email, total_cents) VALUES (?, ?, ?, ?)",
      order.id,
      order.customerName,
      order.customerEmail,
      order.totalCents,
    ),
  );
  for (const line of order.lines) {
    statements.push(
      statement(
        "INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)",
        order.id,
        line.productId,
        line.name,
        line.unitPriceCents,
        line.quantity,
      ),
    );
  }
  await db.batch(statements);
}

export interface OrderRow {
  id: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  created_at: string;
}

export interface OrderItemRow {
  product_id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
}

export async function getOrder(
  db: Db,
  id: string,
): Promise<{ order: OrderRow; items: OrderItemRow[] } | null> {
  const order = await db.first<OrderRow>(
    "SELECT id, customer_name, customer_email, total_cents, created_at FROM orders WHERE id = ?",
    [id],
  );
  if (!order) return null;
  const items = await db.all<OrderItemRow>(
    "SELECT product_id, name, unit_price_cents, quantity FROM order_items WHERE order_id = ? ORDER BY name",
    [id],
  );
  return { order, items };
}

export interface NewProduct {
  id: string;
  name: string;
  description: string;
  emoji: string;
  departmentId: number;
  priceCents: number;
  stock: number;
}

export async function addProduct(db: Db, product: NewProduct): Promise<void> {
  await db.run(
    `INSERT INTO products (id, name, description, emoji, department_id, price_cents, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.name,
      product.description,
      product.emoji,
      product.departmentId,
      product.priceCents,
      product.stock,
    ],
  );
}

/** Adds (or, with a negative amount, removes) stock. A restock can't push stock below zero. */
export async function adjustStock(db: Db, id: string, delta: number): Promise<boolean> {
  const { changes } = await db.run(
    "UPDATE products SET stock = stock + ? WHERE id = ? AND stock + ? >= 0",
    [delta, id, delta],
  );
  return changes === 1;
}

export async function setPrice(db: Db, id: string, priceCents: number): Promise<boolean> {
  const { changes } = await db.run("UPDATE products SET price_cents = ? WHERE id = ?", [
    priceCents,
    id,
  ]);
  return changes === 1;
}

export async function setActive(db: Db, id: string, active: boolean): Promise<boolean> {
  const { changes } = await db.run("UPDATE products SET active = ? WHERE id = ?", [
    active ? 1 : 0,
    id,
  ]);
  return changes === 1;
}

export async function addDepartment(db: Db, name: string, overheadCents: number): Promise<void> {
  await db.run("INSERT INTO departments (name, overhead_cents) VALUES (?, ?)", [
    name,
    overheadCents,
  ]);
}

export async function setOverhead(
  db: Db,
  departmentId: number,
  overheadCents: number,
): Promise<boolean> {
  const { changes } = await db.run("UPDATE departments SET overhead_cents = ? WHERE id = ?", [
    overheadCents,
    departmentId,
  ]);
  return changes === 1;
}

export async function createStaffSession(
  db: Db,
  tokenHash: string,
  githubLogin: string,
  expiresAt: number,
): Promise<void> {
  await db.run(
    "INSERT INTO staff_sessions (token_hash, github_login, expires_at) VALUES (?, ?, ?)",
    [tokenHash, githubLogin, expiresAt],
  );
}

export async function findStaffSession(
  db: Db,
  tokenHash: string,
  now: number,
): Promise<{ github_login: string } | null> {
  return db.first<{ github_login: string }>(
    "SELECT github_login FROM staff_sessions WHERE token_hash = ? AND expires_at > ?",
    [tokenHash, now],
  );
}

export async function deleteStaffSession(db: Db, tokenHash: string): Promise<void> {
  await db.run("DELETE FROM staff_sessions WHERE token_hash = ?", [tokenHash]);
}
