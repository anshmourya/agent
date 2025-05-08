import { integer, pgTable, text, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const task = pgTable("task", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  todo: text().notNull(),
  status: pgEnum("status", ["pending", "in_progress", "completed"])(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
