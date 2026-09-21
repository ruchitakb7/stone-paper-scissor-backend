import {
  pgTable,
  serial,
  integer,
  varchar,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

import { games } from "./gameModel.js";

export const playerRoleEnum = pgEnum("player_role", [
  "player1",
  "player2",
]);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),

    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, {
        onDelete: "cascade",
      }),

    playerId: varchar("playerId", {
      length: 255,
    }).notNull(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    role: playerRoleEnum("role").notNull(),
  },
  (table) => ({
    uniqueGameRole: unique("unique_game_role").on(
      table.gameId,
      table.role
    ),
  })
);