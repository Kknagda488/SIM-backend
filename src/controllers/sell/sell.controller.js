import express from "express";
import mongoose from "mongoose";
import Sell from "../../models/sell/Sell.model.js";
import StockInventory from "../../models/stock/StockInventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = express.Router();

// POST: Create a new sell
export const createSell = asyncHandler(async (req, res, next) => {
  try {
    const { stockId, stockQty,salesDate, sellPrice, remarks } = req.body;

    if (!stockId || !stockQty || !sellPrice) {
      return res.status(400).json(new ApiError(400, "All required fields must be provided"));
    }

    const inventory = await StockInventory.findOne({ stockId });
    if (!inventory || inventory.remaining < stockQty) {
      return res.status(400).json(new ApiError(400, "Insufficient stock available"));
    } 

    const newSell = new Sell({
      stockId,
      salesDate,
      createdBy: req.user._id,
      stockQty,
      stockSoldPrice:sellPrice,
      remarks,
      netTotal: stockQty * sellPrice,
    });

    const savedSell = await newSell.save();



    inventory.totalSold += stockQty;
    inventory.remaining -= stockQty;
    await inventory.save();

    return res
      .status(201)
      .json(new ApiResponse(201, savedSell, "Sell created successfully"));
  } catch (error) {
    next(error);
  }
});

// GET: Retrieve a single sell by ID
export const getSellById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid sell ID"));
    }

    const sell = await Sell.findById(id).populate("stockId").populate("createdBy");
    if (!sell) {
      return res.status(404).json(new ApiError(404, "Sell not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, sell, "Sell retrieved successfully"));
  } catch (error) {
    next(error);
  }
});



export const sellsList = asyncHandler(async (req, res, next) => {
  try {
    // Correctly find purchases by user ID and populate stockId field
    const sells = await Sell.find({ createdBy: req.user._id }).populate("stockId");

    // Handle case when no sells are found
    if (!sells || sells.length === 0) {
      return res.status(404).json(new ApiError(404, "No sells found"));
    }

    // Map sells and include relevant fields
    const formattedsells = sells.map((sell) => ({
      id: sell._id,
      stockName: sell.stockId?.stockName, 
      salesDate: new Date(sell.salesDate).toLocaleString("en-US", {
        year: "numeric",
        month: "short", // Short month format, e.g., "Nov"
        day: "numeric", // Numeric day
        hour: "numeric", // Hour in 12-hour format
        minute: "numeric", // Minute
        hour12: true, // Ensures 12-hour format with AM/PM
      }),      
      stockQty: sell.stockQty,// Use optional chaining for safety
      soldPrice: sell.stockSoldPrice,
      total: sell.netTotal,
      remarks: sell.remarks,
    }));

    // Return the formatted response
    return res
      .status(200)
      .json(new ApiResponse(200, formattedsells, "Sells retrieved successfully"));
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
});
// PUT: Update a sell by ID
export const updateSell = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stockId, stockQty, sellPrice, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid sell ID"));
    }

    const sell = await Sell.findById(id);
    if (!sell) {
      return res.status(404).json(new ApiError(404, "Sell not found"));
    }

    const inventory = await StockInventory.findOne({ stockId: sell.stockId });
    if (!inventory) {
      return res.status(404).json(new ApiError(404, "Inventory record not found"));
    }

    const originalQty = sell.stockQty;

    if (stockQty && stockQty - originalQty > inventory.remaining) {
      return res.status(400).json(new ApiError(400, "Insufficient stock available for update"));
    }

    sell.stockId = stockId || sell.stockId;
    sell.stockQty = stockQty || sell.stockQty;
    sell.sellPrice = sellPrice || sell.sellPrice;
    sell.remarks = remarks || sell.remarks;
    sell.totalAmount = sell.stockQty * sell.sellPrice;

    const updatedSell = await sell.save();

    inventory.totalSold += (updatedSell.stockQty - originalQty);
    inventory.remaining -= (updatedSell.stockQty - originalQty);
    await inventory.save();

    return res
      .status(200)
      .json(new ApiResponse(200, updatedSell, "Sell updated successfully"));
  } catch (error) {
    next(error);
  }
});

// DELETE: Delete a sell by ID
// export const deleteSell = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json(new ApiError(400, "Invalid sell ID"));
//     }

//     const deletedSell = await Sell.findByIdAndDelete(id);
//     if (!deletedSell) {
//       return res.status(404).json(new ApiError(404, "Sell not found"));
//     }

//     const inventory = await StockInventory.findOne({ transactionId: id });
//     if (inventory) {
//       inventory.totalSold -= deletedSell.stockQty;
//       inventory.remaining += deletedSell.stockQty;
//       await inventory.save();
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, null, "Sell deleted successfully"));
//   } catch (error) {
//     next(error);
//   }
// });

export const deleteSell = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate sell ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid sell ID"));
    }

    // Find the sell record
    const sell = await Sell.findById(id);
    if (!sell) {
      return res.status(404).json(new ApiError(404, "Sell not found"));
    }

    // Find the inventory record related to the sell
    const inventory = await StockInventory.findOne({ stockId: sell.stockId });
    if (!inventory) {
      return res.status(404).json(new ApiError(404, "Inventory record not found"));
    }

    // Update inventory before deleting the sell
    inventory.totalSold = Math.max(0, inventory.totalSold - sell.stockQty); // Prevent negative totalSold
    inventory.remaining += sell.stockQty; // Add back the sold quantity
    await inventory.save();

    // Delete the sell record
    await sell.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Sell deleted successfully"));
  } catch (error) {
    next(error);
  }
});


export default router;
