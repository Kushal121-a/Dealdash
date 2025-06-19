import express from 'express';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import { tokenBlacklist } from '../routes/authRoutes.js'; // ✅ Import token blacklist

const router = express.Router();

// ✅ Approve User (Admin Only)
router.put('/approve-user/:userId', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "❌ Unauthorized! Please log in to approve users." });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Prevent logged-out admins from approving users
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: "❌ You are logged out! Please log in again to approve users." });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isApproved = true;
    await user.save();

    res.json({ message: '✅ User approved successfully!', user });
  } catch (error) {
    console.error("🔥 Approve User Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Approve Auction (Admin Only)
router.put('/approve-auction/:auctionId', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "❌ Unauthorized! Please log in to approve auctions." });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Prevent logged-out admins from approving auctions
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: "❌ You are logged out! Please log in again to approve auctions." });
    }

    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    auction.status = 'approved';
    await auction.save();

    res.json({ message: '✅ Auction approved successfully!', auction });
  } catch (error) {
    console.error("🔥 Approve Auction Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Reject User & Delete Account (Admin Only)
router.delete('/reject-user/:userId', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.deleteOne();
    res.json({ message: '❌ User rejected and removed!', userId: req.params.userId });
  } catch (error) {
    console.error("🔥 Reject User Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Remove Auction (Admin Only)
router.delete('/remove-auction/:auctionId', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    await auction.deleteOne();
    res.json({ message: '❌ Auction removed successfully!', auctionId: req.params.auctionId });
  } catch (error) {
    console.error("🔥 Remove Auction Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/pending-users', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false });
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching pending users' });
  }
});

router.get("/auctions/pending",authenticate, authorizeRole(['admin']) , async (req, res) => {
  try {
    const pendingAuctions = await Auction.find({ status: "pending" })
      .populate("categoryId", "categoryName"); // ✅ Fetch category name instead of ID
    res.json(pendingAuctions);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error!" });
  }
});

export default router;