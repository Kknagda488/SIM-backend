
import express from "express"
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import {StockMaster} from "./models/StockMaster.model.js";
const app = express()

app.use(express.json());



//routes import
// import testRoutes from "./routes/test/index.routes"

// app.use('/api/v1/test', testRoutes);

app.get('/', (req, res) => {
    res.send('Hello baby!, ')
})


app.post('/StockMaster/stocks', asyncHandler(async (req, res) => {
    let {stockName, stockUnit} = req.body;
    const stock = new StockMaster({stockName, stockUnit});
    await stock.save(); 
    res.status(201).json(new ApiResponse(201, stock, "Stock created successfully"));
}));

// Get All Stocks
app.get('/StockMaster/stocks', asyncHandler(async (req, res) => {
    const stocks = await StockMaster.find();
    res.status(200).json(new ApiResponse(200, stocks, "Stocks retrieved successfully"));
}));

// Get Stock by ID
app.get('/StockMaster/stocks/:id', asyncHandler(async (req, res) => {
    const stock = await StockMaster.findById(req.params.id);
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock retrieved successfully"));
}));

// Update Stock
app.put('/StockMaster/stocks/:id', asyncHandler(async (req, res) => {
    const stock = await StockMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock updated successfully"));
}));

// Delete Stock
app.delete('/StockMaster/stocks/:id', asyncHandler(async (req, res) => {
    const stock = await StockMaster.findByIdAndDelete(req.params.id);
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock deleted successfully"));
}));

export { app }