-- UP 主搜索：author_info_master 的 GiST 三元组索引改为 GIN，并新增粉丝数 >= 1000 的搜索物化视图。
-- 2026-11-07 已在生产库手动执行；GIN 分区索引在线上是逐分区 CREATE INDEX CONCURRENTLY 再 ATTACH 建的，
-- 这里的写法用于新环境，会锁表。
CREATE INDEX IF NOT EXISTS author_info_name_gin
  ON author_info_master USING gin (name gin_trgm_ops);
--> statement-breakpoint
DROP INDEX IF EXISTS author_info_name_trgm;
--> statement-breakpoint
-- 名字拆成单字 + 二元组，配合 GIN 让 1~2 个字的关键词也能走索引
CREATE OR REPLACE FUNCTION name_grams(t text) RETURNS text[]
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT coalesce(array_agg(DISTINCT g), '{}') FROM (
    SELECT substr(lower(t), i, 1) g FROM generate_series(1, char_length(t)) i
    UNION ALL
    SELECT substr(lower(t), i, 2) FROM generate_series(1, char_length(t) - 1) i
  ) s
$$;
--> statement-breakpoint
CREATE MATERIALIZED VIEW IF NOT EXISTS author_search_mv AS
  SELECT f.mid, i.name, i.face, f.fans
  FROM author_latest_fans f
  JOIN author_info_master i ON i.mid = f.mid
  WHERE f.fans >= 1000 AND i.name IS NOT NULL AND i.name <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS author_search_mv_mid ON author_search_mv (mid);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS author_search_mv_fans ON author_search_mv (fans DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS author_search_mv_name_gin ON author_search_mv USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS author_search_mv_grams ON author_search_mv USING gin (name_grams(name));
