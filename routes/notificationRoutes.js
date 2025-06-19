import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

// ✅ Get Notifications for a User
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const notifications = await Notification.find({ userId }).sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
});

// ✅ Mark a Notification as Read
router.put("/mark-read/:notifId", async (req, res) => {
  const { notifId } = req.params;

  try {
    const updatedNotif = await Notification.findByIdAndUpdate(
      notifId,
      { read: true }, // ✅ Fix: Correct field name
      { new: true }
    );

    if (!updatedNotif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification: updatedNotif });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ error: "Server error marking notification" });
  }
});

// ✅ Create a Notification (For Auction Events)
router.post("/create", async (req, res) => {
  const { userId, auctionId, message, type } = req.body;

  try {
    const newNotif = await Notification.create({
      userId,
      auctionId,
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ message: "Notification created successfully", notification: newNotif });
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    res.status(500).json({ error: "Server error creating notification" });
  }
});

export default router;