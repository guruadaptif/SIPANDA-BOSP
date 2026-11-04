import { db, registerOnSaveListener } from './db.ts';
import { SHEETS_SCHEMA_MAP } from './gasTemplate.ts';

/**
 * Transforms raw application data models into clean 2D tabular rows
 * matching the exact header column schemas of the 28 Sheets in Google Spreadsheet.
 */
export function formatTablesForGas(raw: any): Record<string, any[][]> {
  const result: Record<string, any[][]> = {};

  // 1. Pengguna
  if (Array.isArray(raw.Pengguna)) {
    result['Pengguna'] = raw.Pengguna.map((u: any) => [
      u.id || '',
      u.username || '',
      u.password || (u.role === 'ADMIN_DINAS' ? 'admin123' : 'bendahara123'),
      u.name || '',
      u.role || '',
      u.schoolId || '',
      u.nip || '',
      u.email || '',
      u.phone || '',
      u.isActive !== undefined ? u.isActive : true,
      u.verificationStatus || 'TERVERIFIKASI',
      u.createdAt || '',
    ]);
  }

  // 2. Sekolah
  if (Array.isArray(raw.Sekolah)) {
    result['Sekolah'] = raw.Sekolah.map((s: any) => [
      s.id || '',
      s.npsn || '',
      s.name || '',
      s.status || '',
      s.level || '',
      s.address || '',
      s.village || '',
      s.subdistrict || '',
      s.district || '',
      s.province || '',
      s.postalCode || '',
      s.headmasterName || '',
      s.headmasterNip || '',
      s.treasurerName || '',
      s.treasurerNip || '',
      s.committeeName || '',
      s.bankAccount || '',
      s.bankName || '',
      s.npwp || '',
      s.activeFiscalYear || '',
      s.logoUrl || '',
      s.isLocked || false,
      s.verificationStatus || 'TERVERIFIKASI',
    ]);
  }

  // 3. LingkunganSekolah
  if (Array.isArray(raw.LingkunganSekolah)) {
    result['LingkunganSekolah'] = raw.LingkunganSekolah.map((l: any) => [
      l.id || '',
      l.schoolId || '',
      l.categoryName || l.NamaKategori || '',
      l.description || l.Keterangan || '',
      l.createdAt || '',
    ]);
  }

  // 4. TahunFiskal
  if (Array.isArray(raw.TahunFiskal)) {
    result['TahunFiskal'] = raw.TahunFiskal.map((y: any) => [
      y.id || '',
      y.year || y.Tahun || '',
      y.isActive !== undefined ? y.isActive : true,
      y.status || 'Open',
      y.closedAt || '',
      y.notes || '',
    ]);
  }

  // 5. SumberPendanaan
  if (Array.isArray(raw.SumberPendanaan)) {
    result['SumberPendanaan'] = raw.SumberPendanaan.map((f: any) => [
      f.id || '',
      f.code || '',
      f.name || '',
      f.description || '',
      f.year || '',
    ]);
  }

  // 6. BudgetPlans
  if (Array.isArray(raw.BudgetPlans)) {
    result['BudgetPlans'] = raw.BudgetPlans.map((b: any) => [
      b.id || '',
      b.schoolId || '',
      b.fiscalYear || '',
      b.fundSource || 'BOSP_REGULER',
      b.totalPagu || 0,
      b.stage1Allocation || 0,
      b.stage2Allocation || 0,
      b.status || '',
      b.approvedAt || '',
      b.notes || '',
    ]);
  }

  // 7. KomponenAnggaran
  if (Array.isArray(raw.KomponenAnggaran)) {
    result['KomponenAnggaran'] = raw.KomponenAnggaran.map((c: any) => [
      c.id || '',
      c.schoolId || '',
      c.fiscalYear || '',
      c.fundSource || 'BOSP_REGULER',
      c.code || '',
      c.name || '',
      c.mainType || '',
      c.category || '',
      c.subComponent || '',
      c.allocatedAmount || 0,
      c.realizedAmount || 0,
      c.remainingAmount || 0,
      c.stage1Budget || 0,
      c.stage2Budget || 0,
      c.items ? JSON.stringify(c.items) : '',
    ]);
  }

  // 8. MasterSubComponents
  if (Array.isArray(raw.MasterSubComponents)) {
    result['MasterSubComponents'] = raw.MasterSubComponents.map((m: any) => [
      m.id || '',
      m.code || '',
      m.name || '',
      m.mainType || '',
      m.category || '',
      m.description || '',
      m.isCustom || false,
      m.activeFiscalYear || '',
      m.createdAt || '',
    ]);
  }

  // 9. TandaTerima
  if (Array.isArray(raw.TandaTerima)) {
    result['TandaTerima'] = raw.TandaTerima.map((r: any) => [
      r.id || '',
      r.schoolId || '',
      r.receiptNumber || '',
      r.transactionId || '',
      r.receivedFrom || '',
      r.paidTo || '',
      r.amount || 0,
      r.amountWords || '',
      r.paymentFor || '',
      r.date || '',
      r.paymentMethod || '',
      r.budgetComponentCode || '',
      r.status || '',
    ]);
  }

  // 10. Transaksi
  if (Array.isArray(raw.Transaksi)) {
    result['Transaksi'] = raw.Transaksi.map((t: any) => [
      t.id || '',
      t.schoolId || '',
      t.fiscalYear || '',
      t.transactionNumber || '',
      t.date || '',
      t.type || '',
      t.description || '',
      t.budgetComponentId || '',
      t.recipientName || '',
      t.invoiceNumber || '',
      t.amount || 0,
      t.paymentMethod || '',
      t.fundingSourceId || '',
      t.verificationStatus || '',
      t.hasTax || false,
      t.taxes ? JSON.stringify(t.taxes) : '',
      t.createdBy || '',
      t.createdAt || '',
    ]);
  }

  // 11. DetailTransaksi
  if (Array.isArray(raw.DetailTransaksi)) {
    result['DetailTransaksi'] = raw.DetailTransaksi.map((d: any) => [
      d.id || '',
      d.transactionId || '',
      d.itemDescription || '',
      d.volume || 0,
      d.unit || '',
      d.unitPrice || 0,
      d.total || 0,
    ]);
  }

  // 12. BukuKas
  if (Array.isArray(raw.BukuKas)) {
    result['BukuKas'] = raw.BukuKas.map((e: any) => [
      e.id || '',
      e.schoolId || '',
      e.fiscalYear || '',
      e.date || '',
      e.transactionId || '',
      e.evidenceNumber || '',
      e.description || '',
      e.debit || 0,
      e.credit || 0,
      e.balance || 0,
      e.category || '',
      e.createdAt || '',
    ]);
  }

  // 13. BukuBank
  if (Array.isArray(raw.BukuBank)) {
    result['BukuBank'] = raw.BukuBank.map((e: any) => [
      e.id || '',
      e.schoolId || '',
      e.fiscalYear || '',
      e.date || '',
      e.transactionId || '',
      e.evidenceNumber || '',
      e.description || '',
      e.debit || 0,
      e.credit || 0,
      e.balance || 0,
      e.createdAt || '',
    ]);
  }

  // 14. CashBookLedger
  if (Array.isArray(raw.CashBookLedger)) {
    result['CashBookLedger'] = raw.CashBookLedger.map((e: any) => [
      e.id || '',
      e.schoolId || '',
      e.fiscalYear || '',
      e.date || '',
      e.transactionId || '',
      e.evidenceNumber || '',
      e.description || '',
      e.debit || 0,
      e.credit || 0,
      e.balance || 0,
      e.createdAt || '',
    ]);
  }

  // 15. TaxBook
  if (Array.isArray(raw.TaxBook)) {
    result['TaxBook'] = raw.TaxBook.map((e: any) => [
      e.id || '',
      e.schoolId || '',
      e.fiscalYear || '',
      e.date || '',
      e.transactionId || '',
      e.evidenceNumber || '',
      e.description || '',
      e.taxType || '',
      (e as any).taxBase || 0,
      (e as any).rate || 0,
      e.credit || (e as any).taxAmount || 0,
      (e as any).billingCode || '',
      (e as any).ntpn || '',
      (e as any).isDeposited ? 'Disetor' : 'Belum Disetor',
      e.createdAt || '',
    ]);
  }

  // 16. TarifPajak
  if (Array.isArray(raw.TarifPajak)) {
    result['TarifPajak'] = raw.TarifPajak.map((t: any) => [
      t.id || '',
      t.code || '',
      t.name || '',
      t.rate || 0,
      t.threshold || 0,
      t.description || '',
      t.effectiveFrom || '',
      t.effectiveTo || '',
      t.lawReference || '',
      t.isActive !== undefined ? t.isActive : true,
    ]);
  }

  // 17. PembayaranPajak
  if (Array.isArray(raw.PembayaranPajak)) {
    result['PembayaranPajak'] = raw.PembayaranPajak.map((p: any) => [
      p.id || '',
      p.schoolId || '',
      p.fiscalYear || '',
      p.depositNumber || '',
      p.date || '',
      p.taxType || '',
      p.taxAmount || 0,
      p.billingCode || '',
      p.ntpn || '',
      p.bankName || '',
      p.transactionIds ? JSON.stringify(p.transactionIds) : '',
      p.status || '',
      p.createdAt || '',
    ]);
  }

  // 18. Rekonsiliasi
  if (Array.isArray(raw.Rekonsiliasi)) {
    result['Rekonsiliasi'] = raw.Rekonsiliasi.map((r: any) => [
      r.id || '',
      r.schoolId || '',
      r.fiscalYear || '',
      r.month || '',
      r.year || '',
      r.bookBalance || 0,
      r.bankBalance || 0,
      r.unrecordedTransactionsCount || 0,
      r.unidentifiedTransactionsCount || 0,
      r.adjustments || 0,
      r.finalDifference || 0,
      r.status || '',
      r.notes || '',
      r.reconciledBy || '',
      r.createdAt || '',
    ]);
  }

  // 19. LaporanBank
  if (Array.isArray(raw.LaporanBank)) {
    result['LaporanBank'] = raw.LaporanBank.map((b: any) => [
      b.id || '',
      b.schoolId || '',
      b.date || '',
      b.description || '',
      b.reference || '',
      b.debit || 0,
      b.credit || 0,
      b.balance || 0,
      b.matchedTransactionId || '',
    ]);
  }

  // 20. TandaTerimaDokumen
  if (Array.isArray(raw.TandaTerimaDokumen)) {
    result['TandaTerimaDokumen'] = raw.TandaTerimaDokumen.map((d: any) => [
      d.id || '',
      d.schoolId || '',
      d.receiptNumber || '',
      d.date || '',
      d.senderName || '',
      d.subject || '',
      d.status || '',
      d.createdAt || '',
    ]);
  }

  // 21. SPPD
  if (Array.isArray(raw.SPPD)) {
    result['SPPD'] = raw.SPPD.map((s: any) => [
      s.id || '',
      s.schoolId || '',
      s.fiscalYear || '',
      s.assignmentLetterNumber || '',
      s.sppdNumber || '',
      s.officerName || '',
      s.officerNip || '',
      s.officerPosition || '',
      s.officerRank || '',
      s.destination || '',
      s.purpose || '',
      s.departureDate || '',
      s.returnDate || '',
      s.durationDays || 0,
      s.totalCost || 0,
      s.budgetSource || '',
      s.assigningOfficial || '',
      s.status || '',
      s.createdAt || '',
    ]);
  }

  // 22. SPPDDetails
  if (Array.isArray(raw.SPPDDetails)) {
    result['SPPDDetails'] = raw.SPPDDetails.map((d: any) => [
      d.id || '',
      d.sppdId || '',
      d.transportCost || 0,
      d.lodgingCost || 0,
      d.dailyAllowance || 0,
      d.otherCosts || 0,
      d.otherCostDescription || '',
    ]);
  }

  // 23. SuratSurat
  if (Array.isArray(raw.SuratSurat)) {
    result['SuratSurat'] = raw.SuratSurat.map((s: any) => [
      s.id || '',
      s.schoolId || '',
      s.fiscalYear || '',
      s.letterType || '',
      s.letterNumber || '',
      s.date || '',
      s.subject || '',
      s.recipient || '',
      s.bodyContent || '',
      s.signatoryName || '',
      s.signatoryNip || '',
      s.status || '',
      s.createdAt || '',
    ]);
  }

  // 24. Risalah
  if (Array.isArray(raw.Risalah)) {
    result['Risalah'] = raw.Risalah.map((m: any) => [
      m.id || '',
      m.schoolId || '',
      m.fiscalYear || '',
      m.minutesType || '',
      m.minutesNumber || '',
      m.date || '',
      m.period || '',
      m.vendorName || '',
      m.description || '',
      m.taxAmount ? JSON.stringify({ taxType: m.taxType, taxBase: m.taxBase, taxRate: m.taxRate, taxAmount: m.taxAmount }) : '',
      m.conclusion || '',
      m.signatories ? JSON.stringify(m.signatories) : '',
      m.createdAt || '',
    ]);
  }

  // 25. Laporan
  if (Array.isArray(raw.Laporan)) {
    result['Laporan'] = raw.Laporan.map((l: any) => [
      l.id || '',
      l.schoolId || '',
      l.fiscalYear || '',
      l.reportType || '',
      l.period || '',
      l.stage || '',
      l.totalReceipt || 0,
      l.totalExpense || 0,
      l.cashBalance || 0,
      l.status || '',
      l.createdAt || '',
    ]);
  }

  // 26. PenomoranDokumen
  if (Array.isArray(raw.PenomoranDokumen)) {
    result['PenomoranDokumen'] = raw.PenomoranDokumen.map((p: any) => [
      p.id || '',
      p.schoolId || '',
      p.fiscalYear || '',
      p.documentType || '',
      p.prefix || '',
      p.lastNumber || 0,
      p.format || '',
    ]);
  }

  // 27. Lampiran
  if (Array.isArray(raw.Lampiran)) {
    result['Lampiran'] = raw.Lampiran.map((a: any) => [
      a.id || '',
      a.schoolId || '',
      a.documentId || '',
      a.fileName || '',
      a.driveFileId || '',
      a.driveUrl || '',
      a.fileSize || 0,
      a.createdAt || '',
    ]);
  }

  // 28. Pengumuman
  if (Array.isArray(raw.Pengumuman)) {
    result['Pengumuman'] = raw.Pengumuman.map((p: any) => [
      p.id || '',
      p.title || '',
      p.content || '',
      p.author || '',
      p.isUrgent || false,
      p.targetRole || '',
      p.createdAt || '',
    ]);
  }

  // 29. AuditLog
  if (Array.isArray(raw.AuditLog)) {
    result['AuditLog'] = raw.AuditLog.slice(0, 100).map((a: any) => [
      a.id || '',
      a.userId || '',
      a.username || '',
      a.userRole || '',
      a.schoolId || '',
      a.schoolName || '',
      a.action || '',
      a.module || '',
      a.details || '',
      a.timestamp || '',
    ]);
  }

  // 30. PengaturanAplikasi
  if (raw.PengaturanAplikasi && typeof raw.PengaturanAplikasi === 'object') {
    const s = raw.PengaturanAplikasi;
    result['PengaturanAplikasi'] = Object.entries(s).map(([key, value], idx) => [
      `SET-${idx + 1}`,
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
      'Pengaturan Global SIPANDA BOSP',
      new Date().toISOString(),
    ]);
  }

  return result;
}

