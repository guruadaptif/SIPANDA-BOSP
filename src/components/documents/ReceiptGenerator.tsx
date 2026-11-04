import React, { useState, useEffect } from 'react';
import { School, Receipt, Transaction } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, terbilang, formatDateIndo } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  FileText,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  X,
  Save,
} from 'lucide-react';

interface ReceiptGeneratorProps {
  school: School;
  selectedTransaction?: Transaction | null;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  school,
  selectedTransaction,
}) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Receipt>>({
    paidTo: `Bendahara Dana BOSP ${school.name}`,
    recipientName: '',
    amount: 0,
    amountInWords: '',
    paymentFor: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK',
    fundingSource: 'Dana BOSP Reguler',
    budgetComponentCode: '02.01',
    headmasterName: school.headmasterName,
    headmasterNip: school.headmasterNip,
    treasurerName: school.treasurerName,
    treasurerNip: school.treasurerNip,
  });

  useEffect(() => {
    loadReceipts();
  }, [school.id, school.activeFiscalYear]);

  useEffect(() => {
    if (selectedTransaction) {
      setFormData({
        transactionId: selectedTransaction.id,
        paidTo: `Bendahara Dana BOSP ${school.name}`,
        recipientName: selectedTransaction.recipientName,
        amount: selectedTransaction.amount,
        amountInWords: terbilang(selectedTransaction.amount),
        paymentFor: selectedTransaction.description,
        paymentDate: selectedTransaction.date,
        paymentMethod: selectedTransaction.paymentMethod,
        fundingSource: 'Dana BOSP Reguler',
        budgetComponentCode: '01.01',
        headmasterName: school.headmasterName,
        headmasterNip: school.headmasterNip,
        treasurerName: school.treasurerName,
        treasurerNip: school.treasurerNip,
      });
      setShowCreateModal(true);
    }
  }, [selectedTransaction]);

  const loadReceipts = async () => {
    const res = await api.getReceipts(school.id, school.activeFiscalYear);
    if (res.success) {
      setReceipts(res.receipts);
    }
  };

  const handleAmountChange = (val: number) => {
    setFormData({
      ...formData,
      amount: val,
      amountInWords: terbilang(val),
    });
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Jumlah uang kuitansi harus lebih dari 0!');
      return;
    }

    const res = await api.createReceipt({
      ...formData,
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
      amountInWords: terbilang(formData.amount),
    });

    if (res.success) {
      setShowCreateModal(false);
      loadReceipts();
      setActiveReceipt(res.receipt);
      setIsPrintOpen(true);
    }
  };

  const handlePrintExisting = (r: Receipt) => {
    setActiveReceipt(r);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0B5D3B]" />
            <span>Generator Kuitansi Resmi Pembayaran BOSP</span>
          </h2>
          <p className="text-xs text-slate-500">
            Penomoran otomatis berurutan, kalimat terbilang rupiah baku, dan siap cetak format A4 kedinasan.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              paidTo: `Bendahara Dana BOSP ${school.name}`,
              recipientName: '',
              amount: 0,
              amountInWords: '',
              paymentFor: '',
              paymentDate: new Date().toISOString().split('T')[0],
              paymentMethod: 'BANK',
              fundingSource: 'Dana BOSP Reguler',
              budgetComponentCode: '02.01',
              headmasterName: school.headmasterName,
              headmasterNip: school.headmasterNip,
              treasurerName: school.treasurerName,
              treasurerNip: school.treasurerNip,
            });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Terbitkan Kuitansi Baru</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Kuitansi yang Telah Diterbitkan
          </h3>
          <span className="text-xs text-slate-500">{receipts.length} Kuitansi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">No. Kuitansi</th>
                <th className="px-3 py-3">Tanggal Bayar</th>
                <th className="px-4 py-3">Diberikan Kepada (Penyedia)</th>
                <th className="px-4 py-3">Untuk Pembayaran</th>
                <th className="px-4 py-3 text-right">Jumlah Uang (Rp)</th>
                <th className="px-3 py-3 text-center">Metode</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Belum ada kuitansi yang diterbitkan. Klik "Terbitkan Kuitansi Baru".
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0B5D3B]">
                      {r.receiptNumber}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600">{r.paymentDate}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.recipientName}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{r.paymentFor}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(r.amount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-emerald-50 text-emerald-800">
                        {r.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePrintExisting(r)}
                        className="flex items-center gap-1 mx-auto px-2.5 py-1 text-xs font-semibold text-[#0B5D3B] hover:text-white hover:bg-[#0B5D3B] border border-[#0B5D3B] rounded-md transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE KUITANSI MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">Terbitkan Kuitansi Pembayaran BOSP</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sudah Diterima Dari *
                </label>
                <input
                  type="text"
                  required
                  value={formData.paidTo || ''}
                  onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Diberikan Kepada (Nama Penerima / Toko / CV) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.recipientName || ''}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="Contoh: PT Penerbit Erlangga / Toko Sumber Makmur"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jumlah Uang (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount || 0}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Pembayaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDate || ''}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>
              </div>

              {/* Terbilang Otomatis Preview */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <span className="text-[11px] font-bold text-emerald-900 block uppercase">
                  Terbilang Otomatis:
                </span>
                <p className="text-xs text-slate-800 italic mt-0.5 font-serif font-semibold">
                  # {formData.amount ? terbilang(formData.amount) : 'Nol Rupiah'} #
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Untuk Pembayaran *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.paymentFor || ''}
                  onChange={(e) => setFormData({ ...formData, paymentFor: e.target.value })}
                  placeholder="Contoh: Pembayaran pengadaan buku Kurikulum Merdeka Semester 2..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formData.paymentMethod || 'BANK'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="BANK">Bank / Transfer (BJB)</option>
                    <option value="TUNAI">Kas Tunai</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Sumber Anggaran
                  </label>
                  <input
                    type="text"
                    value={formData.fundingSource || 'Dana BOSP Reguler'}
                    onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs"
                >
                  Terbitkan & Cetak Kuitansi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL KUITANSI RESMI A4 */}
      {activeReceipt && (
        <PrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`Kuitansi Resmi Pembayaran BOSP (${activeReceipt.receiptNumber})`}
          documentNumber={activeReceipt.receiptNumber}
        >
          <OfficialKop school={school} />

          <div className="flex justify-between items-start my-4 pb-2 border-b border-black text-xs font-mono">
            <div>
              <p>Tahun Anggaran : {school.activeFiscalYear}</p>
              <p>Mata Anggaran  : {activeReceipt.budgetComponentCode || '01.01'}</p>
              <p>Sumber Dana    : {activeReceipt.fundingSource}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">KUITANSI / BUKTI PEMBAYARAN</p>
              <p>Nomor: {activeReceipt.receiptNumber}</p>
            </div>
          </div>

          <table className="w-full text-xs my-6 border-collapse">
            <tbody>
              <tr>
                <td className="w-40 py-2 align-top font-semibold">Sudah Terima Dari</td>
                <td className="w-4 py-2 align-top">:</td>
                <td className="py-2 align-top font-semibold">{activeReceipt.paidTo}</td>
              </tr>
              <tr>
                <td className="py-2 align-top font-semibold">Uang Sejumlah</td>
                <td className="py-2 align-top">:</td>
                <td className="py-2 align-top italic font-bold bg-slate-100 p-2 border border-slate-300">
                  # {activeReceipt.amountInWords} #
                </td>
              </tr>
              <tr>
                <td className="py-2 align-top font-semibold">Untuk Pembayaran</td>
                <td className="py-2 align-top">:</td>
                <td className="py-2 align-top leading-relaxed">{activeReceipt.paymentFor}</td>
              </tr>
              <tr>
                <td className="py-2 align-top font-semibold">Terbilang (Rupiah)</td>
                <td className="py-2 align-top">:</td>
                <td className="py-2 align-top font-mono font-bold text-base text-slate-900">
                  {formatRupiah(activeReceipt.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3 Formal Signatures */}
          <div className="grid grid-cols-3 gap-4 text-xs mt-12 print-break-inside-avoid text-center">
            <div>
              <p>Setuju Dibayar,</p>
              <p className="font-bold">Kepala Sekolah</p>
              <div className="h-24"></div>
              <p className="font-bold underline uppercase">{activeReceipt.headmasterName}</p>
              <p>NIP. {activeReceipt.headmasterNip || '-'}</p>
            </div>

            <div>
              <p>Lunas Dibayar Tgl: {formatDateIndo(activeReceipt.paymentDate)}</p>
              <p className="font-bold">Bendahara BOSP</p>
              <div className="h-24"></div>
              <p className="font-bold underline uppercase">{activeReceipt.treasurerName}</p>
              <p>NIP. {activeReceipt.treasurerNip || '-'}</p>
            </div>

            <div>
              <p>{school.district}, {formatDateIndo(activeReceipt.paymentDate)}</p>
              <p className="font-bold">Penerima Uang / Rekanan</p>
              <div className="h-24"></div>
              <p className="font-bold underline uppercase">{activeReceipt.recipientName}</p>
              <p className="text-[11px] text-slate-500">(Tanda Tangan & Stempel Toko)</p>
            </div>
          </div>
        </PrintModal>
      )}
    </div>
  );
};
