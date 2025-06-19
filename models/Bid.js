import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bidAmount: Number,
  timestamp: { type:String , default: () => moment().tz("Asia/Kolkata").format() }
});

export default mongoose.model('Bid', bidSchema);