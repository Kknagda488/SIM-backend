import express from "express";
import mongoose from "mongoose";
import Purchase from "../../models/purchase/Purchase.model.js";
import StockInventory from "../../models/stock/StockInventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Sell from "../../models/sell/Sell.model.js";
import InventoryCFBFModel from "../../models/stock/InventoryCFBF.model.js";

const router = express.Router();

// POST: Create a new purchase

// export const createPurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { stockId, stockQty,purchaseDate, stockPurchasePrice, remarks } = req.body;

//     // Validate required fields
//     if (!stockId || !stockQty || !stockPurchasePrice) {
//       return res.status(400).json(new ApiError(400, "All required fields must be provided"));
//     }

//     // Create a new purchase
//     const newPurchase = new Purchase({
//       stockId,
//       purchaseDate,
//       createdBy: req.user._id,
//       stockQty,
//       stockPurchasePrice,
//       remarks,
//       netTotal: stockQty * stockPurchasePrice,
//     });

//     const savedPurchase = await newPurchase.save();

//     // Check if the stockId exists in inventory
//     let existingInventory = await StockInventory.findOne({ stockId, createdBy: req.user._id });

//     if (existingInventory) {
//       // Update existing inventory
//       existingInventory.totalPurchased += parseInt(stockQty);
//       existingInventory.remaining += parseInt(stockQty);

//       // Optional: Update transactionId or other fields if required
//       // existingInventory.lastTransactionId = savedPurchase._id;
//       // existingInventory.lastUpdated = new Date();

//       await existingInventory.save();
//     } else {
//       // Create new inventory entry
//       const newInventory = new StockInventory({
//         transactionId: savedPurchase._id,
//         transactionType: "Purchase",
//         createdBy: req.user._id,
//         stockId,
//         date: new Date(),
//         totalPurchased: stockQty,
//         remaining: stockQty,
//       });

//       await newInventory.save();
//     }

//     return res
//       .status(201)
//       .json(new ApiResponse(201, savedPurchase, "Purchase created and inventory updated successfully"));
//   } catch (error) {
//     next(error);
//   }
// });


// export const createPurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { stockId, stockQty, purchaseDate, stockPurchasePrice, remarks } = req.body;

//     // Validate input
//     if (!stockId || !stockQty || !stockPurchasePrice || !purchaseDate) {
//       return res.status(400).json(
//         new ApiError(400, "All required fields must be provided")
//       );
//     }

//     // Start transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       // Create purchase record
//       const newPurchase = new Purchase({
//         stockId,
//         purchaseDate: new Date(purchaseDate),
//         createdBy: req.user._id,
//         stockQty,
//         stockPurchasePrice,
//         remarks,
//         netTotal: (stockQty * stockPurchasePrice).toFixed(2),
//       });

//       const savedPurchase = await newPurchase.save({ session });

//       // Create a new inventory entry for each purchase
//       const newInventoryEntry = new StockInventory({
//         transactionId: savedPurchase._id,
//         transactionType: "Purchase",
//         createdBy: req.user._id,
//         stockId,
//         date: new Date(purchaseDate),
//         totalPurchased: stockQty,
//         totalSold: 0,
//         remaining: stockQty,
//       });

//       await newInventoryEntry.save({ session });

//       // Commit the transaction
//       await session.commitTransaction();

//       return res.status(201).json(
//         new ApiResponse(201, savedPurchase, "Purchase created successfully")
//       );
//     } catch (error) {
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }
//   } catch (error) {
//     next(error);
//   }
// });


