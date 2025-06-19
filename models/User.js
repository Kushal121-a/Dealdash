import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'dealer', 'bidder'], default: 'bidder' , required: true},
  isApproved:{type:Boolean, default:false},
  isLoggedIn:{type:Boolean,default:false}
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // ✅ Fix: Ensure the password isn't accidentally double-hashed
  if (!this.password.startsWith("$2b$")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});

export default mongoose.model('User', userSchema);