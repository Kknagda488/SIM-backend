import express from 'express'
import { authMiddleware } from '../../middlewares/authMiddlewear.js'
import { ApiResponse } from '../../utils/ApiResponse.js';
import Purchase from '../../models/purchase/Purchase.model.js';
import Sell from '../../models/sell/Sell.model.js';


const inventoryRoutes = express.Router()



inventoryRoutes.get("/report/profit-loss",authMiddleware, async (req, res) => {
  try {
    const user = req.user;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
  
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
  
      // Calculate overall profit/loss
      const purchases = await Purchase.find();
      const sells = await Sell.find();
  
      let totalCost = 0;
      let totalRevenue = 0;
  
      purchases.forEach((purchase) => {
        totalCost += purchase.stockQty * purchase.stockPurchasePrice;
      });
  
      sells.forEach((sell) => {
        totalRevenue += sell.stockQty * sell.stockSoldPrice;
      });
  
      const overallProfitLoss = totalRevenue - totalCost;
  
      // Calculate today's profit/loss
      const todayPurchases = await Purchase.find({
        purchaseDate: { $gte: todayStart, $lte: todayEnd },
      });
  
      const todaySells = await Sell.find({
        salesDate: { $gte: todayStart, $lte: todayEnd },
      });
  
      let todayCost = 0;
      let todayRevenue = 0;
  
      todayPurchases.forEach((purchase) => {
        todayCost += purchase.stockQty * purchase.stockPurchasePrice;
      });
  
      todaySells.forEach((sell) => {
        todayRevenue += sell.stockQty * sell.stockSoldPrice;
      });
  
      const todayProfitLoss = todayRevenue - todayCost;

      return res.status(200).json(new ApiResponse(200, { overallProfitLoss, todayProfitLoss }, "Profit/Loss report generated successfully"));
  } catch (error) {
      res.status(500).json(new ApiError(error.message))
  }
})

// inventoryRoutes.get("/report/profit-loss",authMiddleware, async (req, res) => {
//     try {
//       const user = req.user;
//         const todayStart = new Date();
//         todayStart.setHours(0, 0, 0, 0);
    
//         const todayEnd = new Date();
//         todayEnd.setHours(23, 59, 59, 999);
    
//         // Calculate overall profit/loss
//         const purchases = await Purchase.find();
//         const sells = await Sell.find();
    
//         let totalCost = 0;
//         let totalRevenue = 0;
    
//         purchases.forEach((purchase) => {
//           totalCost += purchase.stockQty * purchase.stockPurchasePrice;
//         });
    
//         sells.forEach((sell) => {
//           totalRevenue += sell.stockQty * sell.stockSoldPrice;
//         });
    
//         const overallProfitLoss = totalRevenue - totalCost;
    
//         // Calculate today's profit/loss
//         const todayPurchases = await Purchase.find({
//           purchaseDate: { $gte: todayStart, $lte: todayEnd },
//         });
    
//         const todaySells = await Sell.find({
//           salesDate: { $gte: todayStart, $lte: todayEnd },
//         });
    
//         let todayCost = 0;
//         let todayRevenue = 0;
    
//         todayPurchases.forEach((purchase) => {
//           todayCost += purchase.stockQty * purchase.stockPurchasePrice;
//         });
    
//         todaySells.forEach((sell) => {
//           todayRevenue += sell.stockQty * sell.stockSoldPrice;
//         });
    
//         const todayProfitLoss = todayRevenue - todayCost;

//         return res.status(200).json(new ApiResponse(200, { overallProfitLoss, todayProfitLoss }, "Profit/Loss report generated successfully"));
//     } catch (error) {
//         res.status(500).json(new ApiError(error.message))
//     }
// })
export default inventoryRoutes