import path from 'node:path'
import * as process from 'node:process'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'

const { resolve } = path

config({ path: process.env.DOTENV_CONFIG_PATH ?? resolve(process.cwd(), '.env') })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to initialize the database connection.')
}

export const db = drizzle(databaseUrl)
