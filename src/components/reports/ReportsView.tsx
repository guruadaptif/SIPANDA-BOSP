import React, { useState, useEffect } from 'react';
import { School, Transaction, BudgetComponent, BudgetPlan } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import { exportBudgetRealizationToExcel } from '../../utils/excelExport.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  BarChart3,
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface ReportsViewProps {
  school: School;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ school }) => {
  const [reportType, setReportType] = useState<
    'REALISASI_BOSP' | 'PENGGUNAAN_KOMPONEN' | 'PENERIMAAN_SP2D' | 'LPJ_SPTJM'
  >('REALISASI_BOSP');
  const [stageFilter, setStageFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [plan, setPlan] = useState<BudgetPlan | null>(null);
  const [components, setComponents] = useState<BudgetComponent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  useEffect(() => {
    loadReportData();
  }, [school.id, school.activeFiscalYear]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [bRes, tRes] = await Promise.all([
        api.getBudgetSummary(school.id, school.activeFiscalYear),
        api.getTransactions({ schoolId: school.id, fiscalYear: school.activeFiscalYear }),
      ]);
      if (bRes.success) {
        setPlan(bRes.plan);
        setComponents(bRes.components);
      }
      if (tRes.success) {
        setTransactions(tRes.transactions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalPagu = plan?.totalPagu || 0;
  const totalPenerimaan = transactions
    .filter((t) => t.type === 'PENERIMAAN')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPengeluaran = transactions
    .filter((t) => t.type === 'PENGELUARAN')
    .reduce((sum, t) => sum + t.amount, 0);
  const sisaSaldo = totalPenerimaan - totalPengeluaran;
  const serapanPct = totalPagu > 0 ? (totalPengeluaran / totalPagu) * 100 : 0;

  const handleExportExcel = () => {
    exportBudgetRealizationToExcel(school.name, school.activeFiscalYear, totalPagu, components);
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'REALISASI_BOSP':
        return `Laporan Realisasi Penggunaan Dana BOSP (Tahap ${stageFilter === 'ALL' ? 'I & II' : stageFilter})`;
      case 'PENGGUNAAN_KOMPONEN':
        return 'Laporan Realisasi Berdasarkan Komponen Standar Nasional Pendidikan';
      case 'PENERIMAAN_SP2D':
        return 'Laporan Rekapitulasi Penerimaan Penyaluran Dana BOSP (SP2D)';
      case 'LPJ_SPTJM':
        return 'Laporan Pertanggungjawaban Mutlak Keuangan (SPTJM BOSP)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0B5D3B]" />
            <span>Pusat Laporan Pertanggungjawaban Keuangan BOSP</span>
          </h2>
          <p className="text-xs text-slate-500">
            Laporan Realisasi Anggaran, Rekapitulasi Tahap I & II, Rincian Objek Belanja, dan SPTJM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsPrintOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Resmi (A4)</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Stage Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setReportType('REALISASI_BOSP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'REALISASI_BOSP'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Realisasi Dana BOSP
          </button>
          <button
            onClick={() => setReportType('PENGGUNAAN_KOMPONEN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'PENGGUNAAN_KOMPONEN'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Penggunaan per Komponen
          </button>
          <button
            onClick={() => setReportType('PENERIMAAN_SP2D')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'PENERIMAAN_SP2D'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Penerimaan Penyaluran
          </button>
          <button
            onClick={() => setReportType('LPJ_SPTJM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'LPJ_SPTJM'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pengesahan SPTJM
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">Filter Tahap:</span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="ALL">Semua Tahap (1 Tahun)</option>
            <option value="1">Tahap I (Januari - Juni)</option>
            <option value="2">Tahap II (Juli - Desember)</option>
          </select>
        </div>
      </div>

      {/* Report Table Display */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{getReportTitle()}</h3>
            <p className="text-xs text-slate-500">
              {school.name} · Tahun Anggaran {school.activeFiscalYear}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Pagu: <strong>{formatRupiah(totalPagu)}</strong></span>
            <span>Realisasi: <strong className="text-[#0B5D3B]">{formatRupiah(totalPengeluaran)} ({serapanPct.toFixed(1)}%)</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-3 py-3 w-12 text-center">No</th>
                <th className="px-3 py-3 w-20">Kode</th>
                <th className="px-4 py-3">Komponen Penggunaan Dana</th>
                <th className="px-3 py-3">Sub-Komponen</th>
                <th className="px-4 py-3 text-right">Anggaran (Rp)</th>
                <th className="px-4 py-3 text-right">Realisasi Belanja (Rp)</th>
                <th className="px-4 py-3 text-right">Sisa Anggaran (Rp)</th>
                <th className="px-3 py-3 text-center">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map((comp, idx) => {
                const pct = comp.allocatedAmount > 0 ? (comp.realizedAmount / comp.allocatedAmount) * 100 : 0;
                return (
                  <tr key={comp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#0B5D3B]">{comp.code}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{comp.name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{comp.subComponent}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-800">
                      {formatRupiah(comp.allocatedAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-[#0B5D3B]">
                      {formatRupiah(comp.realizedAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {formatRupiah(comp.remainingAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">
                  TOTAL REALISASI DANA BOSP:
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatRupiah(totalPagu)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0B5D3B]">
                  {formatRupiah(totalPengeluaran)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                  {formatRupiah(totalPagu - totalPengeluaran)}
                </td>
                <td className="px-3 py-3 text-center font-mono text-[#0B5D3B]">
                  {serapanPct.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRINT MODAL FORMAL A4 */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title={getReportTitle()}
        documentNumber={`LPJ-BOSP/${school.npsn}/${school.activeFiscalYear}`}
        onExportExcel={handleExportExcel}
      >
        <OfficialKop school={school} />

        <div className="text-center my-4">
          <h2 className="text-base font-bold uppercase tracking-wider underline">
            {getReportTitle()}
          </h2>
          <p className="text-xs">
            Tahun Anggaran {school.activeFiscalYear} · Periode Penyaluran Tahap {stageFilter === 'ALL' ? 'I dan II' : stageFilter}
          </p>
        </div>

        {/* Ringkasan Realisasi */}
        <div className="grid grid-cols-4 gap-2 text-xs border border-black p-2 my-4 bg-slate-50 font-mono">
          <div>
            <span className="text-[10px] text-slate-600 block">Pagu Anggaran:</span>
            <strong>{formatRupiah(totalPagu)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Dana Diterima:</span>
            <strong>{formatRupiah(totalPenerimaan)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Total Realisasi:</span>
            <strong>{formatRupiah(totalPengeluaran)}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Sisa Saldo Kas:</span>
            <strong>{formatRupiah(sisaSaldo)}</strong>
          </div>
        </div>

        {/* Tabel Realisasi */}
        <table className="w-full text-[11px] my-4 border border-black">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black p-1 w-8">No</th>
              <th className="border border-black p-1 w-16">Kode</th>
              <th className="border border-black p-1">Komponen Penggunaan Dana</th>
              <th className="border border-black p-1 w-28 text-right">Alokasi (Rp)</th>
              <th className="border border-black p-1 w-28 text-right">Realisasi (Rp)</th>
              <th className="border border-black p-1 w-28 text-right">Sisa (Rp)</th>
              <th className="border border-black p-1 w-14 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => {
              const pct = c.allocatedAmount > 0 ? (c.realizedAmount / c.allocatedAmount) * 100 : 0;
              return (
                <tr key={c.id}>
                  <td className="border border-black p-1 text-center">{i + 1}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{c.code}</td>
                  <td className="border border-black p-1">{c.name}</td>
                  <td className="border border-black p-1 text-right font-mono">{c.allocatedAmount.toLocaleString('id-ID')}</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{c.realizedAmount.toLocaleString('id-ID')}</td>
                  <td className="border border-black p-1 text-right font-mono">{c.remainingAmount.toLocaleString('id-ID')}</td>
                  <td className="border border-black p-1 text-center font-mono">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="border border-black p-1 text-right">TOTAL:</td>
              <td className="border border-black p-1 text-right font-mono">{totalPagu.toLocaleString('id-ID')}</td>
              <td className="border border-black p-1 text-right font-mono">{totalPengeluaran.toLocaleString('id-ID')}</td>
              <td className="border border-black p-1 text-right font-mono">{(totalPagu - totalPengeluaran).toLocaleString('id-ID')}</td>
              <td className="border border-black p-1 text-center font-mono">{serapanPct.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>

        {/* SPTJM Paragraph */}
        <p className="text-xs text-justify leading-relaxed my-4">
          Laporan Realisasi Penggunaan Dana BOSP ini disusun dengan sesungguhnya berdasarkan bukti-bukti pengeluaran yang sah dan telah diverifikasi oleh Tim Manajemen BOSP Sekolah. Apabila di kemudian hari ditemukan ketidaksesuaian, kami bersedia bertanggung jawab sepenuhnya sesuai hukum yang berlaku.
        </p>

        {/* Tanda Tangan Resmi */}
        <div className="grid grid-cols-2 gap-8 text-xs mt-10 print-break-inside-avoid">
          <div className="text-center">
            <p>Mengetahui & Menyetujui,</p>
            <p className="font-bold">Kepala {school.name}</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.headmasterName}</p>
            <p>NIP. {school.headmasterNip || '-'}</p>
          </div>

          <div className="text-center">
            <p>{school.district}, 31 Desember {school.activeFiscalYear}</p>
            <p className="font-bold">Bendahara Dana BOSP,</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.treasurerName}</p>
            <p>NIP. {school.treasurerNip || '-'}</p>
          </div>
        </div>
      </PrintModal>
    </div>
  );
};
