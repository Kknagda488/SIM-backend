import express from 'express';
import { authMiddleware } from "../../middlewares/authMiddlewear.js";
import {createPurchase, deletePurchase, getPurchaseById, inventoryList, profitLossReport, purchaseList, updatePurchase} from "../../controllers/purchase/purchase.controller.js"
const purchaseRoutes = express.Router();


purchaseRoutes.post("/",authMiddleware, createPurchase);
purchaseRoutes.get("/list", authMiddleware, purchaseList)
purchaseRoutes.get("/:id", authMiddleware, getPurchaseById);
purchaseRoutes.put("/:id", authMiddleware, updatePurchase)
purchaseRoutes.delete("/:id", authMiddleware, deletePurchase)
purchaseRoutes.get("/inventory/list", authMiddleware, inventoryList)
purchaseRoutes.get("/profit-loss/list",authMiddleware, profitLossReport)


export default purchaseRoutes;