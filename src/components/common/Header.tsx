import React, { useState, useEffect, useRef } from 'react';
import { User, School } from '../../types/index.ts';
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  PieChart,
  ArrowRightLeft,
  BookOpen,
  Receipt,
  FileText,
  Send,
  FileCheck,
  FileSignature,
  BarChart3,
  Building2,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { formatDriveImageUrl } from '../../utils/driveHelper.ts';

export interface SyncStatusInfo {
  isConfigured: boolean;
  isLiveSyncEnabled: boolean;
  lastSyncTimestamp: string | null;
  isSyncing: boolean;
}

interface HeaderProps {
  user: User;
  currentSchool?: School | null;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  onOpenGas?: () => void;
  onLogout: () => void;
  schools?: School[];
  onSelectSchool?: (schoolId: string) => void;
  syncStatus?: SyncStatusInfo;
  isRkasApproved?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentSchool,
  activeTab = 'dashboard',
  onNavigate,
  onLogout,
  isRkasApproved = false,
}) => {
  const isAdmin = user.role === 'ADMIN_DINAS';
  const [appLogo, setAppLogo] = useState<string>('');
  const [activeDropdown, setActiveDropdown] = useState<'perencanaan' | 'penatausahaan' | 'laporan' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.success && res.settings?.logoAppUrl) {
        setAppLogo(res.settings.logoAppUrl);
      }
    }).catch(() => {});
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logoSrc = formatDriveImageUrl(appLogo) || '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';

  const isPerencanaanActive = activeTab === 'budget';
  const isPenatausahaanActive = ['transactions', 'bookkeeping', 'tax', 'receipts', 'sppd'].includes(activeTab);
  const isLaporanActive = ['reconciliation', 'letters', 'minutes', 'reports'].includes(activeTab);

  const handleSubNavigate = (tabId: string) => {
    onNavigate?.(tabId);
    setActiveDropdown(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Logo & Label Aplikasi */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src={logoSrc}
            alt="SIPANDA BOSP"
            className="w-9 h-9 object-contain rounded-full shadow-xs border border-emerald-700/20"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg') {
                target.src = '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
              }
            }}
          />
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="text-left group focus:outline-none cursor-pointer"
          >
            <span className="text-lg font-extrabold text-[#0B5D3B] tracking-tight whitespace-nowrap block">
              SIPANDA BOSP
            </span>
          </button>
        </div>

        {/* Zone 2: Menu Bar Tombol (Perencanaan, Penatausahaan, Laporan, dll) */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-1.5 flex-1 justify-center relative">
          {/* Tombol Dashboard */}
          <button
            onClick={() => handleSubNavigate('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'text-slate-700 hover:text-[#0B5D3B] hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          {/* Tombol Menu Bar: Perencanaan */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'perencanaan' ? null : 'perencanaan')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isPerencanaanActive || activeDropdown === 'perencanaan'
                  ? 'bg-[#0B5D3B] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#0B5D3B] hover:bg-slate-100'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-amber-300" />
              <span>Perencanaan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                activeDropdown === 'perencanaan' ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Perencanaan */}
            {activeDropdown === 'perencanaan' && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Menu Perencanaan
                </p>
                <button
                  onClick={() => handleSubNavigate('budget')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'budget'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <PieChart className="w-4 h-4 text-[#0B5D3B]" />
                  <span>RKAS & Anggaran</span>
                </button>
              </div>
            )}
          </div>

          {/* Tombol Menu Bar: Penatausahaan */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'penatausahaan' ? null : 'penatausahaan')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isPenatausahaanActive || activeDropdown === 'penatausahaan'
                  ? 'bg-[#0B5D3B] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#0B5D3B] hover:bg-slate-100'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Penatausahaan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                activeDropdown === 'penatausahaan' ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Penatausahaan */}
            {activeDropdown === 'penatausahaan' && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Menu Penatausahaan</span>
                  {!isAdmin && !isRkasApproved && (
                    <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Terkunci</span>
                    </span>
                  )}
                </p>

                <button
                  onClick={() => handleSubNavigate('transactions')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'transactions'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowRightLeft className="w-4 h-4 text-[#0B5D3B]" />
                    <span>Transaksi Keuangan</span>
                  </div>
                  {!isAdmin && !isRkasApproved && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                </button>

                <button
                  onClick={() => handleSubNavigate('bookkeeping')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'bookkeeping'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#0B5D3B]" />
                    <span>Pembukuan Otomatis</span>
                  </div>
                  {!isAdmin && !isRkasApproved && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                </button>

                <button
                  onClick={() => handleSubNavigate('tax')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'tax'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-[#0B5D3B]" />
                    <span>Perpajakan BOSP</span>
                  </div>
                  {!isAdmin && !isRkasApproved && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                </button>

                {!isAdmin && (
                  <>
                    <button
                      onClick={() => handleSubNavigate('receipts')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeTab === 'receipts'
                          ? 'bg-emerald-50 text-[#0B5D3B]'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#0B5D3B]" />
                        <span>Generator Kuitansi</span>
                      </div>
                      {!isRkasApproved && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                    </button>

                    <button
                      onClick={() => handleSubNavigate('sppd')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeTab === 'sppd'
                          ? 'bg-emerald-50 text-[#0B5D3B]'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Send className="w-4 h-4 text-[#0B5D3B]" />
                        <span>Modul SPPD</span>
                      </div>
                      {!isRkasApproved && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tombol Menu Bar: Pelaporan & Dokumen */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'laporan' ? null : 'laporan')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLaporanActive || activeDropdown === 'laporan'
                  ? 'bg-[#0B5D3B] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#0B5D3B] hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Pelaporan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                activeDropdown === 'laporan' ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Pelaporan */}
            {activeDropdown === 'laporan' && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Menu Pelaporan & Dokumen
                </p>
                <button
                  onClick={() => handleSubNavigate('reconciliation')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'reconciliation'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-[#0B5D3B]" />
                  <span>Rekonsiliasi Bank</span>
                </button>

                {!isAdmin && (
                  <>
                    <button
                      onClick={() => handleSubNavigate('letters')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeTab === 'letters'
                          ? 'bg-emerald-50 text-[#0B5D3B]'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-[#0B5D3B]" />
                      <span>Surat Administrasi</span>
                    </button>

                    <button
                      onClick={() => handleSubNavigate('minutes')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeTab === 'minutes'
                          ? 'bg-emerald-50 text-[#0B5D3B]'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <FileSignature className="w-4 h-4 text-[#0B5D3B]" />
                      <span>Berita Acara</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleSubNavigate('reports')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'reports'
                      ? 'bg-emerald-50 text-[#0B5D3B]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-[#0B5D3B]" />
                  <span>Laporan Keuangan</span>
                </button>
              </div>
            )}
          </div>

          {/* Tombol Data Sekolah */}
          <button
            onClick={() => handleSubNavigate('schools')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'schools'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'text-slate-700 hover:text-[#0B5D3B] hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Data Sekolah</span>
          </button>
        </nav>

        {/* Zone 3: Profil Pengguna & Tombol Keluar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {user.role === 'ADMIN_DINAS' ? 'Admin Dinas Pendidikan' : currentSchool?.name || 'Bendahara Sekolah'}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            title="Keluar dari Aplikasi"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};

