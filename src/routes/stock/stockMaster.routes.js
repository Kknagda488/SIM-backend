import express from 'express'
import { authMiddleware } from '../../middlewares/authMiddlewear.js'
import { createBulkStockMaster, createStockMaster, delteStock, getAllStocks, getStockById, updateStock } from '../../controllers/stock/stockMaster.controller.js'

const stockMasterRoutes = express.Router()

stockMasterRoutes.post("/", authMiddleware, createStockMaster)
stockMasterRoutes.get("/list", authMiddleware, getAllStocks)
stockMasterRoutes.get("/:id", authMiddleware, getStockById)
stockMasterRoutes.put("/:id", authMiddleware, updateStock)
stockMasterRoutes.delete("/:id", authMiddleware, delteStock)
stockMasterRoutes.post("/bulk", authMiddleware, createBulkStockMaster)






export default stockMasterRoutes