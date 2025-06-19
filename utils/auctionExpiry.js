import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Notification from '../models/Notification.js';
import moment from 'moment-timezone';

export const checkAuctionExpiry = async () => {
  // ✅ Ensure endDate is properly converted to IST before comparison
  const currentIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

  const expiredAuctions = await Auction.find({ endDate: { $lt: currentIST }, status: "approved" });

  for (const auction of expiredAuctions) {
    const highestBid = await Bid.findOne({ auctionId: auction._id }).sort({ bidAmount: -1 });

    if (highestBid) {
      const winNotification = new Notification({
        userId: highestBid.userId,
        auctionId: auction._id,
        message: `🎉 Congratulations! You won the auction for "${auction.itemName}" at ₹${highestBid.bidAmount}.`,
        type: "win",
        timestamp: currentIST // ✅ Store notification timestamp in IST
      });
      await winNotification.save();
    }

    auction.status = "closed";
    await auction.save();
  }
};