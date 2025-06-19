import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();
export const tokenBlacklist = new Set();

// ✅ User Registration (Fixed Hashing)
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    // ✅ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered. Try a different email or log in." });
    }

    // ✅ Fix: Ensure password is **properly hashed** before saving  
    console.log(`🔍 Password Before Hashing: ${password}`); // Debugging line
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(`🔍 Hashed Password Before Saving: ${hashedPassword}`); // Debugging line

    const isApproved = role === "admin" ? true : false; // Auto-approve admin

    const newUser = new User({ fullName, email, password: hashedPassword, role, isApproved });
    await newUser.save();

    res.json({ message: "✅ User registered successfully!" });
  } catch (error) {
    console.error("🔥 Registration Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin Login (Restored & Debugged)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔍 Attempting admin login: ${email}`);

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      console.log("❌ Admin not found");
      return res.status(404).json({ error: "Admin not found" });
    }

    console.log("✅ Admin found, verifying password...");
    console.log(`🔍 Stored Hashed Password in DB: ${user.password}`);

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 Password Match Result: ${passwordMatch}`);

    if (!passwordMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, role: user.role, redirectURL: "/admin-dashboard" });

  } catch (error) {
    console.error("🔥 Admin Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin Password Update (Restored)
router.post('/update-admin', authenticate, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log(`🔍 Request to update password for: ${email}`);

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      console.log("❌ Admin not found");
      return res.status(404).json({ error: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log("✅ Password updated successfully");
    res.json({ message: "✅ Admin password updated successfully!" });

  } catch (error) {
    console.error("🔥 Admin Password Update Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}); 

router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error!" });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.isApproved) {
      return res.status(403).json({ error: "Admin approval required. Please wait for approval." });
    }

    console.log(`🔍 Entered Password: ${password}`);
    console.log(`🔍 Stored Hashed Password in DB: ${user.password}`);

    // ✅ Fix: Ensure password comparison is properly handled inside `try` block
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`🔍 Password Match Result: ${passwordMatch}`);

    if (!passwordMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    user.isLoggedIn=true;
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, role: user.role, redirectURL: `/${user.role}-dashboard` });
  } catch (error) {
    console.error("🔥 Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ error: "❌ No token provided!" });

    const token = authHeader.split(" ")[1];

    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: "❌ Already logged out!" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Retrieve user safely & check existence before updating
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "❌ User not found!" });

    // ✅ Safely update login status
    user.isLoggedIn = false;
    await user.save();

    tokenBlacklist.add(token); // ✅ Blacklist token to block further access

    res.json({ message: "✅ Successfully logged out!"});
  } catch (error) {
    console.error("🔥 Logout Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
export default router;