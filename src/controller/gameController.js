import { eq, desc, and } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "../config/postgresdb.js";
import { games } from "../models/gameModel.js";
import { players } from "../models/player.js";
import { rounds } from "../models/roundModel.js";


const generateRoomCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};


export const createGame = async (req, res) => {
  try {
    const { playerName } = req.body;

    if (!playerName?.trim()) {
      return res.status(400).json({
        message: "Player name is required",
      });
    }

    let roomCode;
    let existingGame;

    do {
      roomCode = generateRoomCode();

      const result = await db
        .select()
        .from(games)
        .where(eq(games.roomCode, roomCode));

      existingGame = result[0];
    } while (existingGame);

    const playerId = crypto.randomUUID();

  
    const gameResult = await db
      .insert(games)
      .values({
        roomCode,
        status: "waiting",
        currentRound: 1,
      })
      .returning();

    const game = gameResult[0];

  
    await db.insert(players).values({
      gameId: game.id,
      playerId,
      name: playerName.trim(),
      role: "player1",
    });

    return res.status(201).json({
      message: "Game created successfully",
      gameId: game.id,
      roomCode: game.roomCode,
      playerId,
      playerRole: "player1",
    });
  } catch (error) {
    console.error("Create game error:", error);

    return res.status(500).json({
      message: "Failed to create game",
    });
  }
};


export const joinGame = async (req, res) => {
  try {
    const { roomCode, playerName } = req.body;

    if (!roomCode?.trim() || !playerName?.trim()) {
      return res.status(400).json({
        message: "Room code and player name are required",
      });
    }

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    const gameResult = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.roomCode, normalizedRoomCode),
          eq(games.status, "waiting")
        )
      );

    const game = gameResult[0];

    if (!game) {
      return res.status(404).json({
        message: "Game not found or already started",
      });
    }

    const existingPlayers = await db
      .select()
      .from(players)
      .where(eq(players.gameId, game.id));

    if (existingPlayers.length >= 2) {
      return res.status(400).json({
        message: "Game is already full",
      });
    }

    const playerId = crypto.randomUUID();

   
    await db.insert(players).values({
      gameId: game.id,
      playerId,
      name: playerName.trim(),
      role: "player2",
    });

  
    await db
      .update(games)
      .set({
        status: "playing",
        updatedAt: new Date(),
      })
      .where(eq(games.id, game.id));

    return res.status(200).json({
      message: "Joined game successfully",
      gameId: game.id,
      roomCode: game.roomCode,
      playerId,
      playerRole: "player2",
    });
  } catch (error) {
    console.error("Join game error:", error);

    return res.status(500).json({
      message: "Failed to join game",
    });
  }
};

export const getGameById = async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);

    const gameResult = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId));

    const game = gameResult[0];

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
      });
    }

    const gamePlayers = await db
      .select()
      .from(players)
      .where(eq(players.gameId, game.id));

    const gameRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.gameId, game.id));

    const formattedGame = {
      _id: game.id,
      roomCode: game.roomCode,
      players: gamePlayers,
      status: game.status,
      currentRound: game.currentRound,
      rounds: gameRounds,
      winner: game.winner,
      finalScore: {
        player1: game.finalScorePlayer1,
        player2: game.finalScorePlayer2,
      },
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };

    return res.status(200).json(formattedGame);
  } catch (error) {
    console.error("Get game error:", error);

    return res.status(500).json({
      message: "Failed to fetch game",
    });
  }
};

export const getAllGames = async (req, res) => {
  try {
    const allGames = await db
      .select()
      .from(games)
      .orderBy(desc(games.createdAt));

    const formattedGames = await Promise.all(
      allGames.map(async (game) => {
        const gamePlayers = await db
          .select()
          .from(players)
          .where(eq(players.gameId, game.id));

        const gameRounds = await db
          .select()
          .from(rounds)
          .where(eq(rounds.gameId, game.id));

        return {
          _id: game.id,
          roomCode: game.roomCode,
          players: gamePlayers,
          status: game.status,
          currentRound: game.currentRound,
          rounds: gameRounds,
          winner: game.winner,
          finalScore: {
            player1: game.finalScorePlayer1,
            player2: game.finalScorePlayer2,
          },
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        };
      })
    );

    return res.status(200).json(formattedGames);
  } catch (error) {
    console.error("Get all games error:", error);

    return res.status(500).json({
      message: "Failed to fetch games",
    });
  }
};

