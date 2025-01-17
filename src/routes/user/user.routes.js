import express from "express";
import { createUser, getUserProfile, loginUser, logoutUser, refreshAccessToken } from "../../controllers/user/user.controller.js";
import { authMiddleware } from "../../middlewares/authMiddlewear.js";



const userRoutes = express.Router();

userRoutes.post("/register", createUser);
userRoutes.get("/profile",authMiddleware, getUserProfile);
userRoutes.post("/login", loginUser);
userRoutes.post("/refresh-token", refreshAccessToken);
userRoutes.post("/logout",authMiddleware, logoutUser);

export default userRoutes;