import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { hash } from 'bcryptjs'
import { Client } from 'pg'

const BCRYPT_ROUNDS = 10
const BATCH_SIZE = 500

const MIGRATIONS = [
  'drizzle/0000_milky_hellion.sql',
  'drizzle/0001_add-user-stats.sql',
]

type OldUserRow = {
  id: string
  username: string
  mail: string
  password: string | null
  exp: string
  credit: string
  active: boolean
  created_at: Date
  updated_at: Date | null
}

type UserInsert = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  exp: number
  credit: number
  createdAt: Date
  updatedAt: Date
}

type AccountInsert = {
  id: string
  accountId: string
  providerId: string
  userId: string
  accessToken: string | null
  refreshToken: string | null
  idToken: string | null
  accessTokenExpiresAt: Date | null
  refreshTokenExpiresAt: Date | null
  scope: string | null
  password: string
  createdAt: Date
  updatedAt: Date
}

const isBcryptHash = (value: string): boolean => value.startsWith('$2')

const splitStatements = (content: string): string[] =>
  content
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

const runSqlFile = async (client: Client, filePath: string): Promise<void> => {
  const fullPath = resolve(filePath)
  const content = await readFile(fullPath, 'utf-8')
  const statements = splitStatements(content)
  for (const statement of statements) {
    await client.query(statement)
  }
}

const tableExists = async (client: Client, tableName: string): Promise<boolean> => {
  const res = await client.query(
    `
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = $1
    limit 1
    `,
    [tableName],
  )
  return res.rowCount > 0
}

const listTables = async (client: Client, tableNames: string[]): Promise<Set<string>> => {
  const res = await client.query<{ table_name: string }>(
    `
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_name = any($1)
    `,
    [tableNames],
  )
  return new Set(res.rows.map((row) => row.table_name))
}

const columnExists = async (
  client: Client,
  tableName: string,
  columnName: string,
): Promise<boolean> => {
  const res = await client.query(
    `
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = $1
      and column_name = $2
    limit 1
    `,
    [tableName, columnName],
  )
  return res.rowCount > 0
}

const countRows = async (client: Client, tableName: string): Promise<number> => {
  const res = await client.query(`select count(*)::int as count from "${tableName}"`)
  return res.rows[0]?.count ?? 0
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

const buildInsert = <T extends Record<string, unknown>>(
  table: string,
  columns: { key: keyof T; column: string }[],
  rows: T[],
) => {
  const values: unknown[] = []
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = columns.map((column, columnIndex) => {
      const paramIndex = rowIndex * columns.length + columnIndex + 1
      values.push(row[column.key])
      return `$${paramIndex}`
    })
    return `(${rowPlaceholders.join(', ')})`
  })

  return {
    text: `insert into "${table}" (${columns
      .map((col) => `"${col.column}"`)
      .join(', ')}) values ${placeholders.join(', ')}`,
    values,
  }
}

const fetchDedupedUsers = async (client: Client): Promise<OldUserRow[]> => {
  const res = await client.query<OldUserRow>(
    `
    select
      id::text as id,
      username,
      mail,
      password,
      exp::text as exp,
      credit::text as credit,
      active,
      created_at,
      updated_at
    from (
      select
        *,
        row_number() over (
          partition by lower(trim(mail))
          order by coalesce(updated_at, created_at) desc, id desc
        ) as rn
      from old_users
      where trim(mail) != ''
    ) t
    where rn = 1
    order by id
    `,
  )
  return res.rows
}

