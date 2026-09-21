import {
  pgTable,
  serial,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

import { games, winnerEnum } from "./gameModel.js";

export const choiceEnum = pgEnum("choice", [
  "stone",
  "paper",
  "scissors",
]);

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),

  gameId: integer("gameId")
    .notNull()
    .references(() => games.id, {
      onDelete: "cascade",
    }),

  roundNumber: integer("roundNumber").notNull(),

  player1Choice: choiceEnum("player1Choice"),

  player2Choice: choiceEnum("player2Choice"),

  winner: winnerEnum("winner"),

  player1Score: integer("player1Score")
    .notNull()
    .default(0),

  player2Score: integer("player2Score")
    .notNull()
    .default(0),
});