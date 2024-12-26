
import express from "express"
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import StockMaster from "./models/stock/StockMaster.model.js";
const app = express()

app.use(express.json());



//routes import
// import testRoutes from "./routes/test/index.routes"
import userRoutes from "./routes/user/user.routes.js"
import { authMiddleware } from "./middlewares/authMiddlewear.js";
import purchaseRoutes from "./routes/purchase/purchase.routes.js";
import sellRoutes from "./routes/sell/sell.routes.js";
import StockInventory from "./models/stock/StockInventory.model.js";
import stockMasterRoutes from "./routes/stock/stockMaster.routes.js";

// app.use('/api/v1/test', testRoutes);

app.get('/', (req, res) => {
    res.send('Hello baby!, ')
})

app.get('/data', async (req, res) => {
    let inventory = await StockInventory.find().populate('stockId').populate('transactionId')
    return res.json({
        data: inventory
    })
})

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/purchase', purchaseRoutes)
app.use('/api/v1/sell', sellRoutes)
app.use('/api/v1/StockMaster', stockMasterRoutes)




export { app }