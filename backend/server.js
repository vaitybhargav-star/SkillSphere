const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const connectDB = require("./config/db");
const validateEnv = require("./config/validateEnv");
const { createDefaultAdminIfMissing } = require("./config/adminBootstrap");
const { initializeIndexes } = require("./config/initializeIndexes");
const createApp = require("./app");
const { initSentry } = require('./config/sentry');

validateEnv();

// Initialize Sentry early so it can capture startup errors
const Sentry = initSentry();

const PORT = parseInt(process.env.PORT, 10) || 5000;

const start = async () => {
  await connectDB();
  await createDefaultAdminIfMissing();
  await initializeIndexes();

  const app = createApp();

  // Socket.IO setup (attach to HTTP server)
  const http = require("http");
  const jwt = require("jsonwebtoken");
  const Message = require("./models/Message");
  const videoCallManager = require("./utils/videoCallManager");
  const server = http.createServer(app);
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", methods: ["GET", "POST"] },
  });

  global.io = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1]);
      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      videoCallManager.registerUser(socket.userId, socket.id);
    }

    // Private message: store and forward
    socket.on("private_message", async (payload) => {
      const { to, text, attachments } = payload;
      try {
        const message = await Message.create({
          sender: socket.userId,
          receiver: to,
          text,
          attachments: Array.isArray(attachments) ? attachments : [],
        });
        // deliver to recipient and sender socket rooms
        io.to(`user:${to}`).emit("message", message);
        socket.emit("message", message);
      } catch (err) {
        console.error("Socket message error:", err.message);
      }
    });

    // Typing indicator: broadcast to the other user
    socket.on("typing", ({ to, typing }) => {
      try {
        if (!to) return;
        io.to(`user:${to}`).emit("typing", { from: socket.userId, typing });
      } catch (err) {
        console.error("Socket typing error:", err.message);
      }
    });

    // Mark messages as read (sender -> current user)
    socket.on("mark_read", async ({ from }) => {
      try {
        if (!from || !socket.userId) return;
        await Message.updateMany({ sender: from, receiver: socket.userId, read: false }, { $set: { read: true } });
        // notify sender that their messages were read by this user
        io.to(`user:${from}`).emit("read_receipt", { from: socket.userId });
      } catch (err) {
        console.error("Socket mark_read error:", err.message);
      }
    });

    // Video Call: Initiate call
    socket.on("video_call_initiate", ({ to }) => {
      try {
        if (!socket.userId || !to) return;
        const callId = videoCallManager.createCall(socket.userId, to);
        socket.emit("video_call_initiated", { callId, to });
        io.to(`user:${to}`).emit("video_call_incoming", {
          callId,
          from: socket.userId,
          fromSocketId: socket.id,
        });
      } catch (err) {
        console.error("Socket video_call_initiate error:", err.message);
      }
    });

    // Video Call: Accept call
    socket.on("video_call_accept", ({ callId }) => {
      try {
        if (!callId) return;
        const call = videoCallManager.updateCallStatus(callId, "active");
        if (call) {
          io.to(`user:${call.initiator}`).emit("video_call_accepted", { callId });
        }
      } catch (err) {
        console.error("Socket video_call_accept error:", err.message);
      }
    });

    // Video Call: Reject call
    socket.on("video_call_reject", ({ callId }) => {
      try {
        if (!callId) return;
        const call = videoCallManager.updateCallStatus(callId, "rejected");
        if (call) {
          io.to(`user:${call.initiator}`).emit("video_call_rejected", { callId });
        }
      } catch (err) {
        console.error("Socket video_call_reject error:", err.message);
      }
    });

    // Video Call: WebRTC Signaling - Offer
    socket.on("video_call_offer", ({ callId, offer, to }) => {
      try {
        if (!callId || !offer) return;
        videoCallManager.storeSignalingData(callId, "offer", offer);
        io.to(`user:${to}`).emit("video_call_offer", { callId, offer });
      } catch (err) {
        console.error("Socket video_call_offer error:", err.message);
      }
    });

    // Video Call: WebRTC Signaling - Answer
    socket.on("video_call_answer", ({ callId, answer, to }) => {
      try {
        if (!callId || !answer) return;
        videoCallManager.storeSignalingData(callId, "answer", answer);
        io.to(`user:${to}`).emit("video_call_answer", { callId, answer });
      } catch (err) {
        console.error("Socket video_call_answer error:", err.message);
      }
    });

    // Video Call: WebRTC Signaling - ICE Candidate
    socket.on("video_call_ice_candidate", ({ callId, candidate, to }) => {
      try {
        if (!callId || !candidate) return;
        io.to(`user:${to}`).emit("video_call_ice_candidate", { callId, candidate });
      } catch (err) {
        console.error("Socket video_call_ice_candidate error:", err.message);
      }
    });

    // Video Call: End call
    socket.on("video_call_end", ({ callId, to }) => {
      try {
        if (!callId) return;
        const call = videoCallManager.endCall(callId);
        if (call && to) {
          io.to(`user:${to}`).emit("video_call_ended", { callId, duration: call.duration });
        }
      } catch (err) {
        console.error("Socket video_call_end error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        videoCallManager.unregisterUser(socket.userId);
      }
    });
  });

  const tryListen = (port, attemptsLeft = 5) => {
    return new Promise((resolve, reject) => {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.warn(`Port ${port} is in use, trying ${port + 1}...`);
          // wait a moment then try next port
          setTimeout(() => {
            tryListen(port + 1, attemptsLeft - 1).then(resolve).catch(reject);
          }, 300);
        } else {
          reject(err);
        }
      };

      server.once('error', onError);
      server.listen(port, () => {
        server.removeListener('error', onError);
        console.log(`🚀 Server is running on http://localhost:${port}`);
        resolve(port);
      });
    });
  };

  try {
    await tryListen(PORT);
  } catch (err) {
    console.error('❌ Failed to bind server:', err.message);
    process.exit(1);
  }

  // Optionally start scheduler in-process when enabled (SCHEDULER_ENABLED=true)
  if (process.env.SCHEDULER_ENABLED === 'true') {
    try {
      const scheduler = require('./jobs/scheduler');
      if (scheduler && typeof scheduler.startInProcess === 'function') {
        scheduler.startInProcess();
        console.log('Scheduler enabled and started in-process');
      }
    } catch (err) {
      console.error('Failed to start scheduler in-process:', err.message);
    }
  }
};

start().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});