export const createPurchase = asyncHandler(async (req, res, next) => {
  try {
    const { stockId, stockQty, purchaseDate, stockPurchasePrice, remarks } = req.body;

    // Validate input
    if (!stockId || !stockQty || !stockPurchasePrice || !purchaseDate) {
      return res.status(400).json(
        new ApiError(400, "All required fields must be provided")
      );
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create purchase record
      const newPurchase = new Purchase({
        stockId,
        purchaseDate: new Date(purchaseDate),
        createdBy: req.user._id,
        stockQty,
        stockPurchasePrice,
        remarks,
        netTotal: (stockQty * stockPurchasePrice).toFixed(2),
      });

      const savedPurchase = await newPurchase.save({ session });

      // Update or create inventory
      let inventory = await StockInventory.findOne({ 
        stockId, 
        createdBy: req.user._id 
      });

      if (inventory) {
        inventory.totalPurchased += parseInt(stockQty);
        inventory.remaining += parseInt(stockQty);
      } else {
        inventory = new StockInventory({
          transactionId: savedPurchase._id,
          transactionType: "Purchase",
          createdBy: req.user._id,
          stockId,
          date: new Date(purchaseDate),
          totalPurchased: stockQty,
          totalSold: 0,
          remaining: stockQty,
        });
      }

      await inventory.save({ session });
      await session.commitTransaction();

      return res.status(201).json(
        new ApiResponse(201, savedPurchase, "Purchase created successfully")
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
});

// { stockName: 'Apple Inc.', stockQty: 150, purchasePrice: 120, total: 18000, remarks: 'Tech leader' },

export const purchaseList = asyncHandler(async (req, res, next) => {
  try {
    // Correctly find purchases by user ID and populate stockId field
    const purchases = await Purchase.find({ createdBy: req.user._id }).populate("stockId");

    // Handle case when no purchases are found
    if (!purchases || purchases.length === 0) {
      return res.status(404).json(new ApiError(404, "No purchases found"));
    }

    // Map purchases and include relevant fields
    const formattedPurchases = purchases.map((purchase) => ({
      id: purchase._id,
      stockName: purchase.stockId?.stockName, 
      stockQty: purchase.stockQty,// Use optional chaining for safety
      purchasePrice: purchase.stockPurchasePrice,
      total: purchase.netTotal,
      remarks: purchase.remarks,
    }));

    // Return the formatted response
    return res
      .status(200)
      .json(new ApiResponse(200, formattedPurchases, "Purchases retrieved successfully"));
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
});


// export const inventoryList = asyncHandler(async (req, res, next) => {
//   try {
//     // Correctly find purchases by user ID and populate stockId field
//     const inventory = await StockInventory.find({ remaining: { $gt: 0 }, createdBy:req.user._id }).populate("stockId");


//     // Handle case when no sells are found
//     if (!inventory || inventory.length === 0) {
//       return res.status(404).json(new ApiError(404, "No inventory found"));
//     }

//     // Map sells and include relevant fields
//     const formattedInventory = inventory.map((stock) => ({
//       id: stock._id,
//       stockName: stock.stockId?.stockName,    
//       stockQty: stock.remaining,
//       stockId: stock.stockId?._id// Use optional chaining for safety
//     }));

//     // Return the formatted response
//     return res
//       .status(200)
//       .json(new ApiResponse(200, formattedInventory, "Inventory retrieved successfully"));
//   } catch (error) {
//     next(error); // Pass the error to the error-handling middleware
//   }
// });


export const inventoryList = asyncHandler(async (req, res, next) => {
  try {
    // Fetch inventory records with remaining stock > 0 for the logged-in user
    const inventory = await StockInventory.find({
      remaining: { $gt: 0 },
      createdBy: req.user._id,
    }).populate("stockId");

    // Handle case when no inventory records are found
    if (!inventory || inventory.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No inventory found"));
    }

    // Format the inventory data
    const formattedInventory = inventory.map((stock) => ({
      id: stock._id,
      stockName: stock.stockId?.stockName || "Unknown", // Default to "Unknown" if stockName is missing
      stockQty: stock.remaining,
      stockId: stock.stockId?._id || null, // Default to null if stockId is missing
    }));

    // Return the formatted inventory data
    return res
      .status(200)
      .json(new ApiResponse(200, formattedInventory, "Inventory retrieved successfully"));
  } catch (error) {
    // Handle any unexpected errors
    next(error);
  }
});


// GET: Retrieve a single purchase by ID
export const getPurchaseById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
    }

    const purchase = await Purchase.findById(id).populate("stockId").populate("createdBy");
    if (!purchase) {
      return res.status(404).json(new ApiError(404, "Purchase not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, purchase, "Purchase retrieved successfully"));
  } catch (error) {
    next(error);
  }
});

// PUT: Update a purchase by ID
// export const updatePurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const {  stockQty, stockPurchasePrice, remarks } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
//     }

//     const purchase = await Purchase.findById(id);
//     if (!purchase) {
//       return res.status(404).json(new ApiError(404, "Purchase not found"));
//     }

//     const originalQty = purchase.stockQty;
//     purchase.stockId = purchase.stockId;
//     purchase.stockQty = stockQty || purchase.stockQty;
//     purchase.stockPurchasePrice = stockPurchasePrice || purchase.stockPurchasePrice;
//     purchase.remarks = remarks || purchase.remarks;
//     purchase.netTotal = purchase.stockQty * purchase.stockPurchasePrice;

//     const updatedPurchase = await purchase.save();

//     const inventory = await StockInventory.findOne({ stockId: purchase.stockId });
//     if (inventory) {
//       inventory.totalPurchased = updatedPurchase.stockQty;
//       inventory.remaining += (updatedPurchase.stockQty - originalQty);
//       await inventory.save();
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, updatedPurchase, "Purchase updated successfully"));
//   } catch (error) {
//     next(error);
//   }
// });


export const updatePurchase = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stockQty, stockPurchasePrice, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
    }

    // Find the purchase record
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json(new ApiError(404, "Purchase not found"));
    }

    const originalQty = purchase.stockQty;

    // Update the purchase record
    purchase.stockQty = stockQty || purchase.stockQty;
    purchase.stockPurchasePrice = stockPurchasePrice || purchase.stockPurchasePrice;
    purchase.remarks = remarks || purchase.remarks;
    purchase.netTotal = (purchase.stockQty * purchase.stockPurchasePrice).toFixed(2);

    const updatedPurchase = await purchase.save();

    // Start a transaction to ensure inventory consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update inventory by creating a new entry instead of modifying the existing one
      const newInventoryEntry = new StockInventory({
        transactionId: updatedPurchase._id,
        transactionType: "Purchase Update",
        createdBy: req.user._id,
        stockId: purchase.stockId,
        date: new Date(),
        totalPurchased: updatedPurchase.stockQty - originalQty,
        totalSold: 0,
        remaining: updatedPurchase.stockQty - originalQty,
      });

      await newInventoryEntry.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      return res
        .status(200)
        .json(new ApiResponse(200, updatedPurchase, "Purchase updated successfully"));
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
});


// DELETE: Delete a purchase by ID
// export const deletePurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
//     }

//     const deletedPurchase = await Purchase.findByIdAndDelete(id);
//     if (!deletedPurchase) {
//       return res.status(404).json(new ApiError(404, "Purchase not found"));
//     }

//     const inventory = await StockInventory.findOneAndDelete({ transactionId: id });

//     return res
//       .status(200)
//       .json(new ApiResponse(200, null, "Purchase deleted successfully"));
//   } catch (error) {
//     next(error);
//   }
// });


export const deletePurchase = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate purchase ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the purchase to delete
      const purchase = await Purchase.findById(id).session(session);
      if (!purchase) {
        return res.status(404).json(new ApiError(404, "Purchase not found"));
      }

      const { stockId, stockQty } = purchase;

      // Delete the purchase
      await purchase.deleteOne({ session });

      // Update stock inventory
      const inventory = await StockInventory.findOne({ stockId }).session(session);
      if (inventory) {
        inventory.totalPurchased -= stockQty;
        inventory.remaining -= stockQty;

        // Ensure remaining stock is not negative
        if (inventory.remaining < 0) {
          inventory.remaining = 0;
        }

        // Ensure totalPurchased is not negative (optional)
        if (inventory.totalPurchased < 0) {
          inventory.totalPurchased = 0;
        }

        await inventory.save({ session });
      }

      // Commit transaction
      await session.commitTransaction();

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Purchase deleted successfully"));
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
});


