import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  basePrice: { type: Number, required: true },
  dealerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categorySpecs: { type: String, required: true },
  imageUrl: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected','closed'], default: 'pending' }, // ✅ Admin Approval
  startDate: { type: String, default: () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") }, // ✅ Store in IST
  endDate: { type: String, default: () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss") }, // ✅ Store in IST
});

const Auction = mongoose.model('Auction', auctionSchema);
export default Auction;