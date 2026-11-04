import React, { useState, useEffect } from 'react';
import { School, OfficialLetter, LetterType } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDateIndo } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import {
  FileText,
  Plus,
  Printer,
  Calendar,
  X,
  Edit2,
  FileCheck,
} from 'lucide-react';

interface LetterGeneratorProps {
  school: School;
}

export const LetterGenerator: React.FC<LetterGeneratorProps> = ({ school }) => {
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [activeLetter, setActiveLetter] = useState<OfficialLetter | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<OfficialLetter>>({
    letterType: 'PERNYATAAN_TANGGUNG_JAWAB',
    date: new Date().toISOString().split('T')[0],
    subject: 'Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) Penggunaan Dana BOSP',
    recipient: 'Kepala Dinas Pendidikan Kota Cirebon',
    bodyContent: 'Menyatakan dengan sesungguhnya bahwa belanja yang dibiayai dari Dana BOSP Reguler telah dilaksanakan secara transparan, akuntabel, dan sesuai dengan ketentuan peraturan perundang-undangan.',
    signatoryName: school.headmasterName,
    signatoryNip: school.headmasterNip,
    signatoryPosition: 'Kepala Sekolah',
  });

  const letterTypeOptions: { type: LetterType; label: string; defaultSubject: string; defaultBody: string }[] = [
    {
      type: 'PERNYATAAN_TANGGUNG_JAWAB',
      label: 'Surat Pernyataan Tanggung Jawab Mutlak (SPTJM)',
      defaultSubject: 'Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) Penggunaan Dana BOSP',
      defaultBody: 'Menyatakan dengan sesungguhnya bahwa belanja yang dibiayai dari Dana BOSP Reguler telah dilaksanakan secara transparan, akuntabel, dan sesuai dengan ketentuan peraturan perundang-undangan.',
    },
    {
      type: 'PESANAN',
      label: 'Surat Pesanan Barang / Buku (SIPLah)',
      defaultSubject: 'Surat Pesanan Buku Teks Utama Kurikulum Merdeka',
      defaultBody: 'Dengan ini kami memesan sejumlah buku teks pembelajaran dan bahan ajar sebagaimana terlampir dalam rincian nota pesanan SIPLaH.',
    },
    {
      type: 'PERMINTAAN_PEMBAYARAN',
      label: 'Surat Permintaan Pembayaran (SPP)',
      defaultSubject: 'Permintaan Pembayaran Belanja Kegiatan Operasional Sekolah',
      defaultBody: 'Sehubungan dengan telah diselesaikannya pekerjaan dan/atau pengadaan barang/jasa, dengan ini kami mengajukan permintaan pembayaran kepada Bendahara Pengeluaran Dana BOSP.',
    },
    {
      type: 'PENYELESAIAN_KEGIATAN',
      label: 'Surat Pernyataan Penyelesaian Kegiatan',
      defaultSubject: 'Pernyataan Penyelesaian Kegiatan Pemeliharaan Sarana Sekolah',
      defaultBody: 'Menyatakan bahwa pekerjaan pemeliharaan sarana dan prasarana sekolah telah selesai 100% dengan baik sesuai spesifikasi.',
    },
    {
      type: 'PENGGUNAAN_DANA',
      label: 'Surat Pernyataan Penggunaan Dana',
      defaultSubject: 'Pernyataan Kesanggupan Penggunaan Dana Sesuai Juknis BOSP',
      defaultBody: 'Menyatakan bahwa dana yang diterima akan dipergunakan seluruhnya untuk operasional pendidikan sesuai petunjuk teknis juknis BOSP yang berlaku.',
    },
    {
      type: 'UNDANGAN',
      label: 'Surat Undangan Rapat / Sosialisasi',
      defaultSubject: 'Undangan Rapat Pleno Komite & Sosialisasi Penggunaan Dana BOSP',
      defaultBody: 'Mengharap kehadiran Bapak/Ibu Pengurus Komite dan Orang Tua/Wali Murid pada pertemuan pembahasan program kerja sekolah.',
    },
    {
      type: 'TUGAS',
      label: 'Surat Tugas Pembinaan / Kegiatan',
      defaultSubject: 'Surat Tugas Mengikuti Workshop Peningkatan Mutu Guru',
      defaultBody: 'Menugaskan kepada guru/pegawai yang tercantum di bawah ini untuk mengikuti kegiatan workshop pengembangan kurikulum.',
    },
    {
      type: 'PERMOHONAN',
      label: 'Surat Permohonan',
      defaultSubject: 'Permohonan Rekomendasi Pengesahan RKAS BOSP',
      defaultBody: 'Mengajukan permohonan verifikasi dan rekomendasi pengesahan dokumen RKAS Tahun Anggaran berjalan.',
    },
    {
      type: 'PEMBERITAHUAN',
      label: 'Surat Pemberitahuan',
      defaultSubject: 'Pemberitahuan Pelaksanaan Asesmen dan Kegiatan Belajar',
      defaultBody: 'Diberitahukan kepada seluruh dewan guru dan wali murid perihal jadwal pelaksanaan kegiatan akademik.',
    },
    {
      type: 'PERNYATAAN',
      label: 'Surat Pernyataan Umum',
      defaultSubject: 'Surat Pernyataan Kebenaran Dokumen Administrasi Keuangan',
      defaultBody: 'Menyatakan dengan sesungguhnya bahwa seluruh data dan bukti pembukuan yang disampaikan adalah benar dan sah.',
    },
    {
      type: 'PENGANTAR',
      label: 'Surat Pengantar Laporan',
      defaultSubject: 'Pengantar Laporan Pertanggungjawaban (SPJ) Dana BOSP Tahap I',
      defaultBody: 'Bersama ini kami kirimkan Laporan Realisasi Penggunaan Dana BOSP Reguler Tahap I untuk diperiksa.',
    },
    {
      type: 'KETERANGAN',
      label: 'Surat Keterangan',
      defaultSubject: 'Surat Keterangan Bebas Temuan Audit Administrasi BOSP',
      defaultBody: 'Menerangkan bahwa sekolah telah menyelesaikan penatausahaan pembukuan kas umum dan pelaporan perpajakan.',
    },
    {
      type: 'PERTANGGUNGJAWABAN',
      label: 'Surat Pertanggungjawaban Belanja (SPJ)',
      defaultSubject: 'Surat Pengesahan Pertanggungjawaban Belanja BOSP',
      defaultBody: 'Laporan pertanggungjawaban atas belanja operasional sekolah telah diverifikasi dan disetujui Kepala Satuan Pendidikan.',
    },
  ];

  useEffect(() => {
    loadLetters();
  }, [school.id, school.activeFiscalYear]);

  const loadLetters = async () => {
    const res = await api.getLetters(school.id, school.activeFiscalYear);
    if (res.success) {
      setLetters(res.letters);
    }
  };

  const handleTypeSelect = (t: LetterType) => {
    const opt = letterTypeOptions.find((o) => o.type === t);
    setFormData({
      ...formData,
      letterType: t,
      subject: opt?.defaultSubject || '',
      bodyContent: opt?.defaultBody || '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createLetter({
      ...formData,
      schoolId: school.id,
      fiscalYear: school.activeFiscalYear,
    });

    if (res.success) {
      setShowModal(false);
      loadLetters();
      setActiveLetter(res.letter);
      setIsPrintOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0B5D3B]" />
            <span>Pusat Pembuatan Surat Administrasi Resmi (13 Template)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Penomoran otomatis kedinasan, template baku SPTJM, SPP, Pesanan SIPLaH, dan pengantar laporan.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Baru</span>
        </button>
      </div>

      {/* Letters Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Arsip Surat Keluar Resmi Sekolah
          </h3>
          <span className="text-xs text-slate-500">{letters.length} Surat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Nomor Surat</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">Jenis Template</th>
                <th className="px-4 py-3">Perihal / Subject</th>
                <th className="px-3 py-3">Tujuan / Kepada</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {letters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada surat yang diterbitkan. Klik "Buat Surat Baru".
                  </td>
                </tr>
              ) : (
                letters.map((ltr) => (
                  <tr key={ltr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0B5D3B]">
                      {ltr.letterNumber}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {ltr.date}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800">
                        {ltr.letterType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-xs truncate">
                      {ltr.subject}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{ltr.recipient}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setActiveLetter(ltr);
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

      {/* CREATE LETTER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">Buat Surat Administrasi Kedinasan</h3>
                <p className="text-xs text-slate-500">Pilih dari 13 template resmi BOSP.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pilih Template Surat Resmi *
                </label>
                <select
                  value={formData.letterType}
                  onChange={(e) => handleTypeSelect(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {letterTypeOptions.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Surat *
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
                    Tujuan / Kepada Yth. *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recipient || ''}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    placeholder="Contoh: Kepala Dinas Pendidikan / Pimpinan Rekanan"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Perihal / Subject Surat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Isi / Redaksi Surat (Dapat Diedit Bebas) *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.bodyContent || ''}
                    onChange={(e) => setFormData({ ...formData, bodyContent: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-serif leading-relaxed"
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
                  Terbitkan & Cetak Surat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW SURAT MODAL */}
      {activeLetter && (
        <PrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`Dokumen Resmi: ${activeLetter.subject}`}
          documentNumber={activeLetter.letterNumber}
        >
          <OfficialKop school={school} />

          <div className="flex justify-between items-start text-xs my-4">
            <div>
              <p>Nomor   : {activeLetter.letterNumber}</p>
              <p>Lampiran: -</p>
              <p>Perihal : <strong>{activeLetter.subject}</strong></p>
            </div>
            <div className="text-right">
              <p>{school.district}, {formatDateIndo(activeLetter.date)}</p>
              <p className="mt-2 text-left">Kepada Yth,</p>
              <p className="font-bold text-left">{activeLetter.recipient}</p>
              <p className="text-left">di Tempat</p>
            </div>
          </div>

          <div className="my-8 text-xs leading-loose text-justify font-serif space-y-4">
            <p>Dengan hormat,</p>
            <p className="indent-8">{activeLetter.bodyContent}</p>
            <p className="indent-8">
              Demikian surat ini kami sampaikan dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama yang baik, kami ucapkan terima kasih.
            </p>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-16 print-break-inside-avoid text-xs text-center">
            <div className="w-64">
              <p className="font-bold">{activeLetter.signatoryPosition || 'Kepala Sekolah'},</p>
              <div className="h-24"></div>
              <p className="font-bold underline uppercase">{activeLetter.signatoryName}</p>
              <p>NIP. {activeLetter.signatoryNip || '-'}</p>
            </div>
          </div>
        </PrintModal>
      )}
    </div>
  );
};
