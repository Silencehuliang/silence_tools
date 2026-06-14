ALTER TABLE expense_categories ADD COLUMN parent_id INTEGER REFERENCES expense_categories(id) ON DELETE CASCADE;
