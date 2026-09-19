
import { Router } from "express";

import {createGame,joinGame,getGameById,getAllGames,} from "../controller/gameController.js";


const router=Router()

router.post("/create", createGame);

router.post("/join", joinGame);

router.get("/:gameId", getGameById);

router.get("/", getAllGames);

export default router;