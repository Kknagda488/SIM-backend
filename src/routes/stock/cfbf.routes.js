import express from 'express'
import { authMiddleware } from '../../middlewares/authMiddlewear.js'
import { broughtForward, carryForward, getCfBfList, stockTransaction } from '../../controllers/stock/cfbf.controller.js'

const cfbfRoutes = express.Router()


cfbfRoutes.get("/inventory",authMiddleware, getCfBfList)
cfbfRoutes.post("/carry-forward", authMiddleware, carryForward)
cfbfRoutes.post("/brought-forward/:stockId", authMiddleware, broughtForward)
cfbfRoutes.get("/stock-transaction/:stockId", authMiddleware, stockTransaction)

export default cfbfRoutes 