// export const deletePurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Validate purchase ID
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
//     }

//     // Find the purchase to delete
//     const purchase = await Purchase.findById(id);
//     if (!purchase) {
//       return res.status(404).json(new ApiError(404, "Purchase not found"));
//     }

//     const { stockId, stockQty } = purchase;

//     // Delete the purchase
//     await purchase.deleteOne();

//     // Update stock inventory
//     const inventory = await StockInventory.findOne({ stockId });
//     if (inventory) {
//       inventory.totalPurchased -= stockQty;
//       inventory.remaining -= stockQty;

//       // Ensure remaining stock is not negative
//       if (inventory.remaining < 0) {
//         inventory.remaining = 0;
//       }

//       await inventory.save();
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, null, "Purchase deleted successfully"));
//   } catch (error) {
//     next(error);
//   }
// });



// export const profitLossReport = asyncHandler(async (req, res, next) => {

//   try {
//     const { fromDate, toDate } = req.query;
    
//     // Validate date inputs
//     const startDate = new Date(fromDate);
//     const endDate = new Date(toDate);
    
//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid date range provided'
//       });
//     }

//     // Fetch all purchases within date range
//     const purchases = await Purchase.find({
//       purchaseDate: {
//         $gte: startDate,
//         $lte: endDate
//       }
//     }).populate('stockId');

//     // Fetch all sales within date range
//     const sales = await Sell.find({
//       salesDate: {
//         $gte: startDate,
//         $lte: endDate
//       }
//     }).populate('stockId');

//     // Create a map to store daily transactions
//     const dailyTransactions = new Map();

//     // Process purchases
//     purchases.forEach(purchase => {
//       const dateKey = purchase.purchaseDate.toISOString().split('T')[0];
//       if (!dailyTransactions.has(dateKey)) {
//         dailyTransactions.set(dateKey, []);
//       }
      
//       dailyTransactions.get(dateKey).push({
//         date: purchase.purchaseDate,
//         stockId: purchase.stockId._id,
//         stockName: purchase.stockId.stockName, // Assuming StockMaster has a name field
//         transactionType: 'Purchase',
//         quantity: purchase.stockQty,
//         price: purchase.stockPurchasePrice,
//         total: purchase.netTotal,
//         profitLoss: 0
//       });
//     });

//     // Process sales
//     sales.forEach(sale => {
//       const dateKey = sale.salesDate.toISOString().split('T')[0];
//       if (!dailyTransactions.has(dateKey)) {
//         dailyTransactions.set(dateKey, []);
//       }

//       // Find matching purchase for calculating profit/loss
//       const matchingPurchase = purchases.find(p => 
//         p.stockId._id.toString() === sale.stockId._id.toString() &&
//         p.purchaseDate <= sale.salesDate
//       );

//       const costBasis = matchingPurchase ? matchingPurchase.stockPurchasePrice : 0;
//       const profitLoss = (sale.stockSoldPrice - costBasis) * sale.stockQty;

//       dailyTransactions.get(dateKey).push({
//         date: sale.salesDate,
//         stockId: sale.stockId._id,
//         stockName: sale.stockId.stockName,
//         transactionType: 'Sale',
//         quantity: sale.stockQty,
//         price: sale.stockSoldPrice,
//         total: sale.netTotal,
//         profitLoss: profitLoss
//       });
//     });

//     // Convert map to array and sort by date
//     const report = Array.from(dailyTransactions.entries())
//       .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
//       .map(([date, transactions]) => ({
//         date,
//         transactions: transactions.sort((a, b) => a.stockName.localeCompare(b.stockName))
//       }));

//     // Calculate summary statistics
//     const summary = {
//       totalPurchases: purchases.reduce((sum, p) => sum + p.netTotal, 0),
//       totalSales: sales.reduce((sum, s) => sum + s.netTotal, 0),
//       totalProfitLoss: report.reduce((sum, day) => 
//         sum + day.transactions.reduce((daySum, t) => daySum + t.profitLoss, 0), 0
//       ),
//       totalTransactions: purchases.length + sales.length
//     };

//     return res.status(200).json({
//       success: true,
//       data: {
//         report,
//         summary
//       }
//     });

//   } catch (error) {
//     console.error('Error generating profit/loss report:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error generating profit/loss report',
//       error: error.message
//     });
//   }
// });

// export const profitLossReport = asyncHandler(async (req, res, next) => {
//   try {
//     console.log('Profit/Loss report requested');

//     const { startDate, endDate } = req.query;

//     // Validate date parameters
//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         statusCode: 400,
//         message: "Start date and end date are required",
//       });
//     }

//     // Create date range filter
//     const dateFilter = {
//       purchaseDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//     };
//     const querySalesDate = {
//       salesDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//     };

//     // Fetch purchases and sells within date range
//     const purchases = await Purchase.find(dateFilter).lean();
//     const sells = await Sell.find(querySalesDate).lean();

//     console.log('Purchases:', purchases);
//     console.log('Sells:', sells);

//     const report = [];
//     const groupedByStock = {};

//     // Process purchases
//     purchases.forEach((purchase) => {
//       const {
//         stockId,
//         purchaseDate,
//         stockQty,
//         stockPurchasePrice,
//         scriptName,
//       } = purchase;

//       const netAmount = stockQty * stockPurchasePrice;

//       // Add to grouped data
//       if (!groupedByStock[stockId]) {
//         groupedByStock[stockId] = {
//           scriptName,
//           buyQty: 0,
//           sellQty: 0,
//           buyTurnover: 0,
//           sellTurnover: 0,
//           profitLoss: 0,
//           avgPurchasePrice: 0,
//         };
//       }
//       groupedByStock[stockId].buyQty += stockQty;
//       groupedByStock[stockId].buyTurnover += netAmount;
//       groupedByStock[stockId].avgPurchasePrice =
//         groupedByStock[stockId].buyTurnover / groupedByStock[stockId].buyQty;

