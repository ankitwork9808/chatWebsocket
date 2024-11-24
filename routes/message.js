import express from "express";
import messageController from "../controllers/message.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/sendMessage", verifyUser, messageController.sendMessage);
router.get("/getMessages/:id", verifyUser, messageController.getMessages);

export default router;
