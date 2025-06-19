import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true, trim: true }, // 🚨 Prevent duplicates & empty names
  description: { type: String, required: true, trim: true },
  specs: { type: [String], default: [] } // 🛠 Store category-specific attributes
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
export default Category;