/**
 * Validates Google Apps Script URL format and warns about common mistakes
 * such as pasting the /edit URL or /dev test URL.
 */
export function validateGasUrl(url: string): { valid: boolean; reason?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, reason: 'URL Google Apps Script belum diisi.' };
  }
  if (!trimmed.startsWith('https://script.google.com/')) {
    return { valid: false, reason: 'URL harus dimulai dengan "https://script.google.com/".' };
  }
  if (trimmed.includes('/edit')) {
    return {
      valid: false,
      reason: 'URL yang dimasukkan adalah URL Editor script (berakhiran /edit). Silakan buka menu Deploy > Manage deployments lalu salin "Web app URL" resmi yang berakhiran /exec.',
    };
  }
  if (trimmed.endsWith('/dev')) {
    return {
      valid: false,
      reason: 'URL berakhiran /dev adalah Test Deployment yang memerlukan login akun Google. Silakan gunakan URL Web App Production resmi yang berakhiran /exec.',
    };
  }
  return { valid: true };
}

/**
 * Safely parses response from Google Apps Script and provides human-readable diagnosis
 * when Google returns HTML (such as sign-in redirect or authorization errors).
 */
export function parseGasResponse(rawText: string, targetUrl: string): { isJson: boolean; data?: any; errorFeedback?: string } {
  const clean = (rawText || '').trim().replace(/^\uFEFF/, '');

  const isHtml = 
    clean.startsWith('<') || 
    clean.toLowerCase().includes('<!doctype') || 
    clean.toLowerCase().includes('<html') || 
    clean.toLowerCase().includes('<body') || 
    clean.toLowerCase().includes('<head') || 
    clean.toLowerCase().includes('accounts.google.com') ||
    clean.toLowerCase().includes('servicelogin');

  if (isHtml) {
    if (targetUrl.includes('/edit')) {
      return {
        isJson: false,
        errorFeedback: 'URL yang Anda masukkan adalah URL Editor Script (berakhiran /edit). Silakan buka menu Deploy > Manage deployments lalu salin "Web app URL" resmi yang berakhiran /exec.',
      };
    }
    if (targetUrl.endsWith('/dev')) {
      return {
        isJson: false,
        errorFeedback: 'URL berakhiran /dev (Test Deployment) memerlukan otentikasi login akun Google. Harap gunakan URL Web App versi Production yang berakhiran /exec.',
      };
    }
    if (clean.includes('accounts.google.com') || clean.includes('Sign in') || clean.includes('ServiceLogin')) {
      return {
        isJson: false,
        errorFeedback: 'Google menolak akses karena opsi "Who has access" (Yang memiliki akses) pada Web App Anda belum diatur ke "Anyone" (Siapa saja). Silakan buka Google Apps Script > Deploy > Manage deployments > Edit > ubah menjadi "Anyone", lalu klik Deploy.',
      };
    }
    return {
      isJson: false,
      errorFeedback: 'Google Apps Script merespons dengan halaman web HTML (bukan format JSON). Hal ini terjadi jika pengaturan "Who has access" pada deployment Web App belum disetel ke "Anyone" (Siapa saja) atau fungsi initDatabase() belum pernah dijalankan satu kali untuk memberikan otorisasi izin Spreadsheet.',
    };
  }

  try {
    const parsed = JSON.parse(clean);
    return { isJson: true, data: parsed };
  } catch (err: any) {
    return {
      isJson: false,
      errorFeedback: 'Google Apps Script merespons dengan format HTML/Teks biasa (bukan data JSON). Pastikan Web App Anda telah dideploy dengan opsi "Who has access: Anyone" (Siapa saja) dan menggunakan kode Code.gs terbaru.',
    };
  }
}

