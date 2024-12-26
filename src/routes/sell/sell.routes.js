import express from 'express';
import { authMiddleware } from "../../middlewares/authMiddlewear.js";
import { createSell, deleteSell, getSellById, sellsList, updateSell } from '../../controllers/sell/sell.controller.js';

const sellRoutes = express.Router();


sellRoutes.post("/",authMiddleware, createSell);
sellRoutes.get("/list", authMiddleware, sellsList)
sellRoutes.get("/:id", authMiddleware, getSellById);
sellRoutes.put("/:id", authMiddleware, updateSell)
sellRoutes.delete("/:id", authMiddleware, deleteSell)

export default sellRoutes;