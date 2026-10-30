'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useHealth } from '@/lib/queries/integrations';

function StatusRow({ label, status, latency }: { label: string; status?: string; latency?: number }) {
  const ok = status === 'ok';
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1e1e1e] last:border-0">
      <span className="text-[#aaa] text-sm">{label}</span>
      <div className="flex items-center gap-3">
        {latency !== undefined && (
          <span className="text-xs font-mono text-[#555]">{latency} ms</span>
        )}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ok ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
          {ok ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useHealth();
  const [lastRefresh, setLastRefresh] = useState('');

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastRefresh(new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { timeStyle: 'medium' }));
    }
  }, [dataUpdatedAt]);

  // Auto-refresh every 30s (useHealth already has refetchInterval: 30_000)
  // Show countdown
  const [countdown, setCountdown] = useState(30);
  useEffect(() => {
    setCountdown(30);
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 30 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-[#555] text-sm mt-0.5">
            {lastRefresh ? `Last updated ${lastRefresh}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#444]">Refresh in {countdown}s</span>
          <button
            onClick={() => { void refetch(); }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141414] border border-[#2a2a2a] text-[#666] hover:text-white text-sm disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] px-5 mb-4">
        <h2 className="text-xs text-[#555] uppercase tracking-wider py-3 border-b border-[#1e1e1e]">Services</h2>
        {isLoading && !data && (
          <p className="text-[#555] text-sm text-center py-6">Checking services…</p>
        )}
        {data && (
          <>
            <StatusRow
              label="RAG Engine"
              status={data.deps?.ragEngine?.status}
              latency={data.deps?.ragEngine?.latencyMs}
            />
            <StatusRow
              label="MongoDB"
              status={data.deps?.mongo?.status}
              latency={data.deps?.mongo?.latencyMs}
            />
            <StatusRow label="API Server" status="ok" />
          </>
        )}
      </div>

      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] px-5 mb-4">
        <h2 className="text-xs text-[#555] uppercase tracking-wider py-3 border-b border-[#1e1e1e]">Overall</h2>
        <div className="py-4 flex items-center gap-3">
          {isLoading && !data ? (
            <span className="text-[#555] text-sm">Checking…</span>
          ) : (
            <>
              <span className={`w-3 h-3 rounded-full ${data?.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-lg font-semibold ${data?.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {data?.status === 'ok' ? 'All systems operational' : 'Degraded — check services above'}
              </span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-[#444] text-center">Auto-refreshes every 30 seconds</p>
    </div>
  );
}
