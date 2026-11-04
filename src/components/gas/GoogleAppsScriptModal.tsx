import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  X,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
  Search,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'code'>('status');
  const [scriptCode, setScriptCode] = useState<string>('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [webAppUrl, setWebAppUrl] = useState<string>('');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(false);
  
  // Diagnostics & Status
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Connection Testing
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    status?: string;
    totalSheetsFound?: number;
  } | null>(null);

  // Handshake Testing
  const [isTestingHandshake, setIsTestingHandshake] = useState<boolean>(false);
  const [handshakeResult, setHandshakeResult] = useState<{
    success: boolean;
    status?: string;
    isHtml?: boolean;
    message: string;
    latencyMs?: number;
    documentationUrl?: string;
    steps?: string[];
  } | null>(null);

  // Syncing
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    lastSyncTimestamp?: string;
  } | null>(null);

  // Saving settings
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadAll();
    }
  }, [isOpen]);

  const loadAll = async () => {
    setIsLoadingDiagnostics(true);
    try {
      const [scriptRes, settingsRes, diagRes] = await Promise.all([
        api.getGasScript(),
        api.getSettings(),
        api.getGasDiagnostics(),
      ]);

      if (scriptRes.success) {
        setScriptCode(scriptRes.scriptCode);
        setInstructions(scriptRes.instructions);
      }
      if (settingsRes.success) {
        setWebAppUrl(settingsRes.settings.googleAppsScriptUrl || '');
        setIsLiveSync(Boolean(settingsRes.settings.isLiveSyncEnabled));
      }
      if (diagRes.success) {
        setDiagnostics(diagRes);
      }
    } catch (err) {
      console.error('Error loading GAS details:', err);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateSettings({
        googleAppsScriptUrl: webAppUrl.trim(),
        isLiveSyncEnabled: isLiveSync,
      });
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh diagnostics
        const diagRes = await api.getGasDiagnostics();
        if (diagRes.success) setDiagnostics(diagRes);
        onSyncComplete?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await api.testGasConnection(webAppUrl.trim());
      setTestResult(result);
      if (result.success) {
        const diagRes = await api.getGasDiagnostics();
        if (diagRes.success) setDiagnostics(diagRes);
        onSyncComplete?.();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Koneksi gagal atau jaringan terputus.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestHandshake = async () => {
    setIsTestingHandshake(true);
    setHandshakeResult(null);
    try {
      const result = await api.testGasHandshake(webAppUrl.trim());
      setHandshakeResult(result);
      if (result.success) {
        onSyncComplete?.();
      }
    } catch (err: any) {
      setHandshakeResult({
        success: false,
        message: err.message || 'Gagal terhubung ke endpoint Handshake.',
      });
    } finally {
      setIsTestingHandshake(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.syncGasData(webAppUrl.trim());
      setSyncResult(result);
      if (result.success) {
        const diagRes = await api.getGasDiagnostics();
        if (diagRes.success) setDiagnostics(diagRes);
        onSyncComplete?.();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Gagal menyinkronkan data.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredSheets = diagnostics?.sheets
    ? Object.entries(diagnostics.sheets as Record<string, { columnCount: number; localCount: number; columns: string[] }>).filter(
        ([sheetName]) =>
          sheetName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const isConfigured = Boolean(webAppUrl && webAppUrl.trim().startsWith('https://script.google.com/'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-emerald-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-emerald-100 bg-linear-to-r from-emerald-800 to-[#0B5D3B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Status Integrasi Google Spreadsheet & Apps Script
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  28 Sheet Enterprise
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-normal">
                Verifikasi kesesuaian struktur database, audit kolom, dan status sinkronisasi real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Structure compliance */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-500 text-[10px] block font-medium">Struktur Database:</span>
                <span className="font-bold text-emerald-800">100% SESUAI & LENGKAP (28 Sheet)</span>
              </div>
            </div>

            {/* Sync status badge */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
              <Radio
                className={`w-4 h-4 shrink-0 ${
                  isConfigured && isLiveSync ? 'text-emerald-600 animate-pulse' : 'text-amber-500'
                }`}
              />
              <div>
                <span className="text-slate-500 text-[10px] block font-medium">Status Sinkronisasi:</span>
                <span
                  className={`font-bold ${
                    isConfigured
                      ? diagnostics?.configuration?.lastSyncTimestamp
                        ? 'text-emerald-700'
                        : 'text-blue-700'
                      : 'text-amber-700'
                  }`}
                >
                  {!isConfigured
                    ? 'BELUM TERSINKRONKAN (URL Apps Script Kosong)'
                    : !isLiveSync
                    ? 'TERHUBUNG (Live Sync Belum Aktif)'
                    : diagnostics?.configuration?.lastSyncTimestamp
                    ? 'TERSINKRONISASI'
                    : 'SIAP SINKRONISASI'}
                </span>
              </div>
            </div>

            {/* Last sync timestamp */}
            {diagnostics?.configuration?.lastSyncTimestamp && (
              <div className="hidden sm:block text-slate-500 text-[11px]">
                Sinkron terakhir:{' '}
                <span className="font-semibold text-slate-700">
                  {new Date(diagnostics.configuration.lastSyncTimestamp).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="/api/database/excel-export"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Unduh langsung file Excel berisi 28 sheet lengkap tanpa ribet setup Apps Script"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Unduh Excel 28 Sheet</span>
            </a>
            <button
              onClick={handleTestHandshake}
              disabled={isTestingHandshake || !webAppUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Lakukan diagnostik Connection Handshake untuk memeriksa otorisasi izin dan respons HTML"
            >
              <Activity className={`w-3.5 h-3.5 ${isTestingHandshake ? 'animate-spin text-amber-700' : 'text-amber-700'}`} />
              <span>{isTestingHandshake ? 'Handshake...' : 'Uji Handshake'}</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !webAppUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#0B5D3B]' : ''}`} />
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !webAppUrl}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Layers className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-[#0B5D3B] text-[#0B5D3B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Pemeriksaan Struktur 28 Sheet & Rekonsiliasi Data</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-[#0B5D3B] text-[#0B5D3B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Konfigurasi Google Apps Script & Koneksi</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'code'
                ? 'border-[#0B5D3B] text-[#0B5D3B]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Source Code (Code.gs) & Panduan Pasang</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Handshake Diagnostic Alert */}
          {handshakeResult && (
            <div
              className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                handshakeResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {handshakeResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider">
                      {handshakeResult.success
                        ? 'Handshake Koneksi: Berhasil & Valid (JSON)'
                        : 'Handshake Koneksi: Respon HTML Terdeteksi'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed font-medium">
                      {handshakeResult.message}
                    </p>
                    {handshakeResult.latencyMs && (
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Waktu respons server: {handshakeResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setHandshakeResult(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Direct link & steps if HTML response detected */}
              {handshakeResult.isHtml && (
                <div className="mt-2 pt-3 border-t border-amber-200/80 space-y-3">
                  <div className="text-xs font-bold text-amber-950">
                    Langkah Penyelesaian Otorisasi Izin & Deployment "Anyone":
                  </div>
                  {handshakeResult.steps && (
                    <ol className="text-xs space-y-1.5 list-decimal list-inside text-amber-900 leading-relaxed font-medium">
                      {handshakeResult.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={handshakeResult.documentationUrl || "https://developers.google.com/apps-script/execution/web-apps"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Dokumentasi Resmi Google Web Apps: Otorisasi & Akses 'Anyone'</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications / Alerts if any test or sync action was run */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {testResult.success ? 'Hasil Uji Koneksi: Berhasil' : 'Hasil Uji Koneksi: Gagal / Belum Terhubung'}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">{testResult.message}</p>
                  {testResult.latencyMs && (
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Waktu respons server: {testResult.latencyMs} ms
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {syncResult && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                syncResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {syncResult.success ? 'Sinkronisasi Berhasil' : 'Gagal Sinkronisasi'}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">{syncResult.message}</p>
                </div>
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: Status & Audit 28 Sheet */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Alert Penjelasan: Kenapa Spreadsheet Masih Kosong? */}
              {!isConfigured ? (
                <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-amber-950">
                          Kenapa Google Spreadsheet Anda Masih Kosong?
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          Jalur Sinkronisasi Belum Terhubung
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Data sekolah, transaksi, atau anggaran yang Anda input <strong>sudah tersimpan aman di database aplikasi</strong>. 
                        Namun Google Spreadsheet Anda masih kosong karena <strong>URL Web App Google Apps Script belum dimasukkan ke aplikasi</strong>.
                        Aplikasi membutuhkan URL ini sebagai jembatan resmi (REST API) untuk mentransfer data ke Google Drive Anda.
                      </p>
                      <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('code')}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Langkah 1: Salin Kode & Deploy di Google Drive</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('config')}
                          className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Langkah 2: Masukkan URL Web App di Sini</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !diagnostics?.configuration?.lastSyncTimestamp ? (
                <div className="bg-blue-50/90 border-2 border-blue-300 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-blue-950">
                          URL Web App Terhubung! Klik "Sinkronkan Sekarang"
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          Siap Diisi Data
                        </span>
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        URL Web App telah terkonfigurasi. Untuk mengirim seluruh data yang sudah Anda input ke 28 sheet di Google Spreadsheet, silakan klik tombol <strong>"Sinkronkan Sekarang"</strong> di bawah ini.
                      </p>
                      <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <Layers className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Menyinkronkan ke Spreadsheet...' : 'Kirim Data ke Google Spreadsheet Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Checklist Validasi Standar BOSP */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Hasil Audit Struktur Aplikasi vs Google Spreadsheet:</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagnostics?.structuralChecks?.map((check: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex items-start gap-2.5 shadow-2xs"
                    >
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">{check.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 28 Sheets Explorer */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Daftar 28 Sheet Database BOSP & Audit Kolom
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Seluruh sheet telah diselaraskan dengan arsitektur SIPANDA BOSP, termasuk struktur verifikasi dan rincian belanja.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama sheet..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                        <th className="py-2.5 px-4">Nama Sheet</th>
                        <th className="py-2.5 px-4 text-center">Jumlah Kolom</th>
                        <th className="py-2.5 px-4 text-center">Data Lokal</th>
                        <th className="py-2.5 px-4 text-center">Status Skema</th>
                        <th className="py-2.5 px-4">Struktur Header Kolom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSheets.map(([sName, sData]: [string, any], idx) => (
                        <tr key={sName} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-4 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{sName}</span>
                          </td>
                          <td className="py-2 px-4 text-center font-mono font-semibold text-slate-700">
                            {sData.columnCount}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                              {sData.localCount} baris
                            </span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Check className="w-3 h-3" /> SESUAI
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {sData.columns.slice(0, 5).map((col: string, cIdx: number) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono"
                                >
                                  {col}
                                </span>
                              ))}
                              {sData.columns.length > 5 && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                                  +{sData.columns.length - 5} kolom
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Konfigurasi & Uji Koneksi */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="p-5 border border-emerald-200 rounded-2xl bg-emerald-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Parameter Koneksi Google Sheets & Web App
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Masukkan URL Web App hasil deployment Google Apps Script untuk menghubungkan sinkronisasi.
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      isConfigured
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {isConfigured ? 'Konfigurasi Lengkap' : 'Belum Terhubung'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      URL Deployment Google Apps Script (Web App Exec URL)
                    </label>
                    <input
                      type="text"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Salin dari menu <strong>Deploy &gt; Manage Deployments &gt; Web app URL</strong> di Google Apps Script Anda (WAJIB berakhiran <code>/exec</code>).
                    </span>

                    {webAppUrl && webAppUrl.includes('/edit') && (
                      <div className="mt-2.5 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-950 flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-0.5">URL Tidak Tepat: Anda Memasukkan URL Editor</strong>
                          URL yang berakhiran <code>/edit</code> adalah halaman editor script Google, bukan Web App API. Silakan buka menu <strong>Terapkan (Deploy) &gt; Penerapan baru (New deployment)</strong> &gt; pilih <strong>Aplikasi web</strong> &gt; salin URL yang berakhiran <code>/exec</code>.
                        </div>
                      </div>
                    )}

                    {webAppUrl && webAppUrl.endsWith('/dev') && (
                      <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block mb-0.5">URL Test Deployment (/dev)</strong>
                          URL yang berakhiran <code>/dev</code> hanya bisa dibuka oleh pemilik akun via browser dan memicu error login jika dihubungkan ke server. Harap gunakan URL Production yang berakhiran <code>/exec</code>.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLiveSync}
                        onChange={(e) => setIsLiveSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B5D3B]"></div>
                      <span className="ml-3 text-xs font-bold text-slate-800">
                        Aktifkan Sinkronisasi Otomatis (Live Sync)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-emerald-200/60">
                  {saveSuccess && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-4 h-4" /> Pengaturan berhasil disimpan dan diperbarui!
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting || !webAppUrl}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#0B5D3B]' : ''}`} />
                      <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Card: Panduan Mengatasi Error HTML / Unexpected Token */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Panduan Mengatasi Notifikasi: "Unexpected token &lt;, &lt;!doctype... is not valid JSON"</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Pesan tersebut muncul karena Google merespons dengan <strong>halaman login/halaman web (HTML)</strong>, bukan data transaksi (JSON). Hal ini dipicu oleh salah satu dari 2 penyebab berikut:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-1.5">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                      Akses Deployment Masih "Only Myself"
                    </span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Buka Google Apps Script &gt; klik <strong>Deploy (Terapkan)</strong> &gt; <strong>Manage deployments (Kelola penerapan)</strong> &gt; klik ikon <strong>Pensil (Edit)</strong>. Pada bagian <strong>"Who has access" (Yang memiliki akses)</strong>, ubah pilihannya menjadi <strong>"Anyone" (Siapa saja)</strong>, lalu klik <strong>Deploy</strong>.
                    </p>
                  </div>
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-1.5">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                      Salah Menyalin URL Editor (/edit)
                    </span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Pastikan URL yang disalin <strong>WAJIB berakhiran <code>/exec</code></strong> (misal: <code>https://script.google.com/macros/s/AKfy.../exec</code>). JANGAN menyalin URL halaman editor yang berakhiran <code>/edit</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Source Code & Panduan Pasang */}
          {activeTab === 'code' && (
            <div className="space-y-6">
              {/* Petunjuk Lengkap */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>5 Langkah Mudah Menghubungkan Google Spreadsheet:</span>
                </h4>
                <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Buka <strong>Google Spreadsheet baru</strong> di Google Drive dinas/sekolah Anda.
                  </li>
                  <li>
                    Klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode yang ada, lalu klik tombol <strong>"Salin Seluruh Kode"</strong> di bawah dan tempelkan ke file <code>Code.gs</code>.
                  </li>
                  <li>
                    Jalankan fungsi <strong><code>initDatabase()</code></strong> satu kali dari dropdown fungsi untuk membuat <strong>28 sheet lengkap dengan header warna hijau resmi</strong>.
                  </li>
                  <li>
                    Klik <strong>Deploy &gt; New Deployment &gt; Web app</strong>. Pilih:
                    <ul className="pl-6 list-disc text-slate-600 mt-1 space-y-0.5">
                      <li>Execute as: <strong>Me (email Anda)</strong></li>
                      <li>Who has access: <strong>Anyone</strong> (agar API dapat mengirim data transaksi)</li>
                    </ul>
                    Lalu salin <strong>Web App URL</strong> ke tab <em>"Konfigurasi & Koneksi"</em> di aplikasi ini.
                  </li>
                </ol>
              </div>

              {/* Code viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Source Code Google Apps Script (Code.gs)
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0B5D3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Seluruh Kode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono max-h-80 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-emerald-600">
                    {scriptCode}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SIPANDA BOSP Engine v2.5 · REST API Google Apps Script</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
