import fs from 'fs';
import path from 'path';
import {
  User,
  School,
  FiscalYear,
  FundingSource,
  BudgetPlan,
  BudgetComponent,
  Transaction,
  LedgerEntry,
  TaxRateConfig,
  TaxDepositRecord,
  ReconciliationRecord,
  BankStatementItem,
  Receipt,
  SPPDItem,
  OfficialLetter,
  MinutesRecord,
  Announcement,
  AuditLog,
  AppSettings,
  BudgetSubComponentConfig,
  FundSourceType,
} from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'sipanda_database.json');

export interface DatabaseSchema {
  Pengguna: User[];
  Sekolah: School[];
  LingkunganSekolah: any[];
  TahunFiskal: FiscalYear[];
  SumberPendanaan: FundingSource[];
  BudgetPlans: BudgetPlan[];
  KomponenAnggaran: BudgetComponent[];
  MasterSubComponents?: BudgetSubComponentConfig[];
  TandaTerima: Receipt[];
  Transaksi: Transaction[];
  DetailTransaksi: any[];
  BukuKas: LedgerEntry[];
  BukuBank: LedgerEntry[];
  CashBookLedger: LedgerEntry[];
  TaxBook: LedgerEntry[];
  TarifPajak: TaxRateConfig[];
  PembayaranPajak: TaxDepositRecord[];
  Rekonsiliasi: ReconciliationRecord[];
  LaporanBank: BankStatementItem[];
  TandaTerimaDokumen: any[];
  SPPD: SPPDItem[];
  SPPDDetails: any[];
  SuratSurat: OfficialLetter[];
  Risalah: MinutesRecord[];
  Laporan: any[];
  PenomoranDokumen: any[];
  Lampiran: any[];
  Pengumuman: Announcement[];
  AuditLog: AuditLog[];
  PengaturanAplikasi: AppSettings;
}

// In-memory mutex lock for transactions
let isLocked = false;
const lockQueue: (() => void)[] = [];

export async function acquireLock(): Promise<void> {
  if (!isLocked) {
    isLocked = true;
    return;
  }
  return new Promise((resolve) => {
    lockQueue.push(() => {
      isLocked = true;
      resolve();
    });
  });
}

export function releaseLock(): void {
  if (lockQueue.length > 0) {
    const next = lockQueue.shift();
    if (next) next();
  } else {
    isLocked = false;
  }
}

type SaveListener = (data: DatabaseSchema) => void;
const saveListeners: SaveListener[] = [];

export function registerOnSaveListener(listener: SaveListener): void {
  saveListeners.push(listener);
}

