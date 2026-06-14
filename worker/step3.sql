-- 一级分类
INSERT INTO expense_categories (id, family_id, name, icon, sort_order, parent_id) VALUES
  (1, NULL, '餐饮', '🍜', 1, NULL),
  (2, NULL, '交通', '🚗', 2, NULL),
  (3, NULL, '购物', '🛒', 3, NULL),
  (4, NULL, '住房', '🏠', 4, NULL),
  (5, NULL, '教育', '📚', 5, NULL),
  (6, NULL, '医疗', '🏥', 6, NULL),
  (7, NULL, '娱乐', '🎮', 7, NULL),
  (8, NULL, '通讯', '📱', 8, NULL),
  (9, NULL, '人情', '🎁', 9, NULL),
  (10, NULL, '其他', '📦', 10, NULL);

-- 餐饮子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '早餐', '🥣', 1, 1),
  (NULL, '午餐', '🍱', 2, 1),
  (NULL, '晚餐', '🍲', 3, 1),
  (NULL, '零食饮品', '🍪', 4, 1),
  (NULL, '水果', '🍎', 5, 1);

-- 交通子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '公共交通', '🚌', 1, 2),
  (NULL, '打车', '🚕', 2, 2),
  (NULL, '加油', '⛽', 3, 2),
  (NULL, '停车', '🅿️', 4, 2),
  (NULL, '骑行', '🚲', 5, 2);

-- 购物子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '日用品', '🧴', 1, 3),
  (NULL, '服装鞋帽', '👕', 2, 3),
  (NULL, '电子产品', '💻', 3, 3),
  (NULL, '家居用品', '🛋️', 4, 3);

-- 住房子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '房租房贷', '🏡', 1, 4),
  (NULL, '水电燃气', '💡', 2, 4),
  (NULL, '物业费', '🏢', 3, 4),
  (NULL, '维修', '🔧', 4, 4);

-- 教育子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '书籍', '📖', 1, 5),
  (NULL, '培训课程', '🎓', 2, 5),
  (NULL, '考试费用', '📝', 3, 5);

-- 医疗子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '门诊', '🩺', 1, 6),
  (NULL, '药品', '💊', 2, 6),
  (NULL, '体检', '🔬', 3, 6);

-- 娱乐子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '电影演出', '🎬', 1, 7),
  (NULL, '运动健身', '🏃', 2, 7),
  (NULL, '旅游', '✈️', 3, 7),
  (NULL, '游戏', '🎯', 4, 7);

-- 通讯子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '手机话费', '📱', 1, 8),
  (NULL, '网费', '🌐', 2, 8);

-- 人情子分类
INSERT INTO expense_categories (family_id, name, icon, sort_order, parent_id) VALUES
  (NULL, '礼物', '🎁', 1, 9),
  (NULL, '聚餐', '🍻', 2, 9),
  (NULL, '红包', '🧧', 3, 9);