//       // Add to report
//       report.push({
//         stockId,
//         scriptName,
//         date: purchaseDate,
//         type: "BUY",
//         buyQty: stockQty,
//         sellQty: 0,
//         rate: stockPurchasePrice,
//         netAmount: parseFloat(netAmount.toFixed(2)),
//         profitLoss: 0,
//       });
//     });

//     // Process sells
//     sells.forEach((sell) => {
//       const {
//         stockId,
//         salesDate,
//         stockQty,
//         stockSoldPrice,
//         scriptName,
//       } = sell;

//       const netAmount = stockQty * stockSoldPrice;

//       // Calculate Profit/Loss
//       const avgPurchasePrice =
//         groupedByStock[stockId]?.avgPurchasePrice || 0;
//       const profitLoss = (stockSoldPrice - avgPurchasePrice) * stockQty;

//       // Update grouped data
//       if (!groupedByStock[stockId]) {
//         groupedByStock[stockId] = {
//           scriptName,
//           buyQty: 0,
//           sellQty: 0,
//           buyTurnover: 0,
//           sellTurnover: 0,
//           profitLoss: 0,
//         };
//       }
//       groupedByStock[stockId].sellQty += stockQty;
//       groupedByStock[stockId].sellTurnover += netAmount;
//       groupedByStock[stockId].profitLoss += profitLoss;

//       // Add to report
//       report.push({
//         stockId,
//         scriptName,
//         date: salesDate,
//         type: "SELL",
//         buyQty: 0,
//         sellQty: stockQty,
//         rate: stockSoldPrice,
//         netAmount: parseFloat(netAmount.toFixed(2)),
//         profitLoss: parseFloat(profitLoss.toFixed(2)),
//       });
//     });

//     // Calculate summary statistics
//     const summary = {
//       totalBuyQty: 0,
//       totalSellQty: 0,
//       totalBuyTurnover: 0,
//       totalSellTurnover: 0,
//       totalProfitLoss: 0,
//     };

//     // Add script-wise totals and update summary
//     Object.keys(groupedByStock).forEach((stockId) => {
//       const stockData = groupedByStock[stockId];

//       report.push({
//         stockId,
//         scriptName: stockData.scriptName,
//         type: "TOTAL",
//         date: null,
//         buyQty: stockData.buyQty,
//         sellQty: stockData.sellQty,
//         rate: null,
//         netAmount: parseFloat((stockData.buyTurnover - stockData.sellTurnover).toFixed(2)),
//         profitLoss: parseFloat(stockData.profitLoss.toFixed(2)),
//       });

//       // Update summary
//       summary.totalBuyQty += stockData.buyQty;
//       summary.totalSellQty += stockData.sellQty;
//       summary.totalBuyTurnover += stockData.buyTurnover;
//       summary.totalSellTurnover += stockData.sellTurnover;
//       summary.totalProfitLoss += stockData.profitLoss;
//     });

//     // Format numbers in summary
//     Object.keys(summary).forEach((key) => {
//       if (typeof summary[key] === "number") {
//         summary[key] = parseFloat(summary[key].toFixed(2));
//       }
//     });

//     // Sort report by date (newest first) and put TOTALs at the end
//     const sortedReport = report.sort((a, b) => {
//       if (a.type === "TOTAL" && b.type !== "TOTAL") return 1;
//       if (a.type !== "TOTAL" && b.type === "TOTAL") return -1;
//       if (!a.date || !b.date) return 0;
//       return new Date(b.date) - new Date(a.date);
//     });

//     res.json({
//       statusCode: 200,
//       message: "Report generated successfully",
//       data: sortedReport,
//       summary,
//     });
//   } catch (error) {
//     console.error("Error generating profit/loss report:", error);
//     res.status(500).json({
//       statusCode: 500,
//       message: "Failed to generate report",
//       error: error.message,
//     });
//   }
// });

// last working
// export const profitLossReport = asyncHandler(async (req, res, next) => {
//   try {
//     console.log('Profit/Loss report requested');

//     const { startDate, endDate } = req.query;

//     // Validate date parameters
//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         statusCode: 400,
//         message: "Start date and end date are required",
//       });
//     }

  
//     // Create date range filter
//     const dateFilter = {
//       purchaseDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//     };
//     const querySalesDate = {
//       salesDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//     };

//     // Fetch purchases and sells within date range
//     const purchases = await Purchase.find(dateFilter).lean().populate('stockId');
//     const sells = await Sell.find(querySalesDate).lean().populate('stockId');

//     console.log('Purchases:', purchases);
//     console.log('Sells:', sells);
//     const report = [];
//     const groupedByStock = {};

//     // Process purchases
//     purchases.forEach((purchase) => {
//       const {
//         stockId,
//         purchaseDate,
//         stockQty,
//         stockPurchasePrice,
//         scriptName, // Assuming you have script name in the purchase model
//       } = purchase;

//       const netAmount = stockQty * stockPurchasePrice;

//       report.push({
//         stockId: stockId.stockName,
//         scriptName,
//         date: purchaseDate.toISOString().split('T')[0],
//         type: "BUY",
//         buyQty: stockQty,
//         sellQty: 0,
//         rate: stockPurchasePrice,
//         netAmount: parseFloat(netAmount.toFixed(2)),
//         profitLoss: 0,
//       });

//       // Group by stock
//       if (!groupedByStock[stockId._id]) {
//         groupedByStock[stockId._id] = {
//           scriptName,
//           buyQty: 0,
//           sellQty: 0,
//           buyTurnover: 0,
//           sellTurnover: 0,
//           profitLoss: 0,
//         };
//       }
//       groupedByStock[stockId._id].buyQty += stockQty;
//       groupedByStock[stockId._id].buyTurnover += netAmount;
//     });

