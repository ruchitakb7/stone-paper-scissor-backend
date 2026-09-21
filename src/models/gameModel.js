import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const winnerEnum = pgEnum("winner", [
  "player1",
  "player2",
  "tie",
]);

export const gameStatusEnum = pgEnum("game_status", [
  "waiting",
  "playing",
  "completed",
]);

export const games = pgTable("games", {
  id: serial("id").primaryKey(),

  roomCode: varchar("roomCode", {
    length: 255,
  })
    .notNull()
    .unique(),

  currentRound: integer("currentRound")
    .notNull()
    .default(1),

  finalScorePlayer1: integer("finalScorePlayer1")
    .notNull()
    .default(0),

  finalScorePlayer2: integer("finalScorePlayer2")
    .notNull()
    .default(0),

  winner: winnerEnum("winner"),

  status: gameStatusEnum("status")
    .notNull()
    .default("waiting"),

  createdAt: timestamp("createdAt", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updatedAt", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});