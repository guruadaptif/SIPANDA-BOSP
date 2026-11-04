import React, { useState, useEffect } from 'react';
import { School, LedgerEntry } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah } from '../../utils/terbilang.ts';
import { exportBKUToExcel } from '../../utils/excelExport.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  BookOpen,
  Printer,
  Download,
  Building,
  Coins,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { User } from '../../types/index.ts';

interface BookkeepingViewProps {
  school: School;
  user?: User | null;
}

export const BookkeepingView: React.FC<BookkeepingViewProps> = ({ school, user }) => {
  const isAdmin = user?.role === 'ADMIN_DINAS';
  const [activeBook, setActiveBook] = useState<'BKU' | 'BANK' | 'TUNAI' | 'PAJAK'>('BKU');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [finalBalance, setFinalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadLedgers();
  }, [school.id, school.activeFiscalYear, activeBook]);

  const loadLedgers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLedgers(school.id, school.activeFiscalYear, activeBook);
      if (res.success) {
        setEntries(res.entries);
        setTotalDebit(res.totalDebit);
        setTotalCredit(res.totalCredit);
        setFinalBalance(res.finalBalance);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getBookTitle = () => {
    switch (activeBook) {
      case 'BKU':
        return 'BUKU KAS UMUM (BKU)';
      case 'BANK':
        return 'BUKU PEMBANTU BANK';
      case 'TUNAI':
        return 'BUKU PEMBANTU KAS TUNAI';
      case 'PAJAK':
        return 'BUKU PEMBANTU PAJAK';
    }
  };

  const handleExportExcel = () => {
    exportBKUToExcel(
      school.name,
      school.activeFiscalYear,
      activeBook,
      entries,
      { totalDebit, totalCredit, finalBalance }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0B5D3B]" />
            <span>Modul Pembukuan Otomatis Bendahara Sekolah</span>
          </h2>
          <p className="text-xs text-slate-500">
            Buku Kas Umum, Buku Pembantu Bank, Kas Tunai, dan Pajak terintegrasi secara otomatis.
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
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span><strong>Mode Pratinjau Admin Dinas:</strong> Anda melihat Buku Kas Umum & Pembukuan Otomatis sekolah ini dalam mode <em>Pratinjau (Preview Read-Only)</em>.</span>
        </div>
      )}

      {/* Book Type Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveBook('BKU')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeBook === 'BKU'
              ? 'bg-[#0B5D3B] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Buku Kas Umum (BKU)</span>
        </button>

        <button
          onClick={() => setActiveBook('BANK')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeBook === 'BANK'
              ? 'bg-[#0B5D3B] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Buku Pembantu Bank</span>
        </button>

        <button
          onClick={() => setActiveBook('TUNAI')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeBook === 'TUNAI'
              ? 'bg-[#0B5D3B] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Buku Pembantu Kas Tunai</span>
        </button>

        <button
          onClick={() => setActiveBook('PAJAK')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeBook === 'PAJAK'
              ? 'bg-[#0B5D3B] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Buku Pembantu Pajak</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">
            {activeBook === 'PAJAK' ? 'Total Pajak Dipungut' : 'Total Penerimaan (Debit)'}
          </p>
          <p className="text-xl font-black text-blue-700 font-mono mt-1 tabular-nums">
            {formatRupiah(totalDebit)}
          </p>
          <span className="text-[10px] text-slate-400">Akumulasi Tahun {school.activeFiscalYear}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">
            {activeBook === 'PAJAK' ? 'Total Pajak Disetor' : 'Total Pengeluaran (Kredit)'}
          </p>
          <p className="text-xl font-black text-[#0B5D3B] font-mono mt-1 tabular-nums">
            {formatRupiah(totalCredit)}
          </p>
          <span className="text-[10px] text-slate-400">Akumulasi Belanja Disahkan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase">
            {activeBook === 'PAJAK' ? 'Sisa Pajak Belum Disetor' : 'Saldo Akhir Berjalan'}
          </p>
          <p className="text-xl font-black text-slate-900 font-mono mt-1 tabular-nums">
            {formatRupiah(finalBalance)}
          </p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {activeBook === 'PAJAK' && finalBalance === 0 ? 'Pajak Lunas 100%' : 'Saldo Sesuai Rekonsiliasi'}
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{getBookTitle()}</h3>
            <p className="text-xs text-slate-500">
              {school.name} · Tahun Anggaran {school.activeFiscalYear}
            </p>
          </div>
          <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
            {entries.length} Catatan Buku
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-3 py-3 w-12 text-center">No</th>
                <th className="px-3 py-3 w-28">Tanggal</th>
                <th className="px-3 py-3 w-36">No. Bukti</th>
                <th className="px-4 py-3">Uraian Transaksi</th>
                <th className="px-4 py-3 text-right">Penerimaan (Debit)</th>
                <th className="px-4 py-3 text-right">Pengeluaran (Kredit)</th>
                <th className="px-4 py-3 text-right">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Belum ada mutasi transaksi pada buku ini.
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#0B5D3B] font-semibold whitespace-nowrap">
                      {entry.evidenceNumber}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">
                      {entry.description}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-blue-700 font-semibold whitespace-nowrap">
                      {entry.debit > 0 ? formatRupiah(entry.debit) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 font-semibold whitespace-nowrap">
                      {entry.credit > 0 ? formatRupiah(entry.credit) : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(entry.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">
                  TOTAL MUTASI DAN SALDO AKHIR:
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-blue-700">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                  {formatRupiah(totalCredit)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0B5D3B]">
                  {formatRupiah(finalBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`Cetak Dokumen Resmi: ${getBookTitle()}`}
        documentNumber={`REG/BKU/${school.npsn}/${school.activeFiscalYear}`}
        onExportExcel={handleExportExcel}
      >
        <OfficialKop school={school} />

        <div className="text-center my-4">
          <h2 className="text-base font-bold uppercase tracking-wider underline">
            {getBookTitle()}
          </h2>
          <p className="text-xs">
            Bulan / Periode: Januari s.d. Desember {school.activeFiscalYear}
          </p>
          <p className="text-xs">
            Sumber Dana: Dana BOSP Reguler Tahun Anggaran {school.activeFiscalYear}
          </p>
        </div>

        <table className="w-full text-[11px] my-4 border border-black">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black p-1 w-8">No</th>
              <th className="border border-black p-1 w-20">Tanggal</th>
              <th className="border border-black p-1 w-28">No. Bukti</th>
              <th className="border border-black p-1">Uraian Transaksi</th>
              <th className="border border-black p-1 w-28">Penerimaan (Rp)</th>
              <th className="border border-black p-1 w-28">Pengeluaran (Rp)</th>
              <th className="border border-black p-1 w-28">Saldo (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => (
              <tr key={e.id}>
                <td className="border border-black p-1 text-center">{idx + 1}</td>
                <td className="border border-black p-1 text-center font-mono">{e.date}</td>
                <td className="border border-black p-1 font-mono">{e.evidenceNumber}</td>
                <td className="border border-black p-1">{e.description}</td>
                <td className="border border-black p-1 text-right font-mono">
                  {e.debit > 0 ? e.debit.toLocaleString('id-ID') : '-'}
                </td>
                <td className="border border-black p-1 text-right font-mono">
                  {e.credit > 0 ? e.credit.toLocaleString('id-ID') : '-'}
                </td>
                <td className="border border-black p-1 text-right font-mono font-bold">
                  {e.balance.toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50">
              <td colSpan={4} className="border border-black p-1 text-right">
                Jumlah Total & Saldo Akhir:
              </td>
              <td className="border border-black p-1 text-right font-mono">
                {totalDebit.toLocaleString('id-ID')}
              </td>
              <td className="border border-black p-1 text-right font-mono">
                {totalCredit.toLocaleString('id-ID')}
              </td>
              <td className="border border-black p-1 text-right font-mono">
                {finalBalance.toLocaleString('id-ID')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Official Signatures Box */}
        <div className="grid grid-cols-2 gap-8 text-xs mt-10 print-break-inside-avoid">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala {school.name}</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.headmasterName}</p>
            <p>NIP. {school.headmasterNip || '-'}</p>
          </div>

          <div className="text-center">
            <p>{school.district}, 31 Desember {school.activeFiscalYear}</p>
            <p className="font-bold">Bendahara BOSP,</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.treasurerName}</p>
            <p>NIP. {school.treasurerNip || '-'}</p>
          </div>
        </div>
      </PrintModal>
    </div>
  );
};
