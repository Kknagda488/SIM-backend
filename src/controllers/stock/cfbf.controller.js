import InventoryCFBF from "../../models/stock/InventoryCFBF.model.js";
import StockInventory from "../../models/stock/StockInventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import Sell from "../../models/sell/Sell.model.js";

import moment from 'moment';
import Purchase from "../../models/purchase/Purchase.model.js";

// export const getCfBfList = asyncHandler(async (req, res) => {
//     const {stockId} = req.params;
//     const cfbfRecords = await InventoryCFBF.find({stockId, createdBy: req.user._id})
//     if (!cfbfRecords) {
//         return res.status(404).json(new ApiError(404, "No CFBF records found"))
//     }
//     return res.status(200).json(new ApiResponse(200, cfbfRecords, "CFBF records fetched successfully"))
// })

export const getCfBfList = asyncHandler(async (req, res) => {
  // Fetch all stocks from inventory with remaining > 0
  const inventoryRecords = await StockInventory.find({
    remaining: { $gt: 0 }, // Only include stocks with remaining quantity
    createdBy: req.user._id,
  }).populate("stockId");

  if (!inventoryRecords.length) {
    return res
      .status(404)
      .json(new ApiError(404, "No inventory records found with remaining stock"));
  }

  // Extract all stock IDs from inventory records
  const stockIds = inventoryRecords.map((record) => record.stockId._id);

  // Fetch corresponding CFBF records for these stock IDs
  const cfbfRecords = await InventoryCFBF.find({
    stockId: { $in: stockIds },
    createdBy: req.user._id,
  });

  // Map CFBF records for quick lookup and calculate overall status
  const cfbfMap = cfbfRecords.reduce((map, record) => {
    const stockId = record.stockId.toString();
    if (!map[stockId]) {
      map[stockId] = [];
    }
    map[stockId].push(record.status);
    return map;
  }, {});

  // Prepare the consolidated response
  const response = inventoryRecords.map((inventory) => {
    const stockId = inventory.stockId._id.toString();
    const relatedStatuses = cfbfMap[stockId] || []; // Get related statuses or an empty array

    // Determine overall status: "initial" if no related statuses, otherwise include statuses
    const overallStatus = relatedStatuses.length > 0 ? relatedStatuses : ["initial"];
    console.log(overallStatus);
    return {
      stockId: inventory.stockId._id,
      stockName: inventory.stockId.stockName, // Assuming stock name is available in inventory schema
      remainingStock: inventory.remaining,
      cfbfStatus: overallStatus[overallStatus.length - 1],
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Inventory with CFBF status fetched successfully"));
});

  

// export const carryForward = asyncHandler(async (req, res) => {
//     const {items} = req.body;
//     // item = ["stockId1", `stockId2`]

//     const inventory = await StockInventory.findOne({
//         stockId,
//         remaining: { $gt: 0 },
//       });

//     if(!inventory){
//         return res.status(400).json(new ApiError(400, "No stock available to carry forward"))
//     }

//     // const carryForward = new StockInventory({
//     //     transactionId: inventory._id,
//     //     transactionType: "CFBF",
//     //     stockId,
//     //     date,
//     //     totalPurchased: 0,
//     //     totalSold: 0,
//     //     remaining: inventory.remaining,
//     //     createdBy: req.user._id
//     // })
//     const newCFBF = new InventoryCFBF({
//         stockId,
//         carryForwardDate: date,
//         totalCarriedForward: inventory.remaining,
//         remaining: inventory.remaining,
//         createdBy: req.user._id,
//     })
//     const savedCFBF = await newCFBF.save();
//     return res.status(201).json(new ApiResponse(201, savedCFBF, "CFBF record created successfully"))
// })

export const carryForward = asyncHandler(async (req, res) => {
    const { items } = req.body; // Array of stock IDs
    const userId = req.user._id; // Assumes user information is in the request object
  
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(new ApiError(400, "Items array is required and cannot be empty"));
    }
  
    const results = [];
  
    for (const stockId of items) {
      // Check for pending carry-forward status for this stock
      const existingPendingCF = await InventoryCFBF.findOne({
        stockId,
        status: "pending",
      });
  
      if (existingPendingCF) {
        results.push({
          stockId,
          status: "failed",
          message: "Carry forward already exists for this stock in pending state",
        });
        continue;
      }
  
      // Check if stock inventory exists with remaining quantity
      const inventory = await StockInventory.findOne({
        stockId,
        remaining: { $gt: 0 },
      });
  
      if (!inventory) {
        results.push({
          stockId,
          status: "failed",
          message: "No stock available to carry forward",
        });
        continue;
      }
  
      // Fetch the last sell price for the stock
      const lastSell = await Sell.findOne({ stockId })
        .sort({ salesDate: -1 }) // Get the latest sell record
        .select("stockSoldPrice");
  
      if (!lastSell) {
        results.push({
          stockId,
          status: "failed",
          message: "No sell record found for this stock",
        });
        continue;
      }
  
      // Calculate the carry-forward amount using the last sell price
      const cfAmount = lastSell.stockSoldPrice * inventory.remaining;
  
      // Create a carry-forward record
      const newCFBF = new InventoryCFBF({
        stockId,
        cFDate: new Date(),
        amount: cfAmount,
        stockQty: inventory.remaining,
        status: "pending", // Default status
        createdBy: userId,
      });
  
      try {
        const savedCFBF = await newCFBF.save();
  
        // Optionally, update stock inventory (e.g., adjust remaining stock if required)
        // inventory.remaining = 0; // Assuming all remaining stock is carried forward
        await inventory.save();
  
        results.push({
          stockId,
          status: "success",
          record: savedCFBF,
        });
      } catch (error) {
        results.push({
          stockId,
          status: "failed",
          message: error.message,
        });
      }
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, results, "Carry forward process completed"));
  });




export const broughtForward = asyncHandler(async (req, res) => {
    const {stockId}  = req.params;
    const currentDate = new Date(); // Use current date for brought forward
  
    // Validate input
    console.log(stockId)
    if (!stockId) {
      return res.status(400).json(new ApiError(400, "Stock ID is required"));
    }
  
    // Find the first record with the given stockId and empty bFDate
    const cfbfRecord = await InventoryCFBF.findOne({
      stockId,
      cFDate: { $ne: null }, // Ensure it has a carry-forward date
      bFDate: null, // Ensure it hasn't already been brought forward
    }).sort({ cFDate: 1 }); // Sort by carry forward date (optional for prioritization)
  
    if (!cfbfRecord) {
      return res
        .status(400)
        .json(new ApiError(400, "No eligible carry forward record found"));
    }
  
    // Update the carry forward record to reflect the brought forward action
    cfbfRecord.bFDate = currentDate;
    cfbfRecord.status = "complete";
  
    try {
      const updatedCFBFRecord = await cfbfRecord.save();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            updatedCFBFRecord,
            "Brought Forward successfully completed"
          )
        );
    } catch (error) {
      return res.status(500).json(new ApiError(500, error.message));
    }
  });



