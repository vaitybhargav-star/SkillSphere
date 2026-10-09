/**
 * WebRTC Video Call Handler for Socket.IO
 * Manages peer-to-peer video and audio calls
 */

const { randomUUID, randomBytes } = require('crypto');
const uuidv4 = typeof randomUUID === 'function' ? () => randomUUID() : () => randomBytes(16).toString('hex');

class VideoCallManager {
  constructor() {
    this.activeCalls = new Map(); // callId -> {initiator, participant, startTime, status}
    this.userSocketMap = new Map(); // userId -> socketId
  }

  /**
   * Register user socket connection
   */
  registerUser(userId, socketId) {
    this.userSocketMap.set(userId, socketId);
  }

  /**
   * Unregister user on disconnect
   */
  unregisterUser(userId) {
    this.userSocketMap.delete(userId);
  }

  /**
   * Get socket ID for a user
   */
  getSocketId(userId) {
    return this.userSocketMap.get(userId);
  }

  /**
   * Create a new call
   */
  createCall(initiatorId, participantId) {
    const callId = uuidv4();
    this.activeCalls.set(callId, {
      callId,
      initiator: initiatorId,
      participant: participantId,
      startTime: new Date(),
      status: "initiated",
      signalingData: {},
    });
    return callId;
  }

  /**
   * Get call details
   */
  getCall(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Update call status
   */
  updateCallStatus(callId, status) {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = status;
      if (status === "active") call.connectedAt = new Date();
      return call;
    }
    return null;
  }

  /**
   * Store signaling data for a call
   */
  storeSignalingData(callId, type, data) {
    const call = this.activeCalls.get(callId);
    if (call) {
      if (!call.signalingData[type]) {
        call.signalingData[type] = [];
      }
      call.signalingData[type].push(data);
    }
  }

  /**
   * End a call
   */
  endCall(callId) {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = "ended";
      call.endTime = new Date();
      call.duration = Math.round((call.endTime - call.startTime) / 1000); // seconds
      return call;
    }
    return null;
  }

  /**
   * Get call history for a user
   */
  getCallHistory(userId) {
    const calls = Array.from(this.activeCalls.values()).filter(
      (call) => call.initiator === userId || call.participant === userId
    );
    return calls.filter((call) => call.status === "ended");
  }

  /**
   * Clean up old calls (older than 24 hours)
   */
  cleanupOldCalls() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.startTime < oneDayAgo && call.status === "ended") {
        this.activeCalls.delete(callId);
      }
    }
  }

  /**
   * Get active calls for a user
   */
  getActiveCalls(userId) {
    const calls = Array.from(this.activeCalls.values()).filter(
      (call) => (call.initiator === userId || call.participant === userId) && call.status === "active"
    );
    return calls;
  }
}

module.exports = new VideoCallManager();
