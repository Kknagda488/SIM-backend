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
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

StockMasterSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export const StockMaster = mongoose.model('StockMaster', StockMasterSchema);