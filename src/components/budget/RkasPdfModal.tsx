import React, { useState } from 'react';
import { School, BudgetPlan, BudgetComponent, BudgetItemDetail, MainExpenditureType, FundSourceType } from '../../types/index.ts';
import { formatRupiah, terbilang, formatDateIndo } from '../../utils/terbilang.ts';
import { OfficialKop } from '../common/OfficialKop.tsx';
import { PrintModal } from '../common/PrintModal.tsx';
import { Printer, Download, Calendar, Layers, FileCheck, CheckCircle2 } from 'lucide-react';
import { StageFilter } from './BudgetManagement.tsx';
import { exportBudgetRealizationToExcel } from '../../utils/excelExport.ts';

interface RkasPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  plan: Partial<BudgetPlan>;
  components: BudgetComponent[];
  initialStage?: StageFilter;
  fundSource?: FundSourceType;
  fiscalYear?: number;
}

export const RkasPdfModal: React.FC<RkasPdfModalProps> = ({
  isOpen,
  onClose,
  school,
  plan,
  components,
  initialStage = 'GABUNGAN',
  fundSource = 'BOSP_REGULER',
  fiscalYear,
}) => {
  const [selectedStage, setSelectedStage] = useState<StageFilter>(initialStage);

  if (!isOpen) return null;

  const defaultPagu = fundSource === 'BOSP_REGULER' ? 240000000 : 0;
  const totalPaguAnnual = plan.totalPagu !== undefined && plan.totalPagu !== null ? plan.totalPagu : defaultPagu;
  const paguStage1 = plan.stage1Allocation !== undefined && plan.stage1Allocation !== null ? plan.stage1Allocation : Math.floor(totalPaguAnnual / 2);
  const paguStage2 = plan.stage2Allocation !== undefined && plan.stage2Allocation !== null ? plan.stage2Allocation : Math.floor(totalPaguAnnual / 2);

  const activePagu =
    selectedStage === 'GABUNGAN'
      ? totalPaguAnnual
      : selectedStage === 'TAHAP_1'
      ? paguStage1
      : paguStage2;

  const stageLabel =
    selectedStage === 'GABUNGAN'
      ? '1 TAHUN ANGGARAN (TAHAP I & II)'
      : selectedStage === 'TAHAP_1'
      ? 'PENYALURAN TAHAP I (JANUARI - JUNI)'
      : 'PENYALURAN TAHAP II (JULI - DESEMBER)';

  const stageSubTitle =
    selectedStage === 'GABUNGAN'
      ? 'Alokasi Penuh Tahap I & Tahap II'
      : selectedStage === 'TAHAP_1'
      ? 'Semester I (Realisasi Jan - Jun)'
      : 'Semester II (Realisasi Jul - Des)';

  const isFullYear = selectedStage === 'GABUNGAN';

  // Helper to determine item amount in Tahap 1
  const getItemStage1Amount = (item: BudgetItemDetail): number => {
    if (item.stage === '2') return 0;
    if (item.stage1Amount !== undefined && item.stage1Amount !== null) return item.stage1Amount;
    if (item.stage === '1') return item.totalAmount || ((item.volume || 1) * (item.unitPrice || 0));
    const tot = item.totalAmount || ((item.volume || 1) * (item.unitPrice || 0));
    return Math.round(tot / 2);
  };

  // Helper to determine item amount in Tahap 2
  const getItemStage2Amount = (item: BudgetItemDetail): number => {
    if (item.stage === '1') return 0;
    if (item.stage2Amount !== undefined && item.stage2Amount !== null) return item.stage2Amount;
    if (item.stage === '2') return item.totalAmount || ((item.volume || 1) * (item.unitPrice || 0));
    const tot = item.totalAmount || ((item.volume || 1) * (item.unitPrice || 0));
    return tot - Math.round(tot / 2);
  };

  // Helper to determine item amount in selected stage
  const getItemAmount = (item: BudgetItemDetail): number => {
    if (selectedStage === 'GABUNGAN') return item.totalAmount || ((item.volume || 1) * (item.unitPrice || 0));
    if (selectedStage === 'TAHAP_1') return getItemStage1Amount(item);
    return getItemStage2Amount(item);
  };

  const getItemVolume = (item: BudgetItemDetail): number => {
    if (selectedStage === 'GABUNGAN') return item.volume || 1;
    if (selectedStage === 'TAHAP_1') {
      if (item.stage === '2') return 0;
      if (item.stage === '1') return item.volume || 1;
      return Math.max(1, Math.round((item.volume || 1) / 2));
    } else {
      if (item.stage === '1') return 0;
      if (item.stage === '2') return item.volume || 1;
      return Math.max(1, (item.volume || 1) - Math.round((item.volume || 1) / 2));
    }
  };

  // Filter and compute categories
  const categories: {
    type: MainExpenditureType;
    codePrefix: string;
    title: string;
    subTitle: string;
  }[] = [
    {
      type: 'BARANG_JASA',
      codePrefix: '5.1.02',
      title: 'A. BELANJA BARANG DAN JASA',
      subTitle: 'Operasional kegiatan pembelajaran, ATK, langganan daya & jasa, pemeliharaan',
    },
    {
      type: 'MODAL_PERALATAN_MESIN',
      codePrefix: '5.2.02',
      title: 'B. BELANJA MODAL PERALATAN DAN MESIN',
      subTitle: 'Pengadaan komputer, proyektor, peralatan IT dan keamanan kantor',
    },
    {
      type: 'MODAL_ASET_TETAP_LAINNYA',
      codePrefix: '5.2.05',
      title: 'C. BELANJA MODAL ASET TETAP LAINNYA',
      subTitle: 'Pengadaan koleksi buku teks umum, teks pendamping, dan literasi siswa',
    },
  ];

  // Calculate totals per category: Stage 1, Stage 2, and Combined Total
  const categoryTotals: Record<MainExpenditureType, { stage1: number; stage2: number; total: number }> = {
    BARANG_JASA: { stage1: 0, stage2: 0, total: 0 },
    MODAL_PERALATAN_MESIN: { stage1: 0, stage2: 0, total: 0 },
    MODAL_ASET_TETAP_LAINNYA: { stage1: 0, stage2: 0, total: 0 },
  };

  categories.forEach((cat) => {
    const comps = components.filter((c) => c.mainType === cat.type);
    let s1 = 0;
    let s2 = 0;
    let tot = 0;

    comps.forEach((comp) => {
      if (comp.items && comp.items.length > 0) {
        comp.items.forEach((item) => {
          const itmS1 = getItemStage1Amount(item);
          const itmS2 = getItemStage2Amount(item);
          s1 += itmS1;
          s2 += itmS2;
          tot += (item.totalAmount || (itmS1 + itmS2));
        });
      } else {
        const compS1 = comp.stage1Budget || Math.round((comp.allocatedAmount || 0) / 2);
        const compS2 = comp.stage2Budget || ((comp.allocatedAmount || 0) - compS1);
        s1 += compS1;
        s2 += compS2;
        tot += (comp.allocatedAmount || (compS1 + compS2));
      }
    });

    categoryTotals[cat.type] = { stage1: s1, stage2: s2, total: tot };
  });

  const grandStage1 =
    categoryTotals.BARANG_JASA.stage1 +
    categoryTotals.MODAL_PERALATAN_MESIN.stage1 +
    categoryTotals.MODAL_ASET_TETAP_LAINNYA.stage1;

  const grandStage2 =
    categoryTotals.BARANG_JASA.stage2 +
    categoryTotals.MODAL_PERALATAN_MESIN.stage2 +
    categoryTotals.MODAL_ASET_TETAP_LAINNYA.stage2;

  const grandTotal = isFullYear
    ? (grandStage1 + grandStage2)
    : selectedStage === 'TAHAP_1'
    ? grandStage1
    : grandStage2;

  const remainingPagu = activePagu - grandTotal;

  const handleExportExcel = () => {
    exportBudgetRealizationToExcel(
      school.name,
      school.activeFiscalYear,
      totalPaguAnnual,
      components,
      selectedStage
    );
  };

  const headerControls = (
    <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg">
      <span className="text-[11px] font-semibold text-slate-700 px-2 flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-[#0B5D3B]" />
        Periode:
      </span>
      <button
        type="button"
        onClick={() => setSelectedStage('GABUNGAN')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
          selectedStage === 'GABUNGAN'
            ? 'bg-[#0B5D3B] text-white shadow-xs'
            : 'text-slate-700 hover:text-black hover:bg-slate-300/60'
        }`}
      >
        1 Tahun Penuh
      </button>
      <button
        type="button"
        onClick={() => setSelectedStage('TAHAP_1')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
          selectedStage === 'TAHAP_1'
            ? 'bg-blue-700 text-white shadow-xs'
            : 'text-slate-700 hover:text-black hover:bg-slate-300/60'
        }`}
      >
        Tahap I
      </button>
      <button
        type="button"
        onClick={() => setSelectedStage('TAHAP_2')}
        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
          selectedStage === 'TAHAP_2'
            ? 'bg-indigo-700 text-white shadow-xs'
            : 'text-slate-700 hover:text-black hover:bg-slate-300/60'
        }`}
      >
        Tahap II
      </button>
    </div>
  );

  const effectiveYear = fiscalYear || plan.fiscalYear || school.activeFiscalYear || 2026;
  const effectiveFundSource = fundSource || plan.fundSource || 'BOSP_REGULER';
  const fundTitle =
    effectiveFundSource === 'BOSP_KINERJA'
      ? 'DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) KINERJA'
      : effectiveFundSource === 'BOSP_AFIRMASI'
      ? 'DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) AFIRMASI'
      : 'DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) REGULER';

  const fundLabel =
    effectiveFundSource === 'BOSP_KINERJA'
      ? 'Dana BOSP Kinerja'
      : effectiveFundSource === 'BOSP_AFIRMASI'
      ? 'Dana BOSP Afirmasi'
      : 'Dana BOSP Reguler';

  return (
    <PrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Dokumen Resmi RKAS ${fundLabel} TA ${effectiveYear}`}
      documentNumber={`RKAS-${effectiveFundSource}/${school.npsn}/${effectiveYear}/${selectedStage}`}
      onExportExcel={handleExportExcel}
      maxWidthClass={isFullYear ? "max-w-6xl" : "max-w-5xl"}
      headerExtra={headerControls}
    >
      {/* KOP SURAT RESMI */}
      <OfficialKop school={school} />

      {/* JUDUL DOKUMEN RKAS */}
      <div className="text-center my-4 pb-2 border-b-2 border-black">
        <h2 className="text-base font-bold uppercase tracking-wider font-serif">
          RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS)
        </h2>
        <h3 className="text-sm font-bold uppercase tracking-wide font-serif text-slate-800">
          {fundTitle}
        </h3>
        <p className="text-xs font-serif font-semibold mt-0.5">
          TAHUN ANGGARAN {effectiveYear} — PERIODE: {stageLabel}
        </p>
      </div>

      {/* INFORMASI SATUAN PENDIDIKAN & PAGU */}
      <div className="text-[11px] leading-relaxed mb-4 border border-black p-3 bg-white">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div className="flex">
            <span className="w-36 font-semibold">Nama Satuan Pendidikan</span>
            <span className="w-3">:</span>
            <span className="font-bold uppercase">{school.name}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Kabupaten / Kota</span>
            <span className="w-3">:</span>
            <span>{school.district || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">NPSN / NSS</span>
            <span className="w-3">:</span>
            <span className="font-mono font-bold">{school.npsn}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Provinsi</span>
            <span className="w-3">:</span>
            <span>{school.province || 'Jawa Barat'}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Bentuk Pendidikan</span>
            <span className="w-3">:</span>
            <span>{school.level} ({school.status})</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Sumber Dana</span>
            <span className="w-3">:</span>
            <span className="font-semibold">{fundLabel} TA {effectiveYear}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Pagu Periode Ini</span>
            <span className="w-3">:</span>
            <span className="font-mono font-bold text-slate-900">{formatRupiah(activePagu)}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold">Dasar Penetapan</span>
            <span className="w-3">:</span>
            <span>Permendikbudristek Juknis BOSP TA {effectiveYear}</span>
          </div>
        </div>
      </div>

      {/* TABEL RINCIAN RKAS PER OBJEK BELANJA */}
      <table className="w-full text-[10px] border-collapse mb-4 border border-black">
        <thead>
          {isFullYear ? (
            /* Header Tabel Cetakan 1 Tahun Penuh (Menampilkan Anggaran Tahap 1, Tahap 2, dan Total) */
            <>
              <tr className="bg-slate-100 text-center font-bold border-b border-black">
                <th className="border border-black py-1.5 px-1 w-7">No</th>
                <th className="border border-black py-1.5 px-1.5 w-18">Kode Rek</th>
                <th className="border border-black py-1.5 px-2 text-left">Objek Belanja / Sub-Rincian / Uraian Belanja</th>
                <th className="border border-black py-1.5 px-1 w-10">Vol</th>
                <th className="border border-black py-1.5 px-1 w-14">Satuan</th>
                <th className="border border-black py-1.5 px-1.5 w-20 text-right">Harga Satuan</th>
                <th className="border border-black py-1.5 px-1.5 w-24 text-right bg-blue-50/50">Anggaran Tahap 1</th>
                <th className="border border-black py-1.5 px-1.5 w-24 text-right bg-indigo-50/50">Anggaran Tahap 2</th>
                <th className="border border-black py-1.5 px-2 w-26 text-right bg-emerald-50/50">Total Anggaran</th>
              </tr>
              <tr className="bg-slate-50 text-[9px] text-center italic text-slate-600 border-b border-black">
                <td className="border border-black py-0.5">1</td>
                <td className="border border-black py-0.5">2</td>
                <td className="border border-black py-0.5 text-left pl-2">3</td>
                <td className="border border-black py-0.5">4</td>
                <td className="border border-black py-0.5">5</td>
                <td className="border border-black py-0.5 text-right pr-1.5">6</td>
                <td className="border border-black py-0.5 text-right pr-1.5">7</td>
                <td className="border border-black py-0.5 text-right pr-1.5">8</td>
                <td className="border border-black py-0.5 text-right pr-2">9 = (7 + 8)</td>
              </tr>
            </>
          ) : (
            /* Header Tabel Cetakan Per Tahap (Hanya data tahap aktif, tanpa kolom keterangan tahap) */
            <>
              <tr className="bg-slate-100 text-center font-bold border-b border-black">
                <th className="border border-black py-1.5 px-1 w-8">No</th>
                <th className="border border-black py-1.5 px-2 w-20">Kode Rek</th>
                <th className="border border-black py-1.5 px-2 text-left">Objek Belanja / Sub-Rincian / Uraian Belanja</th>
                <th className="border border-black py-1.5 px-1.5 w-12">Vol</th>
                <th className="border border-black py-1.5 px-1.5 w-16">Satuan</th>
                <th className="border border-black py-1.5 px-2 w-24 text-right">Harga Satuan</th>
                <th className="border border-black py-1.5 px-2 w-32 text-right">
                  Jumlah Anggaran {selectedStage === 'TAHAP_1' ? 'Tahap I' : 'Tahap II'}
                </th>
              </tr>
              <tr className="bg-slate-50 text-[9px] text-center italic text-slate-600 border-b border-black">
                <td className="border border-black py-0.5">1</td>
                <td className="border border-black py-0.5">2</td>
                <td className="border border-black py-0.5 text-left pl-2">3</td>
                <td className="border border-black py-0.5">4</td>
                <td className="border border-black py-0.5">5</td>
                <td className="border border-black py-0.5 text-right pr-2">6</td>
                <td className="border border-black py-0.5 text-right pr-2">7 = (4 × 6)</td>
              </tr>
            </>
          )}
        </thead>
        <tbody>
          {categories.map((cat, catIdx) => {
            const catComps = components.filter((c) => c.mainType === cat.type);
            const catSummary = categoryTotals[cat.type];

            return (
              <React.Fragment key={cat.type}>
                {/* Header Kategori Objek Belanja Utama */}
                <tr className="bg-slate-200 font-bold border-b border-black">
                  <td className="border border-black py-1 text-center font-bold">
                    {String.fromCharCode(65 + catIdx)}
                  </td>
                  <td className="border border-black py-1 font-mono text-center">{cat.codePrefix}</td>
                  <td className="border border-black py-1 px-2 uppercase font-bold" colSpan={4}>
                    {cat.title}
                  </td>
                  {isFullYear ? (
                    <>
                      <td className="border border-black py-1 px-1.5 text-right font-mono font-bold bg-blue-100/50">
                        {formatRupiah(catSummary.stage1)}
                      </td>
                      <td className="border border-black py-1 px-1.5 text-right font-mono font-bold bg-indigo-100/50">
                        {formatRupiah(catSummary.stage2)}
                      </td>
                      <td className="border border-black py-1 px-2 text-right font-mono font-bold bg-emerald-100/50">
                        {formatRupiah(catSummary.total)}
                      </td>
                    </>
                  ) : (
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                      {formatRupiah(selectedStage === 'TAHAP_1' ? catSummary.stage1 : catSummary.stage2)}
                    </td>
                  )}
                </tr>

                {/* Sub-Rincian Objek Belanja */}
                {catComps.map((comp, compIdx) => {
                  const compItems = comp.items || [];
                  // Hanya mengambil data per tahap jika bukan cetakan gabungan
                  const activeItems = compItems.filter((itm) => {
                    if (isFullYear) return true;
                    if (selectedStage === 'TAHAP_1') return itm.stage === '1' || itm.stage === 'BOTH' || !itm.stage;
                    return itm.stage === '2' || itm.stage === 'BOTH' || !itm.stage;
                  });

                  // Subtotal sub-rincian
                  let compS1 = 0;
                  let compS2 = 0;
                  let compTot = 0;

                  if (compItems.length > 0) {
                    compItems.forEach((itm) => {
                      const s1 = getItemStage1Amount(itm);
                      const s2 = getItemStage2Amount(itm);
                      compS1 += s1;
                      compS2 += s2;
                      compTot += (itm.totalAmount || (s1 + s2));
                    });
                  } else {
                    compS1 = comp.stage1Budget || Math.round((comp.allocatedAmount || 0) / 2);
                    compS2 = comp.stage2Budget || ((comp.allocatedAmount || 0) - compS1);
                    compTot = comp.allocatedAmount || (compS1 + compS2);
                  }

                  const compActiveStageTotal = selectedStage === 'TAHAP_1' ? compS1 : compS2;

                  return (
                    <React.Fragment key={comp.code}>
                      <tr className="bg-slate-50 font-semibold border-b border-black">
                        <td className="border border-black py-1 text-center text-slate-700">
                          {catIdx + 1}.{compIdx + 1}
                        </td>
                        <td className="border border-black py-1 text-center font-mono text-slate-700">
                          {comp.code}
                        </td>
                        <td className="border border-black py-1 px-2 font-bold text-slate-900" colSpan={4}>
                          {comp.name}
                        </td>
                        {isFullYear ? (
                          <>
                            <td className="border border-black py-1 px-1.5 text-right font-mono font-semibold text-slate-800 bg-blue-50/30">
                              {formatRupiah(compS1)}
                            </td>
                            <td className="border border-black py-1 px-1.5 text-right font-mono font-semibold text-slate-800 bg-indigo-50/30">
                              {formatRupiah(compS2)}
                            </td>
                            <td className="border border-black py-1 px-2 text-right font-mono font-bold text-slate-900 bg-emerald-50/30">
                              {formatRupiah(compTot)}
                            </td>
                          </>
                        ) : (
                          <td className="border border-black py-1 px-2 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(compActiveStageTotal)}
                          </td>
                        )}
                      </tr>

                      {/* Detail Line Items */}
                      {activeItems.length > 0 ? (
                        activeItems.map((itm, itmIdx) => {
                          const itemS1 = getItemStage1Amount(itm);
                          const itemS2 = getItemStage2Amount(itm);
                          const itemTot = itm.totalAmount || (itemS1 + itemS2);
                          const stageAmount = selectedStage === 'TAHAP_1' ? itemS1 : itemS2;
                          const stageVol = getItemVolume(itm);

                          return (
                            <tr key={itm.id || itmIdx} className="border-b border-slate-300">
                              <td className="border border-black py-1 text-center text-slate-500 text-[9px]">
                                {catIdx + 1}.{compIdx + 1}.{itmIdx + 1}
                              </td>
                              <td className="border border-black py-1 text-center font-mono text-slate-400 text-[9px]">
                                {comp.code}.{String(itmIdx + 1).padStart(2, '0')}
                              </td>
                              <td className="border border-black py-1 px-2 pl-6 text-slate-800">
                                {itm.description || 'Kebutuhan belanja operasional satuan pendidikan'}
                              </td>
                              <td className="border border-black py-1 px-1 text-center font-mono">
                                {isFullYear ? itm.volume : stageVol}
                              </td>
                              <td className="border border-black py-1 px-1 text-center">
                                {itm.unit || 'Paket'}
                              </td>
                              <td className="border border-black py-1 px-1.5 text-right font-mono">
                                {formatRupiah(itm.unitPrice || 0)}
                              </td>
                              {isFullYear ? (
                                <>
                                  <td className="border border-black py-1 px-1.5 text-right font-mono text-blue-900">
                                    {formatRupiah(itemS1)}
                                  </td>
                                  <td className="border border-black py-1 px-1.5 text-right font-mono text-indigo-900">
                                    {formatRupiah(itemS2)}
                                  </td>
                                  <td className="border border-black py-1 px-2 text-right font-mono font-semibold text-emerald-950">
                                    {formatRupiah(itemTot)}
                                  </td>
                                </>
                              ) : (
                                <td className="border border-black py-1 px-2 text-right font-mono font-semibold text-slate-900">
                                  {formatRupiah(stageAmount)}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="border-b border-slate-300 italic text-slate-500">
                          <td className="border border-black py-1 text-center text-[9px]">-</td>
                          <td className="border border-black py-1 text-center font-mono text-[9px]">-</td>
                          <td className="border border-black py-1 px-2 pl-6" colSpan={4}>
                            Alokasi paket pembiayaan standar {comp.name}
                          </td>
                          {isFullYear ? (
                            <>
                              <td className="border border-black py-1 px-1.5 text-right font-mono">
                                {formatRupiah(compS1)}
                              </td>
                              <td className="border border-black py-1 px-1.5 text-right font-mono">
                                {formatRupiah(compS2)}
                              </td>
                              <td className="border border-black py-1 px-2 text-right font-mono font-semibold">
                                {formatRupiah(compTot)}
                              </td>
                            </>
                          ) : (
                            <td className="border border-black py-1 px-2 text-right font-mono font-semibold">
                              {formatRupiah(compActiveStageTotal)}
                            </td>
                          )}
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot style={{ display: 'table-row-group' }}>
          {/* REKAPITULASI TOTAL */}
          <tr className="bg-slate-100 font-bold border-t-2 border-b border-black text-black">
            <td className="border border-black py-2 px-2 text-center" colSpan={6}>
              TOTAL RENCANA KEGIATAN & ANGGARAN SEKOLAH (RKAS)
            </td>
            {isFullYear ? (
              <>
                <td className="border border-black py-2 px-1.5 text-right font-mono font-bold bg-blue-100/60">
                  {formatRupiah(grandStage1)}
                </td>
                <td className="border border-black py-2 px-1.5 text-right font-mono font-bold bg-indigo-100/60">
                  {formatRupiah(grandStage2)}
                </td>
                <td className="border border-black py-2 px-2 text-right font-mono font-bold text-xs bg-emerald-100/60">
                  {formatRupiah(grandTotal)}
                </td>
              </>
            ) : (
              <td className="border border-black py-2 px-2 text-right font-mono font-bold text-xs">
                {formatRupiah(grandTotal)}
              </td>
            )}
          </tr>
          <tr className="bg-white border-b border-black">
            <td className="border border-black py-1.5 px-2 text-center font-semibold" colSpan={6}>
              TOTAL PAGU ANGGARAN DANA BOSP ({stageSubTitle})
            </td>
            {isFullYear ? (
              <>
                <td className="border border-black py-1.5 px-1.5 text-right font-mono font-bold">
                  {formatRupiah(paguStage1)}
                </td>
                <td className="border border-black py-1.5 px-1.5 text-right font-mono font-bold">
                  {formatRupiah(paguStage2)}
                </td>
                <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                  {formatRupiah(activePagu)}
                </td>
              </>
            ) : (
              <td className="border border-black py-1.5 px-2 text-right font-mono font-bold">
                {formatRupiah(activePagu)}
              </td>
            )}
          </tr>
          <tr className="bg-white border-b-2 border-black">
            <td className="border border-black py-1.5 px-2 text-center font-semibold" colSpan={6}>
              SISA PAGU ANGGARAN BELUM DIALOKASIKAN
            </td>
            {isFullYear ? (
              <>
                <td className={`border border-black py-1.5 px-1.5 text-right font-mono font-bold ${paguStage1 - grandStage1 < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatRupiah(paguStage1 - grandStage1)}
                </td>
                <td className={`border border-black py-1.5 px-1.5 text-right font-mono font-bold ${paguStage2 - grandStage2 < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatRupiah(paguStage2 - grandStage2)}
                </td>
                <td className={`border border-black py-1.5 px-2 text-right font-mono font-bold ${remainingPagu < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatRupiah(remainingPagu)}
                </td>
              </>
            ) : (
              <td className={`border border-black py-1.5 px-2 text-right font-mono font-bold ${remainingPagu < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatRupiah(remainingPagu)}
              </td>
            )}
          </tr>
        </tfoot>
      </table>

      {/* REKAPITULASI PERSENTASE KETENTUAN JUKNIS */}
      <div className="mb-6 p-2.5 border border-black bg-slate-50 text-[10px] print-break-inside-avoid">
        <p className="font-bold uppercase tracking-wide mb-1 border-b border-black pb-0.5">
          Rekapitulasi Kepatuhan Juknis {fundLabel} TA {effectiveYear}:
        </p>
        {(() => {
          const bjTotal = selectedStage === 'TAHAP_1' ? categoryTotals.BARANG_JASA.stage1 : selectedStage === 'TAHAP_2' ? categoryTotals.BARANG_JASA.stage2 : categoryTotals.BARANG_JASA.total;
          const mpmTotal = selectedStage === 'TAHAP_1' ? categoryTotals.MODAL_PERALATAN_MESIN.stage1 : selectedStage === 'TAHAP_2' ? categoryTotals.MODAL_PERALATAN_MESIN.stage2 : categoryTotals.MODAL_PERALATAN_MESIN.total;
          const matlTotal = selectedStage === 'TAHAP_1' ? categoryTotals.MODAL_ASET_TETAP_LAINNYA.stage1 : selectedStage === 'TAHAP_2' ? categoryTotals.MODAL_ASET_TETAP_LAINNYA.stage2 : categoryTotals.MODAL_ASET_TETAP_LAINNYA.total;

          // Honorarium calculation
          const honorComps = components.filter(c => c.category === 'HONORARIUM' || c.code === '5.1.02.01');
          let honorAllocVal = 0;
          honorComps.forEach(c => {
            if (c.items && c.items.length > 0) {
              c.items.forEach(itm => { honorAllocVal += getItemAmount(itm); });
            } else {
              honorAllocVal += selectedStage === 'TAHAP_1' ? (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2)) : selectedStage === 'TAHAP_2' ? ((c.allocatedAmount || 0) - (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2))) : (c.allocatedAmount || 0);
            }
          });
          const honorAllocPct = activePagu > 0 ? (honorAllocVal / activePagu) * 100 : 0;
          const maxHonorAllocPct = school.status === 'Negeri' ? 20 : 40;

          // Belanja Modal Buku calculation
          const bukuComps = components.filter(c => c.mainType === 'MODAL_ASET_TETAP_LAINNYA' || c.category === 'BUKU_DAN_MODAL' || ['5.2.05.01', '5.2.05.02', '5.2.05.03'].includes(c.code));
          let bukuAllocVal = 0;
          bukuComps.forEach(c => {
            if (c.items && c.items.length > 0) {
              c.items.forEach(itm => { bukuAllocVal += getItemAmount(itm); });
            } else {
              bukuAllocVal += selectedStage === 'TAHAP_1' ? (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2)) : selectedStage === 'TAHAP_2' ? ((c.allocatedAmount || 0) - (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2))) : (c.allocatedAmount || 0);
            }
          });
          const bukuAllocPct = activePagu > 0 ? (bukuAllocVal / activePagu) * 100 : 0;

          // Pemeliharaan Sarana Prasarana calculation
          const sarprasComps = components.filter(c => c.category === 'PEMELIHARAAN_SARPRAS' || c.code === '5.1.02.16');
          let sarprasAllocVal = 0;
          sarprasComps.forEach(c => {
            if (c.items && c.items.length > 0) {
              c.items.forEach(itm => { sarprasAllocVal += getItemAmount(itm); });
            } else {
              sarprasAllocVal += selectedStage === 'TAHAP_1' ? (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2)) : selectedStage === 'TAHAP_2' ? ((c.allocatedAmount || 0) - (c.stage1Budget || Math.round((c.allocatedAmount || 0) / 2))) : (c.allocatedAmount || 0);
            }
          });
          const sarprasAllocPct = activePagu > 0 ? (sarprasAllocVal / activePagu) * 100 : 0;

          return (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-1.5">
                <div>
                  <span className="font-semibold block">A. Belanja Barang & Jasa:</span>
                  <span className="font-mono font-bold">{formatRupiah(bjTotal)}</span>{' '}
                  <span>({activePagu > 0 ? ((bjTotal / activePagu) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div>
                  <span className="font-semibold block">B. Belanja Modal Peralatan & Mesin:</span>
                  <span className="font-mono font-bold">{formatRupiah(mpmTotal)}</span>{' '}
                  <span>({activePagu > 0 ? ((mpmTotal / activePagu) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div>
                  <span className="font-semibold block">C. Belanja Modal Aset Tetap Lainnya:</span>
                  <span className="font-mono font-bold">{formatRupiah(matlTotal)}</span>{' '}
                  <span>({activePagu > 0 ? ((matlTotal / activePagu) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-[9.5px] uppercase tracking-wider text-slate-800 mb-1">
                  Aturan Batas Penganggaran Juknis BOSP Reguler:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-1.5 border border-slate-300 rounded-sm">
                    <span className="font-semibold block">1. Belanja Honorarium:</span>
                    <span className="font-mono font-bold">{formatRupiah(honorAllocVal)}</span> ({honorAllocPct.toFixed(1)}%)
                    <span className="block text-[9px] text-slate-600 mt-0.5">
                      Batas Max: {maxHonorAllocPct}% ({school.status}) — {honorAllocPct <= maxHonorAllocPct ? '✓ Memenuhi Juknis' : '⚠️ Melebihi Batas'}
                    </span>
                  </div>
                  <div className="bg-white p-1.5 border border-slate-300 rounded-sm">
                    <span className="font-semibold block">2. Belanja Modal Buku Siswa:</span>
                    <span className="font-mono font-bold">{formatRupiah(bukuAllocVal)}</span> ({bukuAllocPct.toFixed(1)}%)
                    <span className="block text-[9px] text-slate-600 mt-0.5">
                      Batas Min: 10% — {bukuAllocPct >= 10 ? '✓ Memenuhi Juknis' : '⚠️ Kurang dari 10%'}
                    </span>
                  </div>
                  <div className="bg-white p-1.5 border border-slate-300 rounded-sm">
                    <span className="font-semibold block">3. Pemeliharaan Sarpras:</span>
                    <span className="font-mono font-bold">{formatRupiah(sarprasAllocVal)}</span> ({sarprasAllocPct.toFixed(1)}%)
                    <span className="block text-[9px] text-slate-600 mt-0.5">
                      Batas Max: 20% — {sarprasAllocPct <= 20 ? '✓ Memenuhi Juknis' : '⚠️ Melebihi Batas'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* LEMBAR PENGESAHAN DOKUMEN RESMI (3 TANDA TANGAN) */}
      <div className="text-[11px] mt-8 pt-2 print-break-inside-avoid font-serif">
        <div className="flex justify-between items-start mb-2">
          <div></div>
          <div className="text-right">
            <p>
              Ditetapkan di: <span className="font-semibold">{school.district || 'Kota/Kabupaten'}</span>
            </p>
            <p>
              Pada Tanggal: <span className="font-semibold">{formatDateIndo(new Date().toISOString().split('T')[0])}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mt-4">
          <div>
            <p className="font-normal">Menyetujui,</p>
            <p className="font-bold">Kepala Satuan Pendidikan</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.headmasterName || 'NAMA KEPALA SEKOLAH'}</p>
            <p className="text-[10px]">NIP. {school.headmasterNip || '....................................'}</p>
          </div>

          <div>
            <p className="font-normal">Mengetahui,</p>
            <p className="font-bold">Ketua Komite Satuan Pendidikan</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.committeeName || 'NAMA KOMITE SEKOLAH'}</p>
            <p className="text-[10px] text-slate-500">(Perwakilan Orang Tua / Komite)</p>
          </div>

          <div>
            <p className="font-normal">Disusun Oleh,</p>
            <p className="font-bold">Bendahara Dana BOSP</p>
            <div className="h-20"></div>
            <p className="font-bold underline uppercase">{school.treasurerName || 'NAMA BENDAHARA'}</p>
            <p className="text-[10px]">NIP. {school.treasurerNip || '....................................'}</p>
          </div>
        </div>
      </div>
    </PrintModal>
  );
};
