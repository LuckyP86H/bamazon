-- Departments own products. Overhead is a flat yearly figure set by a supervisor.
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 60),
  overhead_cents INTEGER NOT NULL DEFAULT 0 CHECK (overhead_cents >= 0)
);

-- Money is stored in whole cents, never floats.
-- `stock >= 0` is the oversell guard: a checkout that would go negative fails and rolls back.
CREATE TABLE products (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 30),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 250),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  emoji TEXT NOT NULL DEFAULT '📦',
  department_id INTEGER NOT NULL REFERENCES departments (id),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  product_sales_cents INTEGER NOT NULL DEFAULT 0 CHECK (product_sales_cents >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE INDEX products_department ON products (department_id);

CREATE TABLE orders (
  id TEXT PRIMARY KEY CHECK (length(id) = 10),
  customer_name TEXT NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 80),
  customer_email TEXT NOT NULL CHECK (length(customer_email) BETWEEN 3 AND 254),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Names and prices are copied at purchase time, so later edits never rewrite history.
CREATE TABLE order_items (
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products (id),
  name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  PRIMARY KEY (order_id, product_id)
);

-- Staff sessions. Only the SHA-256 of the session token is stored.
CREATE TABLE staff_sessions (
  token_hash TEXT PRIMARY KEY,
  github_login TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
