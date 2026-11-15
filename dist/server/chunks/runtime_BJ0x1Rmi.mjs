globalThis.process ??= {};
globalThis.process.env ??= {};
import { env } from "cloudflare:workers";
// src/lib/db.ts
var statement = (sql, ...params) => ({
	sql,
	params
});
var PRODUCT_COLUMNS = `
  p.id, p.name, p.description, p.emoji, p.department_id, d.name AS department,
  p.price_cents, p.stock, p.product_sales_cents, p.active, p.featured`;
var SORTS = {
	featured: "p.name COLLATE NOCASE ASC",
	"price-asc": "p.price_cents ASC, p.name COLLATE NOCASE ASC",
	"price-desc": "p.price_cents DESC, p.name COLLATE NOCASE ASC",
	"stock-asc": "p.stock ASC, p.name COLLATE NOCASE ASC"
};
var isSortKey = (value) => value in SORTS;
/** Escapes LIKE wildcards so a search for "100%" matches that text, not everything. */
var likePattern = (text) => `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
async function listProducts(db, query = {}) {
	const where = [];
	const params = [];
	if (!query.includeInactive) where.push("p.active = 1");
	if (query.search?.trim()) {
		where.push("(p.name LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");
		const pattern = likePattern(query.search.trim());
		params.push(pattern, pattern);
	}
	if (query.departmentId !== void 0) {
		where.push("p.department_id = ?");
		params.push(query.departmentId);
	}
	if (query.minPriceCents !== void 0) {
		where.push("p.price_cents >= ?");
		params.push(query.minPriceCents);
	}
	if (query.maxPriceCents !== void 0) {
		where.push("p.price_cents <= ?");
		params.push(query.maxPriceCents);
	}
	const order = SORTS[query.sort ?? "featured"];
	const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
	return db.all(`SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     ${clause} ORDER BY ${order}`, params);
}
async function getProduct(db, id) {
	return db.first(`SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id WHERE p.id = ?`, [id]);
}
async function productsByIds(db, ids) {
	if (ids.length === 0) return [];
	const marks = ids.map(() => "?").join(", ");
	return db.all(`SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     WHERE p.id IN (${marks})`, ids);
}
async function listDepartments(db) {
	return db.all("SELECT id, name FROM departments ORDER BY name");
}
/** Profit is worked out at read time from sales and overhead. It is never stored. */
async function departmentSummary(db) {
	return db.all(`SELECT d.id, d.name, d.overhead_cents,
            COALESCE(SUM(p.product_sales_cents), 0) AS sales_cents,
            COALESCE(SUM(p.product_sales_cents), 0) - d.overhead_cents AS profit_cents,
            COUNT(p.id) AS product_count
     FROM departments d LEFT JOIN products p ON p.department_id = d.id
     GROUP BY d.id ORDER BY d.name`);
}
async function lowStock(db, threshold) {
	return db.all(`SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     WHERE p.active = 1 AND p.stock < ? ORDER BY p.stock ASC, p.name COLLATE NOCASE ASC`, [threshold]);
}
/**
* Places an order in one atomic batch. Stock and sales are updated in the same batch as the order.
* Two guards live in the SQL itself, so a race can't oversell:
*  - `stock >= 0` (a CHECK constraint): an order that would take stock negative fails the batch.
*  - an inactive product sets stock to -1 on purpose, which trips the same constraint.
* Any failure rolls back the whole batch, including the order row.
*/
async function placeOrder(db, order) {
	const statements = order.lines.map((line) => statement(`UPDATE products
         SET stock = CASE WHEN active = 1 THEN stock - ? ELSE -1 END,
             product_sales_cents = product_sales_cents + CASE WHEN active = 1 THEN ? ELSE 0 END
       WHERE id = ?`, line.quantity, line.unitPriceCents * line.quantity, line.productId));
	statements.push(statement("INSERT INTO orders (id, customer_name, customer_email, total_cents) VALUES (?, ?, ?, ?)", order.id, order.customerName, order.customerEmail, order.totalCents));
	for (const line of order.lines) statements.push(statement("INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)", order.id, line.productId, line.name, line.unitPriceCents, line.quantity));
	await db.batch(statements);
}
async function getOrder(db, id) {
	const order = await db.first("SELECT id, customer_name, customer_email, total_cents, created_at FROM orders WHERE id = ?", [id]);
	if (!order) return null;
	return {
		order,
		items: await db.all("SELECT product_id, name, unit_price_cents, quantity FROM order_items WHERE order_id = ? ORDER BY name", [id])
	};
}
async function addProduct(db, product) {
	await db.run(`INSERT INTO products (id, name, description, emoji, department_id, price_cents, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
		product.id,
		product.name,
		product.description,
		product.emoji,
		product.departmentId,
		product.priceCents,
		product.stock
	]);
}
/** Adds (or, with a negative amount, removes) stock. A restock can't push stock below zero. */
async function adjustStock(db, id, delta) {
	const { changes } = await db.run("UPDATE products SET stock = stock + ? WHERE id = ? AND stock + ? >= 0", [
		delta,
		id,
		delta
	]);
	return changes === 1;
}
async function setPrice(db, id, priceCents) {
	const { changes } = await db.run("UPDATE products SET price_cents = ? WHERE id = ?", [priceCents, id]);
	return changes === 1;
}
async function setActive(db, id, active) {
	const { changes } = await db.run("UPDATE products SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
	return changes === 1;
}
/** The current deal of the day, if a manager has featured one. */
async function getFeaturedProduct(db) {
	return db.first(`SELECT ${PRODUCT_COLUMNS} FROM products p JOIN departments d ON d.id = p.department_id
     WHERE p.featured = 1 AND p.active = 1`);
}
/**
* Features one product as the deal of the day. Clearing every other flag in the same
* atomic batch is what keeps "at most one featured product" true.
*/
async function featureProduct(db, id) {
	if (!await db.first("SELECT id FROM products WHERE id = ?", [id])) return false;
	await db.batch([statement("UPDATE products SET featured = 0 WHERE featured = 1"), statement("UPDATE products SET featured = 1 WHERE id = ?", id)]);
	return true;
}
/** Per-product sales over a recent window, from the order history the store already keeps. */
async function productSalesStats(db, days = 30) {
	const rows = await db.all(`SELECT oi.product_id AS product_id,
            COALESCE(SUM(oi.quantity), 0) AS units,
            COALESCE(SUM(oi.quantity * oi.unit_price_cents), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)
     GROUP BY oi.product_id`, [`-${days} days`]);
	return new Map(rows.map((row) => [row.product_id, {
		productId: row.product_id,
		unitsRecent: row.units,
		revenueRecentCents: row.revenue
	}]));
}
async function addDepartment(db, name, overheadCents) {
	await db.run("INSERT INTO departments (name, overhead_cents) VALUES (?, ?)", [name, overheadCents]);
}
async function setOverhead(db, departmentId, overheadCents) {
	const { changes } = await db.run("UPDATE departments SET overhead_cents = ? WHERE id = ?", [overheadCents, departmentId]);
	return changes === 1;
}
async function createStaffSession(db, tokenHash, githubLogin, expiresAt) {
	await db.run("INSERT INTO staff_sessions (token_hash, github_login, expires_at) VALUES (?, ?, ?)", [
		tokenHash,
		githubLogin,
		expiresAt
	]);
}
async function findStaffSession(db, tokenHash, now) {
	return db.first("SELECT github_login FROM staff_sessions WHERE token_hash = ? AND expires_at > ?", [tokenHash, now]);
}
async function deleteStaffSession(db, tokenHash) {
	await db.run("DELETE FROM staff_sessions WHERE token_hash = ?", [tokenHash]);
}
// src/lib/runtime.ts
/** Server-only glue: the Cloudflare bindings and the D1 adapter. Tests never import this file. */
function fromD1(database) {
	return {
		async all(sql, params = []) {
			return (await database.prepare(sql).bind(...params).all()).results;
		},
		async first(sql, params = []) {
			return database.prepare(sql).bind(...params).first();
		},
		async run(sql, params = []) {
			return { changes: (await database.prepare(sql).bind(...params).run()).meta.changes };
		},
		async batch(statements) {
			await database.batch(statements.map((s) => database.prepare(s.sql).bind(...s.params)));
		}
	};
}
var db = () => fromD1(env.DB);
var bindings = env;
export { setPrice as C, setOverhead as S, lowStock as _, adjustStock as a, productsByIds as b, departmentSummary as c, getFeaturedProduct as d, getOrder as f, listProducts as g, listDepartments as h, addProduct as i, featureProduct as l, isSortKey as m, db as n, createStaffSession as o, getProduct as p, addDepartment as r, deleteStaffSession as s, bindings as t, findStaffSession as u, placeOrder as v, setActive as x, productSalesStats as y };

//# sourceMappingURL=runtime_BJ0x1Rmi.mjs.map