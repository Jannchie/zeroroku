import * as process from 'node:process'
import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

export default defineConfig({
  out: './drizzle',
  schema: './lib/database/schema.ts',
  dialect: 'postgresql',
  tablesFilter: [
    '!author_fans_stat_[0-9]*',
    '!author_info_[0-9]*',
    '!tag_info_[0-9]*',
    '!video_history_stats_[0-9]*',
    '!video_info_[0-9]*',
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
