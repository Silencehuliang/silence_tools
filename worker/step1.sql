-- 先删除账单数据
DELETE FROM expense_tag_relations;
DELETE FROM expenses;

-- 清除所有分类
DELETE FROM expense_categories;
