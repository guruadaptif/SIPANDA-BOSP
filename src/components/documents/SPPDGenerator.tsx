import React, { useState, useEffect } from 'react';
import { School, SPPDItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah, formatDateIndo, terbilang } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  Send,
  Plus,
  Printer,
  FileCheck2,
  Calendar,
  X,
  UserCheck,
} from 'lucide-react';

interface SPPDGeneratorProps {
  school: School;
}

export const SPPDGenerator: React.FC<SPPDGeneratorProps> = ({ school }) => {
  const [sppdList, setSppdList] = useState<SPPDItem[]>([]);
  const [activeItem, setActiveItem] = useState<SPPDItem | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<SPPDItem>>({
    travelerName: school.treasurerName,
    travelerNip: school.treasurerNip,
    travelerPosition: 'Bendahara Dana BOSP',
    travelerRank: 'Penata Muda Tk. I (III/b)',
    destination: 'Dinas Pendidikan Kota Cirebon',
    purpose: 'Konsultasi dan Rekonsiliasi Pelaporan Dana BOSP',
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: new Date().toISOString().split('T')[0],
    durationDays: 1,
    transportMode: 'Kendaraan Dinas / Umum',
    transportCost: 75000,
    lodgingCost: 0,
    dailyAllowance: 150000,
    otherCosts: 0,
    totalCost: 225000,
    budgetSource: 'Dana BOSP Reguler TA 2026',
    assigningOfficial: school.headmasterName,
    assigningOfficialNip: school.headmasterNip,
    reportSummary: 'Telah melaksanakan koordinasi penatausahaan pembukuan dan rekonsiliasi.',
  });

  useEffect(() => {
    loadSPPD();
  }, [school.id, school.activeFiscalYear]);

  const loadSPPD = async () => {
    const res = await api.getSPPD(school.id, school.activeFiscalYear);
    if (res.success) {
      setSppdList(res.sppd);
    }
  };

  const handleCostChange = (field: string, val: number) => {
    const updated = { ...formData, [field]: val };
    const transport = Number(updated.transportCost || 0);
    const lodging = Number(updated.lodgingCost || 0);
    const daily = Number(updated.dailyAllowance || 0);
    const other = Number(updated.otherCosts || 0);
    const total = transport + lodging + daily + other;

    setFormData({
      ...updated,
      totalCost: total,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createSPPD({
      ...formData,
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
    });

    if (res.success) {
      setShowModal(false);
      loadSPPD();
      setActiveItem(res.sppd);
      setIsPrintOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-[#0B5D3B]" />
            <span>Generator Surat Perintah Perjalanan Dinas (SPPD)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Surat Tugas, SPPD resmi, Rincian Biaya Riil, dan Laporan Hasil Perjalanan Dinas.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Buat SPPD Baru</span>
        </button>
      </div>

      {/* SPPD List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Perjalanan Dinas Terbit
          </h3>
          <span className="text-xs text-slate-500">{sppdList.length} SPPD</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">No. SPPD / Surat Tugas</th>
                <th className="px-3 py-3">Pelaksana</th>
                <th className="px-3 py-3">Tujuan</th>
                <th className="px-4 py-3">Maksud Perjalanan</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3 text-right">Total Biaya (Rp)</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sppdList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Belum ada riwayat SPPD. Klik "Buat SPPD Baru".
                  </td>
                </tr>
              ) : (
                sppdList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0B5D3B]">
                      {item.sppdNumber}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ST: {item.letterNumber}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {item.travelerName}
                      <span className="text-[10px] text-slate-500 block font-normal font-mono">
                        {item.travelerNip}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{item.destination}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{item.purpose}</td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {item.departureDate} ({item.durationDays} hari)
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setActiveItem(item);
                          setIsPrintOpen(true);
                        }}
                        className="flex items-center gap-1 mx-auto px-2.5 py-1 text-xs font-semibold text-[#0B5D3B] hover:text-white hover:bg-[#0B5D3B] border border-[#0B5D3B] rounded-md transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Dokumen</span>
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
                <h3 className="text-base font-bold text-slate-900">Buat SPPD & Surat Tugas Baru</h3>
                <p className="text-xs text-slate-500">
                  Perhitungan uang harian, transportasi, dan rincian riil otomatis.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Pegawai yang Ditugaskan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.travelerName || ''}
                    onChange={(e) => setFormData({ ...formData, travelerName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NIP Pegawai
                  </label>
                  <input
                    type="text"
                    value={formData.travelerNip || ''}
                    onChange={(e) => setFormData({ ...formData, travelerNip: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.travelerPosition || ''}
                    onChange={(e) => setFormData({ ...formData, travelerPosition: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Pangkat / Golongan
                  </label>
                  <input
                    type="text"
                    value={formData.travelerRank || ''}
                    onChange={(e) => setFormData({ ...formData, travelerRank: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tempat / Tujuan Perjalanan Dinas *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination || ''}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Contoh: Kantor Dinas Pendidikan Kota Cirebon"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Maksud Perjalanan Dinas *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.purpose || ''}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Contoh: Menghadiri Rapat Koordinasi dan Verifikasi Pelaporan Dana BOSP Tahap I..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Berangkat *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.departureDate || ''}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Kembali *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.returnDate || ''}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Cost Split */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Rincian Standar Biaya Perjalanan Dinas
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Transportasi (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.transportCost || 0}
                      onChange={(e) => handleCostChange('transportCost', Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Uang Harian (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.dailyAllowance || 0}
                      onChange={(e) => handleCostChange('dailyAllowance', Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Penginapan (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.lodgingCost || 0}
                      onChange={(e) => handleCostChange('lodgingCost', Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Total Biaya (Rp)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formatRupiah(formData.totalCost || 0)}
                      className="w-full text-xs font-mono font-black px-2 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded"
                    />
                  </div>
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
                  Terbitkan & Cetak SPPD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW SPPD MODAL */}
      {activeItem && (
        <PrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`Dokumen Resmi SPPD (${activeItem.sppdNumber})`}
          documentNumber={activeItem.sppdNumber}
        >
          <OfficialKop school={school} />

          <div className="text-center my-4">
            <h2 className="text-sm font-bold uppercase tracking-wider underline">
              SURAT PERINTAH TUGAS
            </h2>
            <p className="text-xs font-mono">Nomor: {activeItem.letterNumber}</p>
          </div>

          <p className="text-xs text-justify leading-relaxed mb-4">
            Yang bertanda tangan di bawah ini Kepala {school.name}, dengan ini menugaskan kepada:
          </p>

          <table className="w-full text-xs mb-4">
            <tbody>
              <tr>
                <td className="w-40 py-1">Nama Pegawai</td>
                <td className="w-4 py-1">:</td>
                <td className="font-bold">{activeItem.travelerName}</td>
              </tr>
              <tr>
                <td className="py-1">NIP / NUPTK</td>
                <td className="py-1">:</td>
                <td className="font-mono">{activeItem.travelerNip || '-'}</td>
              </tr>
              <tr>
                <td className="py-1">Jabatan / Golongan</td>
                <td className="py-1">:</td>
                <td>{activeItem.travelerPosition} ({activeItem.travelerRank || '-'})</td>
              </tr>
              <tr>
                <td className="py-1">Maksud Perjalanan</td>
                <td className="py-1">:</td>
                <td className="font-medium">{activeItem.purpose}</td>
              </tr>
              <tr>
                <td className="py-1">Tempat Tujuan</td>
                <td className="py-1">:</td>
                <td>{activeItem.destination}</td>
              </tr>
              <tr>
                <td className="py-1">Lama Perjalanan</td>
                <td className="py-1">:</td>
                <td>{activeItem.durationDays} hari (Tanggal: {activeItem.departureDate} s.d. {activeItem.returnDate})</td>
              </tr>
              <tr>
                <td className="py-1">Pembebanan Anggaran</td>
                <td className="py-1">:</td>
                <td>{activeItem.budgetSource}</td>
              </tr>
            </tbody>
          </table>

          {/* Rincian Riil Biaya */}
          <div className="my-6">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 border-b border-black pb-1">
              Rincian Biaya Perjalanan Dinas (Pengeluaran Riil)
            </h4>
            <table className="w-full text-xs border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-1 w-8">No</th>
                  <th className="border border-black p-1">Perincian Biaya</th>
                  <th className="border border-black p-1 w-32 text-right">Jumlah (Rp)</th>
                  <th className="border border-black p-1 w-32">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 text-center">1</td>
                  <td className="border border-black p-1">Biaya Transportasi PP</td>
                  <td className="border border-black p-1 text-right font-mono">{formatRupiah(activeItem.transportCost)}</td>
                  <td className="border border-black p-1 text-center">Riil</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center">2</td>
                  <td className="border border-black p-1">Uang Harian Pelaksana</td>
                  <td className="border border-black p-1 text-right font-mono">{formatRupiah(activeItem.dailyAllowance)}</td>
                  <td className="border border-black p-1 text-center">Standar SBU</td>
                </tr>
                {activeItem.lodgingCost > 0 && (
                  <tr>
                    <td className="border border-black p-1 text-center">3</td>
                    <td className="border border-black p-1">Biaya Penginapan</td>
                    <td className="border border-black p-1 text-right font-mono">{formatRupiah(activeItem.lodgingCost)}</td>
                    <td className="border border-black p-1 text-center">Kuitansi Hotel</td>
                  </tr>
                )}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={2} className="border border-black p-1 text-right">JUMLAH TOTAL:</td>
                  <td className="border border-black p-1 text-right font-mono">{formatRupiah(activeItem.totalCost)}</td>
                  <td className="border border-black p-1 text-center font-serif italic text-[10px]">
                    # {terbilang(activeItem.totalCost)} #
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 text-xs mt-10 print-break-inside-avoid">
            <div className="text-center">
              <p>Telah menerima jumlah uang sebesar</p>
              <p className="font-mono font-bold">{formatRupiah(activeItem.totalCost)}</p>
              <p className="mt-2 font-bold">Yang Menerima Perintah,</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{activeItem.travelerName}</p>
              <p>NIP. {activeItem.travelerNip || '-'}</p>
            </div>

            <div className="text-center">
              <p>{school.district}, {formatDateIndo(activeItem.departureDate)}</p>
              <p className="font-bold">Pejabat Pemberi Tugas (Kepala Sekolah),</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{activeItem.assigningOfficial}</p>
              <p>NIP. {activeItem.assigningOfficialNip || '-'}</p>
            </div>
          </div>
        </PrintModal>
      )}
    </div>
  );
};
