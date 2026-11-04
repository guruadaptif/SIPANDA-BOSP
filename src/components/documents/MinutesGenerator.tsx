import React, { useState, useEffect } from 'react';
import { School, MinutesRecord, MinutesType } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  FileSignature,
  Plus,
  Printer,
  Calendar,
  X,
  Receipt,
  FileCheck2,
} from 'lucide-react';

interface MinutesGeneratorProps {
  school: School;
}

export const MinutesGenerator: React.FC<MinutesGeneratorProps> = ({ school }) => {
  const [minutesList, setMinutesList] = useState<MinutesRecord[]>([]);
  const [activeItem, setActiveItem] = useState<MinutesRecord | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MinutesRecord>>({
    minutesType: 'PERHITUNGAN_PAJAK',
    date: new Date().toISOString().split('T')[0],
    period: 'Triwulan I Tahun 2026',
    vendorName: 'PT Penerbit Erlangga Mahameru',
    description: 'Perhitungan dan Pemungutan PPN 11% & PPh Pasal 22 Belanja Buku Kurikulum Merdeka',
    taxType: 'PPN & PPh 22',
    taxBase: 16666667,
    taxRate: 12.5,
    taxAmount: 2083333,
    totalPaid: 18500000,
    taxWithheld: 2083333,
    billingOrNtpn: 'NTPN: 7A8B9C0D1E2F3G4H',
    depositStatus: 'Telah Disetor ke Kas Negara',
    conclusion: 'Pajak telah dihitung secara benar dan disetorkan ke Kas Negara sesuai perundang-undangan.',
    signatories: [
      { role: 'Kepala Sekolah', name: school.headmasterName, nip: school.headmasterNip },
      { role: 'Bendahara BOSP', name: school.treasurerName, nip: school.treasurerNip },
      { role: 'Pihak Penyedia / Penerima', name: 'Perwakilan Rekanan' },
    ],
  });

  const minutesTypeOptions: { type: MinutesType; label: string; desc: string }[] = [
    { type: 'PERHITUNGAN_PAJAK', label: 'Berita Acara Perhitungan Pajak', desc: 'Perhitungan PPN & PPh, DPP, dan status setor NTPN' },
    { type: 'PEMERIKSAAN_KAS', label: 'Berita Acara Pemeriksaan Kas', desc: 'Pemeriksaan fisik kas tunai dan saldo bank penutupan kas' },
    { type: 'REKONSILIASI', label: 'Berita Acara Rekonsiliasi Bank', desc: 'Pencocokan saldo BKU dengan rekening koran' },
    { type: 'SERAH_TERIMA', label: 'Berita Acara Serah Terima (BAST)', desc: 'Serah terima hasil pekerjaan / barang dari penyedia' },
    { type: 'PEMERIKSAAN_BARANG', label: 'Berita Acara Pemeriksaan Barang', desc: 'Verifikasi kesesuaian fisik dan spesifikasi barang' },
    { type: 'PEMBAYARAN', label: 'Berita Acara Pembayaran', desc: 'Pengesahan penyelesaian pembayaran kepada pihak ketiga' },
    { type: 'PENYELESAIAN_KEGIATAN', label: 'Berita Acara Penyelesaian Kegiatan', desc: 'Laporan tuntasnya pelaksanaan program sekolah' },
    { type: 'PENUTUPAN_KAS', label: 'Berita Acara Penutupan Kas Akhir Bulan', desc: 'Penutupan Buku Kas Umum bulanan resmi' },
    { type: 'KOREKSI_PEMBUKUAN', label: 'Berita Acara Koreksi Pembukuan', desc: 'Penyesuaian transaksi jika terdapat kesalahan administratif' },
  ];

  useEffect(() => {
    loadMinutes();
  }, [school.id, school.activeFiscalYear]);

  const loadMinutes = async () => {
    const res = await api.getMinutes(school.id, school.activeFiscalYear);
    if (res.success) {
      setMinutesList(res.minutes);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createMinutes({
      ...formData,
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
    });

    if (res.success) {
      setShowModal(false);
      loadMinutes();
      setActiveItem(res.minutes);
      setIsPrintOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-[#0B5D3B]" />
            <span>Pusat Generator Berita Acara Kedinasan (9 Template)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Berita Acara Perhitungan Pajak, Pemeriksaan Kas, Serah Terima (BAST), dan Penutupan Kas BKU.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Berita Acara Baru</span>
        </button>
      </div>

      {/* Minutes List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Berita Acara Resmi yang Diterbitkan
          </h3>
          <span className="text-xs text-slate-500">{minutesList.length} Berita Acara</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Nomor Berita Acara</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">Jenis</th>
                <th className="px-4 py-3">Uraian / Deskripsi Kegiatan</th>
                <th className="px-3 py-3">Pihak / Rekanan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {minutesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada Berita Acara. Klik "Buat Berita Acara Baru".
                  </td>
                </tr>
              ) : (
                minutesList.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0B5D3B]">
                      {m.minutesNumber}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">{m.date}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800">
                        {m.minutesType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                      {m.description}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{m.vendorName || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setActiveItem(m);
                          setIsPrintOpen(true);
                        }}
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

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Buat Berita Acara Kedinasan Baru</h3>
                <p className="text-xs text-slate-500">Lengkapi formulir berita acara resmi.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Jenis Berita Acara *
                </label>
                <select
                  value={formData.minutesType}
                  onChange={(e) => setFormData({ ...formData, minutesType: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {minutesTypeOptions.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Pembuatan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Periode / Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={formData.period || ''}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="Contoh: Triwulan I / Bulan Februari 2026"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Penyedia / Pihak Terkait (Jika Ada)
                  </label>
                  <input
                    type="text"
                    value={formData.vendorName || ''}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    placeholder="Contoh: PT Penerbit Erlangga / Toko Sumber Makmur"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Uraian Kegiatan / Transaksi *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Uraikan peristiwa atau transaksi yang menjadi dasar berita acara..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Sub-form for Perhitungan Pajak */}
                {formData.minutesType === 'PERHITUNGAN_PAJAK' && (
                  <div className="sm:col-span-2 p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-red-900 block">
                      Rincian Perhitungan Pajak Transaksi
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Dasar Pengenaan (DPP)
                        </label>
                        <input
                          type="number"
                          value={formData.taxBase || 0}
                          onChange={(e) => setFormData({ ...formData, taxBase: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Tarif Pajak (%)
                        </label>
                        <input
                          type="number"
                          value={formData.taxRate || 0}
                          onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Nilai Pajak (Rp)
                        </label>
                        <input
                          type="number"
                          value={formData.taxAmount || 0}
                          onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold text-red-700"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Total Pembayaran (Rp)
                        </label>
                        <input
                          type="number"
                          value={formData.totalPaid || 0}
                          onChange={(e) => setFormData({ ...formData, totalPaid: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kesimpulan Berita Acara *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.conclusion || ''}
                    onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs"
                >
                  Simpan & Cetak Berita Acara
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW BERITA ACARA MODAL */}
      {activeItem && (
        <PrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`Dokumen Resmi: ${activeItem.minutesType}`}
          documentNumber={activeItem.minutesNumber}
        >
          <OfficialKop school={school} />

          <div className="text-center my-4">
            <h2 className="text-sm font-bold uppercase tracking-wider underline">
              {activeItem.minutesType === 'PERHITUNGAN_PAJAK'
                ? 'BERITA ACARA PERHITUNGAN DAN PEMOTONGAN PAJAK'
                : activeItem.minutesType === 'PEMERIKSAAN_KAS'
                ? 'BERITA ACARA PEMERIKSAAN KAS'
                : `BERITA ACARA ${activeItem.minutesType.replace(/_/g, ' ')}`}
            </h2>
            <p className="text-xs font-mono">Nomor: {activeItem.minutesNumber}</p>
          </div>

          <p className="text-xs text-justify leading-relaxed mb-4">
            Pada hari ini, tanggal <strong>{formatDateIndo(activeItem.date)}</strong>, bertempat di <strong>{school.name}</strong>, yang bertanda tangan di bawah ini telah melakukan pemeriksaan dan verifikasi administratif atas kegiatan sebagai berikut:
          </p>

          <table className="w-full text-xs border border-black my-4">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold w-44">Uraian Transaksi / Kegiatan</td>
                <td className="border border-black p-2">{activeItem.description}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Periode Pelaksanaan</td>
                <td className="border border-black p-2">{activeItem.period}</td>
              </tr>
              {activeItem.vendorName && (
                <tr>
                  <td className="border border-black p-2 font-semibold">Penyedia / Pihak Ketiga</td>
                  <td className="border border-black p-2">{activeItem.vendorName}</td>
                </tr>
              )}
              {activeItem.taxAmount && activeItem.taxAmount > 0 && (
                <>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Dasar Pengenaan Pajak (DPP)</td>
                    <td className="border border-black p-2 font-mono">{formatRupiah(activeItem.taxBase || 0)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Tarif & Nilai Pajak</td>
                    <td className="border border-black p-2 font-mono font-bold text-red-800">
                      {activeItem.taxRate}% = {formatRupiah(activeItem.taxAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-semibold">Nomor Bukti Setor / NTPN</td>
                    <td className="border border-black p-2 font-mono font-bold">{activeItem.billingOrNtpn || '-'}</td>
                  </tr>
                </>
              )}
              <tr className="bg-slate-50 font-bold">
                <td className="border border-black p-2">Kesimpulan Pemeriksaan</td>
                <td className="border border-black p-2">{activeItem.conclusion}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs leading-relaxed my-4">
            Demikian Berita Acara ini dibuat dan ditandatangani oleh para pihak yang bersangkutan dengan sebenarnya dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.
          </p>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-xs mt-12 print-break-inside-avoid">
            <div className="text-center">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala {school.name}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{school.headmasterName}</p>
              <p>NIP. {school.headmasterNip || '-'}</p>
            </div>

            <div className="text-center">
              <p>{school.district}, {formatDateIndo(activeItem.date)}</p>
              <p className="font-bold">Bendahara Dana BOSP,</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{school.treasurerName}</p>
              <p>NIP. {school.treasurerNip || '-'}</p>
            </div>
          </div>
        </PrintModal>
      )}
    </div>
  );
};
