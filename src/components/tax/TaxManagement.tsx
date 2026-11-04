import React, { useState, useEffect } from 'react';
import { School, TaxRateConfig, LedgerEntry } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import { exportTaxRecapToExcel } from '../../utils/excelExport.ts';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  ShieldCheck,
  AlertCircle,
  Save,
  FileCheck2,
} from 'lucide-react';

import { User } from '../../types/index.ts';

interface TaxManagementProps {
  school: School;
  user?: User | null;
}

export const TaxManagement: React.FC<TaxManagementProps> = ({ school, user }) => {
  const isAdmin = user?.role === 'ADMIN_DINAS';
  const [taxRates, setTaxRates] = useState<TaxRateConfig[]>([]);
  const [taxEntries, setTaxEntries] = useState<LedgerEntry[]>([]);
  const [taxSummary, setTaxSummary] = useState<Record<string, { collected: number; deposited: number; unpaid: number }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);

  // Deposit Form
  const [depositForm, setDepositForm] = useState({
    taxType: 'PPN',
    taxAmount: 0,
    billingCode: '',
    ntpn: '',
    bankName: 'Bank BJB',
  });

  useEffect(() => {
    loadTaxData();
  }, [school.id, school.activeFiscalYear]);

  const loadTaxData = async () => {
    setIsLoading(true);
    try {
      const [rRes, recapRes] = await Promise.all([
        api.getTaxRates(),
        api.getTaxRecap(school.id, school.activeFiscalYear),
      ]);
      if (rRes.success) setTaxRates(rRes.taxRates);
      if (recapRes.success) {
        setTaxEntries(recapRes.taxEntries);
        setTaxSummary(recapRes.summary);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositForm.ntpn || !depositForm.billingCode) {
      alert('Nomor Kode Billing dan NTPN wajib diisi!');
      return;
    }

    await api.depositTax({
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
      taxType: depositForm.taxType,
      taxAmount: Number(depositForm.taxAmount),
      billingCode: depositForm.billingCode,
      ntpn: depositForm.ntpn,
      bankName: depositForm.bankName,
    });

    setShowDepositModal(false);
    loadTaxData();
  };

  const totalCollected = Object.values(taxSummary).reduce((s, i) => s + (i.collected || 0), 0);
  const totalDeposited = Object.values(taxSummary).reduce((s, i) => s + (i.deposited || 0), 0);
  const totalUnpaid = totalCollected - totalDeposited;

  const handleExportExcel = () => {
    exportTaxRecapToExcel(school.name, school.activeFiscalYear, taxEntries);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            <span>Manajemen Perpajakan Bendahara BOSP</span>
          </h2>
          <p className="text-xs text-slate-500">
            Penatausahaan PPN, PPh 21, PPh 22, PPh 23, PPh 4 ayat (2), dan Surat Setoran Pajak (NTPN).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Pajak</span>
          </button>
          {!isAdmin && (
            <button
              onClick={() => {
                setDepositForm({
                  taxType: 'PPN',
                  taxAmount: totalUnpaid > 0 ? totalUnpaid : 0,
                  billingCode: `01${Date.now().toString().slice(-10)}`,
                  ntpn: '',
                  bankName: 'Bank BJB',
                });
                setShowDepositModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Catat Bukti Setor Pajak (NTPN)</span>
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span><strong>Mode Pratinjau Admin Dinas:</strong> Halaman manajemen perpajakan BOSP ini berada dalam mode <em>Pratinjau (Preview Read-Only)</em>. Input kode billing dan bukti setor NTPN hanya dapat dilakukan oleh Bendahara Sekolah.</span>
        </div>
      )}

      {/* Tax KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Pajak Dipungut / Dipotong</p>
          <p className="text-xl font-black text-slate-900 font-mono mt-1 tabular-nums">
            {formatRupiah(totalCollected)}
          </p>
          <span className="text-[10px] text-slate-400">Seluruh Transaksi Pembelian & Honor</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Pajak Disetor ke Kas Negara</p>
          <p className="text-xl font-black text-emerald-700 font-mono mt-1 tabular-nums">
            {formatRupiah(totalDeposited)}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Tercatat dengan Bukti NTPN</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Sisa Pajak Belum Disetor</p>
          <p
            className={`text-xl font-black font-mono mt-1 tabular-nums ${
              totalUnpaid > 0 ? 'text-red-600' : 'text-[#0B5D3B]'
            }`}
          >
            {formatRupiah(totalUnpaid)}
          </p>
          <span className="text-[10px] text-slate-500">
            {totalUnpaid === 0 ? 'Kewajiban pajak lunas 100%' : 'Segera setorkan sebelum jatuh tempo!'}
          </span>
        </div>
      </div>

      {/* Breakdown per Tax Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Rekapitulasi Kepatuhan Pajak per Jenis Potongan
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(taxSummary).map(([type, stats]) => (
            <div key={type} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{type}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    stats.unpaid === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {stats.unpaid === 0 ? 'Lunas' : 'Belum Lunas'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                <span>Dipungut:</span>
                <span className="font-semibold text-slate-700">{formatRupiah(stats.collected)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                <span>Disetor:</span>
                <span className="font-semibold text-emerald-700">{formatRupiah(stats.deposited)}</span>
              </div>
              <div className="text-[11px] border-t border-slate-200 pt-1 flex justify-between font-mono">
                <span className="font-bold text-slate-700">Sisa:</span>
                <span className="font-bold text-red-600">{formatRupiah(stats.unpaid)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Pemotongan dan Penyetoran Pajak (Buku Pembantu Pajak)
          </h3>
          <span className="text-xs text-slate-500">{taxEntries.length} Transaksi Tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-3 py-3 w-12 text-center">No</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">No. Bukti / Kode</th>
                <th className="px-4 py-3">Uraian Transaksi</th>
                <th className="px-3 py-3 text-center">Jenis Pajak</th>
                <th className="px-4 py-3 text-right">Dipungut (Rp)</th>
                <th className="px-4 py-3 text-right">Disetor (Rp)</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Belum ada transaksi yang dipotong pajak.
                  </td>
                </tr>
              ) : (
                taxEntries.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">{item.date}</td>
                    <td className="px-3 py-2.5 font-mono text-[#0B5D3B] font-semibold whitespace-nowrap">{item.evidenceNumber}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{item.description}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">
                        {item.taxType || 'PAJAK'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatRupiah(item.debit || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {formatRupiah(item.credit || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.credit > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-amber-600" /> Belum
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configurable Tax Rates Reference (Section H) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0B5D3B]" />
              <span>Konfigurasi Tarif & Dasar Hukum Perpajakan Resmi</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tarif dapat diperbarui sesuai peraturan perundang-undangan tanpa mengubah kode program.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {taxRates.map((tr) => (
            <div key={tr.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{tr.name}</span>
                <span className="text-xs font-mono font-black text-red-700 bg-red-50 px-2 py-0.5 rounded">
                  {tr.rate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">{tr.description}</p>
              <p className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                Dasar Hukum: {tr.lawReference}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* RECORD DEPOSIT (NTPN) MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Input Bukti Penerimaan Negara (NTPN)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Catat bukti penyetoran pajak ke Kas Negara melalui Bank Persepsi / Pos.
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jenis Pajak yang Disetor *
                </label>
                <select
                  value={depositForm.taxType}
                  onChange={(e) => setDepositForm({ ...depositForm, taxType: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="PPN">PPN (Pajak Pertambahan Nilai)</option>
                  <option value="PPH22">PPh Pasal 22 Belanja Barang</option>
                  <option value="PPH21">PPh Pasal 21 Honorarium</option>
                  <option value="PPH23">PPh Pasal 23 Jasa / Sewa</option>
                  <option value="PPH4_2">PPh Final 4(2) Gedung</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jumlah Pajak Disetor (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={depositForm.taxAmount}
                  onChange={(e) => setDepositForm({ ...depositForm, taxAmount: Number(e.target.value) })}
                  className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kode Billing DJP (15 Digit) *
                </label>
                <input
                  type="text"
                  required
                  value={depositForm.billingCode}
                  onChange={(e) => setDepositForm({ ...depositForm, billingCode: e.target.value })}
                  placeholder="Contoh: 018492847291048"
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nomor Transaksi Penerimaan Negara (NTPN) *
                </label>
                <input
                  type="text"
                  required
                  value={depositForm.ntpn}
                  onChange={(e) => setDepositForm({ ...depositForm, ntpn: e.target.value.toUpperCase() })}
                  placeholder="Contoh: 7A8B9C0D1E2F3G4H"
                  className="w-full text-xs font-mono font-bold uppercase px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Bank Persepsi Pembayaran
                </label>
                <input
                  type="text"
                  value={depositForm.bankName}
                  onChange={(e) => setDepositForm({ ...depositForm, bankName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs"
                >
                  Simpan Bukti Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
