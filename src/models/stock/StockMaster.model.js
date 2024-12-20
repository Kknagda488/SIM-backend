import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const StockMasterSchema = new Schema({
    stockName: {
        type: String,
        required: true
    },
    stockUnit: {
        type: String,
        required: true,
    },
    remark: {
        type: String,
        required: false,
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
},
{
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

StockMasterSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
export default mongoose.model("StockMaster", StockMasterSchema);
