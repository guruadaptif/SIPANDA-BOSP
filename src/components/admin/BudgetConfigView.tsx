import React, { useState, useEffect } from 'react';
import { User, BudgetSubComponentConfig, MainExpenditureType, BudgetComponentCategory } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import {
  Sliders,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Info,
  Layers,
  BookOpen,
  Cpu,
  Package,
  Sparkles,
  AlertCircle,
  Save,
  X,
  RefreshCw,
} from 'lucide-react';
import { formatRupiah } from '../../utils/terbilang.ts';

interface BudgetConfigViewProps {
  user: User;
  onRefresh?: () => void;
}

export const BudgetConfigView: React.FC<BudgetConfigViewProps> = ({ user, onRefresh }) => {
  const [subComponents, setSubComponents] = useState<BudgetSubComponentConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMainType, setSelectedMainType] = useState<MainExpenditureType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingSub, setEditingSub] = useState<BudgetSubComponentConfig | null>(null);

  // Form State for new sub-rincian
  const [formData, setFormData] = useState({
    mainType: 'BARANG_JASA' as MainExpenditureType,
    code: '',
    name: '',
    category: 'BARANG_JASA' as BudgetComponentCategory,
    description: '',
    itemDescription: '',
    itemVolume: 1,
    itemUnit: 'Paket',
    itemUnitPrice: 1000000,
    itemStage: 'BOTH' as '1' | '2' | 'BOTH',
  });

  useEffect(() => {
    loadSubComponents();
  }, []);

  const loadSubComponents = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMasterSubComponents();
      if (res.success) {
        setSubComponents(res.subComponents);
      }
    } catch (err) {
      setErrorMsg('Gagal memuat master sub-rincian objek belanja.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = (targetMainType?: MainExpenditureType) => {
    const type = targetMainType || (selectedMainType !== 'ALL' ? selectedMainType : 'BARANG_JASA');
    
    // Auto-generate next code
    const existingForType = subComponents.filter((c) => c.mainType === type);
    let nextCode = '';
    if (type === 'BARANG_JASA') {
      const count = existingForType.length + 1;
      nextCode = `5.1.02.${String(count).padStart(2, '0')}`;
    } else if (type === 'MODAL_PERALATAN_MESIN') {
      const count = existingForType.length + 1;
      nextCode = `5.2.02.${String(count).padStart(2, '0')}`;
    } else {
      const count = existingForType.length + 1;
      nextCode = `5.2.05.${String(count).padStart(2, '0')}`;
    }

    setFormData({
      mainType: type,
      code: nextCode,
      name: '',
      category: type === 'BARANG_JASA' ? 'BARANG_JASA' : type === 'MODAL_PERALATAN_MESIN' ? 'MODAL_MESIN' : 'BUKU_DAN_MODAL',
      description: '',
      itemDescription: '',
      itemVolume: 1,
      itemUnit: 'Paket',
      itemUnitPrice: 1500000,
      itemStage: 'BOTH',
    });
    setEditingSub(null);
    setShowAddModal(true);
  };

  const handleMainTypeChange = (type: MainExpenditureType) => {
    const existingForType = subComponents.filter((c) => c.mainType === type);
    let nextCode = '';
    if (type === 'BARANG_JASA') {
      nextCode = `5.1.02.${String(existingForType.length + 1).padStart(2, '0')}`;
    } else if (type === 'MODAL_PERALATAN_MESIN') {
      nextCode = `5.2.02.${String(existingForType.length + 1).padStart(2, '0')}`;
    } else {
      nextCode = `5.2.05.${String(existingForType.length + 1).padStart(2, '0')}`;
    }

    setFormData({
      ...formData,
      mainType: type,
      code: nextCode,
      category: type === 'BARANG_JASA' ? 'BARANG_JASA' : type === 'MODAL_PERALATAN_MESIN' ? 'MODAL_MESIN' : 'BUKU_DAN_MODAL',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert('Kode rekening dan nama sub-rincian belanja wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (editingSub) {
        // Update existing
        const res = await api.updateCustomSubComponent(editingSub.code, {
          name: formData.name,
          description: formData.description,
          adminName: user.name,
        });
        if (res.success) {
          setSuccessMsg(res.message);
          setShowAddModal(false);
          await loadSubComponents();
          if (onRefresh) onRefresh();
          setTimeout(() => setSuccessMsg(''), 4000);
        } else {
          setErrorMsg(res.message || 'Gagal memperbarui sub-rincian.');
        }
      } else {
        // Create new
        const defaultItems = formData.itemDescription
          ? [
              {
                description: formData.itemDescription,
                volume: Number(formData.itemVolume) || 1,
                unit: formData.itemUnit || 'Paket',
                unitPrice: Number(formData.itemUnitPrice) || 0,
                stage: formData.itemStage,
              },
            ]
          : [];

        const res = await api.addCustomSubComponent({
          code: formData.code,
          name: formData.name,
          mainType: formData.mainType,
          category: formData.category,
          description: formData.description,
          defaultItems,
          adminName: user.name,
        });

        if (res.success) {
          setSuccessMsg(res.message);
          setShowAddModal(false);
          await loadSubComponents();
          if (onRefresh) onRefresh();
          setTimeout(() => setSuccessMsg(''), 4500);
        } else {
          setErrorMsg(res.message || 'Gagal menambahkan sub-rincian.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (sub: BudgetSubComponentConfig) => {
    setEditingSub(sub);
    setFormData({
      mainType: sub.mainType,
      code: sub.code,
      name: sub.name,
      category: sub.category,
      description: sub.description || '',
      itemDescription: sub.defaultItems?.[0]?.description || '',
      itemVolume: sub.defaultItems?.[0]?.volume || 1,
      itemUnit: sub.defaultItems?.[0]?.unit || 'Paket',
      itemUnitPrice: sub.defaultItems?.[0]?.unitPrice || 0,
      itemStage: sub.defaultItems?.[0]?.stage || 'BOTH',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (sub: BudgetSubComponentConfig) => {
    if (!sub.isCustom) {
      alert('Sub-rincian standar baku Juknis BOSP tidak dapat dihapus.');
      return;
    }
    const confirmDel = window.confirm(
      `Apakah Anda yakin ingin menghapus sub-rincian "${sub.name}" (${sub.code}) dari master Juknis BOSP?`
    );
    if (!confirmDel) return;

    try {
      const res = await api.deleteCustomSubComponent(sub.code, user.name);
      if (res.success) {
        setSuccessMsg(res.message);
        await loadSubComponents();
        if (onRefresh) onRefresh();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Gagal menghapus sub-rincian.');
    }
  };

  // Filter components
  const filteredSubComponents = subComponents.filter((sub) => {
    if (selectedMainType !== 'ALL' && sub.mainType !== selectedMainType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = sub.code.toLowerCase().includes(q);
      const matchName = sub.name.toLowerCase().includes(q);
      const matchDesc = sub.description?.toLowerCase().includes(q);
      return matchCode || matchName || matchDesc;
    }
    return true;
  });

  const countBarangJasa = subComponents.filter((c) => c.mainType === 'BARANG_JASA').length;
  const countModalMesin = subComponents.filter((c) => c.mainType === 'MODAL_PERALATAN_MESIN').length;
  const countModalAsetLain = subComponents.filter((c) => c.mainType === 'MODAL_ASET_TETAP_LAINNYA').length;
  const countCustom = subComponents.filter((c) => c.isCustom).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#0B5D3B]" />
            <span>Konfigurasi Juknis BOSP & Master Objek Belanja</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen master sub-rincian objek belanja Dana BOSP. Admin Dinas dapat menambahkan komponen baru apabila terdapat revisi Juknis atau kebijakan fiskal daerah, dan otomatis tersinkronisasi ke seluruh RKAS Satuan Pendidikan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sub-Rincian Belanja Baru</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Sub-Rincian</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 font-mono">{subComponents.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">Item Master</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">23 Standar Baku Permendikbud</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Barang & Jasa</p>
            <Package className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-900 font-mono">{countBarangJasa}</span>
            <span className="text-[10px] text-slate-500">Sub-Rincian</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Kode Akun: 5.1.02.xx</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Modal Mesin</p>
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-900 font-mono">{countModalMesin}</span>
            <span className="text-[10px] text-slate-500">Sub-Rincian</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Kode Akun: 5.2.02.xx</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Kustom / Revisi Juknis</p>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-900 font-mono">{countCustom}</span>
            <span className="text-[10px] text-slate-500">Ditambahkan</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Dapat diedit & dihapus Admin</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedMainType('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              selectedMainType === 'ALL'
                ? 'bg-[#0B5D3B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Objek ({subComponents.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedMainType('BARANG_JASA')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              selectedMainType === 'BARANG_JASA'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Belanja Barang dan Jasa ({countBarangJasa})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMainType('MODAL_PERALATAN_MESIN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              selectedMainType === 'MODAL_PERALATAN_MESIN'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Belanja Modal Peralatan & Mesin ({countModalMesin})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMainType('MODAL_ASET_TETAP_LAINNYA')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              selectedMainType === 'MODAL_ASET_TETAP_LAINNYA'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Belanja Modal Aset Tetap Lainnya ({countModalAsetLain})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama sub-rincian..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#0B5D3B]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Kode Rekening</th>
                <th className="py-3 px-4">Nama Sub-Rincian Objek Belanja</th>
                <th className="py-3 px-4 w-48">Objek Belanja Utama</th>
                <th className="py-3 px-4 w-32 text-center">Status Juknis</th>
                <th className="py-3 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubComponents.map((sub, idx) => {
                const isBarangJasa = sub.mainType === 'BARANG_JASA';
                const isModalMesin = sub.mainType === 'MODAL_PERALATAN_MESIN';

                return (
                  <tr key={sub.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sub.code}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{sub.name}</p>
                      {sub.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{sub.description}</p>
                      )}
                      {sub.createdBy && (
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          Ditambahkan oleh: {sub.createdBy}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                          isBarangJasa
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : isModalMesin
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isBarangJasa
                          ? 'Belanja Barang & Jasa'
                          : isModalMesin
                          ? 'Modal Peralatan & Mesin'
                          : 'Modal Aset Tetap Lainnya'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.isCustom ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Revisi Kustom
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Standar Baku
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(sub)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Sub-Rincian"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {sub.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Sub-Rincian Kustom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSubComponents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan sub-rincian yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0B5D3B]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSub ? `Ubah Sub-Rincian (${editingSub.code})` : 'Tambah Sub-Rincian Objek Belanja Juknis Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {!editingSub && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pilih Objek Belanja Utama <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.mainType}
                    onChange={(e) => handleMainTypeChange(e.target.value as MainExpenditureType)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  >
                    <option value="BARANG_JASA">1. Belanja Barang dan Jasa (5.1.02)</option>
                    <option value="MODAL_PERALATAN_MESIN">2. Belanja Modal Peralatan dan Mesin (5.2.02)</option>
                    <option value="MODAL_ASET_TETAP_LAINNYA">3. Belanja Modal Aset Tetap Lainnya (5.2.05)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kode Rekening <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={!!editingSub}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. 5.1.02.18"
                    className={`w-full text-xs px-3 py-2 border rounded-lg font-mono outline-none ${
                      editingSub ? 'bg-slate-100 text-slate-600 border-slate-200' : 'border-slate-300 focus:ring-2 focus:ring-[#0B5D3B]'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Sub-Rincian Objek Belanja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Belanja Langganan Platform Belajar Digital"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Deskripsi / Keterangan Dasar Perubahan Juknis
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dasar hukum atau petunjuk teknis penambahan sub-rincian belanja baru ini..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                />
              </div>

              {!editingSub && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#0B5D3B]" />
                    Contoh Uraian Belanja Default (Dapat Diedit Sekolah di RKAS)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        1. Uraian Belanja
                      </label>
                      <input
                        type="text"
                        value={formData.itemDescription}
                        onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                        placeholder="Contoh: Lisensi Aplikasi & Platform Belajar Digital Siswa"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        2. Volume & 3. Satuan
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={formData.itemVolume}
                          onChange={(e) => setFormData({ ...formData, itemVolume: Number(e.target.value) })}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                        />
                        <input
                          type="text"
                          value={formData.itemUnit}
                          onChange={(e) => setFormData({ ...formData, itemUnit: e.target.value })}
                          placeholder="Paket / Bulan"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        4. Estimasi Harga Satuan (Rp)
                      </label>
                      <input
                        type="number"
                        step={50000}
                        value={formData.itemUnitPrice}
                        onChange={(e) => setFormData({ ...formData, itemUnitPrice: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                <span>
                  Sub-rincian baru ini akan otomatis masuk ke database master dan disinkronkan ke seluruh menu perencanaan RKAS sekolah di bawah naungan Dinas Pendidikan.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : editingSub ? 'Simpan Perubahan' : 'Simpan & Sinkronkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
