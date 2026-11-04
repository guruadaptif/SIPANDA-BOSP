export const SHEETS_SCHEMA_MAP: Record<string, string[]> = {
  "Pengguna": ["ID", "Username", "Password", "Nama", "Role", "SchoolID", "NIP", "Email", "Phone", "IsActive", "VerificationStatus", "CreatedAt"],
  "Sekolah": ["SchoolID", "NPSN", "NamaSekolah", "Status", "Jenjang", "Alamat", "DesaKelurahan", "Kecamatan", "KabupatenKota", "Provinsi", "KodePos", "NamaKepalaSekolah", "NIPKepalaSekolah", "NamaBendahara", "NIPBendahara", "NamaKomite", "NoRekening", "NamaBank", "NPWP", "TahunAnggaranAktif", "LogoUrl", "IsLocked", "VerificationStatus"],
  "LingkunganSekolah": ["ID", "SchoolID", "NamaKategori", "Keterangan", "CreatedAt"],
  "TahunFiskal": ["ID", "Tahun", "IsActive", "Status", "ClosedAt", "Catatan"],
  "SumberPendanaan": ["ID", "Kode", "NamaSumber", "Keterangan", "Tahun"],
  "BudgetPlans": ["ID", "SchoolID", "TahunFiskal", "SumberDana", "TotalPagu", "AlokasiTahap1", "AlokasiTahap2", "Status", "DisetujuiPada", "Catatan"],
  "KomponenAnggaran": ["ID", "SchoolID", "TahunFiskal", "SumberDana", "Kode", "NamaKomponen", "MainType", "Kategori", "SubKomponen", "PaguKomponen", "RealisasiKomponen", "SisaKomponen", "Tahap1Budget", "Tahap2Budget", "ItemsJSON"],
  "MasterSubComponents": ["ID", "Kode", "NamaSubKomponen", "MainType", "Kategori", "Deskripsi", "IsCustom", "TahunFiskal", "CreatedAt"],
  "TandaTerima": ["ID", "SchoolID", "NomorKuitansi", "NomorTransaksi", "SudahDiterimaDari", "DiberikanKepada", "JumlahUang", "Terbilang", "UntukPembayaran", "Tanggal", "MetodeBayar", "KodeKomponen", "Status"],
  "Transaksi": ["ID", "SchoolID", "TahunFiskal", "NomorTransaksi", "Tanggal", "JenisTransaksi", "Uraian", "KomponenID", "PenerimaPenyedia", "NomorBukti", "NilaiTransaksi", "MetodePembayaran", "SumberDana", "StatusVerifikasi", "HasTax", "PajakJSON", "CreatedBy", "CreatedAt"],
  "DetailTransaksi": ["ID", "TransaksiID", "ItemUraian", "Volume", "Satuan", "HargaSatuan", "Total"],
  "BukuKas": ["ID", "SchoolID", "TahunFiskal", "Tanggal", "TransaksiID", "NomorBukti", "Uraian", "Debit", "Kredit", "Saldo", "Kategori", "CreatedAt"],
  "BukuBank": ["ID", "SchoolID", "TahunFiskal", "Tanggal", "TransaksiID", "NomorBukti", "Uraian", "Debit", "Kredit", "Saldo", "CreatedAt"],
  "CashBookLedger": ["ID", "SchoolID", "TahunFiskal", "Tanggal", "TransaksiID", "NomorBukti", "Uraian", "Debit", "Kredit", "Saldo", "CreatedAt"],
  "TaxBook": ["ID", "SchoolID", "TahunFiskal", "Tanggal", "TransaksiID", "NomorBukti", "Uraian", "JenisPajak", "DasarPengenaan", "Tarif", "NilaiPajak", "KodeBilling", "NTPN", "StatusSetor", "CreatedAt"],
  "TarifPajak": ["ID", "KodePajak", "NamaPajak", "TarifPersen", "ThresholdNominal", "Keterangan", "BerlakuMulai", "BerlakuSampai", "DasarHukum", "IsActive"],
  "PembayaranPajak": ["ID", "SchoolID", "TahunFiskal", "NomorSetor", "TanggalSetor", "JenisPajak", "JumlahPajak", "KodeBilling", "NTPN", "NamaBank", "TransaksiIDs", "Status", "CreatedAt"],
  "Rekonsiliasi": ["ID", "SchoolID", "TahunFiskal", "Bulan", "Tahun", "SaldoPembukuan", "SaldoRekeningKoran", "TransaksiBelumTercatat", "TransaksiBelumTeridentifikasi", "Penyesuaian", "SelisihAkhir", "StatusRekonsiliasi", "Catatan", "ReconciledBy", "CreatedAt"],
  "LaporanBank": ["ID", "SchoolID", "Tanggal", "Uraian", "Referensi", "Masuk", "Keluar", "Saldo", "MatchedTransaksiID"],
  "TandaTerimaDokumen": ["ID", "SchoolID", "NomorTandaTerima", "Tanggal", "NamaPengirim", "Perihal", "Status", "CreatedAt"],
  "SPPD": ["ID", "SchoolID", "TahunFiskal", "NomorSuratTugas", "NomorSPPD", "NamaPelaksana", "NIPPelaksana", "Jabatan", "Golongan", "Tujuan", "MaksudPerjalanan", "TglBerangkat", "TglKembali", "LamaHari", "TotalBiaya", "SumberAnggaran", "PejabatPemberiTugas", "Status", "CreatedAt"],
  "SPPDDetails": ["ID", "SPPDID", "BiayaTransport", "BiayaPenginapan", "UangHarian", "BiayaLainnya", "UraianBiayaLain"],
  "SuratSurat": ["ID", "SchoolID", "TahunFiskal", "JenisSurat", "NomorSurat", "Tanggal", "Perihal", "TujuanPenerima", "IsiSurat", "Penandatangan", "NIPPenandatangan", "Status", "CreatedAt"],
  "Risalah": ["ID", "SchoolID", "TahunFiskal", "JenisRisalah", "NomorRisalah", "Tanggal", "Periode", "NamaPenyedia", "Uraian", "PajakJSON", "Kesimpulan", "PenandatanganJSON", "CreatedAt"],
  "Laporan": ["ID", "SchoolID", "TahunFiskal", "JenisLaporan", "Periode", "Tahap", "TotalPenerimaan", "TotalPengeluaran", "SisaKas", "StatusLapor", "CreatedAt"],
  "PenomoranDokumen": ["ID", "SchoolID", "TahunFiskal", "JenisDokumen", "Prefix", "NomorTerakhir", "Format"],
  "Lampiran": ["ID", "SchoolID", "DokumenID", "NamaFile", "DriveFileID", "DriveUrl", "Ukuran", "CreatedAt"],
  "Pengumuman": ["ID", "Judul", "Konten", "Penulis", "IsUrgent", "TargetRole", "CreatedAt"],
  "AuditLog": ["ID", "UserID", "Username", "UserRole", "SchoolID", "SchoolName", "Aksi", "Modul", "Detail", "Timestamp"],
  "PengaturanAplikasi": ["ID", "Key", "Value", "Keterangan", "UpdatedAt"]
};

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * SIPANDA BOSP - Google Apps Script REST API & Database Engine
 * Edisi Profesional Enterprise - Dana Bantuan Operasional Satuan Pendidikan
 * ============================================================================
 * Petunjuk Instalasi:
 * 1. Buka Google Spreadsheet baru di Google Drive Anda.
 * 2. Klik menu 'Ekstensi' > 'Apps Script'.
 * 3. Hapus kode default, lalu tempelkan (paste) seluruh kode ini.
 * 4. Klik ikon Save (Simpan).
 * 5. Jalankan fungsi 'initDatabase()' satu kali untuk membuat 28 sheet otomatis.
 * 6. Klik 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment).
 * 7. Pilih tipe: 'Aplikasi web' (Web app).
 * 8. Konfigurasikan:
 *    - Jalankan sebagai: Saya (Email Anda)
 *    - Yang memiliki akses: Siapa saja (Anyone)
 *    - Salin URL Aplikasi Web yang dihasilkan dan tempelkan ke SIPANDA BOSP Settings.
 * ============================================================================
 */

