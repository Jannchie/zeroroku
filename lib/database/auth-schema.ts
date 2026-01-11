import { bigint, bigserial, boolean, index, jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: bigserial({ mode: 'number' }).primaryKey().notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  exp: numeric('exp', { mode: 'number' }).default(0).notNull(),
  credit: numeric('credit', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const checkIns = pgTable('check_ins', {
  id: bigserial({ mode: 'number' }).primaryKey().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const creditRecords = pgTable('credit_records', {
  id: bigserial({ mode: 'number' }).primaryKey().notNull(),
  userId: bigint('user_id', { mode: 'number' }),
  credit: numeric('credit', { mode: 'number' }),
  text: text('text'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  data: jsonb('data').$type<Record<string, unknown> | null>(),
})

export const sponsors = pgTable('sponsors', {
  id: bigserial({ mode: 'number' }).primaryKey().notNull(),
  userName: text('user_name').notNull(),
  sponsoredAt: timestamp('sponsored_at', { withTimezone: true }).notNull(),
  amount: numeric('amount', { mode: 'number' }).notNull(),
}, table => [
  index('idx_sponsors_sponsored_at').on(table.sponsoredAt),
])

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})