export const stockTransaction = asyncHandler(async (req, res) => {
  const { stockId } = req.params; // Stock ID from URL parameter
  const { fromDate, toDate } = req.query; // From and to dates from query params

  // Default to today if no date is provided
  const currentDate = new Date(); // Current date in 'YYYY-MM-DD' format
  const startDate = fromDate ? new Date(fromDate) : new Date(currentDate)
  const endDate = toDate ? new Date(toDate) : new Date(currentDate)

  // Initialize an array to collect all transactions
  let transactions = [];
  console.log(startDate, endDate)

  // Fetch purchase transactions
  const purchaseTransactions = await Purchase.find({
    stockId,
    purchaseDate: { $gte: startDate, $lte: endDate },
  });

  purchaseTransactions.forEach((purchase) => {
    transactions.push({
      dateTime: moment(purchase.purchaseDate).format('DD-MM-YYYY HH:mm:ss'),
      type: 'purchase',
      buyQty: purchase.stockQty,
      sellQty: '-',
      rate: purchase.stockPurchasePrice,
      netAmount: purchase.netTotal,
    });
  });

  // Fetch sell transactions
  const sellTransactions = await Sell.find({
    stockId,
    salesDate: { $gte: startDate, $lte: endDate },
  });

  sellTransactions.forEach((sell) => {
    transactions.push({
      dateTime: moment(sell.salesDate).format('DD-MM-YYYY HH:mm:ss'),
      type: 'sell',
      buyQty: '-',
      sellQty: sell.stockQty,
      rate: sell.stockSoldPrice,
      netAmount: sell.netTotal,
    });
  });

  // Fetch carry forward transactions
  const carryForwardTransactions = await InventoryCFBF.find({
    stockId,
    cFDate: { $gte: startDate, $lte: endDate },
  });

  carryForwardTransactions.forEach((cfbf) => {
    transactions.push({
      dateTime: moment(cfbf.cFDate).format('DD-MM-YYYY HH:mm:ss'),
      type: 'cf',
      buyQty: '-',
      sellQty: cfbf.stockQty,
      rate: '-',
      netAmount: cfbf.amount,
    });
  });

  // Fetch brought forward transactions
  const broughtForwardTransactions = await InventoryCFBF.find({
    stockId,
    bFDate: { $gte: startDate, $lte: endDate },
  });

  broughtForwardTransactions.forEach((cfbf) => {
    transactions.push({
      dateTime: moment(cfbf.bFDate).format('DD-MM-YYYY HH:mm:ss'),
      type: 'bf',
      buyQty: cfbf.stockQty,
      sellQty: '-',
      rate: '-',
      netAmount: cfbf.amount,
    });
  });

  // Sort all transactions by date
//   transactions.sort((a, b) => moment(a.dateTime, 'DD-MM-YYYY HH:mm:ss').isBefore(moment(b.dateTime, 'DD-MM-YYYY HH:mm:ss')) ? -1 : 1);

  return res.status(200).json({
    status: 200,
    message: 'Stock transactions fetched successfully',
    data: transactions,
  });
});

// export const broughtForward = asyncHandler(async (req, res) => {
//     const {stockId, date} = req.body;
//     const cfbfRecord = await InventoryCFBF.findOne({
//         stockId,
//         carryForwardDate: { $ne: null },
//       });

//     if(!cfbfRecord){
//         return res.status(400).json(new ApiError(400, "No carry forward record found"))
//     }

//     const broughtForward = new StockInventory({
//          transactionId: cfbfRecord._id,
//       transactionType: "BroughtForward",
//       stockId,
//       date,
//       totalPurchased: cfbfRecord.remaining,
//       totalSold: 0,
//       remaining: cfbfRecord.remaining,
//       createdBy,
//     })

//     await broughtForward.save();

//     // Update CFBF record
//     cfbfRecord.broughtForwardDate = date;
//     cfbfRecord.totalBroughtForward = cfbfRecord.remaining;
//     await cfbfRecord.save();
//     return res.status(201).json(new ApiResponse(201, broughtForward, "Brought Forward successfully"))
// })