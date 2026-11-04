import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDateIndo } from '../../utils/terbilang.ts';
import {
  ShieldAlert,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
} from 'lucide-react';

interface AuditLogViewProps {
  user: User;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.logs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'PERINGATAN: Apakah Anda yakin ingin mengatur ulang database ke kondisi default? Seluruh data baru akan direset ke data sampel awal.'
      )
    ) {
      setIsResetting(true);
      try {
        const res = await api.resetDatabase();
        if (res.success) {
          setResetMessage('Database berhasil direset ke kondisi default.');
          setTimeout(() => setResetMessage(''), 4000);
          loadLogs();
        }
      } finally {
        setIsResetting(false);
      }
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      (l.schoolName && l.schoolName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#0B5D3B]" />
            <span>Audit Trail & Log Keamanan Sistem Terpusat</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan rekam jejak digital setiap aksi simpan, ubah, hapus, dan cetak dokumen keuangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/database/backup"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Backup JSON</span>
          </a>
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isResetting ? 'Mereset...' : 'Reset Database'}</span>
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aktivitas, modul, username, atau sekolah..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {filteredLogs.length} Catatan Log
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Waktu (Timestamp)</th>
                <th className="px-3 py-3">Pengguna & Role</th>
                <th className="px-3 py-3">Satuan Pendidikan</th>
                <th className="px-3 py-3">Modul</th>
                <th className="px-3 py-3">Aksi</th>
                <th className="px-4 py-3">Rincian Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block">{log.username}</span>
                    <span className="text-[10px] text-slate-400">{log.userRole}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                    {log.schoolName || 'Pusat Dinas'}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {log.module}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 leading-snug">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