//     // Process sells
//     sells.forEach((sell) => {
//       const {
//         stockId,
//         salesDate,
//         stockQty,
//         stockSoldPrice,
//         scriptName,
//       } = sell;

//       const netAmount = stockQty * stockSoldPrice;

//       // Calculate Profit/Loss based on average purchase price
//       const avgPurchasePrice =
//         groupedByStock[stockId._id]?.buyTurnover / groupedByStock[stockId._id]?.buyQty || 0;
//       const profitLoss = (stockSoldPrice - avgPurchasePrice) * stockQty;

//       report.push({
//         stockId: stockId.stockName,
//         scriptName,
//         date: salesDate.toISOString().split('T')[0],
//         type: "SELL",
//         buyQty: 0,
//         sellQty: stockQty,
//         rate: stockSoldPrice,
//         netAmount: parseFloat(netAmount.toFixed(2)),
//         profitLoss: parseFloat(profitLoss.toFixed(2)),
//       });

//       // Update grouped data
//       groupedByStock[stockId._id].sellQty += stockQty;
//       groupedByStock[stockId._id].sellTurnover += netAmount;
//       groupedByStock[stockId._id].profitLoss += profitLoss;
//     });

//     // Calculate summary statistics
//     const summary = {
//       totalBuyQty: 0,
//       totalSellQty: 0,
//       totalBuyTurnover: 0,
//       totalSellTurnover: 0,
//       totalProfitLoss: 0,
//     };

//     // Add script-wise totals and update summary
//     Object.keys(groupedByStock).forEach((stockId) => {
//       const stockData = groupedByStock[stockId];
      
//       report.push({
//         stockId: "",
//         scriptName: stockData.scriptName,
//         type: "TOTAL",
//         date: "",
//         buyQty: stockData.buyQty,
//         sellQty: stockData.sellQty,
//         rate: null,
//         netAmount: parseFloat((stockData.buyTurnover - stockData.sellTurnover).toFixed(2)),
//         profitLoss: parseFloat(stockData.profitLoss.toFixed(2)),
//       });

//       // Update summary
//       summary.totalBuyQty += stockData.buyQty;
//       summary.totalSellQty += stockData.sellQty;
//       summary.totalBuyTurnover += stockData.buyTurnover;
//       summary.totalSellTurnover += stockData.sellTurnover;
//       summary.totalProfitLoss += stockData.profitLoss;
//     });

//     // Format numbers in summary
//     Object.keys(summary).forEach(key => {
//       if (typeof summary[key] === 'number') {
//         summary[key] = parseFloat(summary[key].toFixed(2));
//       }
//     });

//     // Sort report by date (newest first) and put TOTALs at the end
//     const sortedReport = report.sort((a, b) => {
//       if (a.type === 'TOTAL' && b.type !== 'TOTAL') return 1;
//       if (a.type !== 'TOTAL' && b.type === 'TOTAL') return -1;
//       if (!a.date || !b.date) return 0;
//       return new Date(b.date) - new Date(a.date);
//     });

//     res.json({
//       statusCode: 200,
//       message: "Report generated successfully",
//       data: sortedReport,
//       summary: summary,
//     });

//   } catch (error) {
//     console.error('Error generating profit/loss report:', error);
//     res.status(500).json({
//       statusCode: 500,
//       message: "Failed to generate report",
//       error: error.message,
//     });
//   }
// })
// try {
//   const purchases = await Purchase.find().lean();
//   const sells = await Sell.find().lean();

//   const report = [];
//   const groupedByStock = {};

//   // Process purchases
//   purchases.forEach((purchase) => {
//     const { stockId, purchaseDate, stockQty, stockSoldPrice } = purchase;
//     const netAmount = stockQty * stockPurchasePrice;

//     report.push({
//       stockId,
//       date: purchaseDate,
//       type: "BUY",
//       buyQty: stockQty,
//       sellQty: 0,
//       rate: stockPurchasePrice,
//       netAmount,
//       profitLoss: 0,
//     });

//     // Group by stock
//     if (!groupedByStock[stockId]) {
//       groupedByStock[stockId] = { buyQty: 0, sellQty: 0, buyTurnover: 0, sellTurnover: 0, profitLoss: 0 };
//     }
//     groupedByStock[stockId].buyQty += stockQty;
//     groupedByStock[stockId].buyTurnover += netAmount;
//   });

//   // Process sells
//   sells.forEach((sell) => {
//     const { stockId, purchaseDate, stockQty, stockPurchasePrice } = sell;
//     const netAmount = stockQty * stockPurchasePrice;

//     // Calculate Profit/Loss (example: sell price - avg purchase price)
//     const avgPurchasePrice = groupedByStock[stockId]?.buyTurnover / groupedByStock[stockId]?.buyQty || 0;
//     const profitLoss = (stockPurchasePrice - avgPurchasePrice) * stockQty;

//     report.push({
//       stockId,
//       date: purchaseDate,
//       type: "SELL",
//       buyQty: 0,
//       sellQty: stockQty,
//       rate: stockPurchasePrice,
//       netAmount,
//       profitLoss,
//     });

//     // Update grouped data
//     groupedByStock[stockId].sellQty += stockQty;
//     groupedByStock[stockId].sellTurnover += netAmount;
//     groupedByStock[stockId].profitLoss += profitLoss;
//   });

//   // Add script-wise totals to report
//   Object.keys(groupedByStock).forEach((stockId) => {
//     const stockData = groupedByStock[stockId];
//     report.push({
//       stockId,
//       type: "TOTAL",
//       buyQty: stockData.buyQty,
//       sellQty: stockData.sellQty,
//       buyTurnover: stockData.buyTurnover,
//       sellTurnover: stockData.sellTurnover,
//       profitLoss: stockData.profitLoss,
//     });
//   });

//   res.json(report);
// } catch (error) {
//   res.status(500).json({ error: error.message });
// }



