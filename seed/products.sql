-- Demo catalogue. Safe to re-run: existing rows are left alone.
INSERT OR IGNORE INTO departments (id, name, overhead_cents) VALUES
  (1, 'Electronics', 1000000),
  (2, 'Books', 250000),
  (3, 'Clothing', 6000000),
  (4, 'Home & Kitchen', 400000),
  (5, 'Sports & Outdoors', 300000);

INSERT OR IGNORE INTO products (id, name, description, emoji, department_id, price_cents, stock) VALUES
  ('TCL 32S305', '32-Inch 720p Roku Smart LED TV', 'A bright 720p screen with built-in Roku streaming apps and a simple remote.', '📺', 1, 16999, 10),
  ('Dell i3265-A643WHT-PUS', 'Inspiron 3265 All-in-One Desktop', 'A compact all-in-one desktop for home and office work.', '🖥️', 1, 42999, 6),
  ('MOUSE 3509', 'Slim Wireless Keyboard and Mouse Combo', 'Quiet keys and a portable mouse, with one USB receiver for both.', '⌨️', 1, 2999, 15),
  ('USB-C 65W', 'Fast USB-C Wall Charger', 'Charges a laptop and a phone at the same time.', '🔌', 1, 3499, 4),
  ('BOO HWN', 'History of Wolves: A Novel', 'Emma Donoghue''s novel about a child who befriends a wolf.', '📕', 2, 1856, 0),
  ('BOO HP12', 'Harry Potter and the Cursed Child, Parts 1 & 2', 'The stage play, in print, for new and returning readers.', '📘', 2, 1499, 10),
  ('BOO NOTE', 'Hardcover Notebook, A5 Dotted', 'Dotted pages, a ribbon bookmark, and a sturdy cover.', '📓', 2, 1299, 22),
  ('CLO TEE01', 'Classic Crew-Neck Cotton Tee', 'A soft everyday tee in a relaxed fit. Machine washable.', '👕', 3, 1999, 30),
  ('CLO JKT02', 'Lightweight Rain Jacket', 'Packs into its own pocket and keeps the drizzle out.', '🧥', 3, 6999, 5),
  ('CLO SOX03', 'Cushioned Running Socks, 3-Pack', 'Breathable, cushioned, and built to stay put.', '🧦', 3, 1499, 3),
  ('HOM POT01', 'Cast-Iron Dutch Oven, 5 Quart', 'Even heat for braises, soups and bread. Oven safe.', '🍲', 4, 5499, 8),
  ('HOM KNF02', 'Chef''s Knife, 8-Inch', 'A balanced German steel blade that holds its edge.', '🔪', 4, 4299, 12),
  ('HOM MUG03', 'Ceramic Mug Set, 4-Piece', 'Dishwasher-safe mugs in four glaze colours.', '☕', 4, 2499, 0),
  ('SPT BAL01', 'Yoga Mat, Non-Slip, 6 mm', 'Grippy on both sides, with a carry strap.', '🧘', 5, 2999, 9),
  ('SPT BTL02', 'Insulated Water Bottle, 750 ml', 'Keeps cold for 24 hours and fits most cup holders.', '🥤', 5, 2299, 40);
