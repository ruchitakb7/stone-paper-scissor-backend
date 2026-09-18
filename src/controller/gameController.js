import crypto from "node:crypto";
import Game from "../models/gameModel.js";

// Generate a unique room code
const generateRoomCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

// Create a new game
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
      existingGame = await Game.findOne({ roomCode });
    } while (existingGame);

    const playerId = crypto.randomUUID();

    const game = await Game.create({
      roomCode,
      players: [
        {
          playerId,
          name: playerName.trim(),
          role: "player1",
        },
      ],
      status: "waiting",
      currentRound: 1,
    });

    return res.status(201).json({
      message: "Game created successfully",
      gameId: game._id,
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

// Join an existing game
export const joinGame = async (req, res) => {
  try {
    const { roomCode, playerName } = req.body;

    if (!roomCode?.trim() || !playerName?.trim()) {
      return res.status(400).json({
        message: "Room code and player name are required",
      });
    }

    const game = await Game.findOne({
      roomCode: roomCode.trim().toUpperCase(),
      status: "waiting",
    });

    if (!game) {
      return res.status(404).json({
        message: "Game not found or already started",
      });
    }

    if (game.players.length >= 2) {
      return res.status(400).json({
        message: "Game is already full",
      });
    }

    const playerId = crypto.randomUUID();

    game.players.push({
      playerId,
      name: playerName.trim(),
      role: "player2",
    });

    game.status = "playing";

    await game.save();

    return res.status(200).json({
      message: "Joined game successfully",
      gameId: game._id,
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

// Get one game
export const getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
      });
    }

    return res.status(200).json(game);
  } catch (error) {
    console.error("Get game error:", error);

    return res.status(500).json({
      message: "Failed to fetch game",
    });
  }
};

// Get all games
export const getAllGames = async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });

    return res.status(200).json(games);
  } catch (error) {
    console.error("Get all games error:", error);

    return res.status(500).json({
      message: "Failed to fetch games",
    });
  }
};

// Socket: Join game room
export const handleJoinGame = async (socket, io, data) => {
  try {
    const { roomCode, playerId } = data;

    if (!roomCode || !playerId) {
      socket.emit("game_error", {
        message: "Room code and player ID are required",
      });
      return;
    }

    const game = await Game.findOne({
      roomCode: roomCode.toUpperCase(),
    });

    if (!game) {
      socket.emit("game_error", {
        message: "Game not found",
      });
      return;
    }

    const player = game.players.find(
      (item) => item.playerId === playerId
    );

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

    const players = game.players.map((item) => ({
      playerId: item.playerId,
      name: item.name,
      role: item.role,
    }));

    if (game.players.length === 2 && game.status === "playing") {
      io.to(game.roomCode).emit("player_joined", {
        players,
        status: game.status,
      });
    } else {
      socket.emit("waiting_for_player", {
        players,
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

// Socket: Submit player choice
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

    const game = await Game.findOne({
      roomCode: roomCode.toUpperCase(),
    });

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

    if (game.players.length !== 2) {
      socket.emit("game_error", {
        message: "Waiting for the second player",
      });
      return;
    }

    const player = game.players.find(
      (item) => item.playerId === playerId
    );

    if (!player) {
      socket.emit("game_error", {
        message: "You are not part of this game",
      });
      return;
    }

    let currentRound = game.rounds.find(
      (round) => round.roundNumber === game.currentRound
    );

   
    if (!currentRound) {
      game.rounds.push({
        roundNumber: game.currentRound,
        player1Choice: null,
        player2Choice: null,
        winner: null,
        player1Score: 0,
        player2Score: 0,
      });

      currentRound = game.rounds[game.rounds.length - 1];
    }

    // Save the player's choice
    if (player.role === "player1") {
      if (currentRound.player1Choice) {
        socket.emit("game_error", {
          message: "You have already submitted your choice",
        });
        return;
      }

      currentRound.player1Choice = choice;
    }

    if (player.role === "player2") {
      if (currentRound.player2Choice) {
        socket.emit("game_error", {
          message: "You have already submitted your choice",
        });
        return;
      }

      currentRound.player2Choice = choice;
    }

    // Inform both players that one player has submitted
    socket.to(game.roomCode).emit("player_ready", {
      playerId,
      role: player.role,
    });

    // If both players have not submitted yet, save and return
    if (!currentRound.player1Choice || !currentRound.player2Choice) {
      await game.save();
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

    currentRound.winner = winner;
    currentRound.player1Score = player1Score;
    currentRound.player2Score = player2Score;

    const totalPlayer1Score = game.rounds.reduce(
      (total, round) => total + (round.player1Score || 0),
      0
    );

    const totalPlayer2Score = game.rounds.reduce(
      (total, round) => total + (round.player2Score || 0),
      0
    );

    const roundNumber = game.currentRound;

    await game.save();

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

      game.finalScore = {
        player1: totalPlayer1Score,
        player2: totalPlayer2Score,
      };

      game.winner = finalWinner;
      game.status = "completed";

      await game.save();

      io.to(game.roomCode).emit("game_completed", {
        winner: finalWinner,
        player1Score: totalPlayer1Score,
        player2Score: totalPlayer2Score,
      });

      return;
    }

   
    game.currentRound += 1;
    await game.save();

    io.to(game.roomCode).emit("next_round", {
      round: game.currentRound,
    });
  } catch (error) {
    console.error("Submit choice error:", error);

    socket.emit("game_error", {
      message: "Failed to submit choice",
    });
  }
};