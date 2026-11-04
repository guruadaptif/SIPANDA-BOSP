import {
  User,
  School,
  FiscalYear,
  BudgetPlan,
  BudgetComponent,
  Transaction,
  LedgerEntry,
  TaxRateConfig,
  TaxDepositRecord,
  ReconciliationRecord,
  Receipt,
  SPPDItem,
  OfficialLetter,
  MinutesRecord,
  Announcement,
  AuditLog,
  AppSettings,
  BudgetSubComponentConfig,
  FundSourceType,
  FundingSource,
} from '../types/index.ts';

const BASE_URL = '/api';

export const api = {
  // Auth
  async login(username: string, password: string):Promise<{ success: boolean; user?: User; school?: School; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async getUsers(): Promise<{ success: boolean; users: User[] }> {
    const res = await fetch(`${BASE_URL}/auth/users`);
    return res.json();
  },

  async createUser(data: Partial<User>): Promise<{ success: boolean; user?: User; message?: string }> {
    const res = await fetch(`${BASE_URL}/auth/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async registerSchool(data: any): Promise<{ success: boolean; message: string; school?: School; user?: User }> {
    const res = await fetch(`${BASE_URL}/auth/register-school`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Schools
  async getSchools(): Promise<{ success: boolean; schools: School[] }> {
    const res = await fetch(`${BASE_URL}/schools`);
    return res.json();
  },

  async getSchoolById(id: string): Promise<{ success: boolean; school: School }> {
    const res = await fetch(`${BASE_URL}/schools/${id}`);
    return res.json();
  },

  async updateSchool(id: string, data: Partial<School>): Promise<{ success: boolean; school: School }> {
    const res = await fetch(`${BASE_URL}/schools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateSchoolStatus(id: string, action: 'verify' | 'suspend' | 'activate', adminName?: string): Promise<{ success: boolean; school?: School; message?: string }> {
    const res = await fetch(`${BASE_URL}/schools/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminName }),
    });
    return res.json();
  },

  async deleteSchool(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/schools/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async createSchool(data: Partial<School>): Promise<{ success: boolean; school: School }> {
    const res = await fetch(`${BASE_URL}/schools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Fiscal Years & Funding Sources
  async getFiscalYears(): Promise<{ success: boolean; fiscalYears: FiscalYear[] }> {
    const res = await fetch(`${BASE_URL}/fiscal-years`);
    return res.json();
  },

  async createFiscalYear(data: { year: number; notes?: string; isActive?: boolean }): Promise<{ success: boolean; fiscalYear: FiscalYear; message: string }> {
    const res = await fetch(`${BASE_URL}/fiscal-years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getFundingSources(): Promise<{ success: boolean; fundingSources: FundingSource[] }> {
    const res = await fetch(`${BASE_URL}/funding-sources`);
    return res.json();
  },

  // Budget & RKAS (Support BOSP Reguler, Kinerja, Afirmasi)
  async getBudgetSummary(schoolId: string, fiscalYear: number, fundSource: FundSourceType = 'BOSP_REGULER'): Promise<{ success: boolean; plan: BudgetPlan; components: BudgetComponent[]; fundSource?: FundSourceType; fiscalYear?: number }> {
    const res = await fetch(`${BASE_URL}/budget/summary?schoolId=${schoolId}&fiscalYear=${fiscalYear}&fundSource=${fundSource}`);
    return res.json();
  },

  async validateBudgetRules(payload: { schoolStatus: string; totalPagu: number; components: Partial<BudgetComponent>[]; fundSource?: FundSourceType }) {
    try {
      const res = await fetch(`${BASE_URL}/budget/validate-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network issue on validateBudgetRules, computing locally:', err);
    }

    // Client-side local calculation fallback if network/server is unavailable
    const { schoolStatus = 'Negeri', totalPagu = 0, components = [], fundSource = 'BOSP_REGULER' } = payload || {};
    const compList = Array.isArray(components) ? components : [];
    const totalPaguNum = Number(totalPagu) || 0;

    const honorAlloc = compList
      .filter((c: any) => c && (c.category === 'HONORARIUM' || c.code === '5.1.02.01'))
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);
    const honorPct = totalPaguNum > 0 ? (honorAlloc / totalPaguNum) * 100 : 0;
    const maxHonorPct = schoolStatus === 'Negeri' ? 20 : 40;

    const bukuAlloc = compList
      .filter((c: any) =>
        c && (
          c.mainType === 'MODAL_ASET_TETAP_LAINNYA' ||
          c.category === 'BUKU_DAN_MODAL' ||
          ['5.2.05.01', '5.2.05.02', '5.2.05.03'].includes(c.code)
        )
      )
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);
    const bukuPct = totalPaguNum > 0 ? (bukuAlloc / totalPaguNum) * 100 : 0;

    const sarprasAlloc = compList
      .filter((c: any) => c && (c.category === 'PEMELIHARAAN_SARPRAS' || c.code === '5.1.02.16'))
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);
    const sarprasPct = totalPaguNum > 0 ? (sarprasAlloc / totalPaguNum) * 100 : 0;

    const violations: string[] = [];
    if (fundSource === 'BOSP_REGULER') {
      if (honorPct > maxHonorPct) {
        violations.push(`[BOSP Reguler] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) melebihi batas maksimal ${maxHonorPct}% untuk Satuan Pendidikan ${schoolStatus}!`);
      }
      if (bukuPct < 10) {
        violations.push(`[BOSP Reguler] Alokasi Belanja Modal Buku (${bukuPct.toFixed(1)}%) kurang dari batas minimal 10% dari Total Pagu BOSP!`);
      }
      if (sarprasPct > 20) {
        violations.push(`[BOSP Reguler] Alokasi Pemeliharaan Sarana Prasarana (${sarprasPct.toFixed(1)}%) melebihi batas maksimal 20% dari Total Pagu BOSP!`);
      }
    } else if (fundSource === 'BOSP_KINERJA') {
      if (honorPct > 30) {
        violations.push(`[BOSP Kinerja] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) disarankan tidak melebihi 30% dari Total Pagu Kinerja.`);
      }
    } else if (fundSource === 'BOSP_AFIRMASI') {
      if (honorPct > 30) {
        violations.push(`[BOSP Afirmasi] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) disarankan tidak melebihi 30% dari Total Pagu Afirmasi.`);
      }
    }

    return {
      success: true,
      isValid: violations.length === 0,
      violations,
      honorAlloc,
      honorPct,
      maxHonorPct,
      bukuAlloc,
      bukuPct,
      sarprasAlloc,
      sarprasPct,
      fundSource,
    };
  },

  async getBudgetRecap(fiscalYear?: number, fundSource?: string): Promise<{
    success: boolean;
    fiscalYear: number;
    fundSource: string;
    recap: Array<{
      schoolId: string;
      schoolName: string;
      npsn: string;
      level: string;
      status: string;
      district: string;
      subdistrict: string;
      province: string;
      fiscalYear: number;
      fundSource: string;
      planId: string | null;
      totalPagu: number;
      stage1Allocation: number;
      stage2Allocation: number;
      totalAllocatedFromComponents: number;
      stage1BudgetFromComponents: number;
      stage2BudgetFromComponents: number;
      realizedAmount: number;
      stage1Realized: number;
      stage2Realized: number;
      remainingAmount: number;
      statusRkas: 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Revisi';
      approvedAt: string | null;
      approvedBy: string | null;
      notes: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (fiscalYear) params.append('fiscalYear', String(fiscalYear));
    if (fundSource) params.append('fundSource', fundSource);
    const res = await fetch(`${BASE_URL}/budget/recap?${params.toString()}`);
    return res.json();
  },

  async updateBudgetStatus(payload: {
    schoolId: string;
    fiscalYear: number;
    fundSource?: string;
    status: 'Draft' | 'Diajukan' | 'Disetujui' | 'Ditolak' | 'Revisi';
    notes?: string;
    adminName?: string;
  }): Promise<{ success: boolean; message: string; plan?: Partial<BudgetPlan> }> {
    const res = await fetch(`${BASE_URL}/budget/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async saveBudget(payload: { plan: Partial<BudgetPlan>; components: Partial<BudgetComponent>[] }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/budget/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          return JSON.parse(errorText);
        } catch {
          return { success: false, message: `Server error: ${res.status} ${res.statusText}` };
        }
      }
      return await res.json();
    } catch (err: any) {
      console.error('saveBudget fetch error:', err);
      return { success: false, message: err.message || 'Koneksi ke server terputus saat menyimpan anggaran.' };
    }
  },

  // Juknis BOSP & Master Sub-Rincian Configuration
  async getMasterSubComponents(): Promise<{ success: boolean; subComponents: BudgetSubComponentConfig[] }> {
    const res = await fetch(`${BASE_URL}/config/budget-subcomponents`);
    return res.json();
  },

  async addCustomSubComponent(payload: Partial<BudgetSubComponentConfig> & { adminName?: string }): Promise<{ success: boolean; subComponent?: BudgetSubComponentConfig; message: string }> {
    const res = await fetch(`${BASE_URL}/config/budget-subcomponents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateCustomSubComponent(code: string, payload: { name?: string; description?: string; adminName?: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/config/budget-subcomponents/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async deleteCustomSubComponent(code: string, adminName?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/config/budget-subcomponents/${code}?adminName=${encodeURIComponent(adminName || 'Admin Dinas')}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Transactions
  async getTransactions(params: {
    schoolId?: string;
    fiscalYear?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    method?: string;
  }): Promise<{ success: boolean; transactions: Transaction[] }> {
    const q = new URLSearchParams();
    if (params.schoolId) q.append('schoolId', params.schoolId);
    if (params.fiscalYear) q.append('fiscalYear', String(params.fiscalYear));
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.type) q.append('type', params.type);
    if (params.method) q.append('method', params.method);

    const res = await fetch(`${BASE_URL}/transactions?${q.toString()}`);
    return res.json();
  },

  async createTransaction(data: Partial<Transaction>): Promise<{ success: boolean; transaction: Transaction }> {
    const res = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<{ success: boolean; transaction: Transaction }> {
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTransaction(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/transactions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Ledgers (BKU, Bank, Tunai, Pajak)
  async getLedgers(schoolId: string, fiscalYear: number, bookType: 'BKU' | 'BANK' | 'TUNAI' | 'PAJAK'): Promise<{
    success: boolean;
    entries: LedgerEntry[];
    totalDebit: number;
    totalCredit: number;
    finalBalance: number;
  }> {
    const res = await fetch(`${BASE_URL}/ledgers?schoolId=${schoolId}&fiscalYear=${fiscalYear}&bookType=${bookType}`);
    return res.json();
  },

  // Tax
  async getTaxRates(): Promise<{ success: boolean; taxRates: TaxRateConfig[] }> {
    const res = await fetch(`${BASE_URL}/taxes/config`);
    return res.json();
  },

  async getTaxRecap(schoolId: string, fiscalYear: number): Promise<{
    success: boolean;
    taxEntries: LedgerEntry[];
    summary: Record<string, { collected: number; deposited: number; unpaid: number }>;
  }> {
    const res = await fetch(`${BASE_URL}/taxes/recap?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async depositTax(payload: {
    schoolId: string;
    fiscalYear: number;
    taxType: string;
    taxAmount: number;
    billingCode: string;
    ntpn: string;
    bankName?: string;
    transactionIds?: string[];
  }): Promise<{ success: boolean; deposit: TaxDepositRecord }> {
    const res = await fetch(`${BASE_URL}/taxes/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Reconciliation
  async getReconciliations(schoolId: string, fiscalYear: number): Promise<{
    success: boolean;
    reconciliations: ReconciliationRecord[];
    bankStatements: any[];
  }> {
    const res = await fetch(`${BASE_URL}/reconciliation?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async saveReconciliation(data: Partial<ReconciliationRecord>): Promise<{ success: boolean; reconciliation: ReconciliationRecord }> {
    const res = await fetch(`${BASE_URL}/reconciliation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Receipts (Kuitansi)
  async getReceipts(schoolId: string, fiscalYear: number): Promise<{ success: boolean; receipts: Receipt[] }> {
    const res = await fetch(`${BASE_URL}/receipts?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async createReceipt(data: Partial<Receipt>): Promise<{ success: boolean; receipt: Receipt }> {
    const res = await fetch(`${BASE_URL}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // SPPD
  async getSPPD(schoolId: string, fiscalYear: number): Promise<{ success: boolean; sppd: SPPDItem[] }> {
    const res = await fetch(`${BASE_URL}/sppd?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async createSPPD(data: Partial<SPPDItem>): Promise<{ success: boolean; sppd: SPPDItem }> {
    const res = await fetch(`${BASE_URL}/sppd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Letters (Surat)
  async getLetters(schoolId: string, fiscalYear: number): Promise<{ success: boolean; letters: OfficialLetter[] }> {
    const res = await fetch(`${BASE_URL}/letters?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async createLetter(data: Partial<OfficialLetter>): Promise<{ success: boolean; letter: OfficialLetter }> {
    const res = await fetch(`${BASE_URL}/letters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Minutes (Berita Acara)
  async getMinutes(schoolId: string, fiscalYear: number): Promise<{ success: boolean; minutes: MinutesRecord[] }> {
    const res = await fetch(`${BASE_URL}/minutes?schoolId=${schoolId}&fiscalYear=${fiscalYear}`);
    return res.json();
  },

  async createMinutes(data: Partial<MinutesRecord>): Promise<{ success: boolean; minutes: MinutesRecord }> {
    const res = await fetch(`${BASE_URL}/minutes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Dinas Overview
  async getDinasOverview(): Promise<{
    success: boolean;
    totalSchools: number;
    activeSchools: number;
    totalPagu: number;
    totalDiterima: number;
    totalRealisasi: number;
    totalBalance: number;
    totalTaxRecorded: number;
    overallPercentage: number;
    completedCount: number;
    pendingCount: number;
    schools: any[];
  }> {
    const res = await fetch(`${BASE_URL}/dinas/overview`);
    return res.json();
  },

  // Google Apps Script & Synchronization
  async getGasScript(): Promise<{ success: boolean; scriptCode: string; instructions: string[] }> {
    const res = await fetch(`${BASE_URL}/gas/script`);
    return res.json();
  },

  async getGasDiagnostics(): Promise<{
    success: boolean;
    structureCompliant: boolean;
    totalRequiredSheets: number;
    sheets: Record<string, { columnCount: number; localCount: number; columns: string[] }>;
    configuration: {
      googleSpreadsheetId: string;
      googleAppsScriptUrl: string;
      isLiveSyncEnabled: boolean;
      isConfigured: boolean;
      isValidFormat: boolean;
      lastSyncTimestamp: string | null;
      totalLocalRecords: number;
    };
    syncStatus: {
      isSynchronized: boolean;
      statusText: string;
    };
    structuralChecks: { name: string; passed: boolean; detail: string }[];
  }> {
    const res = await fetch(`${BASE_URL}/gas/diagnostics`);
    return res.json();
  },

  async testGasHandshake(gasUrl?: string): Promise<{
    success: boolean;
    status: string;
    isHtml?: boolean;
    message: string;
    latencyMs?: number;
    documentationUrl?: string;
    steps?: string[];
  }> {
    const res = await fetch(`${BASE_URL}/gas/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl }),
    });
    return res.json();
  },

  async testGasConnection(gasUrl?: string): Promise<{
    success: boolean;
    status: string;
    message: string;
    latencyMs?: number;
    spreadsheetName?: string;
    spreadsheetId?: string;
    totalSheetsFound?: number;
    sheets?: Record<string, any>;
  }> {
    const res = await fetch(`${BASE_URL}/gas/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl }),
    });
    return res.json();
  },

  async syncGasData(gasUrl?: string): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    lastSyncTimestamp?: string;
  }> {
    const res = await fetch(`${BASE_URL}/gas/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl }),
    });
    return res.json();
  },

  async recycleGasDatabase(gasUrl?: string): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    spreadsheetId?: string;
  }> {
    const res = await fetch(`${BASE_URL}/gas/recycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl }),
    });
    return res.json();
  },

  async pullGasPasswords(gasUrl?: string): Promise<{
    success: boolean;
    message: string;
    updatedUsersCount?: number;
  }> {
    const res = await fetch(`${BASE_URL}/gas/pull-passwords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gasUrl }),
    });
    return res.json();
  },

  // Settings & System
  async getSettings(): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch(`${BASE_URL}/settings`);
    return res.json();
  },

  async updateSettings(data: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/audit-logs`);
    return res.json();
  },

  async getAnnouncements(): Promise<{ success: boolean; announcements: Announcement[] }> {
    const res = await fetch(`${BASE_URL}/announcements`);
    return res.json();
  },

  async createAnnouncement(data: Partial<Announcement>): Promise<{ success: boolean; announcement: Announcement }> {
    const res = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/database/reset`, { method: 'POST' });
    return res.json();
  },
};
