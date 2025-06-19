import express from 'express';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { io } from '../server.js';
import Notification from '../models/Notification.js';
import moment from 'moment-timezone';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {tokenBlacklist} from '../routes/authRoutes.js';

const router = express.Router();

router.post('/place', async (req, res) => {
  try {
    const { auctionId, bidAmount } = req.body;

    // ✅ Require Authentication - Ensure user is logged in
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "❌ Unauthorized! Please log in to place a bid." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ Verify JWT token

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: "❌ Invalid token! Please log in again." });

    // ✅ Prevent logged-out users from placing bids
if (tokenBlacklist.has(token)) {
  return res.status(401).json({ error: "❌ You are logged out! Please log in again to place a bid." });
}

    const userId = decoded.userId; // ✅ Get userId from decoded token

    if (!auctionId || !bidAmount) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(400).json({ error: "Auction not found!" });

    // ✅ Prevent bids if auction is closed
    if (auction.status === "closed") {
      return res.status(400).json({ error: "Bidding is closed for this auction!" });
    }

    const thirtyMinutesAgo = moment().tz("Asia/Kolkata").subtract(30, 'minutes').format("YYYY-MM-DD HH:mm:ss");

    const recentBids = await Bid.find({ auctionId, userId });

    const bidCount = recentBids.filter(bid => moment(bid.timestamp, "YYYY-MM-DD HH:mm:ss").isAfter(thirtyMinutesAgo)).length;

    if (bidCount >= 3) {
      return res.status(400).json({ error: "❌ You can only place 3 bids per auction every 30 minutes!" });
    }

    // ✅ Find the highest bid before this one
    const highestBid = await Bid.findOne({ auctionId }).sort({ bidAmount: -1 });

    if (highestBid && bidAmount <= highestBid.bidAmount) {
      return res.status(400).json({ error: "Bid must be higher than the current highest bid!" });
    }

    // ✅ Store timestamp correctly in IST format
    const timestampIST = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    const newBid = new Bid({ auctionId, userId, bidAmount, timestamp: timestampIST });
    await newBid.save();

    // ✅ Notify previous highest bidder that they were outbid
    if (highestBid) {
      const outbidAmount = bidAmount - highestBid.bidAmount;
      const outbidNotification = new Notification({
        userId: highestBid.userId,
        auctionId,
        message: `You were outbid by ₹${outbidAmount}. The new highest bid is ₹${bidAmount}.`,
        type: "outbid",
        timestamp: timestampIST // ✅ Store IST timestamp for notification
      });
      await outbidNotification.save();
    }

    // ✅ Notify current bidder that they are leading
    const inbidNotification = new Notification({
      userId,
      auctionId,
      message: `You are currently the highest bidder with ₹${bidAmount}.`,
      type: "inbid",
      timestamp: timestampIST // ✅ Store IST timestamp for notification
    });
    await inbidNotification.save();

    io.emit("newBid", { auctionId, userId, bidAmount });

    res.json({ message: "✅ Bid placed successfully!", currentHighestBid: bidAmount, timestamp: newBid.timestamp });
  } catch (error) {
    console.error("🔥 Bid Placement Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/bids/dealer/:auctionId", async (req, res) => {
  try {
    const bids = await Bid.find({ auctionId: req.params.auctionId })
      .sort({ bidAmount: -1 }) // ✅ Sort bids in descending order
      .populate("userId", "fullName"); // ✅ Fetch bidder names

    if (!bids.length) {
      return res.status(404).json({ error: "No bids found for this auction!" });
    }

    res.json(bids);
  } catch (error) {
    console.error("❌ Error fetching dealer bids:", error);
    res.status(500).json({ error: "❌ Server error!" });
  }
});

router.get("/bids/user/:userId", async (req, res) => {
  try {
    const bids = await Bid.find({ userId: req.params.userId })
      .sort({ timestamp: -1 }) // ✅ Sort by latest bids
      .populate("auctionId", "itemName basePrice"); // ✅ Fetch auction details

    if (!bids.length) {
      return res.status(404).json({ error: "No bids found for this user!" });
    }

    res.json(bids);
  } catch (error) {
    console.error("❌ Error fetching user bids:", error);
    res.status(500).json({ error: "❌ Server error!" });
  }
});

//🔥 Route to fetch bids for a specific auction
router.get("/bids/:auctionId", async (req, res) => {
  try {
    const { auctionId } = req.params;
    const bids = await Bid.find({ auctionId }).populate("userId", "_id"); // ✅ Include bidder details
    res.json(bids);
  } catch (error) {
    console.error("❌ Error fetching bids:", error);
    res.status(500).json({ error: "Failed to fetch bid history" });
  }
});

export default router;