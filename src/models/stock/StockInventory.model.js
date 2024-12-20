import { model, Schema } from "mongoose";

const StockInventorySchema = new Schema(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      refPath: "transactionType", // Reference can be either Purchase or Sell
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["Purchase", "Sell"], // Specifies the type of transaction
    },
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "StockMaster",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalPurchased: {
      type: Number,
      default: 0,
      min: [0, "Total purchased cannot be negative"],
    },
    totalSold: {
      type: Number,
      default: 0,
      min: [0, "Total sold cannot be negative"],
      validate: {
        validator: function () {
          return this.totalSold <= this.totalPurchased;
        },
        message: "Total sold cannot exceed total purchased",
      },
    },
    remaining: {
      type: Number,
      default: function () {
        return this.totalPurchased - this.totalSold;
      },
      validate: {
        validator: function () {
          return this.remaining >= 0;
        },
        message: "Remaining stock cannot be negative",
      },
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Indexes for efficient queries
StockInventorySchema.index({ stockId: 1 });
StockInventorySchema.index({ date: 1 });

export default model("StockInventory", StockInventorySchema);
