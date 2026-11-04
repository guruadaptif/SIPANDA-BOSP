import React, { useState, useEffect } from 'react';
import { School, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileText,
  Send,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface BendaharaDashboardProps {
  school: School;
  user: User;
  onNavigate: (tab: string) => void;
}

export const BendaharaDashboard: React.FC<BendaharaDashboardProps> = ({
  school,
  user,
  onNavigate,
}) => {
  const [budgetData, setBudgetData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [taxRecap, setTaxRecap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, [school.id, school.activeFiscalYear]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [bRes, tRes, txRes] = await Promise.all([
        api.getBudgetSummary(school.id, school.activeFiscalYear),
        api.getTransactions({ schoolId: school.id, fiscalYear: school.activeFiscalYear }),
        api.getTaxRecap(school.id, school.activeFiscalYear),
      ]);

      if (bRes.success) setBudgetData(bRes);
      if (tRes.success) setTransactions(tRes.transactions);
      if (txRes.success) setTaxRecap(txRes);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPagu = budgetData?.plan?.totalPagu || 0;
  const totalDiterima = transactions
    .filter((t) => t.type === 'PENERIMAAN')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPengeluaran = transactions
    .filter((t) => t.type === 'PENGELUARAN')
    .reduce((sum, t) => sum + t.amount, 0);
  const saldoKas = totalDiterima - totalPengeluaran;
  const realizationPct = totalPagu > 0 ? (totalPengeluaran / totalPagu) * 100 : 0;

  // Tax pending calculation
  const unpaidTax = taxRecap?.summary
    ? Object.values(taxRecap.summary).reduce(
        (sum: number, item: any) => sum + (item.unpaid || 0),
        0
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* School Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#0B5D3B] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            {school.level}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#0B5D3B] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Sekolah {school.status}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                NPSN: <strong>{school.npsn}</strong>
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-600 font-medium">
                Tahun Anggaran: <strong className="text-slate-900">{school.activeFiscalYear}</strong>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {school.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {school.address}, Kec. {school.subdistrict}, {school.district} · Rekening: {school.bankName} ({school.bankAccount})
            </p>
          </div>
        </div>

        {/* Action Fast Grid */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('transactions')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </button>
          <button
            onClick={() => onNavigate('receipts')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>Kuitansi</span>
          </button>
          <button
            onClick={() => onNavigate('sppd')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-blue-700" />
            <span>SPPD</span>
          </button>
          <button
            onClick={() => onNavigate('bookkeeping')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4 text-purple-700" />
            <span>Cetak BKU</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pagu */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pagu RKAS</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 tabular-nums font-mono">
            {formatRupiah(totalPagu)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Alokasi Pagu Tahap I & II Tahun {school.activeFiscalYear}
          </p>
        </div>

        {/* Dana Diterima */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dana Diterima (SP2D)</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 tabular-nums font-mono">
            {formatRupiah(totalDiterima)}
          </p>
          <p className="text-xs text-blue-600/80 mt-1">
            Masuk ke Rekening {school.bankName}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[#0B5D3B] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Realisasi Belanja</span>
            <ArrowUpRight className="w-4 h-4 text-[#0B5D3B]" />
          </div>
          <p className="text-xl font-black text-[#0B5D3B] tabular-nums font-mono">
            {formatRupiah(totalPengeluaran)}
          </p>
          <div className="flex items-center justify-between text-xs font-semibold mt-1">
            <span className="text-slate-500">Serapan Pagu</span>
            <span className="text-[#0B5D3B]">{realizationPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Saldo Kas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sisa Saldo Kas</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-xl font-black text-slate-900 tabular-nums font-mono">
            {formatRupiah(saldoKas)}
          </p>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-slate-500">Pajak blm disetor:</span>
            <span
              className={`font-mono font-bold ${
                Number(unpaidTax) > 0 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {formatRupiah(Number(unpaidTax))}
            </span>
          </div>
        </div>
      </div>

      {/* Split: Budget Components Progress & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Budget Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Realisasi Belanja Berdasarkan Komponen Penggunaan Dana
              </h3>
              <p className="text-xs text-slate-500">
                Sesuai Petunjuk Teknis Permendikbudristek BOSP
              </p>
            </div>
            <button
              onClick={() => onNavigate('budget')}
              className="text-xs font-semibold text-[#0B5D3B] hover:underline"
            >
              Kelola RKAS &rarr;
            </button>
          </div>

          <div className="space-y-4">
            {budgetData?.components?.map((c: any) => {
              const pct = c.allocatedAmount > 0 ? (c.realizedAmount / c.allocatedAmount) * 100 : 0;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{c.code} · {c.name}</span>
                      <span className="text-[11px] text-slate-500 block">{c.subComponent}</span>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{formatRupiah(c.realizedAmount)}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-slate-500">{formatRupiah(c.allocatedAmount)}</span>
                      <span className="text-[#0B5D3B] font-bold ml-2">({pct.toFixed(0)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        pct > 90 ? 'bg-amber-500' : 'bg-[#0B5D3B]'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (1 col): Recent Transactions & Reminders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900">Transaksi Terkini</h3>
              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-semibold text-[#0B5D3B] hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-[#0B5D3B]">
                      {t.transactionNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDateIndo(t.date)}</span>
                  </div>
                  <p className="text-slate-800 font-medium line-clamp-1">{t.description}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">{t.recipientName}</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        t.type === 'PENERIMAAN' ? 'text-blue-700' : 'text-slate-900'
                      }`}
                    >
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
