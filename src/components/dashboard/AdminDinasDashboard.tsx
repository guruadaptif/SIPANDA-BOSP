import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { formatRupiah } from '../../utils/terbilang.ts';
import {
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  BellRing,
} from 'lucide-react';

interface AdminDinasDashboardProps {
  onSelectSchool: (schoolId: string) => void;
  onNavigate: (tab: string) => void;
}

export const AdminDinasDashboard: React.FC<AdminDinasDashboardProps> = ({
  onSelectSchool,
  onNavigate,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDinasOverview();
      if (res.success) {
        setData(res);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-sm">Memuat data monitoring terpusat Dinas Pendidikan...</p>
      </div>
    );
  }

  const filteredSchools = data.schools.filter(
    (s: any) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.npsn.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0B5D3B] to-[#16865A] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Pusat Kendali Pengawasan Dana BOSP</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Dashboard Monitoring Satuan Pendidikan
          </h2>
          <p className="text-xs text-emerald-100 max-w-2xl mt-1 leading-relaxed">
            Pemantauan realisasi anggaran, ketertiban pembukuan kas umum, penyetoran pajak, dan kepatuhan
            laporan pertanggungjawaban Dana BOSP
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/database/backup"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg border border-white/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Cadangan DB</span>
          </a>
        </div>
      </div>

      {/* Notification Banner for Pending Registrations */}
      {data.pendingVerificationCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Pemberitahuan Pendaftaran Mandiri Satuan Pendidikan
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Terdapat <strong>{data.pendingVerificationCount} sekolah baru</strong> yang mendaftar mandiri dan menunggu verifikasi Anda sebelum dapat mengakses aplikasi.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('schools')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs shrink-0 transition-colors"
          >
            Verifikasi Sekolah Sekarang
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Sekolah Terdaftar</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums font-mono">
            {data.totalSchools}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-emerald-700 font-semibold">
              {data.activeSchools} Aktif
            </span>
            {data.pendingVerificationCount > 0 && (
              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded animate-pulse">
                {data.pendingVerificationCount} Menunggu
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Pagu BOSP</p>
          <p className="text-base font-extrabold text-slate-900 mt-1 tabular-nums font-mono truncate">
            {formatRupiah(data.totalPagu)}
          </p>
          <span className="text-[10px] text-slate-500">Tahun Anggaran 2026</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Dana Tersalurkan</p>
          <p className="text-base font-extrabold text-blue-700 mt-1 tabular-nums font-mono truncate">
            {formatRupiah(data.totalDiterima)}
          </p>
          <span className="text-[10px] text-slate-500">Kemenkeu SP2D</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Realisasi</p>
          <p className="text-base font-extrabold text-[#0B5D3B] mt-1 tabular-nums font-mono truncate">
            {formatRupiah(data.totalRealisasi)}
          </p>
          <span className="text-[10px] font-bold text-[#0B5D3B]">
            {data.overallPercentage.toFixed(1)}% Serapan
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Saldo Kas Seluruh</p>
          <p className="text-base font-extrabold text-amber-700 mt-1 tabular-nums font-mono truncate">
            {formatRupiah(data.totalBalance)}
          </p>
          <span className="text-[10px] text-slate-500">Bank & Tunai</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Status Laporan</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {data.completedCount} Lengkap
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {data.pendingCount} Belum
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Cut-off Triwulan I</span>
        </div>
      </div>

      {/* Realization Progress Bars */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0B5D3B]" />
            <span>Grafik Serapan Realisasi Anggaran per Satuan Pendidikan</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Rata-rata: {data.overallPercentage.toFixed(1)}%
          </span>
        </div>

        <div className="space-y-3">
          {data.schools.map((s: any) => (
            <div key={s.schoolId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                    {s.status} · {s.level}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-slate-600">{formatRupiah(s.keluar)}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-500">{formatRupiah(s.pagu)}</span>
                  <span className="font-bold text-[#0B5D3B] w-12 text-right">
                    {s.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#0B5D3B] h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(s.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schools Monitoring Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Satuan Pendidikan & Rekapitulasi SPJ
            </h3>
            <p className="text-xs text-slate-500">
              Klik nama sekolah untuk masuk dan memantau rincian pembukuan sekolah bersangkutan.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sekolah atau NPSN..."
              className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Satuan Pendidikan</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Pagu Anggaran</th>
                <th className="px-3 py-3 text-right">Realisasi Belanja</th>
                <th className="px-3 py-3 text-right">Saldo Kas</th>
                <th className="px-3 py-3 text-right">Total Pajak</th>
                <th className="px-3 py-3 text-center">Status SPJ</th>
                <th className="px-4 py-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.map((s: any) => (
                <tr key={s.schoolId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        onSelectSchool(s.schoolId);
                        onNavigate('bookkeeping');
                      }}
                      className="text-left font-bold text-slate-900 hover:text-[#0B5D3B] transition-colors"
                    >
                      {s.name}
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      NPSN: {s.npsn}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'Negeri'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-indigo-50 text-indigo-800'
                        }`}
                      >
                        {s.status} ({s.level})
                      </span>
                      {s.verificationStatus === 'MENUNGGU_VERIFIKASI' && (
                        <span className="block text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 w-fit animate-pulse">
                          Menunggu Verifikasi
                        </span>
                      )}
                      {s.verificationStatus === 'DINONAKTIFKAN' && (
                        <span className="block text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300 w-fit">
                          Dinonaktifkan
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {formatRupiah(s.pagu)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-[#0B5D3B]">
                    {formatRupiah(s.keluar)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-700">
                    {formatRupiah(s.saldo)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-600">
                    {formatRupiah(s.taxAmount)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.reportStatus === 'Lengkap'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.reportStatus === 'Lengkap' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Lengkap</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Belum Lengkap</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {s.verificationStatus === 'MENUNGGU_VERIFIKASI' ? (
                        <button
                          onClick={() => {
                            onSelectSchool(s.schoolId);
                            onNavigate('schools');
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shadow-2xs"
                        >
                          Verifikasi
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectSchool(s.schoolId);
                            onNavigate('reports');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0B5D3B] hover:text-white hover:bg-[#0B5D3B] border border-[#0B5D3B] rounded-md transition-colors"
                        >
                          Periksa SPJ
                        </button>
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
  );
};
