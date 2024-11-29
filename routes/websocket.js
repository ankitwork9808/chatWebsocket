import express from "express";
import websocketController from "../controllers/Websocket.js";
const router = express.Router();

router.get("/emit", websocketController.emitToClient);

export default router;