const main = async () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is missing')
  }

  const client = new Client({ connectionString: url })
  await client.connect()

  const oldUsersExists = await tableExists(client, 'old_users')
  if (!oldUsersExists) {
    throw new Error('old_users table does not exist')
  }

  const authTables = ['user', 'account', 'session', 'verification']
  const existingAuthTables = await listTables(client, authTables)
  if (existingAuthTables.size === 0) {
    await runSqlFile(client, MIGRATIONS[0])
  } else if (existingAuthTables.size !== authTables.length) {
    throw new Error('auth tables are partially created, aborting migration')
  }

  const expColumnExists = await columnExists(client, 'user', 'exp')
  const creditColumnExists = await columnExists(client, 'user', 'credit')
  if (!expColumnExists || !creditColumnExists) {
    await runSqlFile(client, MIGRATIONS[1])
  }

  const existingUsers = await countRows(client, 'user')
  if (existingUsers > 0) {
    throw new Error('user table already has data, aborting migration')
  }

  const totalOldUsers = await countRows(client, 'old_users')
  const dedupedRows = await fetchDedupedUsers(client)

  console.log(`old_users total: ${totalOldUsers}`)
  console.log(`deduped users: ${dedupedRows.length}`)

  const passwordFixups: string[] = []
  const users: UserInsert[] = []
  const accounts: AccountInsert[] = []

  for (const row of dedupedRows) {
    const email = row.mail.trim().toLowerCase()
    const name = row.username.trim()
    const createdAt = row.created_at
    const updatedAt = row.updated_at ?? row.created_at
    const expValue = Number(row.exp)
    const creditValue = Number(row.credit)

    const userId = String(row.id)

    let passwordValue = row.password
    if (!passwordValue || !isBcryptHash(passwordValue)) {
      const randomPassword = randomBytes(24).toString('base64url')
      passwordValue = await hash(randomPassword, BCRYPT_ROUNDS)
      passwordFixups.push(`${userId}\t${email}`)
    }

    users.push({
      id: userId,
      name,
      email,
      emailVerified: row.active,
      image: null,
      exp: Number.isNaN(expValue) ? 0 : expValue,
      credit: Number.isNaN(creditValue) ? 0 : creditValue,
      createdAt,
      updatedAt,
    })

    accounts.push({
      id: `credential:${userId}`,
      accountId: userId,
      providerId: 'credential',
      userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordValue,
      createdAt,
      updatedAt,
    })
  }

  await client.query('begin')
  try {
    for (const batch of chunk(users, BATCH_SIZE)) {
      const insert = buildInsert<UserInsert>(
        'user',
        [
          { key: 'id', column: 'id' },
          { key: 'name', column: 'name' },
          { key: 'email', column: 'email' },
          { key: 'emailVerified', column: 'email_verified' },
          { key: 'image', column: 'image' },
          { key: 'exp', column: 'exp' },
          { key: 'credit', column: 'credit' },
          { key: 'createdAt', column: 'created_at' },
          { key: 'updatedAt', column: 'updated_at' },
        ],
        batch,
      )
      await client.query(insert.text, insert.values)
    }

    for (const batch of chunk(accounts, BATCH_SIZE)) {
      const insert = buildInsert<AccountInsert>(
        'account',
        [
          { key: 'id', column: 'id' },
          { key: 'accountId', column: 'account_id' },
          { key: 'providerId', column: 'provider_id' },
          { key: 'userId', column: 'user_id' },
          { key: 'accessToken', column: 'access_token' },
          { key: 'refreshToken', column: 'refresh_token' },
          { key: 'idToken', column: 'id_token' },
          { key: 'accessTokenExpiresAt', column: 'access_token_expires_at' },
          { key: 'refreshTokenExpiresAt', column: 'refresh_token_expires_at' },
          { key: 'scope', column: 'scope' },
          { key: 'password', column: 'password' },
          { key: 'createdAt', column: 'created_at' },
          { key: 'updatedAt', column: 'updated_at' },
        ],
        batch,
      )
      await client.query(insert.text, insert.values)
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    await client.end()
  }

  console.log(`migrated users: ${users.length}`)
  console.log(`migrated accounts: ${accounts.length}`)

  if (passwordFixups.length > 0) {
    console.log('users_with_random_passwords')
    for (const entry of passwordFixups) {
      console.log(entry)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
