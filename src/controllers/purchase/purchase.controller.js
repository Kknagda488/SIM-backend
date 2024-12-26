import express from "express";
import mongoose from "mongoose";
import Purchase from "../../models/purchase/Purchase.model.js";
import StockInventory from "../../models/stock/StockInventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Sell from "../../models/sell/Sell.model.js";

const router = express.Router();

// POST: Create a new purchase

// export const createPurchase = asyncHandler(async (req, res, next) => {
//   try {
//     const { stockId, stockQty, stockPurchasePrice, remarks } = req.body;

//     if (!stockId || !stockQty || !stockPurchasePrice) {
//       return res.status(400).json(new ApiError(400, "All required fields must be provided"));
//     }

//     let isAvilabelStock = await StockInventory.findOne({ stockId });
//     if(isAvilabelStock){
       
//     }
//     const newPurchase = new Purchase({
//       stockId,
//       purchaseDate: new Date(),
//       createdBy: req.user._id,
//       stockQty,
//       stockPurchasePrice,
//       remarks,
//       netTotal: stockQty * stockPurchasePrice,
//     });

//     const savedPurchase = await newPurchase.save();

//     const newInventory = new StockInventory({
//       transactionId: savedPurchase._id,
//       transactionType: "Purchase",
//       stockId,
//       date: new Date(),
//       totalPurchased: stockQty,
//       remaining: stockQty,
//     });

//     await newInventory.save();

//     return res
//       .status(201)
//       .json(new ApiResponse(201, savedPurchase, "Purchase created successfully"));
//   } catch (error) {
//     next(error);
//   }
// });

