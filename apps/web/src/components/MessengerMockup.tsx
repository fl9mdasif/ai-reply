"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const MESSAGES = [
  { from: "customer", text: "সিল্ক শাড়ির দাম কত?" },
  { from: "bot", text: "আমাদের সিল্ক শাড়ির দাম ৳২,৪৫০। রঙ আছে: লাল, নীল, সবুজ।" },
  { from: "customer", text: "লাল রং-এর একটা অর্ডার করতে চাই" },
  { from: "bot", text: "অবশ্যই! আপনার নাম ও ফোন নম্বর দিন।" },
  { from: "customer", text: "Rahim — 01712345678" },
  { from: "bot", text: "✓ অর্ডার নেওয়া হয়েছে। ডেলিভারির ঠিকানা দিন।" },
];

export default function MessengerMockup() {
  return (
    <div
      className="relative mx-auto w-full max-w-xs"
      style={{ perspective: "800px", transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ rotateY: [0, 3, 0, -3, 0], rotateX: [0, -2, 0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="rounded-3xl border border-white/10 bg-[#1c1c1e] shadow-2xl overflow-hidden">
          {/* status bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1c1c1e]">
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-white/60" />
              ))}
            </div>
          </div>

          {/* messenger header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#242425] border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">jobabai Bot</p>
              <p className="text-green-400 text-[10px]">Active now</p>
            </div>
          </div>

          {/* messages */}
          <div className="px-3 py-3 space-y-2 bg-[#1c1c1e] min-h-[260px]">
            {MESSAGES.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.4 + 0.5 }}
                className={`flex ${msg.from === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] leading-snug ${
                    msg.from === "customer"
                      ? "bg-[#7D39EB] text-white rounded-br-sm"
                      : "bg-[#2c2c2e] text-white/90 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {/* typing indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 3.5, duration: 1.5, repeat: Infinity }}
              className="flex justify-start"
            >
              <div className="bg-[#2c2c2e] rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/50"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ delay: i * 0.15, duration: 0.6, repeat: Infinity }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* glow */}
        <div className="absolute inset-0 rounded-3xl bg-[#7D39EB]/20 blur-2xl -z-10 scale-110" />
      </motion.div>
    </div>
  );
}
