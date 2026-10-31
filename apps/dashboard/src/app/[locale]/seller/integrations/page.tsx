'use client';

import { useState } from 'react';
import {
  Globe,
  FileSpreadsheet,
  Zap,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Link2Off,
  X,
} from 'lucide-react';
import {
  useSellerMe,
  useHealth,
  useConnectFacebook,
  useDisconnectFacebook,
  useWebhookToggle,
  useDisconnectSheets,
} from '@/lib/queries/integrations';
import { api } from '@/lib/api-client';

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`}
    />
  );
}

export default function IntegrationsPage() {
  const { data: seller, isLoading: sellerLoading } = useSellerMe();
  const { data: health, isLoading: healthLoading } = useHealth();
  const connectFb = useConnectFacebook();
  const disconnectFb = useDisconnectFacebook();
  const webhookToggle = useWebhookToggle();
  const disconnectSheets = useDisconnectSheets();

  // Facebook connect form state
  const [showFbForm, setShowFbForm] = useState(false);
  const [fbPageId, setFbPageId] = useState('');
  const [fbToken, setFbToken] = useState('');
  const [fbError, setFbError] = useState('');

  const fbConnected = !!seller?.facebookPageId;
  const sheetsConnected = !!seller?.googleSheetConnected;
  const ragOnline = health?.deps?.ragEngine?.status === 'ok';

  async function handleFbConnect(e: React.FormEvent) {
    e.preventDefault();
    setFbError('');
    try {
      await connectFb.mutateAsync({ pageId: fbPageId.trim(), pageAccessToken: fbToken.trim() });
      setShowFbForm(false);
      setFbPageId('');
      setFbToken('');
    } catch (err) {
      setFbError((err as Error).message || 'Connection failed. Check your Page ID and token.');
    }
  }

  async function connectSheets() {
    try {
      const data = await api.get<{ url?: string }>('/seller/connect-sheets/url');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert((err as Error).message || 'Could not get Google Sheets auth URL. Check API is running.');
    }
  }

  if (sellerLoading) {
    return <p className="text-[#9CA3AF] text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#09090B]">Integrations</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Connect your channels and services</p>
      </div>

      <div className="space-y-4">

        {/* ── Facebook Meta ── */}
        <div className="bg-white rounded-xl border border-[#EDE9FE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EDE9FE] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
              <Globe size={18} className="text-[#1877F2]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#09090B]">Facebook Page</p>
              <p className="text-xs text-[#6B7280]">Receive Messenger orders from your Facebook Page</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot online={fbConnected} />
              <span className="text-xs text-[#6B7280]">{fbConnected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>

          <div className="px-5 py-4">
            {fbConnected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="Page" value={seller!.facebookPageName ?? '—'} />
                  <InfoCell label="Page ID" value={seller!.facebookPageId!} mono />
                  <InfoCell
                    label="Webhook"
                    value={
                      <span className="flex items-center gap-1.5">
                        {seller!.webhookSubscribed ? (
                          <><CheckCircle size={13} className="text-green-500" /><span>Subscribed</span></>
                        ) : (
                          <><XCircle size={13} className="text-gray-400" /><span>Not subscribed</span></>
                        )}
                      </span>
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => webhookToggle.mutate({ subscribe: !seller!.webhookSubscribed })}
                    disabled={webhookToggle.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={webhookToggle.isPending ? 'animate-spin' : ''} />
                    {seller!.webhookSubscribed ? 'Unsubscribe webhook' : 'Subscribe webhook'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Disconnect Facebook Page? This will stop AI replies.')) {
                        disconnectFb.mutate();
                      }
                    }}
                    disabled={disconnectFb.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Link2Off size={13} />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : showFbForm ? (
              <form onSubmit={(e) => { void handleFbConnect(e); }} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[#09090B]">Enter Facebook Page details</p>
                  <button
                    type="button"
                    onClick={() => { setShowFbForm(false); setFbError(''); }}
                    className="text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Facebook Page ID</label>
                  <input
                    type="text"
                    required
                    value={fbPageId}
                    onChange={(e) => setFbPageId(e.target.value)}
                    placeholder="e.g. 123456789012345"
                    className="w-full px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D39EB]/30 focus:border-[#7D39EB]"
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Found at facebook.com/your-page → About → Page ID
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Page Access Token</label>
                  <input
                    type="password"
                    required
                    value={fbToken}
                    onChange={(e) => setFbToken(e.target.value)}
                    placeholder="EAAxxxx…"
                    className="w-full px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D39EB]/30 focus:border-[#7D39EB]"
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Generate from Meta for Developers → Graph API Explorer
                  </p>
                </div>
                {fbError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {fbError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={connectFb.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1565D8] disabled:opacity-60 transition-colors"
                >
                  {connectFb.isPending ? (
                    <><RefreshCw size={14} className="animate-spin" /> Connecting…</>
                  ) : (
                    <><Globe size={14} /> Connect Page</>
                  )}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm text-[#6B7280] mb-3">
                  Connect your Facebook Page to start receiving and replying to Messenger orders automatically.
                </p>
                <button
                  onClick={() => setShowFbForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1565D8] transition-colors"
                >
                  <Globe size={15} />
                  Connect Facebook Page
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Google Sheets ── */}
        <div className="bg-white rounded-xl border border-[#EDE9FE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EDE9FE] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#09090B]">Google Sheets</p>
              <p className="text-xs text-[#6B7280]">Export every confirmed order to a Google Sheet automatically</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot online={sheetsConnected} />
              <span className="text-xs text-[#6B7280]">{sheetsConnected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>

          <div className="px-5 py-4">
            {sheetsConnected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {seller?.googleSheetUrl && (
                    <InfoCell label="Sheet URL" value="Google Sheet" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {seller?.googleSheetUrl && (
                    <a
                      href={seller.googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                    >
                      <ExternalLink size={13} />
                      Open Sheet
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Disconnect Google Sheets?')) {
                        disconnectSheets.mutate();
                      }
                    }}
                    disabled={disconnectSheets.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Link2Off size={13} />
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#6B7280] mb-3">
                  Orders are auto-saved to a &ldquo;jobabai Orders&rdquo; sheet in your Google Drive after confirmation.
                </p>
                <button
                  onClick={() => { void connectSheets(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <FileSpreadsheet size={15} />
                  Connect Google Sheets
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RAG Engine ── */}
        <div className="bg-white rounded-xl border border-[#EDE9FE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EDE9FE] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7D39EB]/10 flex items-center justify-center">
              <Zap size={18} className="text-[#7D39EB]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#09090B]">AI Reply Engine</p>
              <p className="text-xs text-[#6B7280]">Powers product search and automated Messenger replies</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot online={!healthLoading && ragOnline} />
              <span className="text-xs text-[#6B7280]">
                {healthLoading ? 'Checking…' : ragOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell
                label="Status"
                value={
                  <span className={`font-medium ${ragOnline ? 'text-green-600' : 'text-red-500'}`}>
                    {healthLoading ? '…' : ragOnline ? 'Online' : 'Offline'}
                  </span>
                }
              />
              {health?.deps?.ragEngine?.latencyMs !== undefined && (
                <InfoCell label="Latency" value={`${health.deps.ragEngine.latencyMs} ms`} />
              )}
              {health?.deps?.mongo?.status && (
                <InfoCell
                  label="Database"
                  value={
                    <span className={health.deps.mongo.status === 'ok' ? 'text-green-600' : 'text-red-500'}>
                      {health.deps.mongo.status === 'ok' ? 'Connected' : 'Error'}
                    </span>
                  }
                />
              )}
            </div>
            <p className="text-xs text-[#9CA3AF] mt-3">
              This is a managed service. Contact support if the engine shows offline for more than 5 minutes.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[#9CA3AF] mb-0.5">{label}</p>
      <p className={`text-sm text-[#09090B] truncate ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </p>
    </div>
  );
}
