#!/bin/bash
# 每日刷新 UP 主搜索物化视图（CONCURRENTLY，不阻塞查询）
set -euo pipefail
echo "$(date '+%F %T') start"
docker exec bili-gazer-v2-db-1 psql -U postgres -d bilibili -v ON_ERROR_STOP=1 -qc \
  "refresh materialized view concurrently author_search_mv"
echo "$(date '+%F %T') done"