export const handleJoinGame = async (socket, io, data) => {
  try {
    const { roomCode, playerId } = data;

    if (!roomCode || !playerId) {
      socket.emit("game_error", {
        message: "Room code and player ID are required",
      });
      return;
    }

    const normalizedRoomCode = roomCode.toUpperCase();

    const gameResult = await db
      .select()
      .from(games)
      .where(eq(games.roomCode, normalizedRoomCode));

    const game = gameResult[0];

    if (!game) {
      socket.emit("game_error", {
        message: "Game not found",
      });
      return;
    }

    const playerResult = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.gameId, game.id),
          eq(players.playerId, playerId)
        )
      );

    const player = playerResult[0];

    if (!player) {
      socket.emit("game_error", {
        message: "You are not a player in this game",
      });
      return;
    }

    socket.join(game.roomCode);

    socket.data.playerId = playerId;
    socket.data.roomCode = game.roomCode;
    socket.data.playerRole = player.role;

    const gamePlayers = await db
      .select()
      .from(players)
      .where(eq(players.gameId, game.id));

    const playersData = gamePlayers.map((item) => ({
      playerId: item.playerId,
      name: item.name,
      role: item.role,
    }));

    if (gamePlayers.length === 2 && game.status === "playing") {
      io.to(game.roomCode).emit("player_joined", {
        players: playersData,
        status: game.status,
      });
    } else {
      socket.emit("waiting_for_player", {
        players: playersData,
        status: game.status,
      });
    }
  } catch (error) {
    console.error("Socket join error:", error);

    socket.emit("game_error", {
      message: "Failed to join game room",
    });
  }
};


export const handleSubmitChoice = async (socket, io, data) => {
  try {
    const { roomCode, playerId, choice } = data;

    const validChoices = ["stone", "paper", "scissors"];

    if (!roomCode || !playerId || !validChoices.includes(choice)) {
      socket.emit("game_error", {
        message: "Invalid game data or choice",
      });
      return;
    }

    const normalizedRoomCode = roomCode.toUpperCase();

    const gameResult = await db
      .select()
      .from(games)
      .where(eq(games.roomCode, normalizedRoomCode));

    const game = gameResult[0];

    if (!game) {
      socket.emit("game_error", {
        message: "Game not found",
      });
      return;
    }

    if (game.status !== "playing") {
      socket.emit("game_error", {
        message: "Game is not currently active",
      });
      return;
    }

    const gamePlayers = await db
      .select()
      .from(players)
      .where(eq(players.gameId, game.id));

    if (gamePlayers.length !== 2) {
      socket.emit("game_error", {
        message: "Waiting for the second player",
      });
      return;
    }

    const playerResult = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.gameId, game.id),
          eq(players.playerId, playerId)
        )
      );

    const player = playerResult[0];

    if (!player) {
      socket.emit("game_error", {
        message: "You are not part of this game",
      });
      return;
    }

    const roundResult = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.gameId, game.id),
          eq(rounds.roundNumber, game.currentRound)
        )
      );

    let currentRound = roundResult[0];

   
    if (!currentRound) {
      const newRoundResult = await db
        .insert(rounds)
        .values({
          gameId: game.id,
          roundNumber: game.currentRound,
          player1Choice: null,
          player2Choice: null,
          winner: null,
          player1Score: 0,
          player2Score: 0,
        })
        .returning();

      currentRound = newRoundResult[0];
    }

   
    if (
      player.role === "player2" &&
      !currentRound.player1Choice
    ) {
      socket.emit("game_error", {
        message: "Player 1 must select first",
      });
      return;
    }

  
    if (player.role === "player1") {
      if (currentRound.player1Choice) {
        socket.emit("game_error", {
          message: "You have already submitted your choice",
        });
        return;
      }

      await db
        .update(rounds)
        .set({
          player1Choice: choice,
        })
        .where(eq(rounds.id, currentRound.id));

      currentRound.player1Choice = choice;
    }

    if (player.role === "player2") {
      if (currentRound.player2Choice) {
        socket.emit("game_error", {
          message: "You have already submitted your choice",
        });
        return;
      }

      await db
        .update(rounds)
        .set({
          player2Choice: choice,
        })
        .where(eq(rounds.id, currentRound.id));

      currentRound.player2Choice = choice;
    }

    socket.to(game.roomCode).emit("player_ready", {
      playerId,
      role: player.role,
    });

    if (!currentRound.player1Choice || !currentRound.player2Choice) {
      return;
    }

    const player1Choice = currentRound.player1Choice;
    const player2Choice = currentRound.player2Choice;

    let winner = "tie";

    if (player1Choice !== player2Choice) {
      const player1Wins =
        (player1Choice === "stone" && player2Choice === "scissors") ||
        (player1Choice === "paper" && player2Choice === "stone") ||
        (player1Choice === "scissors" && player2Choice === "paper");

      winner = player1Wins ? "player1" : "player2";
    }

    let player1Score = 0;
    let player2Score = 0;

    if (winner === "player1") {
      player1Score = 1;
    }

    if (winner === "player2") {
      player2Score = 1;
    }

  
    const completedRoundResult = await db
      .update(rounds)
      .set({
        winner,
        player1Score,
        player2Score,
      })
      .where(eq(rounds.id, currentRound.id))
      .returning();

    currentRound = completedRoundResult[0];

   
    const allRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.gameId, game.id));

    const totalPlayer1Score = allRounds.reduce(
      (total, round) => total + (round.player1Score || 0),
      0
    );

    const totalPlayer2Score = allRounds.reduce(
      (total, round) => total + (round.player2Score || 0),
      0
    );

    const roundNumber = game.currentRound;

  
    await db
      .update(games)
      .set({
        finalScorePlayer1: totalPlayer1Score,
        finalScorePlayer2: totalPlayer2Score,
        updatedAt: new Date(),
      })
      .where(eq(games.id, game.id));

    io.to(game.roomCode).emit("round_result", {
      round: roundNumber,
      player1Choice,
      player2Choice,
      winner,
      player1Score: totalPlayer1Score,
      player2Score: totalPlayer2Score,
    });

    if (game.currentRound >= 6) {
      let finalWinner = "tie";

      if (totalPlayer1Score > totalPlayer2Score) {
        finalWinner = "player1";
      } else if (totalPlayer2Score > totalPlayer1Score) {
        finalWinner = "player2";
      }

      await db
        .update(games)
        .set({
          finalScorePlayer1: totalPlayer1Score,
          finalScorePlayer2: totalPlayer2Score,
          winner: finalWinner,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(games.id, game.id));

      io.to(game.roomCode).emit("game_completed", {
        winner: finalWinner,
        player1Score: totalPlayer1Score,
        player2Score: totalPlayer2Score,
      });

      return;
    }
  } catch (error) {
    console.error("Submit choice error:", error);

    socket.emit("game_error", {
      message: "Failed to submit choice",
    });
  }
};

