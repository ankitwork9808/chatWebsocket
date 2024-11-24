import express from "express";
import userController from "../controllers/user.js"; 
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.get("/getAllUsersProfile", verifyUser, userController.getAllUsersProfile);

export default router;
