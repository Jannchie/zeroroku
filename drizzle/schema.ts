import { bigint, bigserial, boolean, date, index, integer, jsonb, numeric, pgSequence, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

export const authorFansStatsIdSeq = pgSequence('author_fans_stats_id_seq', { startWith: '1', increment: '1', minValue: '1', maxValue: '9223372036854775807', cache: '1', cycle: false })
export const videoHistoryStatsIdSeq = pgSequence('video_history_stats_id_seq', { startWith: '1', increment: '1', minValue: '1', maxValue: '9223372036854775807', cache: '1', cycle: false })

export const videoInfoMaster = pgTable('video_info_master', {
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  aid: bigint({ mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  videos: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tid: bigint({ mode: 'number' }),
  tname: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  copyright: bigint({ mode: 'number' }),
  pic: text(),
  title: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  pubdate: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  ctime: bigint({ mode: 'number' }),
  desc: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  state: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  duration: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  statId: bigint('stat_id', { mode: 'number' }),
  dynamic: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  cid: bigint({ mode: 'number' }),
  shortLink: text('short_link'),
  shortLinkV2: text('short_link_v2'),
  bvid: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  score: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  upFromV2: bigint('up_from_v2', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  missionId: bigint('mission_id', { mode: 'number' }),
  dimension: jsonb(),
  owner: jsonb(),
  rights: jsonb(),
  stat: jsonb(),
  tagList: integer('tag_list').array(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  attribute: bigint({ mode: 'number' }),
})

export const authorInfoMaster = pgTable('author_info_master', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }).notNull(),
  name: text(),
  face: text(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  theme: jsonb(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  silence: bigint({ mode: 'number' }),
  fansBadge: boolean('fans_badge'),
  official: jsonb(),
  nameplate: jsonb(),
  userHonourInfo: jsonb('user_honour_info'),
  topPhoto: text('top_photo'),
  sex: text(),
  sign: text(),
  coins: numeric(),
  pendant: jsonb(),
  sysNotice: jsonb('sys_notice'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rank: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  level: bigint({ mode: 'number' }),
  isFollowed: boolean('is_followed'),
  liveRoom: jsonb('live_room'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  joinTime: bigint('join_time', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  moral: bigint({ mode: 'number' }),
  birthday: text(),
  vip: jsonb(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  isFakeAccount: bigint('is_fake_account', { mode: 'number' }),
  isDeleted: integer('is_deleted'),
  inRegAudit: integer('in_reg_audit'),
  faceNft: integer('face_nft'),
  faceNftNew: integer('face_nft_new'),
  isSeniorMember: integer('is_senior_member'),
  digitalId: text('digital_id'),
  digitalType: integer('digital_type'),
})

export const authorFansSchedules = pgTable('author_fans_schedules', {
  mid: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  next: timestamp({ withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
})

export const authorInfoSchedules = pgTable('author_info_schedules', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }).primaryKey().notNull(),
  next: timestamp({ withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
}, table => [
  index('idx_author_info_schedules_next').using('btree', table.next.asc().nullsLast().op('timestamptz_ops')),
])

export const authorVideoSchedules = pgTable('author_video_schedules', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }).primaryKey().notNull(),
  next: timestamp({ withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
}, table => [
  index('idx_author_video_schedules_next').using('btree', table.next.asc().nullsLast().op('timestamptz_ops')),
])

export const authorFansStatMaster = pgTable('author_fans_stat_master', {
  id: bigserial({ mode: 'bigint' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  fans: bigint({ mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rate1: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rate7: bigint({ mode: 'number' }),
}, table => [
  primaryKey({ columns: [table.mid, table.id], name: 'author_fans_stat_master_pkey' }),
  uniqueIndex('author_fans_stat_master_mid_created_at_uindex')
    .using('btree', table.mid.asc().nullsLast().op('int8_ops'), table.createdAt.asc().nullsLast().op('timestamptz_ops')),
  index('idx_author_fans_stat_master_rate1').using('btree', table.rate1.desc().nullsFirst().op('int8_ops')),
  index('idx_author_fans_stat_master_rate7').using('btree', table.rate7.desc().nullsFirst().op('int8_ops')),
])

export const authorLatestFans = pgTable('author_latest_fans', {
  mid: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  fans: bigint({ mode: 'number' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rate7: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rate1: bigint({ mode: 'number' }),
}, table => [
  index().using('btree', table.updatedAt.desc().nullsFirst().op('timestamptz_ops')),
  index('idx_author_latest_fans_fans').using('btree', table.fans.desc().nullsFirst().op('int8_ops')),
  index('idx_author_latest_fans_rate1').using('btree', table.rate1.desc().nullsFirst().op('int8_ops')),
  index('idx_author_latest_fans_rate7').using('btree', table.rate7.desc().nullsFirst().op('int8_ops')),
])

export const authorRecords = pgTable('author_records', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  maxVar: bigint('max_var', { mode: 'number' }).default(0).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  minVar: bigint('min_var', { mode: 'number' }).default(0).notNull(),
  maxVarDate: date('max_var_date'),
  minVarDate: date('min_var_date'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  maxGiftCurrency: bigint('max_gift_currency', { mode: 'number' }).default(0).notNull(),
  maxGiftCurrencyDate: date('max_gift_currency_date'),
}, table => [
  index().using('btree', table.maxGiftCurrency.asc().nullsLast().op('int8_ops')),
  index().using('btree', table.maxVar.asc().nullsLast().op('int8_ops')),
  index().using('btree', table.minVar.asc().nullsLast().op('int8_ops')),
])

export const authorTagRecFeedbacks = pgTable('author_tag_rec_feedbacks', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  message: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mId: bigint('m_id', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  relevance: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  variegation: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  novelty: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  accuracy: bigint({ mode: 'number' }),
  method: text(),
  ip: text(),
})

export const authorTagSuggestions = pgTable('author_tag_suggestions', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uid: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tid: bigint({ mode: 'number' }),
  method: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
}, table => [
  index('idx_author_tag_suggestions_created_at').using('btree', table.createdAt.asc().nullsLast().op('timestamptz_ops')),
  index('idx_author_tag_suggestions_method').using('btree', table.method.asc().nullsLast().op('text_ops')),
  index('idx_author_tag_suggestions_mid').using('btree', table.mid.asc().nullsLast().op('int8_ops')),
  index('idx_author_tag_suggestions_tid').using('btree', table.tid.asc().nullsLast().op('int8_ops')),
  index('idx_author_tag_suggestions_uid').using('btree', table.uid.asc().nullsLast().op('int8_ops')),
])

export const authorVisitRecords = pgTable('author_visit_records', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mid: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uid: bigint({ mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  ip: text(),
}, table => [
  index('idx_author_visit_records_created_at').using('btree', table.createdAt.asc().nullsLast().op('timestamptz_ops')),
  index('idx_author_visit_records_ip').using('btree', table.ip.asc().nullsLast().op('text_ops')),
  index('idx_author_visit_records_mid').using('btree', table.mid.asc().nullsLast().op('int8_ops')),
  index('idx_author_visit_records_uid').using('btree', table.uid.asc().nullsLast().op('int8_ops')),
])

export const comments = pgTable('comments', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  path: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  parentId: bigint('parent_id', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uid: bigint({ mode: 'number' }),
  content: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  like: bigint('like', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  dislike: bigint('dislike', { mode: 'number' }).default(0),
}, table => [
  index('idx_comments_like').using('btree', table.like.asc().nullsLast().op('int8_ops')),
  index('idx_comments_parent_id').using('btree', table.parentId.asc().nullsLast().op('int8_ops')),
  index('idx_comments_path').using('btree', table.path.asc().nullsLast().op('text_ops')),
  index('idx_comments_uid').using('btree', table.uid.asc().nullsLast().op('int8_ops')),
])

export const channelStats = pgTable('channel_stats', {
  tagId: bigserial('tag_id', { mode: 'bigint' }).primaryKey().notNull(),
  isChannel: boolean('is_channel'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
})

export const liveRoomGiftAggregations = pgTable('live_room_gift_aggregations', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  price: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  count: bigint({ mode: 'number' }).default(0),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  roomId: bigint('room_id', { mode: 'number' }),
  timestamp: timestamp({ withTimezone: true, mode: 'string' }),
}, table => [
  index('idx_live_room_gift_aggregations_room_id').using('btree', table.roomId.asc().nullsLast().op('int8_ops')),
  index('idx_live_room_gift_aggregations_timestamp').using('btree', table.timestamp.asc().nullsLast().op('timestamptz_ops')),
])

export const liveRoomGifts = pgTable('live_room_gifts', {
  id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  roomId: bigint('room_id', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  giftId: bigint('gift_id', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  price: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  count: bigint({ mode: 'number' }).default(0),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uid: bigint({ mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
}, table => [
  index('idx_live_room_gifts_room_id').using('btree', table.roomId.asc().nullsLast().op('int8_ops')),
])

export const livers = pgTable('livers', {
  mid: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  headPic: text('head_pic'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  roomId: bigint('room_id', { mode: 'number' }),
  name: text(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  guardNum: bigint('guard_num', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  gid: bigint({ mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  liveStatus: bigint('live_status', { mode: 'number' }),
  face: text(),
  follow: boolean(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  liveTime: bigint('live_time', { mode: 'number' }),
}, table => [
  index('idx_guard_num').using('btree', table.guardNum.asc().nullsLast().op('int8_ops')),
  index().using('btree', table.liveStatus.asc().nullsLast().op('int8_ops')),
  index().using('btree', table.roomId.asc().nullsLast().op('int8_ops')),
])

export const authorFollows = pgTable('author_follows', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  source: bigint({ mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  target: bigint({ mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
}, table => [
  primaryKey({ columns: [table.source, table.target], name: 'author_follows_pkey' }),
])

export const authorTagRecRecognitions = pgTable('author_tag_rec_recognitions', {
  ip: text().notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  mId: bigint('m_id', { mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  tId: bigint('t_id', { mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  recognition: bigint({ mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  method: text(),
}, table => [
  primaryKey({ columns: [table.ip, table.mId, table.tId], name: 'author_tag_rec_recognitions_pkey' }),
])

export const danmakuInfo = pgTable('danmaku_info', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  cid: bigint({ mode: 'number' }).notNull(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  dmId: bigint('dm_id', { mode: 'number' }).notNull(),
  time: numeric(),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  danmakuType: bigint('danmaku_type', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  fontSize: bigint('font_size', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  color: bigint({ mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  poolType: bigint('pool_type', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  senderChecksum: bigint('sender_checksum', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  blockLevel: bigint('block_level', { mode: 'number' }),
  text: text(),
}, table => [
  index('idx_danmaku_info_created_at').using('btree', table.createdAt.asc().nullsLast().op('timestamptz_ops')),
  index('idx_danmaku_info_sender_checksum').using('btree', table.senderChecksum.asc().nullsLast().op('int8_ops')),
  primaryKey({ columns: [table.cid, table.dmId], name: 'danmaku_info_pkey' }),
])