export const handleNextRound = async (socket, io, data) => {
  try {
    const { roomCode, playerId } = data;

    if (!roomCode || !playerId) {
      socket.emit("game_error", {
        message: "Invalid game data",
      });
      return;
    }

    const normalizedRoomCode = roomCode.toUpperCase();

    const gameResult = await db
      .select()
      .from(games)
      .where(eq(games.roomCode, normalizedRoomCode));

    const game = gameResult[0];

    if (!game) {
      socket.emit("game_error", {
        message: "Game not found",
      });
      return;
    }

    if (game.status !== "playing") {
      socket.emit("game_error", {
        message: "Game is not currently active",
      });
      return;
    }

    const playerResult = await db
      .select()
      .from(players)
      .where(
        and(
          eq(players.gameId, game.id),
          eq(players.playerId, playerId)
        )
      );

    const player = playerResult[0];

    if (!player) {
      socket.emit("game_error", {
        message: "You are not part of this game",
      });
      return;
    }

    const roundResult = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.gameId, game.id),
          eq(rounds.roundNumber, game.currentRound)
        )
      );

    const currentRound = roundResult[0];

 
    if (
      !currentRound ||
      !currentRound.player1Choice ||
      !currentRound.player2Choice ||
      !currentRound.winner
    ) {
      socket.emit("game_error", {
        message: "The current round is not completed yet",
      });
      return;
    }

   
    if (game.currentRound >= 6) {
      return;
    }

   
    const nextRound = game.currentRound + 1;

    await db
      .update(games)
      .set({
        currentRound: nextRound,
        updatedAt: new Date(),
      })
      .where(eq(games.id, game.id));

    io.to(game.roomCode).emit("next_round", {
      round: nextRound,
    });
  } catch (error) {
    console.error("Next round error:", error);

    socket.emit("game_error", {
      message: "Failed to move to the next round",
    });
  }
};

