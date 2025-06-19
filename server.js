import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { checkAuctionExpiry } from './utils/auctionExpiry.js';

setInterval(checkAuctionExpiry, 60000);

// ✅ Load environment variables
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing in environment variables.');
  process.exit(1);
}

if (!process.env.PORT) {
  console.warn('⚠ PORT not set, defaulting to 5000.');
}

console.log('Loaded MONGO_URI:', process.env.MONGO_URI); // Debugging


const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); // Ensure application doesn't start with a broken DB connection
  });

// ✅ Setup Routes
app.use('/auth', authRoutes);
app.use('/bid', bidRoutes);
app.use('/auction', auctionRoutes);
app.use('/admin', adminRoutes);
app.use('/category',categoryRoutes);
app.use('/notifications',notificationRoutes);

// ✅ Setup WebSockets for Real-Time Bidding
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('✅ User connected');

  socket.on('placeBid', async ({ auctionId, userId, bidAmount }) => {
    console.log(`✅ Bid placed: ${bidAmount} on Auction: ${auctionId}`);

    io.emit('updateBids', { auctionId, bidAmount });

    try {
      const highestBid = await mongoose.model('Bid').find({ auctionId })
        .sort({ bidAmount: -1 }).limit(1);
      const previousBid = highestBid[0];

      if (previousBid && previousBid.userId.toString() !== userId) {
        const difference = bidAmount - previousBid.bidAmount;
        io.to(previousBid.userId.toString()).emit('notification', { 
          message: `🚨 You've been outbid by $${difference}` 
        });
      }

      io.to(userId.toString()).emit('notification', { 
        message: '🎉 Your bid is now the highest!' 
      });
    } catch (error) {
      console.error('❌ WebSocket Bid Error:', error);
    }
  });

  socket.on('disconnect', () => console.log('❌ User disconnected'));
});
export {server,io};
// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));