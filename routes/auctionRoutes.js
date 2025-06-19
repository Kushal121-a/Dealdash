import express from 'express';
import mongoose from 'mongoose';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Category from '../models/Category.js';
import { tokenBlacklist } from '../routes/authRoutes.js';

const router = express.Router();
router.post('/create', authenticate , authorizeRole("dealer"), async (req, res) => {
  try {
    const { itemName, basePrice, endDate,startDate, dealerId, categoryId, categorySpecs, imageUrl } = req.body;

    if (!itemName || !basePrice || !endDate || !startDate|| !dealerId || !categoryId || !categorySpecs || !imageUrl) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    // ✅ Require Authentication - Ensure dealer is logged in
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "❌ Unauthorized! Please log in to create an auction." });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Prevent logged-out users from creating auctions
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: "❌ You are logged out! Please log in again to create an auction." });
    }

    // ✅ Check if `categoryId` is a **valid** ObjectId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log("❌ Received Invalid categoryId:", categoryId);
      return res.status(400).json({ error: "Invalid category ID format!" });
    }

    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

    const category = await Category.findById(categoryObjectId);
    if (!category) {
      console.log("❌ Category not found in database!");
      return res.status(400).json({ error: "Category not found!" });
    }

    const newAuction = new Auction({
      itemName,
      basePrice,
      endDate,
      startDate,
      dealerId,
      categoryId: categoryObjectId, // ✅ Store ObjectId properly
      categorySpecs,
      imageUrl,
      status: "pending"
    });

    await newAuction.save();
    res.json({ message: "✅ Auction created successfully! Waiting for admin approval.", auctionId: newAuction._id });

  } catch (error) {
    console.error("🔥 Auction Creation Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/auctions", async (req, res) => {
  try {
    const auctions = await Auction.find({});
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error!" });
  }
});

// ✅ Route to fetch active auctions
router.get("/active", async (req, res) => {
  try {
    const activeAuctions = await Auction.find({ status: { $in: ["approved", "ongoing"] } });
    res.status(200).json(activeAuctions);
  } catch (error) {
    console.error("❌ Error fetching active auctions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/auctions/closed", async (req, res) => {
  try {
    const closedAuctions = await Auction.find({ status: "closed" });
    res.json(closedAuctions);
  } catch (error) {
    console.error("❌ Error fetching closed auctions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get all auctions created by a specific dealer
router.get("/dealer/:dealerId", async (req, res) => {
  try {
    const { dealerId } = req.params;

    // 🔍 Fetch auctions where dealerId matches the request parameter
    const auctions = await Auction.find({ dealerId }).populate("categoryId", "categoryName");

    if (!auctions.length) {
      return res.status(404).json({ error: "No auctions found for this dealer!" });
    }

    // 🔄 Fetch bids separately for each auction (since bids aren't populated in Auction)
    for (const auction of auctions) {
      const bids = await Bid.find({ auctionId: auction._id }).populate("userId", "fullName bidAmount");
      auction._doc.bids = bids; // ✅ Manually attach bids to auction object
    }

    res.status(200).json(auctions);
  } catch (error) {
    console.error("❌ Error fetching dealer auctions:", error);
    res.status(500).json({ error: "Internal server error!" });
  }
});

router.get("/live/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const currentTime = new Date();

    const liveAuctions = await Auction.find({
      categoryId: categoryId,
      status: "approved",
      startDate: { $lte: currentTime },
      endDate: { $gte: currentTime },
    });

    res.status(200).json(liveAuctions);
  } catch (error) {
    console.error("❌ Error fetching live auctions:", error);
    res.status(500).json({ error: "Server error fetching live auctions" });
  }
});



export default router;