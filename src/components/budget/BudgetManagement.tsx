import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  BudgetPlan,
  BudgetComponent,
  BudgetItemDetail,
  MainExpenditureType,
  User,
  FundSourceType,
  MASTER_FUND_SOURCES,
  FiscalYear,
} from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatRupiah } from '../../utils/terbilang.ts';
import { exportBudgetRealizationToExcel } from '../../utils/excelExport.ts';
import {
  PieChart,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Calendar,
  Filter,
  Check,
  Package,
  Cpu,
  BookOpen,
  Printer,
  Building2,
  Search,
  X,
  MapPin,
  RotateCcw,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { RkasPdfModal } from './RkasPdfModal.tsx';
import { PROVINSI_LIST, getKecamatanOptions, getKabupatenOptions } from '../../data/indonesiaRegions.ts';

interface BudgetManagementProps {
  school: School;
  user?: User | null;
  schools?: School[];
  onSelectSchool?: (schoolId: string) => void;
  onRefreshRkasStatus?: () => void;
}

export type StageFilter = 'GABUNGAN' | 'TAHAP_1' | 'TAHAP_2';

export const BudgetManagement: React.FC<BudgetManagementProps> = ({
  school,
  user,
  schools = [],
  onSelectSchool,
  onRefreshRkasStatus,
}) => {
  const isAdmin = user?.role === 'ADMIN_DINAS';
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(school.id);
  const [adminViewMode, setAdminViewMode] = useState<'RECAP' | 'DETAIL'>(isAdmin ? 'RECAP' : 'DETAIL');

  // Keep selectedSchoolId in sync if parent school changes
  useEffect(() => {
    if (school.id) {
      setSelectedSchoolId(school.id);
    }
  }, [school.id]);

  // Active school being inspected
  const activeSchool: School = useMemo(() => {
    if (isAdmin && selectedSchoolId && schools.length > 0) {
      const found = schools.find((s) => s.id === selectedSchoolId);
      if (found) return found;
    }
    return school;
  }, [isAdmin, selectedSchoolId, schools, school]);

  // Admin Search & Filter States
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>('');
  const [filterProvinsi, setFilterProvinsi] = useState<string>('ALL');
  const [filterKabupaten, setFilterKabupaten] = useState<string>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('ALL');

  // Standard list of 38 Indonesian Provinces + any registered ones
  const availableProvinsi = useMemo(() => {
    const list = [...PROVINSI_LIST];
    schools.forEach((s) => {
      const p = s.province?.trim();
      if (p && !list.includes(p)) list.push(p);
    });
    return list;
  }, [schools]);

  // Standard list of Kabupaten / Kota filtered by chosen province + custom inputs
  const availableKabupaten = useMemo(() => {
    const extraDistricts = schools.map((s) => s.district || '').filter(Boolean);
    return getKabupatenOptions(filterProvinsi, extraDistricts);
  }, [filterProvinsi, schools]);

  // Standard list of Kecamatan filtered by chosen province + custom inputs
  const availableKecamatan = useMemo(() => {
    const extraSubs = schools.map((s) => s.subdistrict || '').filter(Boolean);
    return getKecamatanOptions(filterProvinsi, extraSubs);
  }, [filterProvinsi, schools]);

  // Filtered schools based on search query, kabupaten, kecamatan, and propinsi
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const query = schoolSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.npsn.toLowerCase().includes(query);

      const matchesProvinsi =
        filterProvinsi === 'ALL' ||
        (s.province && s.province.toLowerCase() === filterProvinsi.toLowerCase());

      const matchesKabupaten =
        filterKabupaten === 'ALL' ||
        (s.district && s.district.toLowerCase() === filterKabupaten.toLowerCase());

      const matchesKecamatan =
        filterKecamatan === 'ALL' ||
        (s.subdistrict && s.subdistrict.toLowerCase() === filterKecamatan.toLowerCase());

      return matchesSearch && matchesProvinsi && matchesKabupaten && matchesKecamatan;
    });
  }, [schools, schoolSearchQuery, filterProvinsi, filterKabupaten, filterKecamatan]);

  const handleAdminSelectSchool = (newSchoolId: string) => {
    setSelectedSchoolId(newSchoolId);
    onSelectSchool?.(newSchoolId);
  };

  // Penentuan Tahun Pengerjaan & Sumber Anggaran (Reguler, Kinerja, Afirmasi)
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(activeSchool.activeFiscalYear || 2026);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [selectedFundSource, setSelectedFundSource] = useState<FundSourceType>('BOSP_REGULER');
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState<boolean>(false);
  const [newYearInput, setNewYearInput] = useState<string>('2027');
  const [newYearNotes, setNewYearNotes] = useState<string>('');

  const [plan, setPlan] = useState<Partial<BudgetPlan>>({
    schoolId: activeSchool.id,
    fiscalYear: selectedFiscalYear,
    fundSource: selectedFundSource,
    totalPagu: 240000000,
    stage1Allocation: 120000000,
    stage2Allocation: 120000000,
    status: 'Draft',
  });
  const [components, setComponents] = useState<BudgetComponent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningViolations, setWarningViolations] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Admin Recap & Approval State
  const [adminRecapList, setAdminRecapList] = useState<any[]>([]);
  const [isLoadingRecap, setIsLoadingRecap] = useState<boolean>(false);
  const [approvalModalData, setApprovalModalData] = useState<{
    isOpen: boolean;
    schoolId: string;
    schoolName: string;
    action: 'APPROVE' | 'REJECT';
    notes: string;
  }>({
    isOpen: false,
    schoolId: '',
    schoolName: '',
    action: 'APPROVE',
    notes: '',
  });

  // Requirement 2: Filter Penanggaran Tahap I / Tahap II / Gabungan
  const [stageFilter, setStageFilter] = useState<StageFilter>('GABUNGAN');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Request RKAS Change modal state for Bendahara Sekolah
  const [isRequestChangeModalOpen, setIsRequestChangeModalOpen] = useState<boolean>(false);
  const [requestChangeNotes, setRequestChangeNotes] = useState<string>('');
  const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] = useState<boolean>(false);

  // Expanded sub-rincian state
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

  // Sync selectedFiscalYear if activeSchool changed and activeFiscalYear exists
  useEffect(() => {
    if (activeSchool.activeFiscalYear && activeSchool.activeFiscalYear !== selectedFiscalYear) {
      setSelectedFiscalYear(activeSchool.activeFiscalYear);
    }
  }, [activeSchool.id]);

  // Load available fiscal years
  useEffect(() => {
    loadFiscalYears();
  }, []);

  const loadFiscalYears = async () => {
    try {
      const res = await api.getFiscalYears();
      if (res && res.success && res.fiscalYears && res.fiscalYears.length > 0) {
        setFiscalYears(res.fiscalYears);
      } else {
        setFiscalYears([
          { id: 'FY-2024', year: 2024, isActive: false, status: 'Closed', notes: 'Tahun Anggaran 2024' },
          { id: 'FY-2025', year: 2025, isActive: false, status: 'Closed', notes: 'Tahun Anggaran 2025' },
          { id: 'FY-2026', year: 2026, isActive: true, status: 'Open', notes: 'Tahun Anggaran Berjalan 2026' },
          { id: 'FY-2027', year: 2027, isActive: false, status: 'Open', notes: 'Tahun Anggaran Perencanaan 2027' },
        ]);
      }
    } catch (e) {
      console.warn('Error loading fiscal years:', e);
    }
  };

  const handleAddNewFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const yr = Number(newYearInput);
    if (!yr || isNaN(yr)) return;
    try {
      const res = await api.createFiscalYear({
        year: yr,
        notes: newYearNotes || `Tahun Anggaran ${yr}`,
      });
      if (res && res.success) {
        await loadFiscalYears();
        setSelectedFiscalYear(yr);
        setIsAddYearModalOpen(false);
        setNewYearNotes('');
      }
    } catch (err) {
      console.error('Failed to create fiscal year:', err);
    }
  };

  // Load admin recap for all schools
  const loadRecap = async () => {
    if (!isAdmin) return;
    setIsLoadingRecap(true);
    try {
      const res = await api.getBudgetRecap(selectedFiscalYear, selectedFundSource);
      if (res && res.success && Array.isArray(res.recap)) {
        setAdminRecapList(res.recap);
      }
    } catch (err) {
      console.warn('Failed to load budget recap:', err);
    } finally {
      setIsLoadingRecap(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadRecap();
    }
  }, [isAdmin, selectedFiscalYear, selectedFundSource]);

  // Reload budget when school, fiscal year, or fund source changes
  useEffect(() => {
    loadBudget();
  }, [activeSchool.id, selectedFiscalYear, selectedFundSource]);

  const loadBudget = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBudgetSummary(activeSchool.id, selectedFiscalYear, selectedFundSource);
      if (res.success) {
        if (res.plan) {
          setPlan(res.plan);
        } else {
          const defaultPagu = selectedFundSource === 'BOSP_REGULER' ? 240000000 : 0;
          setPlan({
            schoolId: activeSchool.id,
            fiscalYear: selectedFiscalYear,
            fundSource: selectedFundSource,
            totalPagu: defaultPagu,
            stage1Allocation: Math.floor(defaultPagu / 2),
            stage2Allocation: Math.floor(defaultPagu / 2),
            status: 'Draft',
          });
        }
        if (res.components && res.components.length > 0) {
          setComponents(res.components);
          // By default expand first 3 components
          const initialExpanded: Record<string, boolean> = {};
          res.components.slice(0, 3).forEach(c => { initialExpanded[c.code] = true; });
          setExpandedCodes(initialExpanded);
        } else {
          setComponents([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Admin Approval & Rejection
  const handleApproveBudget = async (schoolId: string, notes?: string) => {
    try {
      const res = await api.updateBudgetStatus({
        schoolId,
        fiscalYear: selectedFiscalYear,
        fundSource: selectedFundSource,
        status: 'Disetujui',
        notes: notes || 'Disetujui dan disahkan resmi oleh Admin Dinas Pendidikan.',
        adminName: user?.name || 'Admin Dinas',
      });
      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadRecap();
        if (activeSchool.id === schoolId) {
          await loadBudget();
        }
        onRefreshRkasStatus?.();
        setApprovalModalData({ isOpen: false, schoolId: '', schoolName: '', action: 'APPROVE', notes: '' });
      } else {
        setSaveError(res?.message || 'Gagal menyetujui anggaran.');
      }
    } catch (err: any) {
      console.error('Failed to approve budget:', err);
      setSaveError(err.message || 'Terjadi kesalahan sistem saat menyetujui RKAS.');
    }
  };

  const handleRejectBudget = async (schoolId: string, notes: string) => {
    try {
      const res = await api.updateBudgetStatus({
        schoolId,
        fiscalYear: selectedFiscalYear,
        fundSource: selectedFundSource,
        status: 'Ditolak',
        notes: notes || 'Perlu perbaikan rincian anggaran belanja.',
        adminName: user?.name || 'Admin Dinas',
      });
      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadRecap();
        if (activeSchool.id === schoolId) {
          await loadBudget();
        }
        onRefreshRkasStatus?.();
        setApprovalModalData({ isOpen: false, schoolId: '', schoolName: '', action: 'REJECT', notes: '' });
      } else {
        setSaveError(res?.message || 'Gagal mengubah status revisi.');
      }
    } catch (err: any) {
      console.error('Failed to reject budget:', err);
      setSaveError(err.message || 'Terjadi kesalahan sistem saat meminta revisi.');
    }
  };

  const handleRequestRevisionBySchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestChangeNotes.trim()) return;
    setIsSubmittingChangeRequest(true);
    try {
      const res = await api.updateBudgetStatus({
        schoolId: activeSchool.id,
        fiscalYear: selectedFiscalYear,
        fundSource: selectedFundSource,
        status: 'Diajukan',
        notes: `Pengajuan Perubahan RKAS (${user?.name || 'Bendahara'}): ${requestChangeNotes}`,
      });
      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        setIsRequestChangeModalOpen(false);
        setRequestChangeNotes('');
        await loadBudget();
        if (isAdmin) await loadRecap();
        onRefreshRkasStatus?.();
      } else {
        setSaveError(res?.message || 'Gagal mengajukan perubahan RKAS.');
      }
    } catch (err: any) {
      console.error('Error requesting RKAS change:', err);
      setSaveError(err.message || 'Terjadi gangguan jaringan saat mengajukan perubahan RKAS.');
    } finally {
      setIsSubmittingChangeRequest(false);
    }
  };

  const handlePaguChange = (val: number) => {
    setPlan({
      ...plan,
      fundSource: selectedFundSource,
      fiscalYear: selectedFiscalYear,
      totalPagu: val,
      stage1Allocation: Math.floor(val / 2),
      stage2Allocation: Math.floor(val / 2),
    });
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    components.forEach(c => { all[c.code] = true; });
    setExpandedCodes(all);
  };

  const collapseAll = () => {
    setExpandedCodes({});
  };

  // Line item handlers for sub-rincian
  const handleItemChange = (compCode: string, itemId: string, field: keyof BudgetItemDetail, value: any) => {
    setComponents(prev => prev.map(comp => {
      if (comp.code !== compCode) return comp;
      const currentItems = comp.items ? [...comp.items] : [];
      const updatedItems = currentItems.map(itm => {
        if (itm.id !== itemId) return itm;
        const updated = { ...itm, [field]: value };
        
        const vol1 = Number(field === 'volumeStage1' ? value : (updated.volumeStage1 || 0));
        const vol2 = Number(field === 'volumeStage2' ? value : (updated.volumeStage2 || 0));
        const price = Number(field === 'unitPrice' ? value : updated.unitPrice);
        
        let s1Amt = 0;
        let s2Amt = 0;
        
        if (updated.stage === '1') {
          s1Amt = vol1 * price;
          s2Amt = 0;
        } else if (updated.stage === '2') {
          s1Amt = 0;
          s2Amt = vol2 * price;
        } else {
          s1Amt = vol1 * price;
          s2Amt = vol2 * price;
        }
        
        updated.stage1Amount = s1Amt;
        updated.stage2Amount = s2Amt;
        updated.totalAmount = s1Amt + s2Amt;
        updated.volume = vol1 + vol2;
        
        return updated;
      });

      const totalAllocated = updatedItems.reduce((s, i) => s + i.totalAmount, 0);
      const s1 = updatedItems.reduce((s, i) => s + (i.stage1Amount || 0), 0);
      const s2 = updatedItems.reduce((s, i) => s + (i.stage2Amount || 0), 0);

      return {
        ...comp,
        items: updatedItems,
        allocatedAmount: totalAllocated,
        remainingAmount: totalAllocated - (comp.realizedAmount || 0),
        stage1Budget: s1,
        stage2Budget: s2,
      };
    }));
  };

  const handleAddItem = (compCode: string) => {
    setComponents(prev => prev.map(comp => {
      if (comp.code !== compCode) return comp;
      const currentItems = comp.items ? [...comp.items] : [];
      const newItem: BudgetItemDetail = {
        id: `ITM-${comp.schoolId}-${comp.code.replace(/\./g, '_')}-${Date.now().toString().slice(-4)}`,
        description: 'Uraian rincian kebutuhan baru...',
        volume: 2,
        volumeStage1: 1,
        volumeStage2: 1,
        unit: 'Paket',
        unitPrice: 1000000,
        totalAmount: 2000000,
        stage: 'BOTH',
        stage1Amount: 1000000,
        stage2Amount: 1000000,
      };
      const updatedItems = [...currentItems, newItem];
      const totalAllocated = updatedItems.reduce((s, i) => s + i.totalAmount, 0);
      const s1 = updatedItems.reduce((s, i) => s + (i.stage1Amount || 0), 0);
      const s2 = updatedItems.reduce((s, i) => s + (i.stage2Amount || 0), 0);

      return {
        ...comp,
        items: updatedItems,
        allocatedAmount: totalAllocated,
        remainingAmount: totalAllocated - (comp.realizedAmount || 0),
        stage1Budget: s1,
        stage2Budget: s2,
      };
    }));

    // Ensure expanded
    setExpandedCodes(prev => ({ ...prev, [compCode]: true }));
  };

  const handleDeleteItem = (compCode: string, itemId: string) => {
    setComponents(prev => prev.map(comp => {
      if (comp.code !== compCode) return comp;
      const currentItems = comp.items ? [...comp.items] : [];
      const updatedItems = currentItems.filter(i => i.id !== itemId);
      const totalAllocated = updatedItems.reduce((s, i) => s + i.totalAmount, 0);
      const s1 = updatedItems.reduce((s, i) => s + (i.stage1Amount || 0), 0);
      const s2 = updatedItems.reduce((s, i) => s + (i.stage2Amount || 0), 0);

      return {
        ...comp,
        items: updatedItems,
        allocatedAmount: totalAllocated,
        remainingAmount: totalAllocated - (comp.realizedAmount || 0),
        stage1Budget: s1,
        stage2Budget: s2,
      };
    }));
  };

  // Group components by the 3 Official Main Objek Belanja
  const groups: {
    type: MainExpenditureType;
    title: string;
    description: string;
    icon: any;
    codes: string[];
  }[] = [
    {
      type: 'BARANG_JASA',
      title: 'A. Belanja Barang dan Jasa',
      description: '17 Sub-Rincian: Honorarium, ATK, Benda Pos, Kebersihan, Daya & Jasa, Pemeliharaan, Diklat, dll.',
      icon: Package,
      codes: [
        '5.1.02.01', '5.1.02.02', '5.1.02.03', '5.1.02.04', '5.1.02.05', 
        '5.1.02.06', '5.1.02.07', '5.1.02.08', '5.1.02.09', '5.1.02.10', 
        '5.1.02.11', '5.1.02.12', '5.1.02.13', '5.1.02.14', '5.1.02.15', 
        '5.1.02.16', '5.1.02.17'
      ],
    },
    {
      type: 'MODAL_PERALATAN_MESIN',
      title: 'B. Belanja Modal Peralatan dan Mesin',
      description: '3 Sub-Rincian: Modal Komputer, Peralatan Komputer, dan Peralatan Keamanan Kantor',
      icon: Cpu,
      codes: ['5.2.02.01', '5.2.02.02', '5.2.02.03'],
    },
    {
      type: 'MODAL_ASET_TETAP_LAINNYA',
      title: 'C. Belanja Modal Aset Tetap Lainnya',
      description: '3 Sub-Rincian: Buku Teks Umum, Buku Teks Pendamping, dan Buku Lainnya (Min. 10% Pagu)',
      icon: BookOpen,
      codes: ['5.2.05.01', '5.2.05.02', '5.2.05.03'],
    },
  ];

  // Stage-based totals calculation
  const totalPaguAnnual = plan.totalPagu || 0;
  const activePagu = stageFilter === 'GABUNGAN'
    ? totalPaguAnnual
    : stageFilter === 'TAHAP_1'
    ? (plan.stage1Allocation || Math.floor(totalPaguAnnual / 2))
    : (plan.stage2Allocation || Math.floor(totalPaguAnnual / 2));

  const totalAllocatedActive = components.reduce((sum, c) => {
    if (stageFilter === 'GABUNGAN') return sum + (c.allocatedAmount || 0);
    if (stageFilter === 'TAHAP_1') return sum + (c.stage1Budget || 0);
    return sum + (c.stage2Budget || 0);
  }, 0);

  const totalRealizedActive = components.reduce((sum, c) => {
    if (stageFilter === 'GABUNGAN') return sum + (c.realizedAmount || 0);
    if (stageFilter === 'TAHAP_1') return sum + (c.stage1Realized || 0);
    return sum + (c.stage2Realized || 0);
  }, 0);

  const totalRemainingActive = totalAllocatedActive - totalRealizedActive;

  // Juknis BOSP Rules Verification
  const honorAlloc = components
    .filter(c => c.category === 'HONORARIUM' || c.code === '5.1.02.01')
    .reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);
  const honorPct = totalPaguAnnual > 0 ? (honorAlloc / totalPaguAnnual) * 100 : 0;
  const maxHonorPct = activeSchool.status === 'Negeri' ? 20 : 40;

  const bukuAlloc = components
    .filter(c => c.mainType === 'MODAL_ASET_TETAP_LAINNYA' || c.category === 'BUKU_DAN_MODAL' || ['5.2.05.01', '5.2.05.02', '5.2.05.03'].includes(c.code))
    .reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);
  const bukuPct = totalPaguAnnual > 0 ? (bukuAlloc / totalPaguAnnual) * 100 : 0;

  const sarprasAlloc = components
    .filter(c => c.category === 'PEMELIHARAAN_SARPRAS' || c.code === '5.1.02.16')
    .reduce((sum, c) => sum + (c.allocatedAmount || 0), 0);
  const sarprasPct = totalPaguAnnual > 0 ? (sarprasAlloc / totalPaguAnnual) * 100 : 0;

  const validateRules = async () => {
    try {
      const res = await api.validateBudgetRules({
        schoolStatus: activeSchool?.status || 'Negeri',
        totalPagu: totalPaguAnnual,
        components,
        fundSource: selectedFundSource,
      });
      setValidationResult(res);
      return res;
    } catch (err) {
      console.warn('Validate rules error handled safely:', err);
      return {
        success: true,
        isValid: true,
        violations: [],
      };
    }
  };

  const handleSaveBudget = async () => {
    setSaveError(null);
    try {
      const vResult = await validateRules();
      if (vResult && !vResult.isValid && vResult.violations && vResult.violations.length > 0) {
        setWarningViolations(vResult.violations);
        setShowWarningModal(true);
        return;
      }

      setIsSaving(true);
      const res = await api.saveBudget({
        plan: {
          ...plan,
          schoolId: activeSchool.id,
          fiscalYear: selectedFiscalYear,
          fundSource: selectedFundSource,
        },
        components,
      });
      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setSaveError(res?.message || 'Gagal menyimpan data anggaran ke server.');
      }
    } catch (err: any) {
      console.error('Save budget error caught:', err);
      setSaveError(err?.message || 'Terjadi gangguan jaringan saat menyimpan anggaran.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const fundDef = MASTER_FUND_SOURCES.find(f => f.type === selectedFundSource);
    const fundName = fundDef?.name || 'BOSP Reguler';
    exportBudgetRealizationToExcel(
      `${activeSchool.name} (${fundName})`,
      selectedFiscalYear,
      totalPaguAnnual,
      components,
      stageFilter
    );
  };

  return (
    <div className="space-y-6">
      {/* 0. TAMPILAN REKAPAN ANGGARAN PER SEKOLAH UNTUK ADMIN DINAS */}
      {isAdmin && adminViewMode === 'RECAP' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-[#0B5D3B] rounded-xl border border-emerald-200">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Rekapan Anggaran RKAS Per Satuan Pendidikan Terdaftar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ringkasan pagu tahunan dan alokasi per tahap untuk seluruh satuan pendidikan di bawah binaan Dinas Pendidikan.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Mode Rekapan Admin ({filteredSchools.length} Sekolah)
              </span>
            </div>

            {/* Grid Kontrol Filter & Sumber Dana */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tahun Anggaran:</label>
                <select
                  value={selectedFiscalYear}
                  onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white font-bold"
                >
                  {fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.year}>
                      TA {fy.year} {fy.year === 2026 ? '(Berjalan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sumber Dana BOSP:</label>
                <select
                  value={selectedFundSource}
                  onChange={(e) => setSelectedFundSource(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white font-bold"
                >
                  <option value="BOSP_REGULER">BOSP Reguler</option>
                  <option value="BOSP_KINERJA">BOSP Kinerja</option>
                  <option value="BOSP_AFIRMASI">BOSP Afirmasi</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cari Nama / NPSN:</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau NPSN..."
                    value={schoolSearchQuery}
                    onChange={(e) => setSchoolSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-7 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white"
                  />
                  {schoolSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSchoolSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter Provinsi:</label>
                <select
                  value={filterProvinsi}
                  onChange={(e) => {
                    setFilterProvinsi(e.target.value);
                    setFilterKabupaten('ALL');
                    setFilterKecamatan('ALL');
                  }}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white"
                >
                  <option value="ALL">Semua Provinsi</option>
                  {availableProvinsi.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter Kab / Kota:</label>
                <select
                  value={filterKabupaten}
                  onChange={(e) => setFilterKabupaten(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white"
                >
                  <option value="ALL">Semua Kab/Kota</option>
                  {availableKabupaten.map((kab) => (
                    <option key={kab} value={kab}>{kab}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter Kecamatan:</label>
                <select
                  value={filterKecamatan}
                  onChange={(e) => setFilterKecamatan(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white"
                >
                  <option value="ALL">Semua Kecamatan</option>
                  {availableKecamatan.map((kec) => (
                    <option key={kec} value={kec}>Kec. {kec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Rekapan Anggaran Per Sekolah */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B]">
                  Daftar Rekapan Anggaran Satuan Pendidikan Terdaftar
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Menampilkan Pagu Resmi, alokasi Tahap I & Tahap II 50%, serta status persetujuan RKAS oleh Admin Dinas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRecap}
                  disabled={isLoadingRecap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Segarkan Rekapan Anggaran"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingRecap ? 'animate-spin text-[#0B5D3B]' : ''}`} />
                  <span>Segarkan</span>
                </button>
                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                  Total: {filteredSchools.length} Sekolah
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">Nama Satuan Pendidikan & NPSN</th>
                    <th className="p-3">Wilayah</th>
                    <th className="p-3">Jenjang / Status</th>
                    <th className="p-3 text-right">Pagu BOSP Tahunan</th>
                    <th className="p-3 text-right">Tahap I (50%)</th>
                    <th className="p-3 text-right">Tahap II (50%)</th>
                    <th className="p-3 text-center">Status RKAS</th>
                    <th className="p-3 text-center">Aksi / Verifikasi Dinas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSchools.map((s, idx) => {
                    const recap = adminRecapList.find((r) => r.schoolId === s.id);
                    const defaultPagu = selectedFundSource === 'BOSP_REGULER'
                      ? (s.level === 'SD' ? 240000000 : s.level === 'SMP' ? 320000000 : 400000000)
                      : 0;
                    const paguVal = recap ? Number(recap.totalPagu) : defaultPagu;
                    const stage1Val = recap ? Number(recap.stage1Allocation) : Math.round(paguVal / 2);
                    const stage2Val = recap ? Number(recap.stage2Allocation) : (paguVal - stage1Val);
                    const rkasStatus = recap ? recap.statusRkas : 'Draft';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">NPSN: {s.npsn}</p>
                        </td>
                        <td className="p-3 text-slate-600">
                          <p className="font-medium">{s.subdistrict ? `Kec. ${s.subdistrict}` : '-'}</p>
                          <p className="text-[11px] text-slate-400">{s.district || ''}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {s.level} · {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(paguVal)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-medium">
                          {formatRupiah(stage1Val)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-700 font-medium">
                          {formatRupiah(stage2Val)}
                        </td>
                        <td className="p-3 text-center">
                          {rkasStatus === 'Disetujui' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Disetujui Dinas</span>
                            </span>
                          ) : rkasStatus === 'Diajukan' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>Menunggu Persetujuan</span>
                            </span>
                          ) : rkasStatus === 'Ditolak' || rkasStatus === 'Revisi' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                              <X className="w-3 h-3 text-red-600" />
                              <span>Perlu Revisi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <span>Draf Sekolah</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                handleAdminSelectSchool(s.id);
                                setAdminViewMode('DETAIL');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer"
                              title="Lihat Rincian Anggaran Belanja Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat Rincian</span>
                            </button>

                            {/* Tombol Aksi Pengesahan Cepat untuk Admin Dinas */}
                            {rkasStatus === 'Diajukan' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveBudget(s.id, 'Disetujui dan disahkan resmi oleh Dinas Pendidikan.')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                                  title="Setujui & Sahkan RKAS Sekolah Ini"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setApprovalModalData({ isOpen: true, schoolId: s.id, schoolName: s.name, action: 'REJECT', notes: '' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                                  title="Minta Revisi RKAS ke Sekolah"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                                  <span>Revisi</span>
                                </button>
                              </>
                            )}

                            {rkasStatus === 'Disetujui' && (
                              <button
                                type="button"
                                onClick={() => setApprovalModalData({ isOpen: true, schoolId: s.id, schoolName: s.name, action: 'REJECT', notes: 'Buka kunci untuk penyesuaian belanja sekolah' })}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Buka Kunci Pengesahan untuk Revisi"
                              >
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                                <span>Buka Revisi</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSchools.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Tidak ada satuan pendidikan terdaftar yang sesuai dengan kriteria filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAMPILAN DETAIL RKAS (DITAMPILKAN UNTUK BENDAHARA ATAU ADMIN DALAM MODE DETAIL) */}
      {(!isAdmin || adminViewMode === 'DETAIL') && (
        <>
          {/* Tombol Navigasi Kembali untuk Admin Dinas */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdminViewMode('RECAP')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B5D3B] bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Rekapan Anggaran Sekolah</span>
                </button>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Menampilkan Rincian Anggaran RKAS: {activeSchool.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    NPSN: {activeSchool.npsn} · {activeSchool.address || ''}, Kec. {activeSchool.subdistrict || '-'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-center">
                Mode Rincian Detail Admin
              </span>
            </div>
          )}

      {/* BANNER STATUS PENGESAHAN RKAS OLEH ADMIN DINAS */}
      {isAdmin ? (
        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          plan.status === 'Disetujui'
            ? 'bg-emerald-50/90 border-emerald-300'
            : plan.status === 'Diajukan'
            ? 'bg-amber-50/90 border-amber-300'
            : plan.status === 'Revisi'
            ? 'bg-red-50/90 border-red-300'
            : 'bg-slate-50 border-slate-300'
        }`}>
          <div className="flex items-start gap-3">
            {plan.status === 'Disetujui' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : plan.status === 'Diajukan' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0 animate-bounce" />
            ) : (
              <Info className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Status RKAS {activeSchool.name}:
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  plan.status === 'Disetujui'
                    ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                    : plan.status === 'Diajukan'
                    ? 'bg-amber-200 text-amber-950 border border-amber-400 animate-pulse'
                    : plan.status === 'Revisi'
                    ? 'bg-red-200 text-red-950 border border-red-400'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {plan.status === 'Disetujui'
                    ? '✓ Disetujui & Disahkan Dinas'
                    : plan.status === 'Diajukan'
                    ? '⏱ Menunggu Persetujuan Admin Dinas'
                    : plan.status === 'Revisi'
                    ? '✕ Perlu Revisi Sekolah'
                    : '✎ Draf Sekolah'}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {plan.status === 'Disetujui'
                  ? `RKAS telah disetujui & disahkan resmi oleh ${(plan as any).approvedBy || 'Admin Dinas Pendidikan'}${plan.approvedAt ? ` pada ${new Date(plan.approvedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}` : ''}. Satuan pendidikan diizinkan melaksanakan penatausahaan belanja.`
                  : plan.status === 'Diajukan'
                  ? `Satuan pendidikan telah mengajukan rincian RKAS ini untuk diperiksa dan disahkan oleh Tim BOSP Dinas Pendidikan.`
                  : plan.status === 'Revisi'
                  ? `RKAS dikembalikan ke sekolah dengan catatan revisi: "${plan.notes || 'Mohon perbaiki uraian atau alokasi belanja'}"`
                  : 'Sekolah masih dalam tahap penyusunan draf RKAS dan belum mengajukannya ke dinas.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {plan.status !== 'Disetujui' && (
              <button
                type="button"
                onClick={() => handleApproveBudget(activeSchool.id, 'Disetujui dan disahkan resmi oleh Dinas Pendidikan.')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui & Sahkan RKAS</span>
              </button>
            )}
            {plan.status === 'Diajukan' && (
              <button
                type="button"
                onClick={() => setApprovalModalData({ isOpen: true, schoolId: activeSchool.id, schoolName: activeSchool.name, action: 'REJECT', notes: '' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Minta Revisi</span>
              </button>
            )}
            {plan.status === 'Disetujui' && (
              <button
                type="button"
                onClick={() => setApprovalModalData({ isOpen: true, schoolId: activeSchool.id, schoolName: activeSchool.name, action: 'REJECT', notes: 'Buka kunci untuk penyesuaian belanja oleh sekolah' })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Buka Kunci untuk Revisi</span>
              </button>
            )}
          </div>
        </div>
      ) : plan.status === 'Disetujui' ? (
        <div className="p-4 rounded-2xl border bg-emerald-50/90 border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <strong>✓ RKAS Telah Disahkan Dinas Pendidikan:</strong> Seluruh alokasi anggaran dan item belanja telah disetujui. Modul penatausahaan transaksi diizinkan. Rincian RKAS saat ini terkunci untuk menjaga akuntabilitas BOSP.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRequestChangeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0B5D3B] bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#0B5D3B]" />
            <span>Ajukan Perubahan RKAS Ulang</span>
          </button>
        </div>
      ) : plan.status === 'Revisi' ? (
        <div className="p-3.5 rounded-xl border bg-red-50 border-red-300 flex items-start gap-2.5 text-xs text-red-950 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>Catatan Revisi dari Admin Dinas:</strong> {plan.notes || 'Silakan sesuaikan kembali uraian belanja lalu klik "Ajukan RKAS ke Dinas".'}
          </div>
        </div>
      ) : null}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0B5D3B]" />
              <span>Rencana Kegiatan & Anggaran Sekolah (RKAS BOSP)</span>
            </h2>
            {isAdmin && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {activeSchool.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? (
              <span>
                Menampilkan data RKAS <strong>{activeSchool.name}</strong> (NPSN: {activeSchool.npsn}) • Kec. {activeSchool.subdistrict || '-'}, Prov. {activeSchool.province || '-'} • Kepala Sekolah: {activeSchool.headmasterName || '-'} • Bendahara: {activeSchool.treasurerName || '-'}
              </span>
            ) : (
              'Struktur baku Objek Belanja BOSP, rincian item kebutuhan (Volume × Harga Satuan), dan filter penanggaran tahap penyaluran.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Cetak Dokumen Resmi RKAS ke format PDF A4 per tahap atau per tahun"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF RKAS</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel ({stageFilter === 'GABUNGAN' ? '1 Tahun' : stageFilter === 'TAHAP_1' ? 'Tahap I' : 'Tahap II'})</span>
          </button>

          {/* Kontrol Penyimpanan & Pengajuan */}
          <div className="flex items-center gap-2">
            {!isAdmin ? (
              plan.status === 'Disetujui' ? (
                <button
                  type="button"
                  onClick={() => setIsRequestChangeModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0B5D3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Ajukan Perubahan RKAS Ulang</span>
                </button>
              ) : (
                <>
                  <select
                    value={plan.status || 'Draft'}
                    onChange={(e) => setPlan({ ...plan, status: e.target.value as any })}
                    className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                  >
                    <option value="Draft">Draft (Simpan Sementara)</option>
                    <option value="Diajukan">Diajukan untuk Disahkan Dinas</option>
                  </select>
                  <button
                    onClick={handleSaveBudget}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSaving
                        ? 'Menyimpan...'
                        : plan.status === 'Draft'
                        ? 'Simpan Draf'
                        : 'Ajukan ke Dinas'}
                    </span>
                  </button>
                </>
              )
            ) : (
              <button
                onClick={handleSaveBudget}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Anggaran'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Rencana Anggaran (RKAS) beserta seluruh rincian uraian belanja berhasil disimpan dan disinkronkan.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-2 text-xs text-red-900 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="p-1 text-red-500 hover:text-red-700 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. PENENTUAN TAHUN PENGERJAAN & NAVIGASI 3 SUMBER DANA BOSP */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Baris 1: Penentuan Tahun Pengerjaan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B5D3B] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Penentuan Tahun Pengerjaan RKAS
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-800">Tahun Anggaran:</span>
                <div className="relative">
                  <select
                    value={selectedFiscalYear}
                    onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
                    className="pl-3 pr-8 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] appearance-none cursor-pointer"
                  >
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.year}>
                        {fy.year} {fy.year === 2026 ? '(Tahun Berjalan)' : `(${fy.status})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-[11px] text-slate-500 hidden md:inline">
                  • Satuan pendidikan mengerjakan RKAS untuk Tahun {selectedFiscalYear}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddYearModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B5D3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tahun Anggaran</span>
            </button>
          </div>
        </div>

        {/* Baris 2: Pemilihan 3 Sumber Anggaran (Reguler, Kinerja, Afirmasi) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0B5D3B]" />
              <span className="text-xs font-bold text-slate-800">
                Pilih Sumber Anggaran BOSP (Dikerjakan Secara Terpisah):
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Setiap sumber dana memiliki Pagu, Rincian Komponen, dan Lembar Cetak tersendiri.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {MASTER_FUND_SOURCES.map((fund) => {
              const isSelected = selectedFundSource === fund.type;
              return (
                <button
                  key={fund.type}
                  type="button"
                  onClick={() => setSelectedFundSource(fund.type)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? fund.type === 'BOSP_REGULER'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                        : fund.type === 'BOSP_KINERJA'
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600'
                        : 'border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-600'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border mb-1.5 ${fund.badgeClass}`}>
                        {fund.code}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {fund.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {fund.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        fund.type === 'BOSP_REGULER'
                          ? 'bg-emerald-600 text-white'
                          : fund.type === 'BOSP_KINERJA'
                          ? 'bg-blue-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Status Pengerjaan:</span>
                    <span className={`font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                      {isSelected ? (totalAllocatedActive > 0 ? 'Sedang Dikerjakan' : 'Belum Ada Rincian') : 'Terpisah'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FILTER PENANGGARAN (TAHAP I, TAHAP II, ATAU GABUNGAN KEDUANYA) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#0B5D3B]" />
          <div>
            <p className="text-xs font-bold text-slate-800">
              Filter Penanggaran Penyaluran ({MASTER_FUND_SOURCES.find(f => f.type === selectedFundSource)?.shortName}):
            </p>
            <p className="text-[11px] text-slate-500">Tampilkan pagu dan rincian belanja per semester atau akumulasi 1 tahun penuh.</p>
          </div>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setStageFilter('GABUNGAN')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              stageFilter === 'GABUNGAN'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gabungan (Tahap I + II)
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('TAHAP_1')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              stageFilter === 'TAHAP_1'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tahap I (Januari - Juni)
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('TAHAP_2')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              stageFilter === 'TAHAP_2'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tahap II (Juli - Desember)
          </button>
        </div>
      </div>

      {/* Juknis Compliance Gauges Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Rule 1: Honorarium */}
        <div style={{ backgroundColor: '#078c26' }} className="p-3.5 rounded-xl border border-emerald-700 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: '#f8f8f9' }} className="font-bold">1. Alokasi Belanja Honorarium</span>
            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
              honorPct > maxHonorPct ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {honorPct.toFixed(1)}% / Max {maxHonorPct}%
            </span>
          </div>
          <div className="w-full bg-emerald-900/40 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all ${honorPct > maxHonorPct ? 'bg-red-400' : 'bg-amber-300'}`}
              style={{ width: `${Math.min(100, (honorPct / maxHonorPct) * 100)}%`, backgroundColor: '#2007f3' }}
            />
          </div>
          <p style={{ color: '#f2f4f7' }} className="text-[10px] mt-1.5 flex justify-between">
            <span>{formatRupiah(honorAlloc)}</span>
            <span>Batas: {school.status} (Maks. {maxHonorPct}%)</span>
          </p>
        </div>

        {/* Rule 2: Buku Modal */}
        <div style={{ backgroundColor: '#08961f' }} className="p-3.5 rounded-xl border border-emerald-700 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: '#f8f8f9' }} className="font-bold">2. Belanja Modal Buku Siswa</span>
            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
              bukuPct < 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {bukuPct.toFixed(1)}% / Min 10%
            </span>
          </div>
          <div className="w-full bg-emerald-900/40 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all ${bukuPct < 10 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, (bukuPct / 10) * 100)}%` }}
            />
          </div>
          <p style={{ color: '#f2f4f7' }} className="text-[10px] mt-1.5 flex justify-between">
            <span>{formatRupiah(bukuAlloc)}</span>
            <span>Kurikulum Merdeka (Min. 10%)</span>
          </p>
        </div>

        {/* Rule 3: Pemeliharaan Sarpras */}
        <div style={{ backgroundColor: '#069404' }} className="p-3.5 rounded-xl border border-emerald-700 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: '#f8f8f9' }} className="font-bold">3. Pemeliharaan Sarana Prasarana</span>
            <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
              sarprasPct > 20 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {sarprasPct.toFixed(1)}% / Max 20%
            </span>
          </div>
          <div className="w-full bg-emerald-900/40 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all ${sarprasPct > 20 ? 'bg-red-500' : 'bg-[#16865A]'}`}
              style={{ width: `${Math.min(100, (sarprasPct / 20) * 100)}%` }}
            />
          </div>
          <p style={{ color: '#f2f4f7' }} className="text-[10px] mt-1.5 flex justify-between">
            <span>{formatRupiah(sarprasAlloc)}</span>
            <span>Maksimal 20% dari Total Pagu</span>
          </p>
        </div>
      </div>

      {/* Pagu & Status Active Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
            Total Pagu BOSP Tahunan (Rp)
          </label>
          <input
            type="number"
            value={totalPaguAnnual}
            onChange={(e) => handlePaguChange(Number(e.target.value))}
            className="w-full text-base font-black font-mono text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#0B5D3B] outline-none"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            {formatRupiah(totalPaguAnnual)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">
            Pagu Aktif ({stageFilter === 'GABUNGAN' ? '1 Tahun' : stageFilter === 'TAHAP_1' ? 'Tahap I' : 'Tahap II'})
          </p>
          <p className="text-base font-black text-slate-900 font-mono mt-1">
            {formatRupiah(activePagu)}
          </p>
          <span className="text-[11px] text-slate-400">
            {stageFilter === 'GABUNGAN' ? 'Tahap I + Tahap II' : stageFilter === 'TAHAP_1' ? 'Alokasi Semester 1' : 'Alokasi Semester 2'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Total Dialokasikan (Item)</p>
          <p className={`text-base font-black font-mono mt-1 ${
            totalAllocatedActive > activePagu ? 'text-red-600' : 'text-[#0B5D3B]'
          }`}>
            {formatRupiah(totalAllocatedActive)}
          </p>
          <span className="text-[11px] text-slate-500">
            {totalAllocatedActive === activePagu
              ? 'Tepat seimbang 100%'
              : totalAllocatedActive < activePagu
              ? `Tersisa ${formatRupiah(activePagu - totalAllocatedActive)} belum dianggarkan`
              : `Over budget: ${formatRupiah(totalAllocatedActive - activePagu)}`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Realisasi & Sisa Anggaran</p>
          <p className="text-base font-black text-slate-900 font-mono mt-1">
            {formatRupiah(totalRealizedActive)}
          </p>
          <span className="text-[11px] font-bold text-[#0B5D3B]">
            Sisa: {formatRupiah(totalRemainingActive)}
          </span>
        </div>
      </div>

      {/* Accordion Controls Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Daftar Objek Belanja & Sub-Rincian Kebutuhan:</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[11px]">
            {components.length} Sub-Rincian Baku
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] text-[#0B5D3B] hover:underline font-semibold"
          >
            Buka Semua Rincian Item
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] text-slate-500 hover:underline font-semibold"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {/* THE 3 OBJEK BELANJA ACCORDION GROUPS */}
      <div className="space-y-6">
        {groups.map((group, gIdx) => {
          const groupComponents = components.filter(c => group.codes.includes(c.code));
          const groupTotal = groupComponents.reduce((s, c) => {
            if (stageFilter === 'GABUNGAN') return s + (c.allocatedAmount || 0);
            if (stageFilter === 'TAHAP_1') return s + (c.stage1Budget || 0);
            return s + (c.stage2Budget || 0);
          }, 0);

          const GroupIcon = group.icon;

          return (
            <div key={group.type} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Group Header Strip */}
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0B5D3B]/10 text-[#0B5D3B] flex items-center justify-center shrink-0">
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
                    <p className="text-[11px] text-slate-500">{group.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal Objek:</span>
                  <span className="text-sm font-extrabold text-[#0B5D3B] font-mono tabular-nums">
                    {formatRupiah(groupTotal)}
                  </span>
                </div>
              </div>

              {/* Sub-Rincian List inside this group */}
              <div className="divide-y divide-slate-100">
                {groupComponents.map((comp) => {
                  const isExpanded = !!expandedCodes[comp.code];
                  const items = comp.items || [];

                  // Effective subtotal according to stage filter
                  const compAllocated = stageFilter === 'GABUNGAN'
                    ? comp.allocatedAmount
                    : stageFilter === 'TAHAP_1'
                    ? (comp.stage1Budget || 0)
                    : (comp.stage2Budget || 0);

                  const compRealized = stageFilter === 'GABUNGAN'
                    ? comp.realizedAmount
                    : stageFilter === 'TAHAP_1'
                    ? (comp.stage1Realized || 0)
                    : (comp.stage2Realized || 0);

                  const compRemaining = compAllocated - compRealized;

                  // Filtered items visible in current stage
                  const visibleItems = items.filter(itm => {
                    if (stageFilter === 'GABUNGAN') return true;
                    if (stageFilter === 'TAHAP_1') return itm.stage === '1' || itm.stage === 'BOTH';
                    if (stageFilter === 'TAHAP_2') return itm.stage === '2' || itm.stage === 'BOTH';
                    return true;
                  });

                  return (
                    <div key={comp.code} className="transition-colors">
                      {/* Sub-Rincian Row Header */}
                      <div
                        onClick={() => toggleExpand(comp.code)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                          isExpanded ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="p-1 rounded text-slate-400 hover:text-slate-600 shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#0B5D3B]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <span className="font-mono text-xs font-bold text-slate-700 shrink-0 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {comp.code}
                          </span>
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {comp.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {items.length} rincian item kebutuhan
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 text-xs">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 block">Realisasi</span>
                            <span className="font-mono text-slate-600 tabular-nums">
                              {formatRupiah(compRealized)}
                            </span>
                          </div>
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 block">Sisa Anggaran</span>
                            <span className="font-mono text-emerald-800 font-semibold tabular-nums">
                              {formatRupiah(compRemaining)}
                            </span>
                          </div>
                          <div className="text-right min-w-[110px]">
                            <span className="text-[10px] text-slate-400 block">Alokasi ({stageFilter === 'GABUNGAN' ? '1 Thn' : stageFilter === 'TAHAP_1' ? 'Thp 1' : 'Thp 2'})</span>
                            <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                              {formatRupiah(compAllocated)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Line Items Table (Expandable) */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                              Rincian Uraian Belanja untuk Sub-Rincian: <span className="text-[#0B5D3B]">{comp.name}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddItem(comp.code)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#0B5D3B] border border-[#0B5D3B] rounded-lg font-bold text-[11px] transition-colors shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Uraian Belanja</span>
                            </button>
                          </div>

                          <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-2xs">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100/80 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2 w-10 text-center">No</th>
                                  <th className="px-3 py-2">1. Uraian Belanja</th>
                                  <th className="px-1 py-2 w-20 text-center">2. Vol. Tahap I</th>
                                  <th className="px-1 py-2 w-20 text-center">Vol. Tahap II</th>
                                  <th className="px-2 py-2 w-28">3. Satuan</th>
                                  <th className="px-3 py-2 w-32 text-right">4. Harga Satuan (Rp)</th>
                                  <th className="px-3 py-2 w-32 text-right">Total Anggaran (Rp)</th>
                                  <th className="px-2 py-2 w-32 text-center">Tahap Penyaluran</th>
                                  <th className="px-2 py-2 w-10 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {items.map((itm, iIdx) => (
                                  <tr key={itm.id} className="hover:bg-slate-50/60">
                                    <td className="px-3 py-1.5 text-center text-slate-400 font-mono text-[11px]">
                                      {iIdx + 1}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <input
                                        type="text"
                                        value={itm.description}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'description', e.target.value)}
                                        placeholder="Contoh: Kertas HVS A4 75 Gram..."
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-slate-800 outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      />
                                    </td>
                                    <td className="px-1 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={itm.volumeStage1 || 0}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'volumeStage1', e.target.value)}
                                        className="w-full font-mono text-center px-1 py-1 border border-slate-200 rounded text-slate-900 outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      />
                                    </td>
                                    <td className="px-1 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={itm.volumeStage2 || 0}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'volumeStage2', e.target.value)}
                                        className="w-full font-mono text-center px-1 py-1 border border-slate-200 rounded text-slate-900 outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input
                                        type="text"
                                        value={itm.unit}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'unit', e.target.value)}
                                        placeholder="Rim / Unit / Paket"
                                        className="w-full px-2 py-1 border border-slate-200 rounded text-slate-700 outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        step={1000}
                                        value={itm.unitPrice}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'unitPrice', e.target.value)}
                                        className="w-full font-mono text-right px-2 py-1 border border-slate-200 rounded text-slate-900 outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                                      {formatRupiah(itm.totalAmount)}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <select
                                        value={itm.stage}
                                        onChange={(e) => handleItemChange(comp.code, itm.id, 'stage', e.target.value)}
                                        className="w-full px-2 py-1 text-[11px] font-semibold border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                                      >
                                        <option value="BOTH">Tahap I & II</option>
                                        <option value="1">Tahap I Saja</option>
                                        <option value="2">Tahap II Saja</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(comp.code, itm.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                        title="Hapus Rincian"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}

                                {items.length === 0 && (
                                  <tr>
                                    <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                                      Belum ada uraian rincian belanja. Klik "+ Tambah Uraian Belanja" untuk menambahkan item.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot className="bg-slate-50 text-[11px] font-bold border-t border-slate-200">
                                <tr>
                                  <td colSpan={5} className="px-3 py-2 text-right text-slate-600">
                                    Subtotal Alokasi {comp.name}:
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-[#0B5D3B]">
                                    {formatRupiah(comp.allocatedAmount)}
                                  </td>
                                  <td colSpan={2} className="px-2 py-2 text-[10px] text-slate-500">
                                    Tahap 1: {formatRupiah(comp.stage1Budget || 0)} · Tahap 2: {formatRupiah(comp.stage2Budget || 0)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* POP-UP WARNING MODAL FOR BUDGET VIOLATIONS (Mandatory Permendikbudristek Rule) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border-2 border-red-500 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Peringatan Pelanggaran Aturan Penganggaran BOSP!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Perencanaan anggaran (RKAS) yang Anda simpan tidak memenuhi petunjuk teknis
                  resmi Permendikbudristek Pengelolaan Dana BOSP.
                </p>

                <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-red-900">
                    Daftar Pelanggaran yang Wajib Diperbaiki:
                  </p>
                  <ul className="list-disc list-inside text-xs text-red-800 space-y-1">
                    {warningViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <strong>Petunjuk Tindakan:</strong> Sesuaikan alokasi pada komponen Honorarium, Modal Buku, atau Pemeliharaan Sarpras hingga memenuhi persentase baku.
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWarningModal(false)}
                    className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Perbaiki Perencanaan Anggaran
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK PDF RKAS PER TAHAP / PER TAHUN */}
      <RkasPdfModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        school={activeSchool}
        plan={plan}
        components={components}
        initialStage={stageFilter}
        fundSource={selectedFundSource}
        fiscalYear={selectedFiscalYear}
      />

      {/* MODAL TAMBAH TAHUN ANGGARAN BARU */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0B5D3B]" />
                <span>Tambah Tahun Pengerjaan RKAS</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddNewFiscalYear} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Anggaran Baru:
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0B5D3B] outline-none font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Catatan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tahun Anggaran Perencanaan 2027"
                  value={newYearNotes}
                  onChange={(e) => setNewYearNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0B5D3B] outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-emerald-800 rounded-lg shadow-xs"
                >
                  Simpan Tahun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI & CATATAN PERSETUJUAN / REVISI RKAS */}
      {approvalModalData.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {approvalModalData.action === 'APPROVE' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {approvalModalData.action === 'APPROVE' ? 'Setujui & Sahkan RKAS' : 'Minta Revisi RKAS'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {approvalModalData.schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalData({ isOpen: false, schoolId: '', schoolName: '', action: 'APPROVE', notes: '' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {approvalModalData.action === 'APPROVE'
                  ? 'Dengan menyetujui RKAS ini, seluruh alokasi belanja satuan pendidikan dinyatakan sah dan memenuhi Petunjuk Teknis BOSP. Sekolah dapat langsung merealisasikan pembelanjaan.'
                  : 'Status RKAS akan diubah menjadi "Perlu Revisi". Satuan pendidikan akan menerima catatan revisi dan dapat memperbaiki rincian belanja.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {approvalModalData.action === 'APPROVE' ? 'Catatan Pengesahan (Opsional):' : 'Catatan Revisi untuk Sekolah (Wajib diisi):'}
                </label>
                <textarea
                  rows={3}
                  value={approvalModalData.notes}
                  onChange={(e) => setApprovalModalData({ ...approvalModalData, notes: e.target.value })}
                  placeholder={
                    approvalModalData.action === 'APPROVE'
                      ? 'Contoh: RKAS telah memenuhi standar Juknis BOSP dan disahkan.'
                      : 'Contoh: Alokasi honorarium melebihi batas atau rincian buku belum memenuhi 10% pagu.'
                  }
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0B5D3B] outline-none"
                  required={approvalModalData.action === 'REJECT'}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovalModalData({ isOpen: false, schoolId: '', schoolName: '', action: 'APPROVE', notes: '' })}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              {approvalModalData.action === 'APPROVE' ? (
                <button
                  type="button"
                  onClick={() => handleApproveBudget(approvalModalData.schoolId, approvalModalData.notes)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sahkan RKAS</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRejectBudget(approvalModalData.schoolId, approvalModalData.notes)}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Kirim Revisi ke Sekolah</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN PERUBAHAN RKAS OLEH BENDAHARA SEKOLAH */}
      {isRequestChangeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#0B5D3B]" />
                <span>Pengajuan Perubahan / Pergeseran RKAS</span>
              </h3>
              <button
                onClick={() => setIsRequestChangeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              RKAS Satuan Pendidikan <strong>{activeSchool.name}</strong> saat ini berstatus <strong>Disetujui & Disahkan Dinas</strong>. Dengan mengajukan perubahan, status RKAS akan diperbarui menjadi <strong>Diajukan</strong> sehingga Anda dapat menyesuaikan rincian uraian belanja untuk diverifikasi dan disahkan kembali oleh Admin Dinas.
            </p>

            <form onSubmit={handleRequestRevisionBySchool} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alasan / Catatan Perubahan Anggaran <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestChangeNotes}
                  onChange={(e) => setRequestChangeNotes(e.target.value)}
                  placeholder="Contoh: Penyesuaian kebutuhan peralatan komputer dan langganan daya/jasa semester berjalan..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0B5D3B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestChangeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChangeRequest || !requestChangeNotes.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingChangeRequest ? 'Mengirim...' : 'Kirim Pengajuan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
