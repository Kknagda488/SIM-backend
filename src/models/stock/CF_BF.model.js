import { model, Schema } from "mongoose";

const CF_BFSchema = new Schema(
  {
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "StockMaster",
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: [0, "Quantity must be non-negative"],
    },
    from: {
      type: Date,
      required: true,
    },
    to: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value >= this.from;
        },
        message: "'To' date must be after or equal to 'From' date",
      },
    },
    average: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: "Average must be non-negative",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate the average if needed
CF_BFSchema.pre("save", function (next) {
  if (this.qty > 0 && this.from && this.to) {
    const timeDifference = (new Date(this.to) - new Date(this.from)) / (1000 * 60 * 60 * 24); // Days
    this.average = timeDifference > 0 ? this.qty / timeDifference : this.qty;
  }
  next();
});

// Indexes for optimized queries
CF_BFSchema.index({ stockId: 1 });
CF_BFSchema.index({ from: 1, to: 1 });

export default model("CF_BF", CF_BFSchema);
