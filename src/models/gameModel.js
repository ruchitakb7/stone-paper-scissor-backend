
import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
  {
    roundNumber: {
      type: Number,
      required: true,
    },

    player1Choice: {
      type: String,
      enum: ["stone", "paper", "scissors"],
      default: null,
    },

    player2Choice: {
      type: String,
      enum: ["stone", "paper", "scissors"],
      default: null,
    },

    winner: {
      type: String,
      enum: ["player1", "player2", "tie", null],
      default: null,
    },

    player1Score: {
      type: Number,
      default: 0,
    },

    player2Score: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
    },

    players: [
      {
        playerId: {
          type: String,
          required: true,
        },

        name: {
          type: String,
          required: true,
        },

        role: {
          type: String,
          enum: ["player1", "player2"],
          required: true,
        },
      },
    ],

    rounds: {
      type: [roundSchema],
      default: [],
    },

    currentRound: {
      type: Number,
      default: 1,
    },

    finalScore: {
      player1: {
        type: Number,
        default: 0,
      },

      player2: {
        type: Number,
        default: 0,
      },
    },

    winner: {
      type: String,
      enum: ["player1", "player2", "tie", null],
      default: null,
    },

    status: {
      type: String,
      enum: ["waiting", "playing", "completed"],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

const Game = mongoose.model("Game", gameSchema);

export default Game;