// export const profitLossReport = asyncHandler(async (req, res, next) => {
//   try {
//     const { startDate, endDate } = req.query;

//     // Validate date parameters
//     if (!startDate || !endDate) {
//       return res.status(400).json(
//         new ApiError(400, "Start date and end date are required")
//       );
//     }

//     // Date filters
//     const dateFilter = {
//       purchaseDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//       createdBy: req.user._id
//     };

//     const salesDateFilter = {
//       salesDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//       createdBy: req.user._id
//     };

//     // Fetch data with populated stock details
//     const [purchases, sells, inventoryCFBF] = await Promise.all([
//       Purchase.find(dateFilter).lean().populate('stockId'),
//       Sell.find(salesDateFilter).lean().populate('stockId'),
//       InventoryCFBFModel.find({
//         $or: [
//           { cFDate: { $gte: startDate, $lte: endDate } },
//           { bFDate: { $gte: startDate, $lte: endDate } }
//         ],
//         createdBy: req.user._id
//       }).lean().populate('stockId')
//     ]);

//     // Initialize stock-wise report object
//     const stockReport = {};

//     // Process brought forward entries
//     inventoryCFBF.forEach(entry => {
//       const stockKey = entry.stockId._id.toString();
//       if (!stockReport[stockKey]) {
//         initializeStockReport(stockReport, stockKey, entry.stockId.stockName);
//       }
      
//       if (entry.bFDate) {
//         stockReport[stockKey].openingBalance += entry.stockQty;
//         stockReport[stockKey].openingValue += entry.amount;
//       }
//     });

//     // Process purchases
//     purchases.forEach(purchase => {
//       const stockKey = purchase.stockId._id.toString();
//       if (!stockReport[stockKey]) {
//         initializeStockReport(stockReport, stockKey, purchase.stockId.stockName);
//       }

//       const report = stockReport[stockKey];
//       report.totalPurchaseQty += purchase.stockQty;
//       report.totalPurchaseValue += purchase.stockQty * purchase.stockPurchasePrice;
//       report.transactions.push({
//         date: purchase.purchaseDate,
//         type: 'Purchase',
//         quantity: purchase.stockQty,
//         rate: purchase.stockPurchasePrice,
//         value: purchase.stockQty * purchase.stockPurchasePrice
//       });
//     });

//     // Process sales
//     sells.forEach(sell => {
//       const stockKey = sell.stockId._id.toString();
//       if (!stockReport[stockKey]) {
//         initializeStockReport(stockReport, stockKey, sell.stockId.stockName);
//       }

//       const report = stockReport[stockKey];
//       report.totalSaleQty += sell.stockQty;
//       report.totalSaleValue += sell.stockQty * sell.stockSoldPrice;
//       report.transactions.push({
//         date: sell.salesDate,
//         type: 'Sale',
//         quantity: sell.stockQty,
//         rate: sell.stockSoldPrice,
//         value: sell.stockQty * sell.stockSoldPrice
//       });
//     });

//     // Process carry forward entries
//     inventoryCFBF.forEach(entry => {
//       const stockKey = entry.stockId._id.toString();
//       if (entry.cFDate) {
//         stockReport[stockKey].closingBalance += entry.stockQty;
//         stockReport[stockKey].closingValue += entry.amount;
//       }
//     });

//     // Calculate final metrics for each stock
//     const finalReport = Object.values(stockReport).map(stock => {
//       // Calculate averages
//       stock.avgPurchaseRate = stock.totalPurchaseQty > 0 
//         ? (stock.totalPurchaseValue / stock.totalPurchaseQty).toFixed(2) 
//         : 0;
      
//       stock.avgSaleRate = stock.totalSaleQty > 0 
//         ? (stock.totalSaleValue / stock.totalSaleQty).toFixed(2) 
//         : 0;

//       // Calculate profit/loss
//       stock.profitLoss = (stock.totalSaleValue - 
//         ((stock.totalSaleQty * stock.totalPurchaseValue) / stock.totalPurchaseQty)).toFixed(2);

//       // Calculate turnover
//       stock.turnover = ((stock.totalSaleValue / stock.totalPurchaseValue) * 100).toFixed(2);

//       // Sort transactions by date
//       stock.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

//       return {
//         stockName: stock.stockName,
//         openingBalance: stock.openingBalance,
//         openingValue: parseFloat(stock.openingValue.toFixed(2)),
//         totalPurchaseQty: stock.totalPurchaseQty,
//         totalPurchaseValue: parseFloat(stock.totalPurchaseValue.toFixed(2)),
//         avgPurchaseRate: parseFloat(stock.avgPurchaseRate),
//         totalSaleQty: stock.totalSaleQty,
//         totalSaleValue: parseFloat(stock.totalSaleValue.toFixed(2)),
//         avgSaleRate: parseFloat(stock.avgSaleRate),
//         closingBalance: stock.closingBalance,
//         closingValue: parseFloat(stock.closingValue.toFixed(2)),
//         profitLoss: parseFloat(stock.profitLoss),
//         turnover: parseFloat(stock.turnover),
//         transactions: stock.transactions
//       };
//     });

//     // Calculate summary
//     const summary = calculateSummary(finalReport);

//     return res.status(200).json(
//       new ApiResponse(200, {
//         report: finalReport,
//         summary: summary
//       }, "Profit/Loss report generated successfully")
//     );

//   } catch (error) {
//     next(error);
//   }
// });

// // Helper function to initialize stock report object
// function initializeStockReport(stockReport, stockKey, stockName) {
//   stockReport[stockKey] = {
//     stockName,
//     openingBalance: 0,
//     openingValue: 0,
//     totalPurchaseQty: 0,
//     totalPurchaseValue: 0,
//     totalSaleQty: 0,
//     totalSaleValue: 0,
//     closingBalance: 0,
//     closingValue: 0,
//     transactions: []
//   };
// }

