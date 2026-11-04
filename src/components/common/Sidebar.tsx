import React, { useState } from 'react';
import { User, School } from '../../types/index.ts';
import {
  LayoutDashboard,
  Building2,
  PieChart,
  ArrowRightLeft,
  BookOpen,
  Receipt,
  FileCheck,
  Send,
  FileText,
  FileSignature,
  BarChart3,
  ShieldAlert,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  user: User;
  currentSchool?: School | null;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenGas: () => void;
  schools?: School[];
  onSelectSchool?: (schoolId: string) => void;
  isRkasApproved?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentSchool,
  activeTab,
  onNavigate,
  onOpenGas,
  schools,
  onSelectSchool,
  isRkasApproved = false,
}) => {
  const isAdmin = user.role === 'ADMIN_DINAS';

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sipanda_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sipanda_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navSections = [
    {
      title: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
        { id: 'schools', label: 'Data Sekolah', icon: Building2 },
      ],
    },
    {
      title: 'PERENCANAAN',
      items: [
        { id: 'budget', label: 'RKAS & Anggaran', icon: PieChart },
      ],
    },
    {
      title: 'PENATAUSAHAAN',
      items: [
        { id: 'transactions', label: 'Transaksi Keuangan', icon: ArrowRightLeft },
        { id: 'bookkeeping', label: 'Pembukuan Otomatis', icon: BookOpen },
        { id: 'tax', label: 'Perpajakan BOSP', icon: Receipt },
        ...(!isAdmin
          ? [
              { id: 'receipts', label: 'Generator Kuitansi', icon: FileText },
              { id: 'sppd', label: 'Modul SPPD', icon: Send },
            ]
          : []),
      ],
    },
    {
      title: 'PELAPORAN & DOKUMEN',
      items: [
        { id: 'reconciliation', label: 'Rekonsiliasi Bank', icon: FileCheck },
        ...(!isAdmin
          ? [
              { id: 'letters', label: 'Surat Administrasi', icon: FileText },
              { id: 'minutes', label: 'Berita Acara', icon: FileSignature },
            ]
          : []),
        { id: 'reports', label: 'Laporan Keuangan', icon: BarChart3 },
      ],
    },
    {
      title: 'ADMINISTRASI & SISTEM',
      items: [
        ...(isAdmin
          ? [
              { id: 'budget-config', label: 'Konfigurasi Juknis BOSP', icon: Sliders },
              { id: 'audit', label: 'Audit Log & Keamanan', icon: ShieldAlert },
            ]
          : []),
        { id: 'settings', label: 'Pengaturan Sistem', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-18' : 'w-64'
      } bg-white border-r border-slate-200 flex flex-col shrink-0 no-print min-h-[calc(100vh-4rem)] transition-all duration-200 ease-in-out relative select-none`}
    >
      {/* School Card Context & Collapse Toggle */}
      <div className="p-3 border-b border-slate-100 bg-[#F4F6F8]">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={isAdmin ? 'Dinas Pendidikan' : currentSchool?.name || 'Sekolah'}
              className="w-10 h-10 rounded-xl bg-[#0B5D3B] text-white flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer hover:bg-[#16865A] transition-colors"
              onClick={toggleCollapse}
            >
              {isAdmin ? 'DIS' : currentSchool?.level || 'SD'}
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Buka / Rentangkan Menu Samping"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-[#0B5D3B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {isAdmin ? 'DIS' : currentSchool?.level || 'SD'}
              </div>
              <div className="min-w-0 flex-1">
                {isAdmin && schools && schools.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Dinas Pendidikan
                    </p>
                    <select
                      aria-label="Pilih Satuan Pendidikan"
                      value={currentSchool?.id || ''}
                      onChange={(e) => onSelectSchool?.(e.target.value)}
                      className="text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] cursor-pointer truncate"
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {isAdmin ? 'Dinas Pendidikan' : currentSchool?.name || 'Sekolah'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {isAdmin ? 'Pusat Manajemen' : `NPSN: ${currentSchool?.npsn || '-'}`}
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              title="Susutkan / Ciutkan Bar Sebelah Kiri"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List grouped by Section */}
      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isTransactionModule = [
                'transactions',
                'bookkeeping',
                'tax',
                'reconciliation',
                'receipts',
                'sppd',
                'letters',
                'minutes',
                'reports',
              ].includes(item.id);
              const isItemLocked = !isAdmin && isTransactionModule && !isRkasApproved;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={
                    isCollapsed
                      ? isItemLocked
                        ? `${item.label} (Dikunci - Membutuhkan Pengesahan RKAS)`
                        : item.label
                      : undefined
                  }
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                  } rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0B5D3B] text-white shadow-xs font-semibold'
                      : isItemLocked
                      ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-300' : isItemLocked ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left flex items-center justify-between gap-1">
                      <span className="truncate">{item.label}</span>
                      {isItemLocked && (
                        <span title="Dikunci - Membutuhkan Pengesahan RKAS Dinas">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Integrations Widget */}
      <div className="p-2 border-t border-slate-200 bg-slate-50">
        {isCollapsed ? (
          <div className="flex flex-col items-center py-1">
            <button
              onClick={onOpenGas}
              title="Google Spreadsheet Database (28 Sheet)"
              className="w-10 h-10 flex items-center justify-center text-[#0B5D3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenGas}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0B5D3B]" />
              <span>Google Spreadsheet</span>
            </div>
            <span className="text-[10px] bg-emerald-200 text-[#0B5D3B] px-1.5 py-0.5 rounded font-mono">
              28 Sheet
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