// 30 Tabel Database Sesuai Spesifikasi SIPANDA BOSP Enterprise
var SHEETS_SCHEMA = ` + JSON.stringify(SHEETS_SCHEMA_MAP, null, 2) + `;

/**
 * Inisialisasi Database: Membuat seluruh 30 sheet dan kolom header secara otomatis.
 */
function initDatabase() {
  return recycleDatabase();
}

/**
 * Daur Ulang & Reset Struktur Database:
 * Menyelaraskan ulang seluruh sheet dengan header resmi warna hijau (#0B5D3B),
 * memperbaiki urutan kolom, dan memastikan ID spreadsheet selalu akurat.
 */
function recycleDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = Object.keys(SHEETS_SCHEMA);
  
  for (var i = 0; i < sheetNames.length; i++) {
    var sName = sheetNames[i];
    var headers = SHEETS_SCHEMA[sName];
    var sheet = ss.getSheetByName(sName);
    if (!sheet) {
      sheet = ss.insertSheet(sName);
    }
    
    // Tulis ulang baris header 1 agar 100% presisi dengan skema aplikasi
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0B5D3B");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    
    // Hapus kolom berlebih di kanan jika ada kolom lama yang tidak terpakai
    if (sheet.getLastColumn() > headers.length) {
      var extraCols = sheet.getLastColumn() - headers.length;
      var lastR = Math.max(sheet.getLastRow(), 1);
      sheet.getRange(1, headers.length + 1, lastR, extraCols).clearContent();
    }
  }

  return {
    status: "success",
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    totalSheets: sheetNames.length,
    message: "Struktur database seluruh " + sheetNames.length + " sheet berhasil didaur ulang dan disesuaikan 100% dengan skema aplikasi SIPANDA BOSP."
  };
}