// // Helper function to calculate summary
// function calculateSummary(report) {
//   return report.reduce((acc, stock) => {
//     return {
//       totalOpeningBalance: (acc.totalOpeningBalance || 0) + stock.openingBalance,
//       totalOpeningValue: (acc.totalOpeningValue || 0) + stock.openingValue,
//       totalPurchaseQty: (acc.totalPurchaseQty || 0) + stock.totalPurchaseQty,
//       totalPurchaseValue: (acc.totalPurchaseValue || 0) + stock.totalPurchaseValue,
//       totalSaleQty: (acc.totalSaleQty || 0) + stock.totalSaleQty,
//       totalSaleValue: (acc.totalSaleValue || 0) + stock.totalSaleValue,
//       totalClosingBalance: (acc.totalClosingBalance || 0) + stock.closingBalance,
//       totalClosingValue: (acc.totalClosingValue || 0) + stock.closingValue,
//       totalProfitLoss: (acc.totalProfitLoss || 0) + stock.profitLoss
//     };
//   }, {});
// }

export const profitLossReport = asyncHandler(async (req, res, next) => {
  try {
    console.log("Profit/Loss report requested");

    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        statusCode: 400,
        message: "Start date and end date are required",
      });
    }

    // Create date range filter for purchases and sales
    const dateFilter = {
      purchaseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      createdBy: req.user._id,
    };

    const salesDateFilter = {
      salesDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      createdBy: req.user._id,
    };

    // Fetch purchases, sells, and carry-forward data
    const purchases = await Purchase.find(dateFilter).lean().populate("stockId");
    const sells = await Sell.find(salesDateFilter).lean().populate("stockId");
    const carryForwardRecords = await InventoryCFBFModel.find({
      createdBy: req.user._id,
      cFDate: { $lte: new Date(endDate) }, // Include carry-forwards up to the end date
    }).populate("stockId");

    // Initialize object to store stock-wise data
    const stockReport = {};

    // Process purchases
    purchases.forEach((purchase) => {
      const { stockId, stockQty, stockPurchasePrice } = purchase;
      const stockKey = stockId._id;

      if (!stockReport[stockKey]) {
        stockReport[stockKey] = {
          stockName: stockId.stockName,
          totalBuyQty: 0,
          totalSellQty: 0,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          remingStock: 0,
          carryForwardPrice: 0,
          netAmount: 0,
          profitLoss: 0,
        };
      }

      stockReport[stockKey].totalBuyQty += stockQty;
      stockReport[stockKey].totalBuyAmount += stockQty * stockPurchasePrice;
    });

    // Process carry-forward records
    carryForwardRecords.forEach((cfRecord) => {
      const { stockId, amount } = cfRecord;
      const stockKey = stockId._id;

      if (!stockReport[stockKey]) {
        stockReport[stockKey] = {
          stockName: stockId.stockName,
          totalBuyQty: 0,
          totalSellQty: 0,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          avgBuyPrice: 0,
          avgSellPrice: 0,
          remingStock: 0,
          carryForwardPrice: 0,
          netAmount: 0,
          profitLoss: 0,
        };
      }

      // Add carry-forward amount
      stockReport[stockKey].carryForwardPrice += amount;
    });

    // Calculate average buy price for each stock
    Object.values(stockReport).forEach((stock) => {
      stock.avgBuyPrice =
        stock.totalBuyQty > 0
          ? parseFloat((stock.totalBuyAmount / stock.totalBuyQty).toFixed(2))
          : 0;
    });

    // Process sells
    sells.forEach((sell) => {
      const { stockId, stockQty, stockSoldPrice } = sell;
      const stockKey = stockId._id.toString();

      if (stockReport[stockKey]) {
        stockReport[stockKey].totalSellQty += stockQty;
        stockReport[stockKey].totalSellAmount += stockQty * stockSoldPrice;
      }
    });

    // Calculate final metrics for each stock
    const finalReport = Object.values(stockReport).map((stock) => {
      // Calculate average sell price
      stock.avgSellPrice =
        stock.totalSellQty > 0
          ? parseFloat((stock.totalSellAmount / stock.totalSellQty).toFixed(2))
          : 0;

      // Calculate remaining stock
      stock.remingStock = stock.totalBuyQty - stock.totalSellQty;

      // Calculate net amount (total buy amount - total sell amount)
      stock.netAmount = parseFloat(
        (stock.totalBuyAmount - stock.totalSellAmount).toFixed(2)
      );

      // Calculate profit/loss
      stock.profitLoss = parseFloat(
        (
          stock.avgSellPrice * stock.totalSellQty -
          stock.avgBuyPrice * stock.totalSellQty
        ).toFixed(2)
      );

      // Format amounts
      stock.totalBuyAmount = parseFloat(stock.totalBuyAmount.toFixed(2));
      stock.totalSellAmount = parseFloat(stock.totalSellAmount.toFixed(2));

      return {
        stockName: stock.stockName,
        totalBuyQty: stock.totalBuyQty,
        totalSellQty: stock.totalSellQty,
        avgBuyPrice: stock.avgBuyPrice,
        avgSellPrice: stock.avgSellPrice,
        buyAmount: stock.totalBuyAmount,
        sellAmount: stock.totalSellAmount,
        remingStock: stock.remingStock,
        carryForwardPrice: parseFloat(stock.carryForwardPrice.toFixed(2)), // Include carry forward price
        netAmount: stock.netAmount,
        profitLoss: stock.profitLoss,
      };
    });

    // Calculate overall summary
    const summary = finalReport.reduce(
      (acc, stock) => {
        return {
          totalBuyQty: acc.totalBuyQty + stock.totalBuyQty,
          totalSellQty: acc.totalSellQty + stock.totalSellQty,
          totalBuyAmount: acc.totalBuyAmount + stock.buyAmount,
          totalSellAmount: acc.totalSellAmount + stock.sellAmount,
          totalCarryForwardPrice:
            acc.totalCarryForwardPrice + stock.carryForwardPrice,
          totalProfitLoss: acc.totalProfitLoss + stock.profitLoss,
        };
      },
      {
        totalBuyQty: 0,
        totalSellQty: 0,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        totalCarryForwardPrice: 0,
        totalProfitLoss: 0,
      }
    );

    // Format summary numbers
    Object.keys(summary).forEach((key) => {
      if (typeof summary[key] === "number") {
        summary[key] = parseFloat(summary[key].toFixed(2));
      }
    });

    res.json({
      statusCode: 200,
      message: "Report generated successfully",
      data: finalReport,
      summary: summary,
    });
  } catch (error) {
    console.error("Error generating profit/loss report:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to generate report",
      error: error.message,
    });
  }
});


