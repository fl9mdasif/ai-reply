'use client';

import { Globe, FileSpreadsheet, Zap, CheckCircle, XCircle, ExternalLink, RefreshCw, Link2Off } from 'lucide-react';
import {
  useSellerMe,
  useHealth,
  useDisconnectFacebook,
  useWebhookToggle,
  useDisconnectSheets,
} from '@/lib/queries/integrations';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  const disconnectFb = useDisconnectFacebook();
  const webhookToggle = useWebhookToggle();
  const disconnectSheets = useDisconnectSheets();

  const fbConnected = !!seller?.facebook;
  const sheetsConnected = !!seller?.sheets;
  const ragOnline = health?.deps?.ragEngine?.status === 'ok';

  function connectFacebook() {
    // Redirect browser to core-api Facebook OAuth entry point.
    // Token is sent as a cookie (jba_auth) which the server reads on redirect.
    window.location.href = `${API_URL}/seller/connect-facebook`;
  }

  async function connectSheets() {
    // Get signed OAuth URL from server then redirect.
    try {
      const data = await fetch(`${API_URL}/seller/connect-sheets/url`, {
        headers: {
          Authorization: `Bearer ${document.cookie
            .split(';')
            .find((c) => c.trim().startsWith('jba_auth='))
            ?.split('=')[1] ?? ''}`,
        },
      }).then((r) => r.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      alert('Could not get Google Sheets auth URL. Check API is running.');
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
                  <InfoCell label="Page" value={seller.facebook!.pageName} />
                  <InfoCell label="Page ID" value={seller.facebook!.pageId} mono />
                  <InfoCell
                    label="Webhook"
                    value={
                      <span className="flex items-center gap-1.5">
                        {seller.facebook!.webhookSubscribed ? (
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
                    onClick={() => webhookToggle.mutate({ subscribe: !seller.facebook!.webhookSubscribed })}
                    disabled={webhookToggle.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={webhookToggle.isPending ? 'animate-spin' : ''} />
                    {seller.facebook!.webhookSubscribed ? 'Unsubscribe webhook' : 'Subscribe webhook'}
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
              <div>
                <p className="text-sm text-[#6B7280] mb-3">
                  Connect your Facebook Page to start receiving and replying to Messenger orders automatically.
                </p>
                <button
                  onClick={connectFacebook}
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
                  <InfoCell label="Sheet ID" value={seller.sheets!.spreadsheetId} mono />
                  {seller.sheets!.lastSyncAt && (
                    <InfoCell
                      label="Last sync"
                      value={new Date(seller.sheets!.lastSyncAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={seller.sheets!.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EDE9FE] text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                  >
                    <ExternalLink size={13} />
                    Open Sheet
                  </a>
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
                  Orders are auto-saved to a "jobabai Orders" sheet in your Google Drive after confirmation.
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
