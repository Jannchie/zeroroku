import { Client } from 'pg'
import 'dotenv/config'

const LIMIT = 100
const PRIORITY_TIME = new Date(0)

const QUERY = `
with targets as (
  select mid from (
    select mid
    from author_latest_fans
    where rate1 is not null
    order by rate1 desc, mid asc
    limit $1
  ) rate1_top
  union
  select mid from (
    select mid
    from author_latest_fans
    where rate1 is not null
    order by rate1 asc, mid asc
    limit $1
  ) rate1_bottom
  union
  select mid from (
    select mid
    from author_latest_fans
    where rate7 is not null
    order by rate7 desc, mid asc
    limit $1
  ) rate7_top
  union
  select mid from (
    select mid
    from author_latest_fans
    where rate7 is not null
    order by rate7 asc, mid asc
    limit $1
  ) rate7_bottom
)
insert into author_fans_schedules (mid, next, updated_at)
select mid, $2::timestamptz, $3::timestamptz
from targets
on conflict (mid) do update
set next = excluded.next,
    updated_at = excluded.updated_at
`

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('\u7F3A\u5C11 DATABASE_URL\uFF0C\u65E0\u6CD5\u8FDE\u63A5\u6570\u636E\u5E93\u3002')
    process.exitCode = 1
    return
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  try {
    const now = new Date()
    const result = await client.query(QUERY, [LIMIT, PRIORITY_TIME, now])
    const total = result.rowCount ?? 0
    console.log(`\u5DF2\u5199\u5165/\u66F4\u65B0 ${total} \u6761\u6392\u7A0B\u8BB0\u5F55\u3002`)
  }
  finally {
    await client.end()
  }
}

try {
  await main()
}
catch (error) {
  console.error(error)
  console.error('\u811A\u672C\u6267\u884C\u5931\u8D25\u3002')
  process.exitCode = 1
}
