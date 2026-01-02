import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import swipeRoutes from './routes/swipe.js';
import sessionsRoutes from './routes/sessions.js';
import matchesRoutes from './routes/matches.js';
import notificationsRoutes from './routes/notifications.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store online users: Map<userId, socketId>
const onlineUsers = new Map<string, string>();

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`🔌 User connected: ${userId}`);
  
  // Store user's socket
  onlineUsers.set(userId, socket.id);
  
  // Join user's personal room for direct messages
  socket.join(`user:${userId}`);
  
  // Join a chat room
  socket.on('join_chat', (matchId: string) => {
    socket.join(`chat:${matchId}`);
    console.log(`👤 User ${userId} joined chat:${matchId}`);
  });
  
  // Leave a chat room
  socket.on('leave_chat', (matchId: string) => {
    socket.leave(`chat:${matchId}`);
    console.log(`👤 User ${userId} left chat:${matchId}`);
  });
  
  // Send a message
  socket.on('send_message', async (data: { matchId: string; text: string }) => {
    try {
      const { matchId, text } = data;
      
      // Verify user is part of this match
      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [
            { userAId: userId },
            { userBId: userId }
          ]
        }
      });
      
      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }
      
      // Create the message
      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          text
        }
      });
      
      // Broadcast to everyone in the chat room
      io.to(`chat:${matchId}`).emit('new_message', {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        text: message.text,
        createdAt: message.createdAt.toISOString()
      });
      
      // Send notification to the other user if they're not in the chat
      const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
      const otherSocketId = onlineUsers.get(otherUserId);
      
      if (otherSocketId) {
        const sender = await prisma.user.findUnique({ where: { id: userId } });
        io.to(`user:${otherUserId}`).emit('message_notification', {
          matchId,
          senderName: sender?.name || 'Iemand',
          preview: text.length > 50 ? text.substring(0, 50) + '...' : text
        });
      }
      
      console.log(`💬 Message sent in chat:${matchId} by ${userId}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Typing indicator
  socket.on('typing_start', (matchId: string) => {
    socket.to(`chat:${matchId}`).emit('user_typing', { matchId, userId });
  });
  
  socket.on('typing_stop', (matchId: string) => {
    socket.to(`chat:${matchId}`).emit('user_stopped_typing', { matchId, userId });
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    console.log(`🔌 User disconnected: ${userId}`);
  });
});

// Export io for use in routes
export { io, onlineUsers };

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increased for avatar uploads

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    name: 'GymBuddy API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/auth', '/users', '/swipe', '/sessions', '/matches']
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/swipe', swipeRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/matches', matchesRoutes);
app.use('/notifications', notificationsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Render requires binding to 0.0.0.0
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 GymBuddy API running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time chat`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});
