import React, { useState } from 'react';
import {
  TestTube2,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { DiagnosticReport, DiagnosticResult } from '../types';

export const DiagnosticsPage: React.FC = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await apiFetch<{ report: DiagnosticReport }>('/api/diagnostics/run', {
        method: 'POST',
      });
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Gagal menjalankan diagnostik');
    } finally {
      setRunning(false);
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PASS</span>
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>FAIL</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>UNSUPPORTED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 border border-purple-500/20">
            <TestTube2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              End-to-End Diagnostics & Test Suite
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Uji coba real-time menyeluruh untuk auto-save, view-once recovery, anti-delete archive, websocket, dan disk storage.
            </p>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menjalankan Tes...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Jalankan Semua Tes</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Scorecard if report is available */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
            <div className="text-xs text-zinc-400 font-medium">Total Pengujian</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{report.total}</div>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Lolos (PASS)</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{report.passed}</div>
          </div>

          <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Gagal (FAIL)</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{report.failed}</div>
          </div>

          <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unsupported</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{report.unsupported}</div>
          </div>
        </div>
      )}

      {/* Test Results Table */}
      {report ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
          {report.results.map((res) => (
            <div key={res.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-white">{res.name}</span>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {res.category}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">{res.details}</p>
                {res.error && (
                  <div className="text-rose-500 text-[10px] font-mono bg-rose-500/10 p-1.5 rounded">
                    Error: {res.error}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-zinc-400 font-mono">{res.durationMs}ms</span>
                {getStatusBadge(res.status)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 space-y-3">
          <TestTube2 className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
            Diagnostik Belum Dijalankan
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Klik tombol "Jalankan Semua Tes" di atas untuk memverifikasi integritas database, pipeline View Once, Anti-Delete, penyimpanan media, dan websocket.
          </p>
        </div>
      )}
    </div>
  );
};
