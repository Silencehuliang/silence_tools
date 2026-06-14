-- 家庭表
CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 家庭成员表
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- 消费分类表
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expense_categories_family ON expense_categories(family_id);

-- 标签表
CREATE TABLE IF NOT EXISTS expense_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE(family_id, name)
);
CREATE INDEX IF NOT EXISTS idx_expense_tags_family ON expense_tags(family_id);

-- 消费记录表
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  expense_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_expenses_family ON expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 账单-标签关联表
CREATE TABLE IF NOT EXISTS expense_tag_relations (
  expense_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (expense_id, tag_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES expense_tags(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_etr_tag ON expense_tag_relations(tag_id);

-- 插入固定分类
INSERT INTO expense_categories (family_id, name, icon, sort_order) VALUES
  (NULL, '餐饮', '🍜', 1),
  (NULL, '交通', '🚗', 2),
  (NULL, '购物', '🛒', 3),
  (NULL, '住房', '🏠', 4),
  (NULL, '教育', '📚', 5),
  (NULL, '医疗', '🏥', 6),
  (NULL, '娱乐', '🎮', 7),
  (NULL, '其他', '📦', 8);
