import React, { useState, useEffect } from 'react';
import { User, School, Transaction } from './types/index.ts';
import { api } from './services/api.ts';
import { Header } from './components/common/Header.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { AdminDinasDashboard } from './components/dashboard/AdminDinasDashboard.tsx';
import { BendaharaDashboard } from './components/dashboard/BendaharaDashboard.tsx';
import { SchoolManagement } from './components/schools/SchoolManagement.tsx';
import { BudgetManagement } from './components/budget/BudgetManagement.tsx';
import { TransactionManagement } from './components/transactions/TransactionManagement.tsx';
import { BookkeepingView } from './components/bookkeeping/BookkeepingView.tsx';
import { TaxManagement } from './components/tax/TaxManagement.tsx';
import { ReconciliationView } from './components/reconciliation/ReconciliationView.tsx';
import { ReceiptGenerator } from './components/documents/ReceiptGenerator.tsx';
import { SPPDGenerator } from './components/documents/SPPDGenerator.tsx';
import { LetterGenerator } from './components/documents/LetterGenerator.tsx';
import { MinutesGenerator } from './components/documents/MinutesGenerator.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { AuditLogView } from './components/admin/AuditLogView.tsx';
import { BudgetConfigView } from './components/admin/BudgetConfigView.tsx';
import { SystemSettingsView } from './components/admin/SystemSettingsView.tsx';
import { GoogleAppsScriptModal } from './components/gas/GoogleAppsScriptModal.tsx';
import { Building2, Lock, PieChart, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // RKAS Approval Summary State (Enforces feature gating for Bendahara)
  const [rkasSummary, setRkasSummary] = useState<{
    status: string;
    notes?: string;
    isApproved: boolean;
    isLoading: boolean;
  }>({
    status: 'Draft',
    notes: '',
    isApproved: false,
    isLoading: false,
  });

  // Modals
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);
  const [selectedTrxForReceipt, setSelectedTrxForReceipt] = useState<Transaction | null>(null);

  // Sync status state for Header indicator
  const [syncStatus, setSyncStatus] = useState<{
    isConfigured: boolean;
    isLiveSyncEnabled: boolean;
    lastSyncTimestamp: string | null;
    isSyncing: boolean;
  }>({
    isConfigured: false,
    isLiveSyncEnabled: false,
    lastSyncTimestamp: null,
    isSyncing: false,
  });

  const checkRkasStatus = async (schoolId?: string) => {
    const sId = schoolId || currentSchool?.id;
    if (!sId) return;
    setRkasSummary((prev) => ({ ...prev, isLoading: true }));
    try {
      const year = currentSchool?.activeFiscalYear || 2026;
      const res = await api.getBudgetSummary(sId, year, 'BOSP_REGULER');
      if (res && res.success && res.plan) {
        const status = res.plan.status || 'Draft';
        setRkasSummary({
          status,
          notes: res.plan.notes || '',
          isApproved: status === 'Disetujui',
          isLoading: false,
        });
      } else {
        setRkasSummary({
          status: 'Draft',
          notes: '',
          isApproved: false,
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch RKAS status in App:', err);
      setRkasSummary((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const checkSyncStatus = async () => {
    try {
      const diagRes = await api.getGasDiagnostics();
      if (diagRes.success && diagRes.configuration) {
        setSyncStatus((prev) => ({
          ...prev,
          isConfigured: Boolean(diagRes.configuration.isConfigured),
          isLiveSyncEnabled: Boolean(diagRes.configuration.isLiveSyncEnabled),
          lastSyncTimestamp: diagRes.configuration.lastSyncTimestamp || null,
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch sync status:', err);
    }
  };

  // Load all schools and check sync status on mount
  useEffect(() => {
    loadSchools();
    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 15000); // Background sync status poll
    return () => clearInterval(interval);
  }, []);

  // Fetch RKAS status whenever user, school, or tab changes
  useEffect(() => {
    if (currentUser && currentSchool) {
      checkRkasStatus();
    }
  }, [currentUser?.id, currentSchool?.id, activeTab]);

  const loadSchools = async () => {
    try {
      const res = await api.getSchools();
      if (res.success && res.schools.length > 0) {
        setSchools(res.schools);
        if (!currentSchool) {
          setCurrentSchool(res.schools[0]);
          checkRkasStatus(res.schools[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading schools:', err);
    }
  };

  const handleLoginSuccess = (user: User, school?: School | null) => {
    setCurrentUser(user);
    if (school) {
      setCurrentSchool(school);
      checkRkasStatus(school.id);
    } else if (schools.length > 0) {
      setCurrentSchool(schools[0]);
      checkRkasStatus(schools[0].id);
    }
    setActiveTab('dashboard');
    checkSyncStatus();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleSelectSchool = (schoolId: string) => {
    const s = schools.find((sc) => sc.id === schoolId);
    if (s) {
      setCurrentSchool(s);
      checkRkasStatus(s.id);
    }
  };

  const handleOpenReceiptFromTrx = (trx: Transaction) => {
    setSelectedTrxForReceipt(trx);
    setActiveTab('receipts');
  };

  // If user is not logged in, show Login Portal
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'ADMIN_DINAS';
  const effectiveSchool = currentSchool || (schools.length > 0 ? schools[0] : null);

  const TRANSACTION_MODULES = [
    'transactions',
    'bookkeeping',
    'tax',
    'reconciliation',
    'receipts',
    'sppd',
    'letters',
    'minutes',
    'reports',
  ];
  const isTransactionTabLocked = !isAdmin && TRANSACTION_MODULES.includes(activeTab) && !rkasSummary.isApproved;

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header (Strict Top Bar Contract with Sync Status) */}
      <Header
        user={currentUser}
        currentSchool={effectiveSchool}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onOpenGas={() => setIsGasModalOpen(true)}
        onLogout={handleLogout}
        schools={schools}
        onSelectSchool={handleSelectSchool}
        syncStatus={syncStatus}
        isRkasApproved={rkasSummary.isApproved}
      />

      {/* 2. Main Body with Sidebar Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          user={currentUser}
          currentSchool={effectiveSchool}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onOpenGas={() => setIsGasModalOpen(true)}
          schools={schools}
          onSelectSchool={handleSelectSchool}
          isRkasApproved={rkasSummary.isApproved}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {/* View Routing */}
          {activeTab === 'dashboard' && (
            isAdmin ? (
              <AdminDinasDashboard
                onSelectSchool={handleSelectSchool}
                onNavigate={setActiveTab}
              />
            ) : effectiveSchool ? (
              <BendaharaDashboard
                school={effectiveSchool}
                user={currentUser}
                onNavigate={setActiveTab}
              />
            ) : null
          )}

          {activeTab === 'schools' && (
            <SchoolManagement
              user={currentUser}
              currentSchool={effectiveSchool}
              onRefreshSchool={loadSchools}
            />
          )}

          {/* Modules requiring school context */}
          {!effectiveSchool && activeTab !== 'dashboard' && activeTab !== 'schools' && activeTab !== 'budget-config' && activeTab !== 'audit' && activeTab !== 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-8 space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-emerald-50 text-[#0B5D3B] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Belum Ada Data Satuan Pendidikan Terdaftar
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sistem saat ini beroperasi dengan data asli yang diinput (tanpa data dummy). Silakan daftarkan atau tambahkan satuan pendidikan terlebih dahulu melalui menu Kelola Sekolah.
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('schools')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Buka Menu Kelola Sekolah & Tambah Data</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'budget' && effectiveSchool && (
            <BudgetManagement
              school={effectiveSchool}
              user={currentUser}
              schools={schools}
              onSelectSchool={handleSelectSchool}
              onRefreshRkasStatus={() => checkRkasStatus(effectiveSchool?.id)}
            />
          )}

          {/* Locked Module Guard Banner for Bendahara when RKAS is not approved */}
          {isTransactionTabLocked && effectiveSchool && (
            <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center max-w-2xl mx-auto my-8 shadow-xs space-y-5">
              <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Status RKAS: {rkasSummary.status === 'Diajukan' ? '⏱ Menunggu Persetujuan Admin Dinas' : rkasSummary.status === 'Revisi' ? '✕ Perlu Revisi Sekolah' : '✎ Draf Sekolah (Belum Disahkan)'}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900">
                  Akses Fitur Penatausahaan & Transaksi Dikunci
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Sesuai dengan Regulasi Juknis BOSP, seluruh modul operasional penatausahaan transaksi (<strong>Buku Kas Umum, Pembayaran Transaksi, Pajak BOSP, Rekonsiliasi Bank, Kuitansi, SPPD, Berita Acara,</strong> dan <strong>Laporan Keuangan</strong>) baru dapat digunakan setelah RKAS Satuan Pendidikan <strong>{effectiveSchool.name}</strong> diajukan dan disahkan secara resmi oleh Admin Dinas Pendidikan.
                </p>
              </div>

              {rkasSummary.status === 'Revisi' && rkasSummary.notes && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 text-left font-medium space-y-1">
                  <strong className="block text-red-950 font-bold">Catatan Catatan Revisi dari Admin Dinas:</strong>
                  <p className="text-slate-800 font-mono text-[11px] bg-white p-2 rounded border border-red-200">
                    "{rkasSummary.notes}"
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('budget')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <PieChart className="w-4 h-4 text-amber-300" />
                  <span>Buka Menu Perencanaan RKAS</span>
                </button>
              </div>
            </div>
          )}

          {!isTransactionTabLocked && activeTab === 'transactions' && effectiveSchool && (
            <TransactionManagement
              school={effectiveSchool}
              user={currentUser}
              onOpenReceiptModal={handleOpenReceiptFromTrx}
            />
          )}

          {!isTransactionTabLocked && activeTab === 'bookkeeping' && effectiveSchool && (
            <BookkeepingView school={effectiveSchool} user={currentUser} />
          )}

          {!isTransactionTabLocked && activeTab === 'tax' && effectiveSchool && (
            <TaxManagement school={effectiveSchool} user={currentUser} />
          )}

          {!isTransactionTabLocked && activeTab === 'reconciliation' && effectiveSchool && (
            <ReconciliationView school={effectiveSchool} />
          )}

          {!isTransactionTabLocked && !isAdmin && activeTab === 'receipts' && effectiveSchool && (
            <ReceiptGenerator
              school={effectiveSchool}
              selectedTransaction={selectedTrxForReceipt}
            />
          )}

          {!isTransactionTabLocked && !isAdmin && activeTab === 'sppd' && effectiveSchool && (
            <SPPDGenerator school={effectiveSchool} />
          )}

          {!isTransactionTabLocked && !isAdmin && activeTab === 'letters' && effectiveSchool && (
            <LetterGenerator school={effectiveSchool} />
          )}

          {!isTransactionTabLocked && !isAdmin && activeTab === 'minutes' && effectiveSchool && (
            <MinutesGenerator school={effectiveSchool} />
          )}

          {!isTransactionTabLocked && activeTab === 'reports' && effectiveSchool && (
            <ReportsView school={effectiveSchool} />
          )}

          {activeTab === 'budget-config' && isAdmin && (
            <BudgetConfigView user={currentUser} onRefresh={loadSchools} />
          )}

          {activeTab === 'audit' && (
            <AuditLogView user={currentUser} />
          )}

          {activeTab === 'settings' && (
            <SystemSettingsView user={currentUser} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <GoogleAppsScriptModal
        isOpen={isGasModalOpen}
        onClose={() => {
          setIsGasModalOpen(false);
          checkSyncStatus();
        }}
        onSyncComplete={checkSyncStatus}
      />
    </div>
  );
}
