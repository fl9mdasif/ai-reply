'use client';

import { useState } from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { useConversations, useConversation, type Conversation } from '@/lib/queries/conversations';
import { Badge } from '@/components/ui/Badge';

const STATE_VARIANT: Record<string, 'confirmed' | 'pending' | 'cancelled' | 'default'> = {
  idle: 'default',
  collecting: 'pending',
  awaiting_confirmation: 'pending',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
};

const STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  collecting: 'Collecting',
  awaiting_confirmation: 'Awaiting confirm',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

function maskPsid(psid: string) {
  if (psid.length <= 6) return psid;
  return psid.slice(0, 4) + '••••' + psid.slice(-4);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ConversationDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useConversation(id);

  return (
    <>
      <div className="absolute inset-0 bg-black/20 lg:hidden" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full lg:relative lg:w-auto flex flex-col bg-white border-l border-[#EDE9FE] lg:flex-1">
        {/* Detail header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDE9FE]">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F0FF] text-[#6B7280] lg:hidden">
            <ChevronRight size={16} className="rotate-180" />
          </button>
          {data && (
            <div>
              <p className="font-semibold text-[#09090B] text-sm font-mono">{maskPsid(data.customerPsid)}</p>
              <Badge variant={STATE_VARIANT[data.state] ?? 'default'} className="mt-0.5">
                {STATE_LABEL[data.state] ?? data.state}
              </Badge>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoading && <p className="text-center text-[#9CA3AF] text-sm py-8">Loading…</p>}
          {data?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#F3F0F9] text-[#09090B] rounded-tl-sm'
                    : 'bg-[#7D39EB] text-white rounded-tr-sm'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                {msg.timestamp && (
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-[#9CA3AF]' : 'text-white/60'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          ))}
          {data?.messages.length === 0 && (
            <p className="text-center text-[#9CA3AF] text-sm py-8">No messages yet.</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#EDE9FE]">
          <p className="text-xs text-[#9CA3AF] text-center">Read-only — AI handles all replies via Messenger</p>
        </div>
      </div>
    </>
  );
}

export default function ConversationsPage() {
  const { data, isLoading } = useConversations(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = data?.conversations ?? [];

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl border border-[#EDE9FE] overflow-hidden relative">
      {/* List panel */}
      <div className={`flex flex-col w-full lg:w-80 lg:min-w-[320px] border-r border-[#EDE9FE] ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-[#EDE9FE]">
          <h1 className="font-semibold text-[#09090B]">Conversations</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{conversations.length} total</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="text-center text-[#9CA3AF] text-sm py-8">Loading…</p>}
          {!isLoading && conversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageCircle size={32} className="text-[#EDE9FE] mx-auto mb-3" />
              <p className="text-[#6B7280] text-sm">No conversations yet.</p>
              <p className="text-[#9CA3AF] text-xs mt-1">They appear here when customers message your Page.</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.conversationId}
              onClick={() => setSelectedId(conv.conversationId)}
              className={`w-full text-left px-4 py-3.5 border-b border-[#F3F0FF] hover:bg-[#FAFAFE] transition-colors ${
                selectedId === conv.conversationId ? 'bg-[#F3F0FF]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-sm font-medium text-[#09090B]">
                  {maskPsid(conv.customerPsid)}
                </span>
                <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap mt-0.5">
                  {timeAgo(conv.lastActivityAt)}
                </span>
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-[#6B7280] truncate mb-1.5">{conv.lastMessage}</p>
              )}
              <Badge variant={STATE_VARIANT[conv.state] ?? 'default'}>
                {STATE_LABEL[conv.state] ?? conv.state}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId ? (
        <ConversationDetail id={selectedId} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[#9CA3AF] text-sm">
          Select a conversation to view messages
        </div>
      )}
    </div>
  );
}
