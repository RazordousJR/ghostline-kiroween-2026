import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const entryLimits = sqliteTable('entry_limits', {
  key: text('key').primaryKey(),
  expires: integer('expires').notNull(),
  hits: integer('hits').notNull().default(1),
}, t => [index('entry_limit_expiry').on(t.expires)]);

export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  created: integer("created").notNull(),
  expires: integer("expires").notNull(),
  speaker: text("speaker"),
  lease: integer("lease").notNull().default(0),
});
export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    room: text("room")
      .notNull()
      .references(() => rooms.code, { onDelete: "cascade" }),
    name: text("name").notNull(),
    seen: integer("seen").notNull(),
  },
  (t) => [index("member_room").on(t.room)],
);
export const signals = sqliteTable(
  "signals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    room: text("room")
      .notNull()
      .references(() => rooms.code, { onDelete: "cascade" }),
    sender: text("sender").notNull(),
    recipient: text("recipient").notNull(),
    body: text("body").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [index("signal_recipient").on(t.recipient, t.id)],
);
