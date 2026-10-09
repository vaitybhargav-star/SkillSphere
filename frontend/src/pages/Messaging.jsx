import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { io } from "socket.io-client";

function Messaging() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [typing, setTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [readReceipts, setReadReceipts] = useState({});
  const [callStatus, setCallStatus] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const currentCallIdRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const [videoStream, setVideoStream] = useState(null);
  const videoStreamRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const videoRefLocal = useRef(null);
  const videoRefRemote = useRef(null);
  const peerConnectionRef = useRef(null);

  const loadMessages = async () => {
    if (!receiverId) return;
    const res = await api.get(`/messages/${receiverId}`);
    setMessages(res.data.messages || []);
    try {
      await api.post(`/messages/mark-read/${receiverId}`);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("mark_read", { from: receiverId });
      }
    } catch (e) {
      // ignore mark-read errors for now
    }
  };

  const getCurrentUserId = () => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    return currentUser?.id || currentUser?._id || localStorage.getItem("userId");
  };

  const flushPendingIceCandidates = () => {
    if (!currentCallIdRef.current || !socketRef.current?.connected) return;
    pendingIceCandidatesRef.current.forEach((candidate) => {
      socketRef.current.emit("video_call_ice_candidate", {
        callId: currentCallIdRef.current,
        candidate,
        to: receiverId,
      });
    });
    pendingIceCandidatesRef.current = [];
  };

  const updateCurrentCallId = (callId) => {
    currentCallIdRef.current = callId;
    setCurrentCallId(callId);
    flushPendingIceCandidates();
  };

  const updateVideoStream = (stream) => {
    videoStreamRef.current = stream;
    setVideoStream(stream);
  };

  const cleanupCall = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (videoRefLocal.current) {
      videoRefLocal.current.srcObject = null;
    }
    if (videoRefRemote.current) {
      videoRefRemote.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    updateVideoStream(null);
    updateCurrentCallId(null);
    setIncomingCall(null);
  };

  const createPeerConnection = (remoteUserId, localStream) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (socketRef.current?.connected && currentCallIdRef.current) {
        socketRef.current.emit("video_call_ice_candidate", {
          callId: currentCallIdRef.current,
          candidate: event.candidate,
          to: remoteUserId,
        });
      } else {
        pendingIceCandidatesRef.current.push(event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      if (videoRefRemote.current && event.streams?.[0]) {
        videoRefRemote.current.srcObject = event.streams[0];
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
    }

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const uploadAttachment = async (file) => {
    if (!file) return null;
    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/uploads/attachment", fd);
      return {
        filename: res.data.filename || file.name,
        url: res.data.url,
        contentType: res.data.contentType || file.type,
        size: res.data.size || file.size,
      };
    } catch (error) {
      console.error("Attachment upload failed:", error);
      setErrorMessage("Unable to upload attachment. Please try again.");
      return null;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const triggerAttachmentPicker = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!receiverId) return;

    let active = true;

    const fetchMessages = async () => {
      const res = await api.get(`/messages/${receiverId}`);
      if (active) setMessages(res.data.messages || []);
    };

    void fetchMessages();

    return () => {
      active = false;
    };
  }, [receiverId]);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const socketUrl = (import.meta.env.VITE_SOCKET_URL) || apiBase.replace(/\/api$/, "") || "http://localhost:5000";
    const token = localStorage.getItem("token");
    socketRef.current = io(socketUrl, { auth: { token } });

    socketRef.current.on("connect", () => {
      // connected
    });

    socketRef.current.on("message", (message) => {
      if ((message.sender === receiverId) || (message.receiver === receiverId)) {
        setMessages((m) => [...m, message]);
        const currentUserId = getCurrentUserId();
        if (message.sender === receiverId && message.receiver === currentUserId) {
          socketRef.current.emit("mark_read", { from: receiverId });
          api.post(`/messages/mark-read/${receiverId}`).catch(() => {});
        }
      }
    });

    socketRef.current.on("typing", ({ from, typing }) => {
      if (from === receiverId) setPeerTyping(typing);
    });

    socketRef.current.on("read_receipt", ({ from }) => {
      setReadReceipts((r) => ({ ...r, [from]: true }));
    });

    // Video call events
    socketRef.current.on("video_call_initiated", ({ callId }) => {
      updateCurrentCallId(callId);
    });

    socketRef.current.on("video_call_incoming", ({ callId, from }) => {
      setIncomingCall({ callId, from });
    });

    socketRef.current.on("video_call_accepted", ({ callId }) => {
      if (callId) {
        updateCurrentCallId(callId);
      }
      setCallStatus("connecting");
      if (peerConnectionRef.current && callId) {
        peerConnectionRef.current
          .createOffer()
          .then((offer) => peerConnectionRef.current.setLocalDescription(offer).then(() => {
            socketRef.current.emit("video_call_offer", { callId, offer, to: receiverId });
          }))
          .catch((error) => console.error("Error creating offer:", error));
      }
    });

    socketRef.current.on("video_call_rejected", () => {
      setCallStatus(null);
      cleanupCall();
      alert("Call was rejected");
    });

    socketRef.current.on("video_call_offer", async ({ callId, offer, to }) => {
      if (!peerConnectionRef.current) {
        createPeerConnection(to, videoStreamRef.current);
      }
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketRef.current.emit("video_call_answer", { callId, answer, to });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socketRef.current.on("video_call_answer", async ({ answer }) => {
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus("connected");
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    });

    socketRef.current.on("video_call_ice_candidate", async ({ candidate }) => {
      try {
        if (candidate && peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    socketRef.current.on("video_call_ended", () => {
      cleanupCall();
      setCallStatus(null);
    });

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId]);

  const initiateCall = async () => {
    if (!receiverId) {
      alert("Please enter a receiver ID");
      return;
    }

    try {
      setCallStatus("initiating");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      updateVideoStream(stream);

      if (videoRefLocal.current) {
        videoRefLocal.current.srcObject = stream;
      }

      createPeerConnection(receiverId, stream);
      socketRef.current.emit("video_call_initiate", { to: receiverId });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Unable to access camera/microphone");
      setCallStatus(null);
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      updateVideoStream(stream);

      if (videoRefLocal.current) {
        videoRefLocal.current.srcObject = stream;
      }

      updateCurrentCallId(incomingCall.callId);
      createPeerConnection(incomingCall.from, stream);
      socketRef.current.emit("video_call_accept", { callId: incomingCall.callId });
      setCallStatus("connecting");
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Unable to access camera/microphone");
      setCallStatus(null);
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socketRef.current.emit("video_call_reject", { callId: incomingCall.callId });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (currentCallId && receiverId) {
      socketRef.current.emit("video_call_end", { callId: currentCallId, to: receiverId });
    }
    cleanupCall();
    setCallStatus(null);
  };

  const send = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!receiverId) {
      setErrorMessage("Please enter a receiver user id before sending a message.");
      return;
    }

    if (!text && !attachmentFile) {
      setErrorMessage("Type a message or attach a file before sending.");
      return;
    }

    let attachments = [];
    if (attachmentFile) {
      const uploaded = await uploadAttachment(attachmentFile);
      if (uploaded) {
        attachments = [uploaded];
      }
    }

    const payload = {
      to: receiverId,
      text: text || "",
      attachments,
    };

    try {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("private_message", payload);
      } else {
        await api.post("/messages", { receiver: receiverId, text: text || "", attachments });
      }

      setText("");
      setAttachmentFile(null);
      setErrorMessage(null);
      loadMessages();
    } catch (err) {
      console.error("Message send failed:", err);
      setErrorMessage("Unable to send message. Please try again.");
    }
  };

  const emitTyping = (isTyping) => {
    setTyping(isTyping);
    if (!socketRef.current || !socketRef.current.connected) return;
    socketRef.current.emit("typing", { to: receiverId, typing: isTyping });
  };

  const onInputChange = (e) => {
    setText(e.target.value);
    if (!receiverId) return;
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass-card rounded-[2rem] p-8">
          <h1 className="text-3xl font-bold">Messaging & Video Calls</h1>
          <p className="mt-2 text-slate-400">Connect with clients and freelancers in real time, with video calling support.</p>
        </div>

        {/* Incoming Call Modal */}
        {incomingCall && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-slate-900 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Incoming Video Call</h2>
              <p className="text-slate-300 mb-6">from {incomingCall.from}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={acceptCall}
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
                >
                  Accept
                </button>
                <button
                  onClick={rejectCall}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Call Interface */}
        {callStatus && (
          <div className="glass-card rounded-[2rem] p-6">
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg overflow-hidden bg-black">
                  <video ref={videoRefLocal} autoPlay muted className="w-full h-64 object-cover" />
                  <p className="text-center text-sm text-slate-400 p-2">Your Video</p>
                </div>
                <div className="rounded-lg overflow-hidden bg-black">
                  <video ref={videoRefRemote} autoPlay className="w-full h-64 object-cover" />
                  <p className="text-center text-sm text-slate-400 p-2">Remote Video</p>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <span className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold">
                  {callStatus === "connected" ? "📞 Connected" : "📞 Connecting..."}
                </span>
                <button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold"
                >
                  End Call
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card rounded-[2rem] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5">
              <label className="block text-sm font-medium text-slate-300 mb-3">Receiver user id</label>
              <input
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Receiver user id"
                className="auth-input w-full rounded-3xl px-4 py-3 mb-2"
              />
              <p className="text-sm text-slate-500 mb-4">Enter the receiver's user id to send messages, attachments, and start video calls.</p>
              <button
                onClick={initiateCall}
                disabled={!receiverId || callStatus}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-3 rounded-3xl font-semibold"
              >
                📞 Start Video Call
              </button>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-5 flex flex-col gap-4">
              <div className="space-y-3 overflow-hidden max-h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-500">No messages yet. Enter a user id to begin.</div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender === getCurrentUserId();
                    return (
                      <div key={message._id} className={`rounded-3xl p-4 ${isOwnMessage ? "bg-blue-950/70" : "bg-slate-900/80"}`}>
                        {message.text && <p className="mb-2">{message.text}</p>}
                        {message.attachments?.map((attachment, index) => (
                          <div key={index} className="mb-2 rounded-2xl bg-slate-950/80 p-3">
                            {attachment.contentType?.startsWith("image/") ? (
                              <img src={attachment.url} alt={attachment.filename} className="max-w-full rounded-xl" />
                            ) : (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:text-sky-300"
                              >
                                Download {attachment.filename || "attachment"}
                              </a>
                            )}
                          </div>
                        ))}
                        {isOwnMessage && (
                          <p className="text-xs text-slate-500 mt-2">
                            {message.read || readReceipts[message.receiver] ? "✓ Read" : "➤ Delivered"}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {peerTyping && <p className="text-sm text-slate-400 italic">User is typing...</p>}
              <form onSubmit={send} className="flex flex-col gap-3">
              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
              <input
                value={text}
                onChange={onInputChange}
                placeholder="Type message"
                className="auth-input w-full rounded-3xl px-4 py-3"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerAttachmentPicker}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Attach File
                </button>
                <span className="text-slate-400 text-sm truncate">{attachmentFile ? attachmentFile.name : "No file attached"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
              {attachmentFile && (
                <div className="text-slate-400 text-xs">Ready to send: {attachmentFile.name}</div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={!receiverId || (!text && !attachmentFile) || uploadingAttachment}
                  className="brand-button rounded-3xl px-5 py-3 text-sm font-semibold"
                >
                  {uploadingAttachment ? "Uploading..." : "Send"}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messaging;
