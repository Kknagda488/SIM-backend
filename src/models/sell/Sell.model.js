import { model, Schema } from "mongoose";

const SellSchema = new Schema(
  {
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "StockMaster",
      required: true,
    },
    salesDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stockQty: {
      type: Number,
      required: true,
      min: [1, "Stock quantity must be at least 1"],
    },
    stockSoldPrice: {
      type: Number,
      required: true,
      min: [0, "Sold price must be non-negative"],
    },
    netTotal: {
      type: Number,
      required: true,
      min: [0, "Net total must be non-negative"],
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Pre-save middleware to calculate netTotal
SellSchema.pre("save", function (next) {
  if (this.stockQty && this.stockSoldPrice) {
    this.netTotal = this.stockQty * this.stockSoldPrice;
  }
  next();
});

// Indexes for faster queries
SellSchema.index({ salesDate: 1 });
SellSchema.index({ stockId: 1 });

export default model("Sell", SellSchema);
