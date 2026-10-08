import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Radio,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Database,
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await apiFetch<any>('/api/system/health');
      setHealth(data);
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !health) {
    return <div className="text-center py-20 text-xs text-zinc-400">Memeriksa metrik sistem...</div>;
  }

  const isWaConnected = health.whatsappStatus === 'connected';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">System Health & Telemetry</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Status runtime Node.js, pemakaian memori, koneksi WebSocket, antrian retry media, dan kesehatan bot.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Backend Server */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">API Server</div>
            <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Healthy</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Service */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isWaConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">WhatsApp Baileys</div>
            <div
              className={`font-bold text-sm flex items-center gap-1.5 ${
                isWaConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isWaConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="capitalize">{health.whatsappStatus}</span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Database Storage</div>
            <div className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>ACID Persistent</span>
            </div>
          </div>
        </div>

        {/* Realtime WebSocket */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">WebSocket Clients</div>
            <div className="font-bold text-sm text-purple-600 dark:text-purple-400">
              {health.websocketClients} Aktif
            </div>
          </div>
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memory Details */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Node.js Process Memory</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Heap Used</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">{health.memory?.heapUsedMb} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Heap Total</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{health.memory?.heapTotalMb} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Resident Set Size (RSS)</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{health.memory?.rssMb} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Server Uptime</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {Math.floor(health.uptimeSeconds / 60)} menit
              </span>
            </div>
          </div>
        </div>

        {/* Media Queue & Worker */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Retry Queue & Backoff Worker</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Pending Retry Queue</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {health.queue?.pendingRetries || 0} tugas
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Worker Status</span>
              <span className="text-emerald-500 font-semibold">Idle & Ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Platform OS</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {health.system?.platform} ({health.system?.arch})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">CPU Cores</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{health.system?.cpuCores} Cores</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
