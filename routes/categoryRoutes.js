import express from 'express';
import Category from '../models/Category.js';

const router = express.Router();

// 🛠 Create Category (Prevents Duplicates & Handles Errors)
router.post('/create', async (req, res) => {
  try {
    const { categoryName, description, specs } = req.body;

    console.log("🛠 Received Category:", categoryName); // Log incoming request
    const existingCategory = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, "i") });

    console.log("🔍 MongoDB Found:", existingCategory); // Log if MongoDB detects a duplicate

    if (existingCategory) {
      return res.status(400).json({ error: `❌ Category "${categoryName}" already exists!` });
    }

    const newCategory = new Category({ categoryName, description, specs });
    await newCategory.save();

    res.json({ message: "✅ Category created successfully!", category: newCategory });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "❌ Duplicate category name detected!" });
    }
    console.error("🔥 Category Creation Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔍 Get All Categories
router.get('/all', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    console.error("🔥 Fetch Categories Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// 🗑 Delete a Category
router.delete('/delete/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "❌ Category not found!" });
    }
    res.json({ message: "✅ Category deleted successfully!" });
  } catch (error) {
    console.error("🔥 Delete Category Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;