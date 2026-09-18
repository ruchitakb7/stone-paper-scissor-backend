
import { Router } from "express";

import {createGame,joinGame,getGameById,getAllGames,} from "../controller/gameController.js";


const router=Router()
// Create a new game
router.post("/create", createGame);

// Join an existing game
router.post("/join", joinGame);

// Get a single game's details
router.get("/:gameId", getGameById);

// Get all completed games
router.get("/", getAllGames);

export default router;