// export const profitLossReport = asyncHandler(async (req, res, next) => {
//   try {
//     console.log('Profit/Loss report requested');

//     const { startDate, endDate } = req.query;

//     // Validate date parameters
//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         statusCode: 400,
//         message: "Start date and end date are required",
//       });
//     }

//     // Create date range filter
//     const dateFilter = {
//       purchaseDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//       createdBy: req.user._id
//     };
//     const querySalesDate = {
//       salesDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       },
//       createdBy: req.user._id

//     };

//     // Fetch purchases and sells within date range
//     const purchases = await Purchase.find(dateFilter).lean().populate('stockId');
//     const sells = await Sell.find(querySalesDate).lean().populate('stockId');

//     // Initialize object to store stock-wise data
//     const stockReport = {};
//     // console.log('Purchases:', purchases);
//     // console.log('Sells:', sells);

//     // Process purchases
//     purchases.forEach((purchase) => {
//       const { stockId, stockQty, stockPurchasePrice } = purchase;
//       console.log('purchase',purchase)
//       const stockKey = stockId._id;

//       if (!stockReport[stockKey]) {
//         stockReport[stockKey] = {
//           stockName: stockId.stockName,
//           totalBuyQty: 0,
//           totalSellQty: 0,
//           totalBuyAmount: 0,
//           totalSellAmount: 0,
//           avgBuyPrice: 0,
//           avgSellPrice: 0,
//           remingStock: 0,
//           netAmount: 0,
//           profitLoss: 0
//         };
//       }

//       stockReport[stockKey].totalBuyQty += stockQty;
//       stockReport[stockKey].totalBuyAmount += stockQty * stockPurchasePrice;
//     });

//     // Calculate average buy price for each stock
//     Object.values(stockReport).forEach(stock => {
//       stock.avgBuyPrice = stock.totalBuyQty > 0 
//         ? parseFloat((stock.totalBuyAmount / stock.totalBuyQty).toFixed(2))
//         : 0;
//     });

//     // Process sells
//     sells.forEach((sell) => {
//       const { stockId, stockQty, stockSoldPrice } = sell;
//       const stockKey = stockId._id.toString();

//       if (stockReport[stockKey]) {
//         stockReport[stockKey].totalSellQty += stockQty;
//         stockReport[stockKey].totalSellAmount += stockQty * stockSoldPrice;
//       }
//     });

//     // Calculate final metrics for each stock
//     const finalReport = Object.values(stockReport).map(stock => {
//       // Calculate average sell price
//       stock.avgSellPrice = stock.totalSellQty > 0
//         ? parseFloat((stock.totalSellAmount / stock.totalSellQty).toFixed(2))
//         : 0;

//       // Calculate remaining stock
//       stock.remingStock = stock.totalBuyQty - stock.totalSellQty;

//       // Calculate net amount (total buy amount - total sell amount)
//       stock.netAmount = parseFloat((stock.totalBuyAmount - stock.totalSellAmount).toFixed(2));

//       // Calculate profit/loss
//       stock.profitLoss = parseFloat(
//         (stock.avgSellPrice * stock.totalSellQty - stock.avgBuyPrice * stock.totalSellQty).toFixed(2)
//       );

//       // Format amounts
//       stock.totalBuyAmount = parseFloat(stock.totalBuyAmount.toFixed(2));
//       stock.totalSellAmount = parseFloat(stock.totalSellAmount.toFixed(2));

//       return {
//         stockName: stock.stockName,
//         totalBuyQty: stock.totalBuyQty,
//         totalSellQty: stock.totalSellQty,
//         avgBuyPrice: stock.avgBuyPrice,
//         avgSellPrice: stock.avgSellPrice,
//         buyAmount: stock.totalBuyAmount,
//         sellAmount: stock.totalSellAmount,
//         remingStock: stock.remingStock,
//         carryFowardPrice: // to be calcuate 
//         netAmount: stock.netAmount,
//         profitLoss: stock.profitLoss
//       };
//     });

//     // Calculate overall summary
//     const summary = finalReport.reduce((acc, stock) => {
//       return {
//         totalBuyQty: acc.totalBuyQty + stock.totalBuyQty,
//         totalSellQty: acc.totalSellQty + stock.totalSellQty,
//         totalBuyAmount: acc.totalBuyAmount + stock.buyAmount,
//         totalSellAmount: acc.totalSellAmount + stock.sellAmount,
//         totalProfitLoss: acc.totalProfitLoss + stock.profitLoss
//       };
//     }, {
//       totalBuyQty: 0,
//       totalSellQty: 0,
//       totalBuyAmount: 0,
//       totalSellAmount: 0,
//       totalProfitLoss: 0
//     });

//     // Format summary numbers
//     Object.keys(summary).forEach(key => {
//       if (typeof summary[key] === 'number') {
//         summary[key] = parseFloat(summary[key].toFixed(2));
//       }
//     });

//     res.json({
//       statusCode: 200,
//       message: "Report generated successfully",
//       data: finalReport,
//       summary: summary
//     });

//   } catch (error) {
//     console.error('Error generating profit/loss report:', error);
//     res.status(500).json({
//       statusCode: 500,
//       message: "Failed to generate report",
//       error: error.message
//     });
//   }
// });

export default router;
