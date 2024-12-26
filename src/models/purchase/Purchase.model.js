import { model, Schema } from "mongoose";

const PurchaseSchema = new Schema(
  {
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "StockMaster",
      required: true,
    },
    purchaseDate: {
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
    stockPurchasePrice: {
      type: Number,
      required: true,
      min: [0, "Purchase price must be non-negative"],
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
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Pre-save middleware to calculate netTotal
PurchaseSchema.pre("save", function (next) {
  if (this.stockQty && this.stockPurchasePrice) {
    this.netTotal = this.stockQty * this.stockPurchasePrice;
  }
  next();
});

// Indexes for faster queries
PurchaseSchema.index({ purchaseDate: 1 });
PurchaseSchema.index({ stockId: 1 });

export default model("Purchase", PurchaseSchema);
