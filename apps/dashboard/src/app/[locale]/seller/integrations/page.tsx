'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ChevronRight,
} from 'lucide-react';
import {
  useSellerMe,
  useHealth,
  useConnectFacebookPage,
  useDisconnectFacebook,
  useWebhookToggle,
  useDisconnectSheets,
} from '@/lib/queries/integrations';
import { api } from '@/lib/api-client';

interface FacebookPageOption {
  id: string;
  name: string;
  access_token: string;
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`}
    />
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
      ${type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: seller, isLoading: sellerLoading, refetch: refetchSeller } = useSellerMe();
  const { data: health, isLoading: healthLoading } = useHealth();
  const connectPage = useConnectFacebookPage();
  const disconnectFb = useDisconnectFacebook();
  const webhookToggle = useWebhookToggle();
  const disconnectSheets = useDisconnectSheets();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [manualPageId, setManualPageId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [manualError, setManualError] = useState('');
  // Multiple pages picker
  const [pageOptions, setPageOptions] = useState<FacebookPageOption[]>([]);
  const [showPagePicker, setShowPagePicker] = useState(false);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const fb = searchParams.get('fb');
    const pagesParam = searchParams.get('pages');

    if (fb === 'connected') {
      void refetchSeller();
      showToast('Facebook Page connected!', 'success');
      router.replace('/en/seller/integrations');
    } else if (fb === 'pick' && pagesParam) {
      try {
        const pages = JSON.parse(decodeURIComponent(pagesParam)) as FacebookPageOption[];
        setPageOptions(pages);
        setShowPagePicker(true);
        router.replace('/en/seller/integrations');
      } catch {
        showToast('Failed to read page list from Facebook. Try again.', 'error');
      }
    } else if (fb === 'denied') {
      showToast('Facebook connection cancelled.', 'error');
      router.replace('/en/seller/integrations');
    } else if (fb === 'error') {
      showToast('Facebook connection failed. Try again.', 'error');
      router.replace('/en/seller/integrations');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setManualError('');
    try {
      await connectPage.mutateAsync({ pageId: manualPageId.trim(), pageAccessToken: manualToken.trim() });
      setManualPageId('');
      setManualToken('');
      showToast('Facebook Page connected!', 'success');
    } catch (err) {
      setManualError((err as Error).message || 'Connection failed. Check your Page ID and token.');
    }
  }

  async function startFacebookOAuth() {
    setFbLoading(true);
    try {
      const data = await api.get<{ url: string }>('/seller/facebook/auth-url');
      window.location.href = data.url;
      // don't setFbLoading(false) — page is navigating away
    } catch (err) {
      showToast((err as Error).message || 'Facebook OAuth not configured on server.', 'error');
      setFbLoading(false);
    }
  }

  async function pickPage(page: FacebookPageOption) {
    try {
      await connectPage.mutateAsync({ pageId: page.id, pageAccessToken: page.access_token });
      setShowPagePicker(false);
      setPageOptions([]);
      showToast(`${page.name} connected!`, 'success');
    } catch (err) {
      showToast((err as Error).message || 'Failed to connect page.', 'error');
    }
  }

  async function connectSheets() {
    try {
      const data = await api.get<{ url?: string }>('/seller/connect-sheets/url');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      showToast((err as Error).message || 'Google Sheets not configured on server.', 'error');
    }
  }

  const fbConnected = !!seller?.facebookPageId;
  const sheetsConnected = !!seller?.googleSheetConnected;
  const ragOnline = health?.deps?.ragEngine?.status === 'ok';

  if (sellerLoading) {
    return <p className="text-[#9CA3AF] text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Page picker modal */}
      {showPagePicker && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-[#09090B]">Choose a Facebook Page</p>
              <button onClick={() => setShowPagePicker(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#6B7280] mb-4">
              Multiple pages found. Pick the one you want to connect to jobabai.
            </p>
            <div className="space-y-2">
              {pageOptions.map((page) => (
                <button
                  key={page.id}
                  onClick={() => { void pickPage(page); }}
                  disabled={connectPage.isPending}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#EDE9FE] hover:bg-[#F8F7FF] hover:border-[#7D39EB] transition-all text-left disabled:opacity-50"
                >
                  <div>
                    <p className="font-medium text-[#09090B] text-sm">{page.name}</p>
                    <p className="text-xs text-[#9CA3AF] font-mono">{page.id}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#9CA3AF]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#09090B]">Integrations</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Connect your channels and services</p>
      </div>

      <div className="space-y-4">

        {/* ── Facebook ── */}
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
            ) : (
              <div className="space-y-4">
                {/* Manual fields — shown by default */}
                <form onSubmit={(e) => { void handleManualConnect(e); }} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1">Facebook Page ID</label>
                      <input
                        type="text"
                        required
                        value={manualPageId}
                        onChange={(e) => setManualPageId(e.target.value)}
                        placeholder="e.g. 123456789012345"
                        className="w-full px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D39EB]/30 focus:border-[#7D39EB]"
                      />
                      <p className="text-xs text-[#9CA3AF] mt-1">facebook.com/তোমার-page → About → Page ID</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1">Page Access Token</label>
                      <input
                        type="password"
                        required
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="EAAxxxx…"
                        className="w-full px-3 py-2 text-sm border border-[#EDE9FE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7D39EB]/30 focus:border-[#7D39EB]"
                      />
                      <p className="text-xs text-[#9CA3AF] mt-1">Meta for Developers → Graph API Explorer থেকে নাও</p>
                    </div>
                    {manualError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {manualError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={connectPage.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1565D8] disabled:opacity-60 transition-colors"
                    >
                      {connectPage.isPending ? (
                        <><RefreshCw size={14} className="animate-spin" /> Connecting…</>
                      ) : (
                        <><Globe size={14} /> Connect Page</>
                      )}
                    </button>
                  </form>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-[#EDE9FE]" />
                  <span className="text-xs text-[#9CA3AF]">অথবা</span>
                  <div className="flex-1 h-px bg-[#EDE9FE]" />
                </div>

                {/* OAuth — secondary */}
                <button
                  onClick={() => { void startFacebookOAuth(); }}
                  disabled={fbLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#1877F2]/30 text-[#1877F2] text-sm font-medium hover:bg-[#1877F2]/5 disabled:opacity-60 transition-colors"
                >
                  {fbLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Redirecting…</>
                  ) : (
                    <><Globe size={14} /> Connect with Facebook (OAuth)</>
                  )}
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
                <div className="flex flex-wrap gap-2">
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
                <p className="text-sm text-[#6B7280] mb-4">
                  Orders are auto-saved to a &ldquo;jobabai Orders&rdquo; sheet in your Google Drive after confirmation.
                </p>
                <button
                  onClick={() => { void connectSheets(); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <FileSpreadsheet size={15} />
                  Connect Google Sheets
                </button>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  You&apos;ll be taken to Google to sign in and grant access — no manual setup needed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── AI Engine ── */}
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
              This is a managed service. Contact support if it shows offline for more than 5 minutes.
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