class DatabaseEngine {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrInit();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrInit(): DatabaseSchema {
    this.ensureDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw: DatabaseSchema = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        // Ensure verification status exists on all schools and users
        let updated = false;
        if (raw.Sekolah) {
          raw.Sekolah.forEach(s => {
            if (!s.verificationStatus) {
              s.verificationStatus = 'TERVERIFIKASI';
              updated = true;
            }
          });
        }
        if (raw.Pengguna) {
          raw.Pengguna.forEach(u => {
            if (!u.verificationStatus) {
              u.verificationStatus = 'TERVERIFIKASI';
              updated = true;
            }
          });
        }
        if (updated) {
          this.saveData(raw);
        }
        return raw;
      } catch (err) {
        console.error('Error reading database file, initializing default:', err);
      }
    }
    const initial = this.createInitialData();
    this.saveData(initial);
    return initial;
  }

  public saveData(dataToSave?: DatabaseSchema) {
    this.ensureDir();
    const data = dataToSave || this.data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');

    // Notify listeners (e.g. background sync)
    saveListeners.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error('Save listener error:', e);
      }
    });
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public resetDatabase(): DatabaseSchema {
    this.data = this.createInitialData();
    this.saveData();
    return this.data;
  }

  // Auto numbering helper
  public getNextNumber(type: 'TRX' | 'KWT' | 'SURAT' | 'SPPD' | 'BA', schoolId: string, year: number): string {
    const yStr = String(year);
    if (type === 'TRX') {
      const count = this.data.Transaksi.filter(t => t.schoolId === schoolId && t.fiscalYear === year).length + 1;
      return `TRX/${yStr}/${String(count).padStart(4, '0')}`;
    }
    if (type === 'KWT') {
      const count = this.data.TandaTerima.filter(t => t.schoolId === schoolId && t.fiscalYear === year).length + 1;
      return `KWT/${yStr}/${String(count).padStart(4, '0')}`;
    }
    if (type === 'SURAT') {
      const count = this.data.SuratSurat.filter(s => s.schoolId === schoolId && s.fiscalYear === year).length + 1;
      return `421/${String(count).padStart(3, '0')}/DISDIK/${yStr}`;
    }
    if (type === 'SPPD') {
      const count = this.data.SPPD.filter(s => s.schoolId === schoolId && s.fiscalYear === year).length + 1;
      return `090/${String(count).padStart(3, '0')}/SPPD/${yStr}`;
    }
    if (type === 'BA') {
      const count = this.data.Risalah.filter(r => r.schoolId === schoolId && r.fiscalYear === year).length + 1;
      return `BA/${yStr}/${String(count).padStart(4, '0')}`;
    }
    return `DOC/${Date.now()}`;
  }

  // Automated bookkeeping logic
  public refreshLedgers(schoolId: string, fiscalYear: number) {
    const transactions = this.data.Transaksi
      .filter(t => t.schoolId === schoolId && t.fiscalYear === fiscalYear && t.verificationStatus !== 'Ditolak')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.transactionNumber.localeCompare(b.transactionNumber));

    // Reset ledger entries for this school & year
    this.data.BukuKas = this.data.BukuKas.filter(e => !(e.schoolId === schoolId && e.fiscalYear === fiscalYear));
    this.data.BukuBank = this.data.BukuBank.filter(e => !(e.schoolId === schoolId && e.fiscalYear === fiscalYear));
    this.data.CashBookLedger = this.data.CashBookLedger.filter(e => !(e.schoolId === schoolId && e.fiscalYear === fiscalYear));
    this.data.TaxBook = this.data.TaxBook.filter(e => !(e.schoolId === schoolId && e.fiscalYear === fiscalYear));

    let bkuBalance = 0;
    let bankBalance = 0;
    let cashBalance = 0;

    // Reset budget component realizations
    const components = this.data.KomponenAnggaran.filter(c => c.schoolId === schoolId && c.fiscalYear === fiscalYear);
    components.forEach(c => {
      c.realizedAmount = 0;
      c.remainingAmount = c.allocatedAmount;
      c.stage1Realized = 0;
      c.stage2Realized = 0;
    });

    for (const trx of transactions) {
      const isDebit = trx.type === 'PENERIMAAN' || trx.type === 'PENGEMBALIAN';
      const debitAmount = isDebit ? trx.amount : 0;
      const creditAmount = !isDebit ? trx.amount : 0;

      // Update BKU
      bkuBalance = bkuBalance + debitAmount - creditAmount;
      const bkuEntry: LedgerEntry = {
        id: `BKU-${trx.id}`,
        schoolId,
        fiscalYear,
        date: trx.date,
        transactionId: trx.id,
        evidenceNumber: trx.invoiceNumber || trx.transactionNumber,
        description: trx.description,
        debit: debitAmount,
        credit: creditAmount,
        balance: bkuBalance,
        bookType: 'BKU',
        createdAt: trx.createdAt,
      };
      this.data.BukuKas.push(bkuEntry);

      // Update Bank or Tunai Ledger
      if (trx.paymentMethod === 'BANK') {
        bankBalance = bankBalance + debitAmount - creditAmount;
        const bankEntry: LedgerEntry = {
          id: `BNK-${trx.id}`,
          schoolId,
          fiscalYear,
          date: trx.date,
          transactionId: trx.id,
          evidenceNumber: trx.invoiceNumber || trx.transactionNumber,
          description: trx.description,
          debit: debitAmount,
          credit: creditAmount,
          balance: bankBalance,
          bookType: 'BANK',
          createdAt: trx.createdAt,
        };
        this.data.BukuBank.push(bankEntry);
      } else {
        cashBalance = cashBalance + debitAmount - creditAmount;
        const cashEntry: LedgerEntry = {
          id: `CSH-${trx.id}`,
          schoolId,
          fiscalYear,
          date: trx.date,
          transactionId: trx.id,
          evidenceNumber: trx.invoiceNumber || trx.transactionNumber,
          description: trx.description,
          debit: debitAmount,
          credit: creditAmount,
          balance: cashBalance,
          bookType: 'TUNAI',
          createdAt: trx.createdAt,
        };
        this.data.CashBookLedger.push(cashEntry);
      }

      // Update Tax Book
      if (trx.hasTax && trx.taxes && trx.taxes.length > 0) {
        for (const tax of trx.taxes) {
          const taxEntry: LedgerEntry = {
            id: `TAX-${trx.id}-${tax.taxType}`,
            schoolId,
            fiscalYear,
            date: trx.date,
            transactionId: trx.id,
            evidenceNumber: tax.billingCode || trx.invoiceNumber || trx.transactionNumber,
            description: `Potongan ${tax.taxType} atas ${trx.description} (${tax.rate}%)`,
            debit: tax.taxAmount, // Pajak dipungut
            credit: tax.isDeposited ? tax.taxAmount : 0, // Pajak disetor
            balance: tax.isDeposited ? 0 : tax.taxAmount,
            bookType: 'PAJAK',
            taxType: tax.taxType,
            createdAt: trx.createdAt,
          };
          this.data.TaxBook.push(taxEntry);
        }
      }

      // Update RKAS Component realization
      if (trx.budgetComponentId && trx.type === 'PENGELUARAN') {
        const comp = components.find(c => 
          c.id === trx.budgetComponentId || 
          c.code === trx.budgetComponentId ||
          (trx.budgetComponentId === 'BC-01' && c.code === '5.1.02.01') ||
          (trx.budgetComponentId === 'BC-02' && c.code === '5.2.05.01') ||
          (trx.budgetComponentId === 'BC-03' && c.code === '5.1.02.16') ||
          (trx.budgetComponentId === 'BC-04' && c.code === '5.1.02.05') ||
          (trx.budgetComponentId === 'BC-05' && c.code === '5.1.02.02') ||
          (trx.budgetComponentId === 'BC-06' && c.code === '5.1.02.07')
        );
        if (comp) {
          comp.realizedAmount += trx.amount;
          comp.remainingAmount = comp.allocatedAmount - comp.realizedAmount;
          const month = new Date(trx.date).getMonth();
          if (month < 6) {
            comp.stage1Realized = (comp.stage1Realized || 0) + trx.amount;
          } else {
            comp.stage2Realized = (comp.stage2Realized || 0) + trx.amount;
          }
        }
      }
    }

    this.saveData();
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const entry: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.AuditLog.unshift(entry);
    // Keep last 1000 logs
    if (this.data.AuditLog.length > 1000) {
      this.data.AuditLog.pop();
    }
    this.saveData();
  }

  public generateStandardComponents(
    schoolId: string, 
    fiscalYear: number, 
    totalPagu: number, 
    schoolStatus: 'Negeri' | 'Swasta' = 'Negeri',
    fundSource: FundSourceType = 'BOSP_REGULER'
  ): BudgetComponent[] {
    const subCategoriesConfig = [
      // I. BELANJA BARANG DAN JASA (17 Sub-Rincian)
      { code: '5.1.02.01', name: 'Belanja Honorarium', mainType: 'BARANG_JASA' as const, category: 'HONORARIUM' as const },
      { code: '5.1.02.02', name: 'Belanja Alat Tulis Kantor', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.03', name: 'Belanja Benda Pos', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.04', name: 'Belanja Peralatan Kebersihan', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.05', name: 'Belanja Alat alat Keterampilan', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.06', name: 'Belanja Alat Listrik', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.07', name: 'Belanja Langganan Listrik', mainType: 'BARANG_JASA' as const, category: 'LANGGANAN_DAYA_DAN_JASA' as const },
      { code: '5.1.02.08', name: 'Belanja Langganan Internet', mainType: 'BARANG_JASA' as const, category: 'LANGGANAN_DAYA_DAN_JASA' as const },
      { code: '5.1.02.09', name: 'Belanja Retribusi Sampah', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.10', name: 'Belanja Pajak Bumi dan Bangunan', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.11', name: 'Belanja Cetak', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.12', name: 'Belanja Penggandaan', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.13', name: 'Belanja Makan Minum', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.14', name: 'Belanja Perjalanan Dinas', mainType: 'BARANG_JASA' as const, category: 'ADMINISTRASI_KEGIATAN_SEKOLAH' as const },
      { code: '5.1.02.15', name: 'Belanja Pemeliharaan Peralatan Kantor', mainType: 'BARANG_JASA' as const, category: 'BARANG_JASA' as const },
      { code: '5.1.02.16', name: 'Belanja Pemeliharaan Sarana Prasarana', mainType: 'BARANG_JASA' as const, category: 'PEMELIHARAAN_SARPRAS' as const },
      { code: '5.1.02.17', name: 'Belanja Pelatihan / Diklat', mainType: 'BARANG_JASA' as const, category: 'PENGEMBANGAN_PROFESI_GURU' as const },

      // II. BELANJA MODAL PERALATAN DAN MESIN (3 Sub-Rincian)
      { code: '5.2.02.01', name: 'Belanja Modal Komputer', mainType: 'MODAL_PERALATAN_MESIN' as const, category: 'MODAL_MESIN' as const },
      { code: '5.2.02.02', name: 'Belanja Modal Peralatan Komputer', mainType: 'MODAL_PERALATAN_MESIN' as const, category: 'MODAL_MESIN' as const },
      { code: '5.2.02.03', name: 'Belanja Modal Peralatan Keamanan Kantor', mainType: 'MODAL_PERALATAN_MESIN' as const, category: 'MODAL_MESIN' as const },

      // III. BELANJA MODAL ASET TETAP LAINNYA (3 Sub-Rincian)
      { code: '5.2.05.01', name: 'Belanja Buku Teks Umum', mainType: 'MODAL_ASET_TETAP_LAINNYA' as const, category: 'BUKU_DAN_MODAL' as const },
      { code: '5.2.05.02', name: 'Belanja Buku Teks Pendamping', mainType: 'MODAL_ASET_TETAP_LAINNYA' as const, category: 'BUKU_DAN_MODAL' as const },
      { code: '5.2.05.03', name: 'Belanja Buku lainnya', mainType: 'MODAL_ASET_TETAP_LAINNYA' as const, category: 'BUKU_DAN_MODAL' as const },
    ];

    const fundLabel = fundSource === 'BOSP_KINERJA' ? 'BOSP Kinerja' : fundSource === 'BOSP_AFIRMASI' ? 'BOSP Afirmasi' : 'BOSP Reguler';

    const standardBuilt: BudgetComponent[] = subCategoriesConfig.map((cat) => ({
      id: `BC-${schoolId}-${fiscalYear}-${fundSource}-${cat.code.replace(/\./g, '_')}`,
      schoolId,
      fiscalYear,
      fundSource,
      code: cat.code,
      name: cat.name,
      mainType: cat.mainType,
      category: cat.category,
      subComponent: '',
      allocatedAmount: 0,
      realizedAmount: 0,
      remainingAmount: 0,
      stage1Budget: 0,
      stage2Budget: 0,
      stage1Realized: 0,
      stage2Realized: 0,
      items: [],
      description: `Sub-rincian ${cat.name} anggaran ${fundLabel} Tahun ${fiscalYear}`,
    }));

    // Also include any custom subcomponents configured by Admin Dinas
    const customMasters = (this.data?.MasterSubComponents || []).filter(c => c.isCustom);
    const customComponents: BudgetComponent[] = customMasters.map(custom => ({
      id: `BC-${schoolId}-${fiscalYear}-${fundSource}-${custom.code.replace(/\./g, '_')}`,
      schoolId,
      fiscalYear,
      fundSource,
      code: custom.code,
      name: custom.name,
      mainType: custom.mainType,
      category: custom.category,
      subComponent: '',
      allocatedAmount: 0,
      realizedAmount: 0,
      remainingAmount: 0,
      stage1Budget: 0,
      stage2Budget: 0,
      stage1Realized: 0,
      stage2Realized: 0,
      items: [],
      description: custom.description || `Sub-rincian kustom ${custom.name} anggaran ${fundLabel} Tahun ${fiscalYear}`,
    }));

    return [...standardBuilt, ...customComponents];
  }

  public getStandardMasterSubComponents(): BudgetSubComponentConfig[] {
    return [
      // 1. Belanja Barang dan Jasa
      { id: 'MST-01', code: '5.1.02.01', name: 'Belanja Honorarium', mainType: 'BARANG_JASA', category: 'HONORARIUM', description: 'Honor guru tidak tetap (GTT) & tenaga kependidikan non-ASN' },
      { id: 'MST-02', code: '5.1.02.02', name: 'Belanja Alat Tulis Kantor', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Kertas HVS, spidol, binder, toner printer kantor & kelas' },
      { id: 'MST-03', code: '5.1.02.03', name: 'Belanja Benda Pos', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'e-Meterai, meterai tempel Rp 10.000, ongkos kirim berkas SPJ BOSP' },
      { id: 'MST-04', code: '5.1.02.04', name: 'Belanja Peralatan Kebersihan', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Sapu, pel lantai, cairan disinfektan, tempat sampah pilah' },
      { id: 'MST-05', code: '5.1.02.05', name: 'Belanja Alat alat Keterampilan', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Bahan praktik seni budaya, prakarya, dan perlengkapan P5 siswa' },
      { id: 'MST-06', code: '5.1.02.06', name: 'Belanja Alat Listrik', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Lampu LED hemat daya, kabel roll, steker & saklar standar SNI' },
      { id: 'MST-07', code: '5.1.02.07', name: 'Belanja Langganan Listrik', mainType: 'BARANG_JASA', category: 'LANGGANAN_DAYA_DAN_JASA', description: 'Pembayaran tagihan rekening listrik PLN operasional sekolah' },
      { id: 'MST-08', code: '5.1.02.08', name: 'Belanja Langganan Internet', mainType: 'BARANG_JASA', category: 'LANGGANAN_DAYA_DAN_JASA', description: 'Langganan akses internet broadband/fiber optik ANBK dan PMM' },
      { id: 'MST-09', code: '5.1.02.09', name: 'Belanja Retribusi Sampah', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Iuran kebersihan dan pengangkutan sampah lingkungan sekolah' },
      { id: 'MST-10', code: '5.1.02.10', name: 'Belanja Pajak Bumi dan Bangunan', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Pembayaran ketetapan PBB-P2 gedung dan tanah sekolah' },
      { id: 'MST-11', code: '5.1.02.11', name: 'Belanja Cetak', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Cetak brosur PPDB, spanduk kegiatan sekolah, sampul rapor Kurikulum Merdeka' },
      { id: 'MST-12', code: '5.1.02.12', name: 'Belanja Penggandaan', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Fotokopi naskah penilaian sumatif/formatif, LKPD & modul ajar' },
      { id: 'MST-13', code: '5.1.02.13', name: 'Belanja Makan Minum', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Konsumsi rapat dewan guru, komite, dan petugas proktor ANBK' },
      { id: 'MST-14', code: '5.1.02.14', name: 'Belanja Perjalanan Dinas', mainType: 'BARANG_JASA', category: 'BARANG_JASA', description: 'Uang harian & transport koordinasi BOSP ke Dinas Pendidikan / K3S' },
      { id: 'MST-15', code: '5.1.02.15', name: 'Belanja Pemeliharaan Peralatan Kantor', mainType: 'BARANG_JASA', category: 'PEMELIHARAAN_SARPRAS', description: 'Servis printer, perbaikan AC ruang guru, servis laptop server' },
      { id: 'MST-16', code: '5.1.02.16', name: 'Belanja Pemeliharaan Sarana Prasarana', mainType: 'BARANG_JASA', category: 'PEMELIHARAAN_SARPRAS', description: 'Pengecatan ruang kelas, perbaikan sanitasi/toilet siswa, genteng bocor' },
      { id: 'MST-17', code: '5.1.02.17', name: 'Belanja Pelatihan / Diklat', mainType: 'BARANG_JASA', category: 'PENGEMBANGAN_PROFESI_GURU', description: 'Workshop IHT Kurikulum Merdeka & pelatihan platform digital guru' },

      // 2. Belanja Modal Peralatan dan Mesin
      { id: 'MST-18', code: '5.2.02.01', name: 'Belanja Modal Komputer', mainType: 'MODAL_PERALATAN_MESIN', category: 'MODAL_MESIN', description: 'Pengadaan laptop / PC client dan server laboratorium ANBK' },
      { id: 'MST-19', code: '5.2.02.02', name: 'Belanja Modal Peralatan Komputer', mainType: 'MODAL_PERALATAN_MESIN', category: 'MODAL_MESIN', description: 'Printer scanner ink-tank, proyektor LCD infocus, switch hub jaringan' },
      { id: 'MST-20', code: '5.2.02.03', name: 'Belanja Modal Peralatan Keamanan Kantor', mainType: 'MODAL_PERALATAN_MESIN', category: 'MODAL_MESIN', description: 'Paket CCTV pengawas gedung, tabung pemadam api (APAR), brankas kas' },

      // 3. Belanja Modal Aset Tetap Lainnya
      { id: 'MST-21', code: '5.2.05.01', name: 'Belanja Buku Teks Umum', mainType: 'MODAL_ASET_TETAP_LAINNYA', category: 'BUKU_DAN_MODAL', description: 'Buku teks utama siswa terbitan resmi Kemendikbudristek' },
      { id: 'MST-22', code: '5.2.05.02', name: 'Belanja Buku Teks Pendamping', mainType: 'MODAL_ASET_TETAP_LAINNYA', category: 'BUKU_DAN_MODAL', description: 'Buku teks panduan pendamping guru dan materi pengayaan Kurikulum Merdeka' },
      { id: 'MST-23', code: '5.2.05.03', name: 'Belanja Buku lainnya', mainType: 'MODAL_ASET_TETAP_LAINNYA', category: 'BUKU_DAN_MODAL', description: 'Buku pengayaan literasi, ensiklopedia anak, dan koleksi perpustakaan' },
    ];
  }

  public getMasterSubComponents(): BudgetSubComponentConfig[] {
    if (!this.data.MasterSubComponents || this.data.MasterSubComponents.length === 0) {
      this.data.MasterSubComponents = this.getStandardMasterSubComponents();
      this.saveData();
    }
    return this.data.MasterSubComponents;
  }

  public addCustomSubComponent(
    config: Omit<BudgetSubComponentConfig, 'id' | 'isCustom' | 'createdAt'>, 
    adminName: string
  ): { success: boolean; subComponent?: BudgetSubComponentConfig; message?: string } {
    if (!this.data.MasterSubComponents) {
      this.data.MasterSubComponents = this.getStandardMasterSubComponents();
    }

    if (this.data.MasterSubComponents.some(c => c.code === config.code)) {
      return { success: false, message: `Sub-rincian dengan kode rekening ${config.code} sudah terdaftar.` };
    }

    const newSub: BudgetSubComponentConfig = {
      id: `MST-${Date.now()}`,
      code: config.code,
      name: config.name,
      mainType: config.mainType,
      category: config.category,
      description: config.description || '',
      isCustom: true,
      activeFiscalYear: config.activeFiscalYear || 2026,
      defaultItems: config.defaultItems || [],
      createdAt: new Date().toISOString(),
      createdBy: adminName,
    };

    this.data.MasterSubComponents.push(newSub);

    // Sync to all registered schools' KomponenAnggaran for active fiscal year
    const fiscalYear = config.activeFiscalYear || 2026;
    const schools = this.data.Sekolah;
    let syncedCount = 0;

    schools.forEach(school => {
      const exists = this.data.KomponenAnggaran.some(
        c => c.schoolId === school.id && c.fiscalYear === fiscalYear && c.code === config.code
      );

      if (!exists) {
        const items = (config.defaultItems && config.defaultItems.length > 0)
          ? config.defaultItems.map((itm, idx) => {
              const tot = (itm.volume || 1) * (itm.unitPrice || 0);
              return {
                id: `ITM-${school.id}-${config.code.replace(/\./g, '')}-${idx + 1}`,
                description: itm.description,
                volume: itm.volume,
                unit: itm.unit,
                unitPrice: itm.unitPrice,
                totalAmount: tot,
                stage: itm.stage,
                stage1Amount: itm.stage === '2' ? 0 : itm.stage === '1' ? tot : Math.round(tot / 2),
                stage2Amount: itm.stage === '1' ? 0 : itm.stage === '2' ? tot : tot - Math.round(tot / 2),
              };
            })
          : [];

        const totalAllocated = items.reduce((s, i) => s + i.totalAmount, 0);
        const s1 = items.reduce((s, i) => s + (i.stage1Amount || 0), 0);
        const s2 = items.reduce((s, i) => s + (i.stage2Amount || 0), 0);

        const newComp: BudgetComponent = {
          id: `BC-${school.id}-${config.code.replace(/\./g, '_')}`,
          schoolId: school.id,
          fiscalYear,
          code: config.code,
          name: config.name,
          mainType: config.mainType,
          category: config.category,
          subComponent: items[0]?.description || '',
          allocatedAmount: totalAllocated,
          realizedAmount: 0,
          remainingAmount: totalAllocated,
          stage1Budget: s1,
          stage2Budget: s2,
          stage1Realized: 0,
          stage2Realized: 0,
          items,
          description: config.description || `Sub-rincian ${config.name} hasil penyesuaian Juknis BOSP`,
        };

        this.data.KomponenAnggaran.push(newComp);
        syncedCount++;
      }
    });

    this.logAudit({
      userId: 'ADMIN',
      username: adminName,
      userRole: 'ADMIN_DINAS',
      action: 'TAMBAH_SUB_RINCIAN_JUKNIS',
      module: 'Konfigurasi Juknis',
      details: `Menambahkan sub-rincian objek belanja baru: ${config.name} (${config.code}) pada ${config.mainType}. Disinkronkan ke ${syncedCount} satuan pendidikan aktif.`,
    });

    this.saveData();
    return { success: true, subComponent: newSub };
  }

  public updateCustomSubComponent(
    code: string, 
    updates: Partial<BudgetSubComponentConfig>, 
    adminName: string
  ): { success: boolean; message?: string } {
    if (!this.data.MasterSubComponents) {
      this.data.MasterSubComponents = this.getStandardMasterSubComponents();
    }
    const idx = this.data.MasterSubComponents.findIndex(c => c.code === code);
    if (idx === -1) return { success: false, message: `Sub-rincian dengan kode ${code} tidak ditemukan.` };

    const current = this.data.MasterSubComponents[idx];
    this.data.MasterSubComponents[idx] = { ...current, ...updates };

    // Update in KomponenAnggaran for schools
    if (updates.name) {
      this.data.KomponenAnggaran.forEach(comp => {
        if (comp.code === code) {
          comp.name = updates.name!;
        }
      });
    }

    this.logAudit({
      userId: 'ADMIN',
      username: adminName,
      userRole: 'ADMIN_DINAS',
      action: 'UPDATE_SUB_RINCIAN_JUKNIS',
      module: 'Konfigurasi Juknis',
      details: `Memperbarui sub-rincian ${code} ("${updates.name || current.name}").`,
    });

    this.saveData();
    return { success: true };
  }

  public deleteCustomSubComponent(code: string, adminName: string): { success: boolean; message?: string } {
    if (!this.data.MasterSubComponents) {
      this.data.MasterSubComponents = this.getStandardMasterSubComponents();
    }
    const item = this.data.MasterSubComponents.find(c => c.code === code);
    if (!item) return { success: false, message: 'Sub-rincian tidak ditemukan.' };
    if (!item.isCustom) {
      return { success: false, message: 'Sub-rincian standar baku Juknis BOSP tidak dapat dihapus, hanya sub-rincian kustom tambahan yang dapat dihapus.' };
    }

    this.data.MasterSubComponents = this.data.MasterSubComponents.filter(c => c.code !== code);
    // Remove from schools if no realization has occurred
    this.data.KomponenAnggaran = this.data.KomponenAnggaran.filter(c => !(c.code === code && (!c.realizedAmount || c.realizedAmount === 0)));

    this.logAudit({
      userId: 'ADMIN',
      username: adminName,
      userRole: 'ADMIN_DINAS',
      action: 'HAPUS_SUB_RINCIAN_JUKNIS',
      module: 'Konfigurasi Juknis',
      details: `Menghapus sub-rincian kustom: ${item.name} (${code}).`,
    });

    this.saveData();
    return { success: true };
  }

  // Clean initial data without dummy schools/transactions
  private createInitialData(): DatabaseSchema {
    const now = new Date().toISOString();
    const currentYear = 2026;

    const users: User[] = [
      {
        id: 'USR-001',
        username: 'admin_dinas',
        password: 'admin123',
        name: 'Drs. H. Bambang Sudarsono, M.Pd.',
        role: 'ADMIN_DINAS',
        nip: '19740512 199803 1 002',
        email: 'dinas_pendidikan@bosp.go.id',
        phone: '081234567890',
        isActive: true,
        verificationStatus: 'TERVERIFIKASI',
        createdAt: now,
      },
    ];

    const schools: School[] = [];

    const fiscalYears: FiscalYear[] = [
      { id: 'FY-2026', year: 2026, isActive: true, status: 'Open', notes: 'Tahun Anggaran Berjalan 2026' },
    ];

    const fundingSources: FundingSource[] = [
      { id: 'SRC-01', code: 'BOSP-REG', name: 'Dana BOSP Reguler', description: 'Bantuan Operasional Satuan Pendidikan Reguler Kemendikbudristek', year: currentYear },
      { id: 'SRC-02', code: 'BOSP-KIN', name: 'Dana BOSP Kinerja', description: 'Bantuan Operasional Satuan Pendidikan Prestasi & Kemajuan Terbaik', year: currentYear },
      { id: 'SRC-03', code: 'BOSP-AFIR', name: 'Dana BOSP Afirmasi', description: 'Bantuan Operasional Sekolah Daerah Khusus 3T', year: currentYear },
    ];

    const taxRates: TaxRateConfig[] = [
      {
        id: 'TAX-01',
        code: 'PPN_11',
        name: 'PPN 11% (Pajak Pertambahan Nilai)',
        rate: 11,
        threshold: 2000000,
        description: 'Dikenakan atas penyerahan BKP/JKP kepada bendahara pemerintah dengan nilai transaksi di atas Rp 2.000.000 (tidak termasuk PPN).',
        effectiveFrom: '2022-04-01',
        lawReference: 'UU No. 7 Tahun 2021 (HPP) jo. PMK No. 59/PMK.03/2022',
        isActive: true,
      },
      {
        id: 'TAX-02',
        code: 'PPH_21_GOL3',
        name: 'PPh Pasal 21 PNS Golongan III (5%)',
        rate: 5,
        threshold: 0,
        description: 'Dipotong atas honorarium kegiatan bagi PNS Golongan III.',
        effectiveFrom: '2020-01-01',
        lawReference: 'PP No. 80 Tahun 2010 Pasal 4 ayat (1)',
        isActive: true,
      },
      {
        id: 'TAX-03',
        code: 'PPH_21_GOL4',
        name: 'PPh Pasal 21 PNS Golongan IV (15%)',
        rate: 15,
        threshold: 0,
        description: 'Dipotong atas honorarium kegiatan bagi PNS Golongan IV.',
        effectiveFrom: '2020-01-01',
        lawReference: 'PP No. 80 Tahun 2010 Pasal 4 ayat (2)',
        isActive: true,
      },
      {
        id: 'TAX-04',
        code: 'PPH_22_15',
        name: 'PPh Pasal 22 Belanja Barang Pemerintah (1.5%)',
        rate: 1.5,
        threshold: 2000000,
        description: 'Dipungut oleh bendahara pengeluaran atas pembelian barang bernilai di atas Rp 2.000.000 (tidak termasuk PPN). Tarif 3% jika penyedia tidak ber-NPWP.',
        effectiveFrom: '2022-05-01',
        lawReference: 'PMK No. 59/PMK.03/2022 Pasal 5',
        isActive: true,
      },
      {
        id: 'TAX-05',
        code: 'PPH_23_20',
        name: 'PPh Pasal 23 Jasa dan Sewa (2%)',
        rate: 2,
        threshold: 0,
        description: 'Dipotong atas imbalan jasa teknik, perbaikan, katering, atau sewa selain tanah/bangunan. Tarif 4% jika tidak ber-NPWP.',
        effectiveFrom: '2020-01-01',
        lawReference: 'UU PPh Pasal 23',
        isActive: true,
      },
      {
        id: 'TAX-06',
        code: 'PPH_4_2_10',
        name: 'PPh Final Pasal 4 Ayat (2) Sewa Gedung/Tanah (10%)',
        rate: 10,
        threshold: 0,
        description: 'Dipotong atas persewaan tanah dan/atau bangunan.',
        effectiveFrom: '2020-01-01',
        lawReference: 'PP No. 34 Tahun 2017',
        isActive: true,
      },
    ];

    const announcements: Announcement[] = [
      {
        id: 'ANN-001',
        title: 'Sosialisasi Penatausahaan Dana BOSP Tahun Anggaran 2026',
        content: 'Selamat datang di SIPANDA BOSP Enterprise. Seluruh satuan pendidikan diwajibkan melakukan pendaftaran mandiri dan menunggu verifikasi Admin Dinas sebelum dapat menginput transaksi.',
        author: 'Tim Manajemen BOSP Dinas Pendidikan',
        isUrgent: true,
        targetRole: 'ALL',
        createdAt: now,
      },
    ];

    const appSettings: AppSettings = {
      appName: 'SIPANDA BOSP Enterprise',
      activeFiscalYear: currentYear,
      googleAppsScriptUrl: '',
      isLiveSyncEnabled: true,
      dinasPendidikanName: 'Dinas Pendidikan',
      dinasHeadName: 'Drs. H. Bambang Sudarsono, M.Pd.',
      dinasHeadNip: '19740512 199803 1 002',
      backupIntervalDays: 7,
      allowBendaharaEditProfile: true,
    };

    const auditLogs: AuditLog[] = [
      {
        id: 'AUD-001',
        userId: 'USR-001',
        username: 'admin_dinas',
        userRole: 'ADMIN_DINAS',
        action: 'INISIALISASI_SISTEM',
        module: 'Sistem',
        details: 'Inisialisasi database SIPANDA BOSP bersih tanpa data dummy, siap digunakan dengan data asli input sekolah.',
        timestamp: now,
      },
    ];

    const initialDb: DatabaseSchema = {
      Pengguna: users,
      Sekolah: schools,
      LingkunganSekolah: [],
      TahunFiskal: fiscalYears,
      SumberPendanaan: fundingSources,
      BudgetPlans: [],
      KomponenAnggaran: [],
      TandaTerima: [],
      Transaksi: [],
      DetailTransaksi: [],
      BukuKas: [],
      BukuBank: [],
      CashBookLedger: [],
      TaxBook: [],
      TarifPajak: taxRates,
      PembayaranPajak: [],
      Rekonsiliasi: [],
      LaporanBank: [],
      TandaTerimaDokumen: [],
      SPPD: [],
      SPPDDetails: [],
      SuratSurat: [],
      Risalah: [],
      Laporan: [],
      PenomoranDokumen: [],
      Lampiran: [],
      Pengumuman: announcements,
      AuditLog: auditLogs,
      PengaturanAplikasi: appSettings,
    };

    return initialDb;
  }
}

export const db = new DatabaseEngine();
