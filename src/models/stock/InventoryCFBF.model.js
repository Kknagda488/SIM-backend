import { model, Schema } from "mongoose";

// Inventory Carry Forward / Brought Forward Schema
const InventoryCFBFSchema = new Schema(
  {
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "StockMaster",
      required: true,
    },
    cFDate: {
      type: Date,
      default: null, // Date when the stock is carried forward
    },
    bFDate: {
      type: Date,
      default: null, // Date when the stock is brought forward
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "amount forward total cannot be negative"],
    },
    stockQty: {
      type: Number,
      default: 0,
    },
    status:{
      type: String,
      default: "pending",
      enum: ["complete", "pending"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Indexes for optimized querying
InventoryCFBFSchema.index({ stockId: 1, carryForwardDate: 1 });
InventoryCFBFSchema.index({ stockId: 1, broughtForwardDate: 1 });

export default model("InventoryCFBF", InventoryCFBFSchema);
