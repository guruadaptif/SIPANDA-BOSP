import React, { useState, useEffect } from 'react';
import { School, ReconciliationRecord, LedgerEntry, BankStatementItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ReconciliationViewProps {
  school: School;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ school }) => {
  const [bankEntries, setBankEntries] = useState<LedgerEntry[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatementItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Form State
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [statementBalance, setStatementBalance] = useState<number>(69500000);
  const [adjustments, setAdjustments] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Seluruh transaksi rekening koran cocok 100% dengan Buku Kas Umum.');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [school.id, school.activeFiscalYear]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lRes, rRes] = await Promise.all([
        api.getLedgers(school.id, school.activeFiscalYear, 'BANK'),
        api.getReconciliations(school.id, school.activeFiscalYear),
      ]);
      if (lRes.success) {
        setBankEntries(lRes.entries);
      }
      if (rRes.success) {
        setReconciliations(rRes.reconciliations);
        setBankStatements(rRes.bankStatements);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Saldo menurut pembukuan Bank
  const bookBalance = bankEntries.length > 0 ? bankEntries[bankEntries.length - 1].balance : 0;
  // Selisih
  const rawDiscrepancy = bookBalance - statementBalance;
  const finalDiscrepancy = rawDiscrepancy - adjustments;
  const isMatched = finalDiscrepancy === 0;

  const handleSaveReconciliation = async () => {
    const status = isMatched ? 'Cocok' : adjustments !== 0 ? 'Perlu Penyesuaian' : 'Terdapat Selisih';
    const res = await api.saveReconciliation({
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
      periodMonth: month,
      periodYear: school.activeFiscalYear,
      bookBalance,
      bankBalance: statementBalance,
      unrecordedTransactions: 0,
      unidentifiedTransactions: 0,
      adjustments,
      finalDiscrepancy,
      reconciliationStatus: status,
      notes,
      reconciledBy: school.treasurerName,
      reconciledAt: new Date().toISOString(),
      approvedByHeadmaster: true,
    });

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#0B5D3B]" />
            <span>Rekonsiliasi Bank & Verifikasi Saldo Kas</span>
          </h2>
          <p className="text-xs text-slate-500">
            Pencocokan otomatis transaksi Buku Kas Umum dengan Rekening Koran {school.bankName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Berita Acara Rekonsiliasi</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Comparison Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Saldo Pembukuan (Buku Bank)</p>
          <p className="text-xl font-black text-slate-900 font-mono mt-1 tabular-nums">
            {formatRupiah(bookBalance)}
          </p>
          <span className="text-[10px] text-slate-400">Total Mutasi Saldo Akhir BKU</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Saldo Rekening Koran Bank (Rp)
          </label>
          <input
            type="number"
            value={statementBalance}
            onChange={(e) => setStatementBalance(Number(e.target.value))}
            className="w-full text-base font-black font-mono text-slate-900 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#0B5D3B]"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            {formatRupiah(statementBalance)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Penyesuaian / Koreksi (Rp)
          </label>
          <input
            type="number"
            value={adjustments}
            onChange={(e) => setAdjustments(Number(e.target.value))}
            className="w-full text-base font-mono font-semibold text-slate-900 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#0B5D3B]"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">Biaya Adm / Jasa Giro</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Status & Selisih Akhir</p>
            <p
              className={`text-xl font-black font-mono mt-1 tabular-nums ${
                isMatched ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatRupiah(finalDiscrepancy)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded w-max ${
              isMatched
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isMatched ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>COCOK / REKONSILIASI SESUAI</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>TERDAPAT SELISIH KAS</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Side-by-side Matching Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pembukuan BKU / Buku Bank */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-emerald-50/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Transaksi Pembukuan Sekolah (Buku Bank BOSP)
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-800">
              {bankEntries.length} Baris
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {bankEntries.map((e) => (
              <div key={e.id} className="p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-[#0B5D3B] font-bold">
                    {e.evidenceNumber}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{e.date}</span>
                </div>
                <p className="text-slate-800 font-medium line-clamp-1">{e.description}</p>
                <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                  <span className="text-slate-500">
                    {e.debit > 0 ? `Debit: ${formatRupiah(e.debit)}` : `Kredit: ${formatRupiah(e.credit)}`}
                  </span>
                  <span className="font-bold text-slate-900">Saldo: {formatRupiah(e.balance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rekening Koran Bank */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-slate-200 bg-blue-50/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Mutasi Rekening Koran ({school.bankName})
            </span>
            <span className="text-[11px] font-mono font-bold text-blue-800">
              {bankStatements.length} Mutasi
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {bankStatements.map((b) => (
              <div key={b.id} className="p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-blue-800 font-bold">
                    {b.reference}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{b.date}</span>
                </div>
                <p className="text-slate-800 font-medium line-clamp-1">{b.description}</p>
                <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                  <span className="text-slate-500">
                    {b.debit > 0 ? `CR: ${formatRupiah(b.debit)}` : `DB: ${formatRupiah(b.credit)}`}
                  </span>
                  <span className="font-bold text-slate-900">Saldo: {formatRupiah(b.balance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Submission Notes */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Catatan & Pengesahan Hasil Rekonsiliasi Bank
        </h3>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tuliskan catatan rekonsiliasi, penyebab selisih kas, atau nomor bukti penyetoran bunga bank / biaya administrasi..."
          className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
        />

        <div className="flex items-center justify-between pt-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Hasil Rekonsiliasi Berhasil Disimpan ke Database!
            </span>
          )}
          <button
            onClick={handleSaveReconciliation}
            className="ml-auto flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Hasil Rekonsiliasi</span>
          </button>
        </div>
      </div>

      {/* PRINT PREVIEW MODAL - BERITA ACARA REKONSILIASI BANK */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Berita Acara Rekonsiliasi Bank Dana BOSP"
        documentNumber={`BA-REK/${school.npsn}/${school.activeFiscalYear}`}
      >
        <OfficialKop school={school} />

        <div className="text-center my-4">
          <h2 className="text-base font-bold uppercase tracking-wider underline">
            BERITA ACARA REKONSILIASI BANK
          </h2>
          <p className="text-xs">
            Nomor: 421/BA-REK/{school.npsn}/{school.activeFiscalYear}
          </p>
        </div>

        <p className="text-xs text-justify leading-relaxed mb-4">
          Pada hari ini, tanggal <strong>{formatDateIndo(new Date().toISOString().split('T')[0])}</strong>, bertempat di {school.name}, telah dilaksanakan rekonsiliasi saldo kas rekening bank Dana BOSP Reguler antara Buku Pembantu Bank dan Rekening Koran <strong>{school.bankName}</strong> Nomor Rekening <strong>{school.bankAccount}</strong> dengan hasil sebagai berikut:
        </p>

        <table className="w-full text-xs border border-black my-4">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-semibold w-8 text-center">1</td>
              <td className="border border-black p-2 font-medium">Saldo menurut Buku Pembantu Bank (BKU)</td>
              <td className="border border-black p-2 font-mono font-bold text-right w-48">
                {formatRupiah(bookBalance)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold w-8 text-center">2</td>
              <td className="border border-black p-2 font-medium">Saldo menurut Rekening Koran Bank</td>
              <td className="border border-black p-2 font-mono font-bold text-right">
                {formatRupiah(statementBalance)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold w-8 text-center">3</td>
              <td className="border border-black p-2 font-medium">Penyesuaian Saldo (Bunga Bank / Administrasi)</td>
              <td className="border border-black p-2 font-mono text-right">
                {formatRupiah(adjustments)}
              </td>
            </tr>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-black p-2 text-center">4</td>
              <td className="border border-black p-2">Selisih Bersih (1 - 2 - 3)</td>
              <td className="border border-black p-2 font-mono text-right text-emerald-800">
                {formatRupiah(finalDiscrepancy)}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold text-center">5</td>
              <td className="border border-black p-2 font-medium">Kesimpulan Status Rekonsiliasi</td>
              <td className="border border-black p-2 font-bold text-right">
                {isMatched ? 'COCOK / TIDAK ADA SELISIH' : 'TERDAPAT SELISIH'}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="p-3 border border-black text-xs my-4 bg-slate-50">
          <p className="font-bold mb-1">Catatan Hasil Rekonsiliasi:</p>
          <p className="italic">{notes}</p>
        </div>

        <p className="text-xs leading-relaxed">
          Demikian Berita Acara Rekonsiliasi Bank ini dibuat dengan sebenarnya dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya sebagai kelengkapan Laporan Pertanggungjawaban (SPJ) Dana BOSP.
        </p>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 text-xs mt-10 print-break-inside-avoid">
          <div className="text-center">
            <p>Mengetahui & Menyetujui,</p>
            <p className="font-bold">Kepala {school.name}</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.headmasterName}</p>
            <p>NIP. {school.headmasterNip || '-'}</p>
          </div>

          <div className="text-center">
            <p>{school.district}, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
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
