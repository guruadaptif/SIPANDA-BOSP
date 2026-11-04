/**
 * SIPANDA BOSP - Data Types & Entity Models
 * Covers all 28 Sheets & Modules defined in SIPANDA BOSP Enterprise Spec
 */

export type UserRole = 'ADMIN_DINAS' | 'BENDAHARA_SEKOLAH';

export type SchoolStatus = 'Negeri' | 'Swasta';
export type EducationLevel = 'SD' | 'SMP' | 'SMA' | 'SMK';
export type VerificationStatus = 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI' | 'DINONAKTIFKAN';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  schoolId?: string; // Assigned school for Bendahara; empty for Admin Dinas
  nip?: string;
  email: string;
  phone?: string;
  isActive: boolean;
  verificationStatus?: VerificationStatus;
  createdAt: string;
}

export interface School {
  id: string; // SchoolID
  npsn: string;
  name: string;
  status: SchoolStatus;
  level: EducationLevel;
  address: string;
  village: string; // Desa / Kelurahan
  subdistrict: string; // Kecamatan
  district: string; // Kabupaten / Kota
  province: string;
  postalCode: string;
  headmasterName: string;
  headmasterNip: string;
  treasurerName: string;
  treasurerNip: string;
  bankAccount: string;
  bankName: string;
  npwp: string;
  activeFiscalYear: number;
  phone?: string;
  email?: string;
  committeeName?: string; // Nama Komite Sekolah
  logoUrl?: string;
  isLocked?: boolean;
  verificationStatus?: VerificationStatus;
  registeredAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface FiscalYear {
  id: string;
  year: number;
  isActive: boolean;
  status: 'Open' | 'Closed' | 'Audited';
  closedAt?: string;
  notes?: string;
}

export type FundSourceType = 'BOSP_REGULER' | 'BOSP_KINERJA' | 'BOSP_AFIRMASI';

export interface FundSourceDefinition {
  type: FundSourceType;
  code: string;
  name: string;
  shortName: string;
  description: string;
  badgeClass: string;
  pillColor: string;
}

export const MASTER_FUND_SOURCES: FundSourceDefinition[] = [
  {
    type: 'BOSP_REGULER',
    code: 'BOSP-REG',
    name: 'Dana BOSP Reguler',
    shortName: 'Reguler',
    description: 'Bantuan Operasional Satuan Pendidikan Reguler untuk kebutuhan operasional dasar sekolah.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    pillColor: '#059669',
  },
  {
    type: 'BOSP_KINERJA',
    code: 'BOSP-KIN',
    name: 'Dana BOSP Kinerja',
    shortName: 'Kinerja',
    description: 'Bantuan Operasional Satuan Pendidikan Kinerja untuk sekolah berprestasi dan kemajuan terbaik.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    pillColor: '#2563eb',
  },
  {
    type: 'BOSP_AFIRMASI',
    code: 'BOSP-AFIR',
    name: 'Dana BOSP Afirmasi',
    shortName: 'Afirmasi',
    description: 'Bantuan Operasional Satuan Pendidikan Afirmasi untuk daerah khusus 3T dan kondisi khusus.',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    pillColor: '#7c3aed',
  },
];

export interface FundingSource {
  id: string;
  code: string;
  name: string; // e.g. "BOSP Reguler", "BOSP Kinerja"
  description: string;
  year: number;
}

export interface BudgetPlan {
  id: string;
  schoolId: string;
  fiscalYear: number;
  fundSource?: FundSourceType; // BOSP_REGULER | BOSP_KINERJA | BOSP_AFIRMASI
  totalPagu: number; // Total Pagu Dana BOSP
  stage1Allocation: number; // Tahap 1 (50%)
  stage2Allocation: number; // Tahap 2 (50%)
  approvedAt?: string;
  status: 'Draft' | 'Diajukan' | 'Disetujui' | 'Revisi';
  notes?: string;
}

export type MainExpenditureType = 
  | 'BARANG_JASA' 
  | 'MODAL_PERALATAN_MESIN' 
  | 'MODAL_ASET_TETAP_LAINNYA';

export interface BudgetItemDetail {
  id: string;
  description: string; // 1. Uraian Belanja
  volume: number;      // 2. Total Volume
  unit: string;        // 3. Satuan (e.g. Rim, Paket, Orang/Bulan, Eksemplar, Unit)
  unitPrice: number;   // 4. Harga Satuan
  totalAmount: number; // Volume * Harga Satuan
  stage: '1' | '2' | 'BOTH'; // Filter Penanggaran Tahap I / II / Keduanya
  volumeStage1?: number; // Volume khusus Tahap I
  volumeStage2?: number; // Volume khusus Tahap II
  stage1Amount?: number;
  stage2Amount?: number;
}

export type BudgetComponentCategory = 
  | 'HONORARIUM'
  | 'BUKU_DAN_MODAL'
  | 'PEMELIHARAAN_SARPRAS'
  | 'BARANG_JASA'
  | 'MODAL_MESIN'
  | 'KEGIATAN_PEMBELAJARAN'
  | 'ADMINISTRASI_KEGIATAN_SEKOLAH'
  | 'PENGEMBANGAN_PROFESI_GURU'
  | 'LANGGANAN_DAYA_DAN_JASA'
  | 'PENGEMBANGAN_PERPUSTAKAAN';

export interface BudgetComponent {
  id: string;
  schoolId: string;
  fiscalYear: number;
  fundSource?: FundSourceType; // BOSP_REGULER | BOSP_KINERJA | BOSP_AFIRMASI
  code: string; // e.g. "5.1.02.01", "5.2.02.01"
  name: string;
  mainType?: MainExpenditureType;
  category: BudgetComponentCategory;
  subComponent?: string;
  allocatedAmount: number;
  realizedAmount: number;
  remainingAmount: number;
  stage1Budget: number;
  stage2Budget: number;
  stage1Realized?: number;
  stage2Realized?: number;
  items?: BudgetItemDetail[];
  description?: string;
}

export interface ExpenditureCatalogItem {
  code: string;
  name: string;
  categoryTag: BudgetComponentCategory;
  defaultUnit: string;
}

export interface BudgetSubComponentConfig {
  id: string;
  code: string; // e.g. "5.1.02.18"
  name: string; // e.g. "Belanja Langganan Aplikasi & Platform Digital"
  mainType: MainExpenditureType;
  category: BudgetComponentCategory;
  description?: string;
  isCustom?: boolean;
  activeFiscalYear?: number;
  defaultItems?: {
    description: string;
    volume: number;
    unit: string;
    unitPrice: number;
    stage: '1' | '2' | 'BOTH';
  }[];
  createdAt?: string;
  createdBy?: string;
}

export interface ExpenditureGroup {
  mainType: MainExpenditureType;
  mainLabel: string;
  subCategories: ExpenditureCatalogItem[];
}

export const STANDARD_EXPENDITURE_CATALOG: ExpenditureGroup[] = [
  {
    mainType: 'BARANG_JASA',
    mainLabel: 'Belanja Barang dan Jasa',
    subCategories: [
      { code: '5.1.02.01', name: 'Belanja Honorarium', categoryTag: 'HONORARIUM', defaultUnit: 'Orang/Bulan' },
      { code: '5.1.02.02', name: 'Belanja Alat Tulis Kantor', categoryTag: 'BARANG_JASA', defaultUnit: 'Paket' },
      { code: '5.1.02.03', name: 'Belanja Benda Pos', categoryTag: 'BARANG_JASA', defaultUnit: 'Lembar' },
      { code: '5.1.02.04', name: 'Belanja Peralatan Kebersihan', categoryTag: 'BARANG_JASA', defaultUnit: 'Paket' },
      { code: '5.1.02.05', name: 'Belanja Alat alat Keterampilan', categoryTag: 'BARANG_JASA', defaultUnit: 'Set' },
      { code: '5.1.02.06', name: 'Belanja Alat Listrik', categoryTag: 'BARANG_JASA', defaultUnit: 'Buah' },
      { code: '5.1.02.07', name: 'Belanja Langganan Listrik', categoryTag: 'LANGGANAN_DAYA_DAN_JASA', defaultUnit: 'Bulan' },
      { code: '5.1.02.08', name: 'Belanja Langganan Internet', categoryTag: 'LANGGANAN_DAYA_DAN_JASA', defaultUnit: 'Bulan' },
      { code: '5.1.02.09', name: 'Belanja Retribusi Sampah', categoryTag: 'BARANG_JASA', defaultUnit: 'Bulan' },
      { code: '5.1.02.10', name: 'Belanja Pajak Bumi dan Bangunan', categoryTag: 'BARANG_JASA', defaultUnit: 'Tahun' },
      { code: '5.1.02.11', name: 'Belanja Cetak', categoryTag: 'BARANG_JASA', defaultUnit: 'Rim' },
      { code: '5.1.02.12', name: 'Belanja Penggandaan', categoryTag: 'BARANG_JASA', defaultUnit: 'Lembar' },
      { code: '5.1.02.13', name: 'Belanja Makan Minum', categoryTag: 'BARANG_JASA', defaultUnit: 'Kotak' },
      { code: '5.1.02.14', name: 'Belanja Perjalanan Dinas', categoryTag: 'ADMINISTRASI_KEGIATAN_SEKOLAH', defaultUnit: 'Orang/Kegiatan' },
      { code: '5.1.02.15', name: 'Belanja Pemeliharaan Peralatan Kantor', categoryTag: 'BARANG_JASA', defaultUnit: 'Unit' },
      { code: '5.1.02.16', name: 'Belanja Pemeliharaan Sarana Prasarana', categoryTag: 'PEMELIHARAAN_SARPRAS', defaultUnit: 'Paket' },
      { code: '5.1.02.17', name: 'Belanja Pelatihan / Diklat', categoryTag: 'PENGEMBANGAN_PROFESI_GURU', defaultUnit: 'Kegiatan' },
    ],
  },
  {
    mainType: 'MODAL_PERALATAN_MESIN',
    mainLabel: 'Belanja Modal Peralatan dan Mesin',
    subCategories: [
      { code: '5.2.02.01', name: 'Belanja Modal Komputer', categoryTag: 'MODAL_MESIN', defaultUnit: 'Unit' },
      { code: '5.2.02.02', name: 'Belanja Modal Peralatan Komputer', categoryTag: 'MODAL_MESIN', defaultUnit: 'Unit' },
      { code: '5.2.02.03', name: 'Belanja Modal Peralatan Keamanan Kantor', categoryTag: 'MODAL_MESIN', defaultUnit: 'Set' },
    ],
  },
  {
    mainType: 'MODAL_ASET_TETAP_LAINNYA',
    mainLabel: 'Belanja Modal Aset Tetap Lainnya',
    subCategories: [
      { code: '5.2.05.01', name: 'Belanja Buku Teks Umum', categoryTag: 'BUKU_DAN_MODAL', defaultUnit: 'Eksemplar' },
      { code: '5.2.05.02', name: 'Belanja Buku Teks Pendamping', categoryTag: 'BUKU_DAN_MODAL', defaultUnit: 'Eksemplar' },
      { code: '5.2.05.03', name: 'Belanja Buku lainnya', categoryTag: 'BUKU_DAN_MODAL', defaultUnit: 'Eksemplar' },
    ],
  },
];

export type TransactionType = 
  | 'PENERIMAAN' 
  | 'PENGELUARAN' 
  | 'PENGEMBALIAN' 
  | 'KOREKSI' 
  | 'PEMINDAHBUKUAN' 
  | 'PENYESUAIAN_SALDO';

export type PaymentMethod = 'BANK' | 'TUNAI';

export interface TransactionTaxDetail {
  taxType: 'PPN' | 'PPH21' | 'PPH22' | 'PPH23' | 'PPH4_2';
  rate: number; // in percent (e.g. 11, 1.5, 2)
  taxBase: number; // Dasar Pengenaan Pajak (DPP)
  taxAmount: number; // Nilai Pajak
  billingCode?: string; // Kode Billing Pajak
  ntpn?: string; // Nomor Transaksi Penerimaan Negara
  depositDate?: string;
  isDeposited: boolean;
  notes?: string;
}

export interface Transaction {
  id: string;
  schoolId: string;
  fiscalYear: number;
  transactionNumber: string; // Automatic, e.g. "TRX/2026/0001"
  date: string;
  type: TransactionType;
  description: string;
  budgetComponentId?: string; // RKAS Component reference
  recipientName: string; // Penyedia / Penerima
  recipientNpwp?: string;
  recipientIsPkp?: boolean;
  invoiceNumber?: string; // Nomor Bukti
  amount: number; // Nilai Transaksi
  paymentMethod: PaymentMethod;
  fundingSourceId?: string;
  notes?: string;
  proofDocumentUrl?: string; // Unggah bukti transaksi
  verificationStatus: 'Terverifikasi' | 'Menunggu' | 'Ditolak';
  verifiedBy?: string;
  verifiedAt?: string;
  hasTax: boolean;
  taxes: TransactionTaxDetail[];
  netAmount: number; // Amount after tax deductions (if applicable) or gross
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface LedgerEntry {
  id: string;
  schoolId: string;
  fiscalYear: number;
  date: string;
  transactionId: string;
  evidenceNumber: string;
  description: string;
  debit: number; // Penerimaan
  credit: number; // Pengeluaran
  balance: number; // Saldo Berjalan
  bookType: 'BKU' | 'BANK' | 'TUNAI' | 'PAJAK';
  category?: string;
  taxType?: string;
  createdAt: string;
}

export interface TaxRateConfig {
  id: string;
  code: string;
  name: string;
  rate: number; // Percentage
  threshold?: number; // Minimum transaction for applicability
  description: string;
  effectiveFrom: string;
  effectiveTo?: string;
  lawReference: string; // Dasar hukum, e.g., "PMK No. 59/PMK.03/2022"
  isActive: boolean;
}

export interface TaxDepositRecord {
  id: string;
  schoolId: string;
  fiscalYear: number;
  depositNumber: string;
  date: string;
  taxType: string;
  taxAmount: number;
  billingCode: string;
  ntpn: string;
  bankName: string;
  transactionIds: string[];
  depositProofUrl?: string;
  notes?: string;
  status: 'Lunas' | 'Menunggu Verifikasi';
  createdAt: string;
}

export interface BankStatementItem {
  id: string;
  schoolId?: string;
  date: string;
  description: string;
  reference: string;
  debit: number; // Bank Credit / Masuk
  credit: number; // Bank Debit / Keluar
  balance: number;
  matchedTransactionId?: string;
}

export interface ReconciliationRecord {
  id: string;
  schoolId: string;
  fiscalYear: number;
  periodMonth: number;
  periodYear: number;
  bookBalance: number; // Saldo menurut pembukuan
  bankBalance: number; // Saldo menurut rekening koran
  unrecordedTransactions: number; // Total transaksi belum tercatat
  unidentifiedTransactions: number; // Total transaksi belum teridentifikasi
  adjustments: number; // Penyesuaian
  finalDiscrepancy: number; // Selisih akhir
  reconciliationStatus: 'Cocok' | 'Terdapat Selisih' | 'Perlu Penyesuaian';
  notes: string;
  reconciledBy: string;
  reconciledAt: string;
  approvedByHeadmaster?: boolean;
}

export interface Receipt {
  id: string;
  schoolId: string;
  fiscalYear: number;
  receiptNumber: string; // e.g. "KWT/2026/0001"
  transactionId?: string;
  paidTo: string; // Sudah diterima dari (e.g. "Bendahara BOSP")
  recipientName: string; // Diberikan kepada (Penyedia / Pelaksana)
  amount: number;
  amountInWords: string; // Terbilang otomatis
  paymentFor: string; // Untuk pembayaran
  paymentDate: string;
  paymentMethod: PaymentMethod;
  fundingSource: string;
  budgetComponentCode: string;
  headmasterName: string;
  headmasterNip: string;
  treasurerName: string;
  treasurerNip: string;
  status: 'Diterbitkan' | 'Dibatalkan';
  createdAt: string;
}

export interface SPPDItem {
  id: string;
  schoolId: string;
  fiscalYear: number;
  letterNumber: string; // Nomor Surat Tugas
  sppdNumber: string; // Nomor SPPD
  travelerName: string;
  travelerNip: string;
  travelerPosition: string;
  travelerRank?: string; // Golongan / Pangkat
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  durationDays: number;
  transportMode: string;
  transportCost: number;
  lodgingCost: number;
  dailyAllowance: number;
  otherCosts: number;
  totalCost: number;
  budgetSource: string;
  assigningOfficial: string;
  assigningOfficialNip: string;
  reportSummary?: string;
  status: 'Draf' | 'Diterbitkan' | 'Selesai';
  createdAt: string;
}

export type LetterType = 
  | 'UNDANGAN'
  | 'TUGAS'
  | 'PERMOHONAN'
  | 'PEMBERITAHUAN'
  | 'PERNYATAAN'
  | 'PESANAN'
  | 'PENGANTAR'
  | 'KETERANGAN'
  | 'PERMINTAAN_PEMBAYARAN'
  | 'PERTANGGUNGJAWABAN'
  | 'PERNYATAAN_TANGGUNG_JAWAB'
  | 'PENGGUNAAN_DANA'
  | 'PENYELESAIAN_KEGIATAN';

export interface OfficialLetter {
  id: string;
  schoolId: string;
  fiscalYear: number;
  letterType: LetterType;
  letterNumber: string;
  date: string;
  subject: string;
  recipient: string;
  bodyContent: string;
  signatoryName: string;
  signatoryNip: string;
  signatoryPosition: string;
  status: 'Draf' | 'Final';
  createdAt: string;
}

export type MinutesType = 
  | 'PEMERIKSAAN_KAS'
  | 'REKONSILIASI'
  | 'SERAH_TERIMA'
  | 'PEMBAYARAN'
  | 'PENYELESAIAN_KEGIATAN'
  | 'PEMERIKSAAN_BARANG'
  | 'PERHITUNGAN_PAJAK'
  | 'PENUTUPAN_KAS'
  | 'KOREKSI_PEMBUKUAN';

export interface MinutesRecord {
  id: string;
  schoolId: string;
  fiscalYear: number;
  minutesType: MinutesType;
  minutesNumber: string;
  date: string;
  period: string;
  vendorName?: string;
  description: string;
  taxType?: string;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  totalPaid?: number;
  taxWithheld?: number;
  billingOrNtpn?: string;
  depositStatus?: string;
  conclusion: string;
  signatories: {
    role: string;
    name: string;
    nip?: string;
  }[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  isUrgent: boolean;
  targetRole: 'ALL' | 'BENDAHARA';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  userRole: UserRole;
  schoolId?: string;
  schoolName?: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AppSettings {
  appName: string;
  activeFiscalYear: number;
  googleAppsScriptUrl: string;
  isLiveSyncEnabled: boolean;
  lastSyncTimestamp?: string;
  dinasPendidikanName: string;
  dinasHeadName: string;
  dinasHeadNip: string;
  logoDinasUrl?: string;
  logoAppUrl?: string;
  driveFolderUrl?: string;
  backupIntervalDays: number;
  allowBendaharaEditProfile: boolean;
  googleSpreadsheetId?: string;
  googleSpreadsheetName?: string;
}
