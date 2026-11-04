import React, { useState, useEffect } from 'react';
import { School, User, Transaction, TransactionType, PaymentMethod, BudgetComponent } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import { exportToExcel } from '../../utils/excelExport.ts';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Receipt,
  X,
  Save,
} from 'lucide-react';

interface TransactionManagementProps {
  school: School;
  user: User;
  onOpenReceiptModal: (trx: Transaction) => void;
}

export const TransactionManagement: React.FC<TransactionManagementProps> = ({
  school,
  user,
  onOpenReceiptModal,
}) => {
  const isAdmin = user.role === 'ADMIN_DINAS';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetComponents, setBudgetComponents] = useState<BudgetComponent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'PENGELUARAN',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK',
    amount: 0,
    hasTax: false,
    taxes: [],
    fundingSourceId: 'SRC-01',
  });

  const [selectedTaxType, setSelectedTaxType] = useState<string>('PPN');

  useEffect(() => {
    loadData();
  }, [school.id, school.activeFiscalYear]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, bRes] = await Promise.all([
        api.getTransactions({
          schoolId: school.id,
          fiscalYear: school.activeFiscalYear,
          type: filterType || undefined,
          method: filterMethod || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        api.getBudgetSummary(school.id, school.activeFiscalYear),
      ]);

      if (tRes.success) setTransactions(tRes.transactions);
      if (bRes.success && bRes.components) setBudgetComponents(bRes.components);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTrx(null);
    setFormData({
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
      type: 'PENGELUARAN',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK',
      amount: 0,
      description: '',
      recipientName: '',
      recipientNpwp: '',
      recipientIsPkp: false,
      invoiceNumber: '',
      hasTax: false,
      taxes: [],
      fundingSourceId: 'SRC-01',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (trx: Transaction) => {
    setEditingTrx(trx);
    setFormData(trx);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini? Seluruh buku kas terkait akan diperbarui otomatis.')) {
      await api.deleteTransaction(id);
      loadData();
    }
  };

  // Helper for Tax Calculation
  const handleCalculateTax = (taxType: string, grossAmount: number) => {
    let rate = 0;
    let taxBase = grossAmount;

    if (taxType === 'PPN') {
      rate = 11;
      // Dasar Pengenaan Pajak (DPP) = (100/111) * Nilai Transaksi jika include PPN
      taxBase = Math.round((100 / 111) * grossAmount);
    } else if (taxType === 'PPH21') {
      rate = 5; // Default PNS Gol III 5%
    } else if (taxType === 'PPH22') {
      rate = 1.5; // Belanja barang pemerintah
      taxBase = Math.round((100 / 111) * grossAmount);
    } else if (taxType === 'PPH23') {
      rate = 2; // Jasa / Sewa
    } else if (taxType === 'PPH4_2') {
      rate = 10; // Sewa gedung / tanah
    }

    const taxAmount = Math.round((taxBase * rate) / 100);

    const existingTaxes = formData.taxes || [];
    const filtered = existingTaxes.filter((t) => t.taxType !== taxType);

    const newTaxDetail = {
      taxType: taxType as any,
      rate,
      taxBase,
      taxAmount,
      billingCode: `01${Date.now().toString().slice(-10)}`,
      isDeposited: false,
    };

    setFormData({
      ...formData,
      hasTax: true,
      taxes: [...filtered, newTaxDetail],
    });
  };

  const handleRemoveTax = (taxType: string) => {
    const updated = (formData.taxes || []).filter((t) => t.taxType !== taxType);
    setFormData({
      ...formData,
      taxes: updated,
      hasTax: updated.length > 0,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Nilai transaksi harus lebih besar dari 0!');
      return;
    }

    if (editingTrx) {
      await api.updateTransaction(editingTrx.id, formData);
    } else {
      await api.createTransaction({
        ...formData,
        schoolId: school.id,
        fiscalYear: school.activeFiscalYear,
        createdBy: user.name,
      });
    }

    setShowModal(false);
    loadData();
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      t.transactionNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const handleExportExcel = () => {
    const rows = filteredTransactions.map((t, i) => ({
      No: i + 1,
      'No. Transaksi': t.transactionNumber,
      Tanggal: t.date,
      Jenis: t.type,
      Uraian: t.description,
      'Penyedia / Penerima': t.recipientName,
      'No. Bukti': t.invoiceNumber || '-',
      'Nominal (Rp)': t.amount,
      'Metode Bayar': t.paymentMethod,
      'Status Verifikasi': t.verificationStatus,
      'Ada Pajak': t.hasTax ? 'Ya' : 'Tidak',
    }));
    exportToExcel(rows, `Transaksi_BOSP_${school.name}_${school.activeFiscalYear}`, 'Transaksi');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[#0B5D3B]" />
            <span>Pencatatan Transaksi Keuangan Dana BOSP</span>
          </h2>
          <p className="text-xs text-slate-500">
            Penerimaan, Pengeluaran, Pemindahbukuan, Koreksi Saldo dengan pembukuan otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel</span>
          </button>
          {!isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Transaksi Baru</span>
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-medium shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span><strong>Mode Pratinjau Admin Dinas:</strong> Halaman transaksi keuangan ini ditampilkan dalam mode <em>Pratinjau (Preview Read-Only)</em>. Pengeditan dan penambahan transaksi keuangan hanya dapat dilakukan oleh Bendahara Sekolah.</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 shadow-xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari uraian, penyedia, no. transaksi..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
          />
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
          >
            <option value="">Semua Jenis Transaksi</option>
            <option value="PENERIMAAN">Penerimaan (SP2D)</option>
            <option value="PENGELUARAN">Pengeluaran (Belanja)</option>
            <option value="PEMINDAHBUKUAN">Pemindahbukuan (Tarik Tunai)</option>
            <option value="PENGEMBALIAN">Pengembalian Dana</option>
            <option value="KOREKSI">Koreksi Transaksi</option>
          </select>
        </div>

        <div>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
          >
            <option value="">Semua Metode Bayar</option>
            <option value="BANK">Bank / Transfer (BJB)</option>
            <option value="TUNAI">Kas Tunai</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadData}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
          >
            Terapkan Filter
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">No. Transaksi</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">Jenis</th>
                <th className="px-4 py-3">Uraian Transaksi</th>
                <th className="px-3 py-3">Penerima / Penyedia</th>
                <th className="px-3 py-3 text-center">Metode</th>
                <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                <th className="px-3 py-3 text-center">Pajak</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ditemukan data transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0B5D3B] whitespace-nowrap">
                      {trx.transactionNumber}
                      {trx.invoiceNumber && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Bukti: {trx.invoiceNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-mono">
                      {trx.date}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          trx.type === 'PENERIMAAN'
                            ? 'bg-blue-50 text-blue-800'
                            : trx.type === 'PENGELUARAN'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-purple-50 text-purple-800'
                        }`}
                      >
                        {trx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium max-w-xs">
                      <p className="line-clamp-2">{trx.description}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      {trx.recipientName || '-'}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          trx.paymentMethod === 'BANK'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {trx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap text-slate-900">
                      {formatRupiah(trx.amount)}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {trx.hasTax && trx.taxes && trx.taxes.length > 0 ? (
                        <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-mono font-bold">
                          {trx.taxes.map((t) => t.taxType).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isAdmin && (
                          <>
                            <button
                              onClick={() => onOpenReceiptModal(trx)}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                              title="Terbitkan Kuitansi"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(trx)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                              title="Koreksi Transaksi"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(trx.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEdit(trx)}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded font-semibold text-xs flex items-center gap-1"
                            title="Pratinjau Transaksi"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Pratinjau</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTrx ? `Koreksi Transaksi (${editingTrx.transactionNumber})` : 'Catat Transaksi Keuangan Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Otomatis terhubung ke Buku Kas Umum, Buku Bank/Tunai, dan Buku Pajak.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jenis Transaksi *
                  </label>
                  <select
                    value={formData.type || 'PENGELUARAN'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] bg-white font-medium"
                  >
                    <option value="PENGELUARAN">Pengeluaran (Belanja Operasional / Barang)</option>
                    <option value="PENERIMAAN">Penerimaan Dana (Penyaluran SP2D BOSP)</option>
                    <option value="PEMINDAHBUKUAN">Pemindahbukuan (Tarik Tunai Bank ke Kas)</option>
                    <option value="PENGEMBALIAN">Pengembalian Sisa Belanja ke Kas</option>
                    <option value="KOREKSI">Koreksi / Penyesuaian Saldo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Uraian Transaksi Lengkap *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Contoh: Pembayaran pengadaan ATK dan perlengkapan kelas Semester 2 via SIPLaH..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                {formData.type === 'PENGELUARAN' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Komponen Penggunaan Dana (RKAS) *
                    </label>
                    <select
                      value={formData.budgetComponentId || ''}
                      onChange={(e) => setFormData({ ...formData, budgetComponentId: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                    >
                      <option value="">-- Pilih Komponen RKAS --</option>
                      {budgetComponents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} · {c.name} (Sisa: {formatRupiah(c.remainingAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Penerima / Penyedia (Toko / Rekanan) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recipientName || ''}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="Nama Penyedia / Toko / Guru"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nomor Bukti / Faktur / Nota
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Contoh: INV-2026-081"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nilai Nominal Transaksi (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount || 0}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {formatRupiah(formData.amount || 0)}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={formData.paymentMethod || 'BANK'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] bg-white font-medium"
                  >
                    <option value="BANK">Bank BJB (Transfer / Giro / SIPLaH)</option>
                    <option value="TUNAI">Kas Tunai (Tunai di Bendahara)</option>
                  </select>
                </div>
              </div>

              {/* Tax Calculator Sub-section */}
              {formData.type === 'PENGELUARAN' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-red-600" />
                      <span>Pemotongan / Pemungutan Pajak Terintegrasi</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTaxType}
                        onChange={(e) => setSelectedTaxType(e.target.value)}
                        className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="PPN">PPN (11%)</option>
                        <option value="PPH22">PPh 22 Belanja Barang (1.5%)</option>
                        <option value="PPH21">PPh 21 Honor (5%)</option>
                        <option value="PPH23">PPh 23 Jasa / Sewa (2%)</option>
                        <option value="PPH4_2">PPh Final 4(2) Gedung (10%)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleCalculateTax(selectedTaxType, formData.amount || 0)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded transition-colors"
                      >
                        + Hitung Pajak
                      </button>
                    </div>
                  </div>

                  {formData.taxes && formData.taxes.length > 0 ? (
                    <div className="space-y-2">
                      {formData.taxes.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              {t.taxType} ({t.rate}%)
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              DPP: {formatRupiah(t.taxBase)} · Kode Billing: {t.billingCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-red-700">
                              {formatRupiah(t.taxAmount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTax(t.taxType)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Belum ada potongan pajak pada transaksi ini. Pilih jenis pajak di atas lalu klik "+ Hitung Pajak".
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Transaksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