export const createPurchase = asyncHandler(async (req, res, next) => {
  try {
    const { stockId, stockQty,purchaseDate, stockPurchasePrice, remarks } = req.body;

    // Validate required fields
    if (!stockId || !stockQty || !stockPurchasePrice) {
      return res.status(400).json(new ApiError(400, "All required fields must be provided"));
    }

    // Create a new purchase
    const newPurchase = new Purchase({
      stockId,
      purchaseDate,
      createdBy: req.user._id,
      stockQty,
      stockPurchasePrice,
      remarks,
      netTotal: stockQty * stockPurchasePrice,
    });

    const savedPurchase = await newPurchase.save();

    // Check if the stockId exists in inventory
    let existingInventory = await StockInventory.findOne({ stockId });

    if (existingInventory) {
      // Update existing inventory
      existingInventory.totalPurchased += parseInt(stockQty);
      existingInventory.remaining += parseInt(stockQty);

      // Optional: Update transactionId or other fields if required
      // existingInventory.lastTransactionId = savedPurchase._id;
      // existingInventory.lastUpdated = new Date();

      await existingInventory.save();
    } else {
      // Create new inventory entry
      const newInventory = new StockInventory({
        transactionId: savedPurchase._id,
        transactionType: "Purchase",
        stockId,
        date: new Date(),
        totalPurchased: stockQty,
        remaining: stockQty,
      });

      await newInventory.save();
    }

    return res
      .status(201)
      .json(new ApiResponse(201, savedPurchase, "Purchase created and inventory updated successfully"));
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


export const inventoryList = asyncHandler(async (req, res, next) => {
  try {
    // Correctly find purchases by user ID and populate stockId field
    const inventory = await StockInventory.find({ remaining: { $gt: 0 } }).populate("stockId");


    // Handle case when no sells are found
    if (!inventory || inventory.length === 0) {
      return res.status(404).json(new ApiError(404, "No inventory found"));
    }

    // Map sells and include relevant fields
    const formattedInventory = inventory.map((stock) => ({
      id: stock._id,
      stockName: stock.stockId?.stockName,    
      stockQty: stock.remaining,
      stockId: stock.stockId?._id// Use optional chaining for safety
    }));

    // Return the formatted response
    return res
      .status(200)
      .json(new ApiResponse(200, formattedInventory, "Inventory retrieved successfully"));
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
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
export const updatePurchase = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const {  stockQty, stockPurchasePrice, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid purchase ID"));
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json(new ApiError(404, "Purchase not found"));
    }

    const originalQty = purchase.stockQty;
    purchase.stockId = purchase.stockId;
    purchase.stockQty = stockQty || purchase.stockQty;
    purchase.stockPurchasePrice = stockPurchasePrice || purchase.stockPurchasePrice;
    purchase.remarks = remarks || purchase.remarks;
    purchase.netTotal = purchase.stockQty * purchase.stockPurchasePrice;

    const updatedPurchase = await purchase.save();

    const inventory = await StockInventory.findOne({ stockId: purchase.stockId });
    if (inventory) {
      inventory.totalPurchased = updatedPurchase.stockQty;
      inventory.remaining += (updatedPurchase.stockQty - originalQty);
      await inventory.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedPurchase, "Purchase updated successfully"));
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

    // Find the purchase to delete
    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json(new ApiError(404, "Purchase not found"));
    }

    const { stockId, stockQty } = purchase;

    // Delete the purchase
    await purchase.deleteOne();

    // Update stock inventory
    const inventory = await StockInventory.findOne({ stockId });
    if (inventory) {
      inventory.totalPurchased -= stockQty;
      inventory.remaining -= stockQty;

      // Ensure remaining stock is not negative
      if (inventory.remaining < 0) {
        inventory.remaining = 0;
      }

      await inventory.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Purchase deleted successfully"));
  } catch (error) {
    next(error);
  }
});



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


export const profitLossReport = asyncHandler(async (req, res, next) => {
  try {
    console.log('Profit/Loss report requested');

    const { startDate, endDate } = req.query;

    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        statusCode: 400,
        message: "Start date and end date are required",
      });
    }

    // {
    //   stockName: "Apple Inc.",
    //   date: "2021-09-01",
    //   type: "BUY/SELL",
    //   buyQty: 100,
    //   buyprice: 120,
    //   avgByPrice: 120,
    //   sellQty: 50,
    //   sellPrice: 130,
    //   avgSellPrice: 130,
    //   netAmount: buyQty * buyPrice - ,
    //   profitLoss: 
    // }
    // Create date range filter
    const dateFilter = {
      purchaseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
    const querySalesDate = {
      salesDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    // Fetch purchases and sells within date range
    const purchases = await Purchase.find(dateFilter).lean().populate('stockId');
    const sells = await Sell.find(querySalesDate).lean().populate('stockId');

    console.log('Purchases:', purchases);
    console.log('Sells:', sells);
    const report = [];
    const groupedByStock = {};

    // Process purchases
    purchases.forEach((purchase) => {
      const {
        stockId,
        purchaseDate,
        stockQty,
        stockPurchasePrice,
        scriptName, // Assuming you have script name in the purchase model
      } = purchase;

      const netAmount = stockQty * stockPurchasePrice;

      report.push({
        stockId: stockId.stockName,
        scriptName,
        date: purchaseDate.toISOString().split('T')[0],
        type: "BUY",
        buyQty: stockQty,
        sellQty: 0,
        rate: stockPurchasePrice,
        netAmount: parseFloat(netAmount.toFixed(2)),
        profitLoss: 0,
      });

      // Group by stock
      if (!groupedByStock[stockId._id]) {
        groupedByStock[stockId._id] = {
          scriptName,
          buyQty: 0,
          sellQty: 0,
          buyTurnover: 0,
          sellTurnover: 0,
          profitLoss: 0,
        };
      }
      groupedByStock[stockId._id].buyQty += stockQty;
      groupedByStock[stockId._id].buyTurnover += netAmount;
    });

    // Process sells
    sells.forEach((sell) => {
      const {
        stockId,
        salesDate,
        stockQty,
        stockSoldPrice,
        scriptName,
      } = sell;

      const netAmount = stockQty * stockSoldPrice;

      // Calculate Profit/Loss based on average purchase price
      const avgPurchasePrice =
        groupedByStock[stockId._id]?.buyTurnover / groupedByStock[stockId._id]?.buyQty || 0;
      const profitLoss = (stockSoldPrice - avgPurchasePrice) * stockQty;

      report.push({
        stockId: stockId.stockName,
        scriptName,
        date: salesDate.toISOString().split('T')[0],
        type: "SELL",
        buyQty: 0,
        sellQty: stockQty,
        rate: stockSoldPrice,
        netAmount: parseFloat(netAmount.toFixed(2)),
        profitLoss: parseFloat(profitLoss.toFixed(2)),
      });

      // Update grouped data
      groupedByStock[stockId._id].sellQty += stockQty;
      groupedByStock[stockId._id].sellTurnover += netAmount;
      groupedByStock[stockId._id].profitLoss += profitLoss;
    });

    // Calculate summary statistics
    const summary = {
      totalBuyQty: 0,
      totalSellQty: 0,
      totalBuyTurnover: 0,
      totalSellTurnover: 0,
      totalProfitLoss: 0,
    };

    // Add script-wise totals and update summary
    Object.keys(groupedByStock).forEach((stockId) => {
      const stockData = groupedByStock[stockId];
      
      report.push({
        stockId: "",
        scriptName: stockData.scriptName,
        type: "TOTAL",
        date: "",
        buyQty: stockData.buyQty,
        sellQty: stockData.sellQty,
        rate: null,
        netAmount: parseFloat((stockData.buyTurnover - stockData.sellTurnover).toFixed(2)),
        profitLoss: parseFloat(stockData.profitLoss.toFixed(2)),
      });

      // Update summary
      summary.totalBuyQty += stockData.buyQty;
      summary.totalSellQty += stockData.sellQty;
      summary.totalBuyTurnover += stockData.buyTurnover;
      summary.totalSellTurnover += stockData.sellTurnover;
      summary.totalProfitLoss += stockData.profitLoss;
    });

    // Format numbers in summary
    Object.keys(summary).forEach(key => {
      if (typeof summary[key] === 'number') {
        summary[key] = parseFloat(summary[key].toFixed(2));
      }
    });

    // Sort report by date (newest first) and put TOTALs at the end
    const sortedReport = report.sort((a, b) => {
      if (a.type === 'TOTAL' && b.type !== 'TOTAL') return 1;
      if (a.type !== 'TOTAL' && b.type === 'TOTAL') return -1;
      if (!a.date || !b.date) return 0;
      return new Date(b.date) - new Date(a.date);
    });

    res.json({
      statusCode: 200,
      message: "Report generated successfully",
      data: sortedReport,
      summary: summary,
    });

  } catch (error) {
    console.error('Error generating profit/loss report:', error);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to generate report",
      error: error.message,
    });
  }
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
})

export default router;
