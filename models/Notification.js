import mongoose from 'mongoose';
import moment from 'moment-timezone';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true }, 
  message: { type: String, required: true },
  type: { type: String, enum: ['outbid', 'inbid', 'win'], required: true },
  read:{type:Boolean , default:false},
  timestamp: { type: String, default: () => moment().tz("Asia/Kolkata").format() } // ✅ Fix: Store timestamp in IST format
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;