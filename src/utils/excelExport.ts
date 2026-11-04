import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportBKUToExcel(
  schoolName: string,
  fiscalYear: number,
  period: string,
  entries: any[],
  summary: { totalDebit: number; totalCredit: number; finalBalance: number }
) {
  const rows: any[] = entries.map((e, idx) => ({
    'No': idx + 1,
    'Tanggal': e.date,
    'No. Bukti': e.evidenceNumber,
    'Uraian Transaksi': e.description,
    'Penerimaan (Debit)': e.debit,
    'Pengeluaran (Kredit)': e.credit,
    'Saldo (Rp)': e.balance,
  }));

  // Append total row
  rows.push({
    'No': '',
    'Tanggal': '',
    'No. Bukti': '',
    'Uraian Transaksi': 'TOTAL MUTASI & SALDO AKHIR',
    'Penerimaan (Debit)': summary.totalDebit,
    'Pengeluaran (Kredit)': summary.totalCredit,
    'Saldo (Rp)': summary.finalBalance,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BKU');
  const safeName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `BKU_${safeName}_${fiscalYear}_${period}.xlsx`);
}

export function exportTaxRecapToExcel(
  schoolName: string,
  fiscalYear: number,
  taxEntries: any[]
) {
  const rows = taxEntries.map((t, idx) => ({
    'No': idx + 1,
    'Tanggal': t.date,
    'No. Bukti / Transaksi': t.evidenceNumber,
    'Uraian': t.description,
    'Jenis Pajak': t.taxType || '-',
    'Pajak Dipungut (Rp)': t.debit || 0,
    'Pajak Disetor (Rp)': t.credit || 0,
    'Status': (t.credit && t.credit > 0) ? 'Lunas / Disetor' : 'Belum Disetor',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Pajak');
  const safeName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Rekap_Pajak_${safeName}_${fiscalYear}.xlsx`);
}

export function exportBudgetRealizationToExcel(
  schoolName: string,
  fiscalYear: number,
  totalPagu: number,
  components: any[],
  stageFilter: 'GABUNGAN' | 'TAHAP_1' | 'TAHAP_2' = 'GABUNGAN'
) {
  const rows: any[] = [];
  let no = 1;

  for (const c of components) {
    const mainLabel = 
      c.mainType === 'MODAL_PERALATAN_MESIN'
        ? 'Belanja Modal Peralatan dan Mesin'
        : c.mainType === 'MODAL_ASET_TETAP_LAINNYA'
        ? 'Belanja Modal Aset Tetap Lainnya'
        : 'Belanja Barang dan Jasa';

    const items = c.items && Array.isArray(c.items) && c.items.length > 0 ? c.items : [];

    if (items.length > 0) {
      for (const itm of items) {
        if (stageFilter === 'TAHAP_1' && itm.stage === '2') continue;
        if (stageFilter === 'TAHAP_2' && itm.stage === '1') continue;

        const effectiveTotal = stageFilter === 'TAHAP_1'
          ? (itm.stage === 'BOTH' ? Math.round(itm.totalAmount / 2) : itm.totalAmount)
          : stageFilter === 'TAHAP_2'
          ? (itm.stage === 'BOTH' ? Math.round(itm.totalAmount / 2) : itm.totalAmount)
          : itm.totalAmount;

        rows.push({
          'No': no++,
          'Objek Belanja': mainLabel,
          'Kode Rekening': c.code,
          'Sub Rincian Objek': c.name,
          'Uraian Belanja (Item)': itm.description,
          'Volume': itm.volume,
          'Satuan': itm.unit,
          'Harga Satuan (Rp)': itm.unitPrice,
          'Tahap Penyaluran': itm.stage === '1' ? 'Tahap I' : itm.stage === '2' ? 'Tahap II' : 'Tahap I & II',
          'Total Anggaran (Rp)': effectiveTotal,
        });
      }
    } else {
      const alloc = stageFilter === 'TAHAP_1' ? (c.stage1Budget || c.allocatedAmount / 2) : stageFilter === 'TAHAP_2' ? (c.stage2Budget || c.allocatedAmount / 2) : c.allocatedAmount;
      rows.push({
        'No': no++,
        'Objek Belanja': mainLabel,
        'Kode Rekening': c.code,
        'Sub Rincian Objek': c.name,
        'Uraian Belanja (Item)': c.subComponent || '-',
        'Volume': 1,
        'Satuan': 'Paket',
        'Harga Satuan (Rp)': alloc,
        'Tahap Penyaluran': stageFilter === 'TAHAP_1' ? 'Tahap I' : stageFilter === 'TAHAP_2' ? 'Tahap II' : 'Tahap I & II',
        'Total Anggaran (Rp)': alloc,
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RKAS_Rincian');
  const safeName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `RKAS_BOSP_${safeName}_${fiscalYear}_${stageFilter}.xlsx`);
}
