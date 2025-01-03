import StockMaster from "../../models/stock/StockMaster.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

import stockData from "../../../stock_data.json"  assert { type: 'json' };

export const createStockMaster = asyncHandler(async (req, res) => {
    let {stockName, stockUnit, remark} = req.body;

    let isStockNameExist = await StockMaster.findOne({stockName});
    if(isStockNameExist){
        return res.status(400).json(new ApiError(400, "Stock Name already exists"));
    }
    const stock = new StockMaster({stockName, stockUnit, remark, createdBy: req.user._id});
    await stock.save();
    res.status(201).json(new ApiResponse(201, stock, "Stock created successfully"));
})


export const createBulkStockMaster = asyncHandler(async (req, res) => {
    let stocks = stockData.map((stock) => {
        return {
            stockName: stock.stockName,
            stockUnit: stock.stockUnit,
            remark: stock.remark,
            createdBy: req.user._id,
        }
    })
    await StockMaster.insertMany(stocks);
    res.status(201).json(new ApiResponse(201, stocks, "Stocks created successfully"));
})
    // let {stockName, stockUnit, remark} = req.body;

    // let isStockNameExist = await StockMaster.findOne({stockName});
    // if(isStockNameExist){
    //     return res.status(400).json(new ApiError(400, "Stock Name already exists"));
    // }
    // const stock = new StockMaster({stockName, stockUnit, remark, createdBy: req.user._id});
    // await stock.save();
    // res.status(201).json(new ApiResponse(201, stock, "Stock created successfully"));
// })
// Get All Stocks


export const getAllStocks = asyncHandler(async (req, res) => {
    const stocks = await StockMaster.find({
        createdBy: req.user._id,
    })
    if (!stocks) {
        return res.status(404).json(new ApiError(404, "Stocks not found"))
    }

    let formattedStock = stocks.map((stock) => {
        return {
            _id: stock._id,
            stockName: stock.stockName,
            stockUnit: stock.stockUnit,
            remark: stock.remark,
        }
    })
    res.status(200).json(new ApiResponse(200, formattedStock, "Stocks retrieved successfully"));
});


// Get Stock by ID
export const getStockById = asyncHandler(async (req, res) => {
    const stock = await StockMaster.findById(req.params.id);
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock retrieved successfully"));
});

// Update Stock


export const updateStock = asyncHandler(async (req, res) => {
    let {stockName, stockUnit, remark} = req.body;
    const stock = await StockMaster.findByIdAndUpdate(req.params.id, {stockName, stockUnit, remark}, { new: true });
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock updated successfully"));
});

// Delete Stock

export const delteStock = asyncHandler(async (req, res) => {
    const stock = await StockMaster.findByIdAndDelete(req.params.id);
    if (!stock) {
        return res.status(404).json(new ApiError(404, "Stock not found"))
    }
    res.status(200).json(new ApiResponse(200, stock, "Stock deleted successfully"));
});