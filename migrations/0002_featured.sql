-- At most one product is featured as the deal of the day (enforced in the app layer:
-- featuring one product clears the flag on all the others in the same batch).
ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1));