/**
 * Handle HTTP GET Request
 */
function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || "ping";
  
  try {
    if (action === "ping") {
      return jsonResponse({ status: "success", message: "SIPANDA BOSP Google Apps Script Engine Online", timestamp: new Date() });
    }
    
    if (action === "init" || action === "recycle" || action === "recycleDatabase") {
      var result = recycleDatabase();
      return jsonResponse(result);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return jsonResponse({
        status: "error",
        message: "Script ini tidak terhubung ke Google Spreadsheet. Silakan buka Google Spreadsheet terlebih dahulu, lalu pilih menu Ekstensi > Apps Script."
      });
    }

    if (action === "checkStructure") {
      var sheets = ss.getSheets();
      var foundSheets = {};
      for (var sIdx = 0; sIdx < sheets.length; sIdx++) {
        var curSheet = sheets[sIdx];
        var sName = curSheet.getName();
        var cols = [];
        if (curSheet.getLastColumn() > 0) {
          cols = curSheet.getRange(1, 1, 1, curSheet.getLastColumn()).getValues()[0];
        }
        foundSheets[sName] = {
          rowCount: curSheet.getLastRow(),
          colCount: cols.length,
          headers: cols
        };
      }
      return jsonResponse({
        status: "success",
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        totalSheetsFound: sheets.length,
        sheets: foundSheets,
        targetSchema: SHEETS_SCHEMA
      });
    }
    
    if (action === "getTable") {
      var sheetName = params.sheet;
      var schoolId = params.schoolId;
      var data = readSheetData(sheetName, schoolId);
      return jsonResponse({ status: "success", sheet: sheetName, count: data.length, data: data });
    }
    
    return jsonResponse({ status: "error", message: "Aksi tidak dikenali: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", error: err.toString() });
  }
}

/**
 * Handle HTTP POST Request
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var currentSpreadsheetId = ss.getId();
    var currentSpreadsheetName = ss.getName();

    if (action === "recycleDatabase" || action === "init") {
      var recRes = recycleDatabase();
      return jsonResponse(recRes);
    }
    
    if (action === "syncAll") {
      // Menyimpan data sinkronisasi dari aplikasi utama ke Google Sheets
      var tables = payload.tables;
      
      for (var sheetName in tables) {
        if (SHEETS_SCHEMA[sheetName]) {
          var rows = tables[sheetName];
          var sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            sheet.appendRow(SHEETS_SCHEMA[sheetName]);
            var hRange = sheet.getRange(1, 1, 1, SHEETS_SCHEMA[sheetName].length);
            hRange.setBackground("#0B5D3B");
            hRange.setFontColor("#FFFFFF");
            hRange.setFontWeight("bold");
          }
          // Clear previous data beyond header
          var lastRow = sheet.getLastRow();
          if (lastRow > 1) {
            sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
          }
          // Insert new rows
          if (rows && rows.length > 0) {
            var headers = SHEETS_SCHEMA[sheetName];
            var rowData = rows.map(function(item) {
              if (Array.isArray(item)) {
                return item.map(function(val, colIdx) {
                  // Jika ini sheet PengaturanAplikasi dan kolom Key adalah googleSpreadsheetId, selalu ganti dengan ID spreadsheet ini!
                  if (sheetName === "PengaturanAplikasi" && item[1] === "googleSpreadsheetId" && colIdx === 2) {
                    return currentSpreadsheetId;
                  }
                  if (val === null || val === undefined) return "";
                  if (typeof val === "object") return JSON.stringify(val);
                  return val;
                });
              }
              return headers.map(function(h) {
                if (sheetName === "PengaturanAplikasi" && item["Key"] === "googleSpreadsheetId" && h === "Value") {
                  return currentSpreadsheetId;
                }
                if (item[h] !== undefined && item[h] !== null) {
                  return typeof item[h] === "object" ? JSON.stringify(item[h]) : item[h];
                }
                for (var key in item) {
                  if (key.toLowerCase() === h.toLowerCase()) {
                    return typeof item[key] === "object" ? JSON.stringify(item[key]) : item[key];
                  }
                }
                return "";
              });
            });
            sheet.getRange(2, 1, rowData.length, headers.length).setValues(rowData);
          }
        }
      }
      return jsonResponse({
        status: "success",
        spreadsheetId: currentSpreadsheetId,
        spreadsheetName: currentSpreadsheetName,
        message: "Data berhasil disinkronisasi ke Google Spreadsheet."
      });
    }
    
    return jsonResponse({ status: "error", message: "Aksi POST tidak dikenali." });
  } catch (err) {
    return jsonResponse({ status: "error", error: err.toString() });
  }
}

function readSheetData(sheetName, schoolId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var rows = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    if (!schoolId || row["SchoolID"] === schoolId || !row["SchoolID"]) {
      rows.push(row);
    }
  }
  return rows;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