/**
 * Sends a full synchronization request to the configured Google Apps Script Web App.
 */
export async function performGasSync(targetUrl?: string): Promise<{ success: boolean; message: string; latencyMs?: number; spreadsheetId?: string; spreadsheetName?: string }> {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  const url = (targetUrl || settings.googleAppsScriptUrl || '').trim();

  const val = validateGasUrl(url);
  if (!val.valid) {
    return {
      success: false,
      message: val.reason || 'URL Google Apps Script tidak valid.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const formattedTables = formatTablesForGas(raw);
    const payload = {
      action: 'syncAll',
      timestamp: new Date().toISOString(),
      tables: formattedTables,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const rawText = await response.text();
    const parsed = parseGasResponse(rawText, url);

    if (!parsed.isJson) {
      return {
        success: false,
        latencyMs,
        message: parsed.errorFeedback || 'Gagal memproses respons dari Google Apps Script.',
      };
    }

    const result = parsed.data;

    if (result && result.status === 'success') {
      settings.lastSyncTimestamp = new Date().toISOString();
      if (result.spreadsheetId) {
        settings.googleSpreadsheetId = result.spreadsheetId;
      }
      if (result.spreadsheetName) {
        settings.googleSpreadsheetName = result.spreadsheetName;
      }
      db.saveData();
      return {
        success: true,
        latencyMs,
        spreadsheetId: result.spreadsheetId || settings.googleSpreadsheetId,
        spreadsheetName: result.spreadsheetName || settings.googleSpreadsheetName,
        message: 'Seluruh data SIPANDA BOSP berhasil disinkronisasi ke Google Spreadsheet.',
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: result?.error || result?.message || 'Apps Script merespons dengan kesalahan.',
      };
    }
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      success: false,
      message: err.name === 'AbortError'
        ? 'Sinkronisasi melampaui batas waktu (25 detik). Periksa deployment Apps Script Anda.'
        : `Gagal menyinkronkan data: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
}

/**
 * Recycles the entire Google Spreadsheet database structure:
 * re-initializes header columns for all 30 sheets with official styling,
 * updates spreadsheet ID, and synchronizes clean data.
 */
export async function performGasRecycle(targetUrl?: string): Promise<{ success: boolean; message: string; latencyMs?: number; spreadsheetId?: string }> {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  const url = (targetUrl || settings.googleAppsScriptUrl || '').trim();

  const val = validateGasUrl(url);
  if (!val.valid) {
    return {
      success: false,
      message: val.reason || 'URL Google Apps Script tidak valid.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const payload = {
      action: 'recycleDatabase',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const rawText = await response.text();
    const parsed = parseGasResponse(rawText, url);

    if (!parsed.isJson) {
      return {
        success: false,
        latencyMs,
        message: parsed.errorFeedback || 'Gagal memproses daur ulang database pada Google Apps Script.',
      };
    }

    const result = parsed.data;
    if (result && result.status === 'success') {
      if (result.spreadsheetId) {
        settings.googleSpreadsheetId = result.spreadsheetId;
      }
      if (result.spreadsheetName) {
        settings.googleSpreadsheetName = result.spreadsheetName;
      }
      db.saveData();

      // Now sync all active tables freshly
      const syncResult = await performGasSync(url);

      return {
        success: true,
        latencyMs,
        spreadsheetId: result.spreadsheetId,
        message: `Struktur database Google Spreadsheet berhasil didaur ulang (30 sheet selaras) dan seluruh data berhasil disinkronkan kembali.`,
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: result?.error || result?.message || 'Apps Script merespons dengan kesalahan saat daur ulang.',
      };
    }
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      success: false,
      message: err.name === 'AbortError'
        ? 'Daur ulang database melampaui batas waktu (20 detik).'
        : `Gagal mendaur ulang database: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
}

/**
 * Pulls updated passwords or user data from Google Spreadsheet back to the local database.
 * This allows administrators to update passwords directly in the Google Spreadsheet.
 */
export async function performGasPull(targetUrl?: string): Promise<{ success: boolean; message: string; updatedUsersCount?: number }> {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  const url = (targetUrl || settings.googleAppsScriptUrl || '').trim();

  const val = validateGasUrl(url);
  if (!val.valid) {
    return { success: false, message: val.reason || 'URL Google Apps Script tidak valid.' };
  }

  try {
    const pullUrl = url + (url.includes('?') ? '&' : '?') + 'action=getTable&sheet=Pengguna';
    const response = await fetch(pullUrl, { method: 'GET' });
    const rawText = await response.text();
    const parsed = parseGasResponse(rawText, url);
    if (!parsed.isJson) {
      return { success: false, message: parsed.errorFeedback || 'Gagal membaca sheet Pengguna' };
    }
    const data = parsed.data;
    if (data && data.status === 'success' && Array.isArray(data.data)) {
      let updatedCount = 0;
      data.data.forEach((row: any) => {
        const username = row['Username'] || row['username'];
        const pwd = row['Password'] || row['password'];
        if (username && pwd && pwd !== '******') {
          const user = raw.Pengguna.find(u => u.username === username);
          if (user && (user as any).password !== pwd) {
            (user as any).password = pwd;
            updatedCount++;
          }
        }
      });
      if (updatedCount > 0) {
        db.saveData();
      }
      return {
        success: true,
        message: `Sinkronisasi dari Google Spreadsheet berhasil. ${updatedCount} kata sandi akun pengguna diperbarui dari Spreadsheet.`,
        updatedUsersCount: updatedCount,
      };
    }
    return { success: false, message: 'Tidak ditemukan baris data pada sheet Pengguna.' };
  } catch (err: any) {
    return { success: false, message: `Gagal menarik data dari Google Sheets: ${err.message || 'Kesalahan jaringan'}` };
  }
}

/**
 * Triggers background synchronization if Live Sync is enabled and URL is configured.
 * Runs non-blocking to prevent stalling frontend user interactions.
 */
export function triggerAutoGasSync(): void {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  if (settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== '' && settings.isLiveSyncEnabled !== false) {
    setTimeout(async () => {
      try {
        console.log('🔄 Triggering background auto-sync to Google Spreadsheet...');
        const res = await performGasSync();
        if (res.success) {
          console.log('✅ Background auto-sync to Google Spreadsheet succeeded.');
        } else {
          console.warn('⚠️ Background auto-sync warning:', res.message);
        }
      } catch (err) {
        console.error('❌ Background auto-sync error:', err);
      }
    }, 100);
  }
}

// Automatically sync to Google Spreadsheet whenever data is saved (if Live Sync enabled)
registerOnSaveListener(() => {
  triggerAutoGasSync();
});
