CREATE TYPE "public"."game_status" AS ENUM('waiting', 'playing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."winner" AS ENUM('player1', 'player2', 'tie');--> statement-breakpoint
CREATE TYPE "public"."player_role" AS ENUM('player1', 'player2');--> statement-breakpoint
CREATE TYPE "public"."choice" AS ENUM('stone', 'paper', 'scissors');--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomCode" varchar(255) NOT NULL,
	"currentRound" integer DEFAULT 1 NOT NULL,
	"finalScorePlayer1" integer DEFAULT 0 NOT NULL,
	"finalScorePlayer2" integer DEFAULT 0 NOT NULL,
	"winner" "winner",
	"status" "game_status" DEFAULT 'waiting' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_roomCode_unique" UNIQUE("roomCode")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameId" integer NOT NULL,
	"playerId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "player_role" NOT NULL,
	CONSTRAINT "unique_game_role" UNIQUE("gameId","role")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"gameId" integer NOT NULL,
	"roundNumber" integer NOT NULL,
	"player1Choice" "choice",
	"player2Choice" "choice",
	"winner" "winner",
	"player1Score" integer DEFAULT 0 NOT NULL,
	"player2Score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_gameId_games_id_fk" FOREIGN KEY ("gameId") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_gameId_games_id_fk" FOREIGN KEY ("gameId") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;