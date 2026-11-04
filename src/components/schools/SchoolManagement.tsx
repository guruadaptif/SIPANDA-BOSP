import React, { useState, useEffect, useMemo } from 'react';
import { School, User } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { PROVINSI_LIST, getKecamatanOptions, getKabupatenOptions } from '../../data/indonesiaRegions.ts';
import { formatDriveImageUrl } from '../../utils/driveHelper.ts';
import { 
  Building2, 
  Save, 
  Check, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  PauseCircle, 
  PlayCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Upload,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface SchoolManagementProps {
  user: User;
  currentSchool?: School | null;
  onRefreshSchool: () => void;
}

export const SchoolManagement: React.FC<SchoolManagementProps> = ({
  user,
  currentSchool,
  onRefreshSchool,
}) => {
  const isAdmin = user.role === 'ADMIN_DINAS';
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(currentSchool || null);
  const [formData, setFormData] = useState<Partial<School>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  
  // Status & Wilayah filter for Admin Dinas
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI' | 'DINONAKTIFKAN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProvince, setFilterProvince] = useState<string>('ALL');
  const [filterKabupaten, setFilterKabupaten] = useState<string>('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('ALL');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (currentSchool && !isAdmin) {
      setSelectedSchool(currentSchool);
      setFormData(currentSchool);
    }
  }, [currentSchool, isAdmin]);

  const loadSchools = async () => {
    const res = await api.getSchools();
    if (res.success) {
      setSchools(res.schools);
      if (!selectedSchool && res.schools.length > 0) {
        setSelectedSchool(res.schools[0]);
        setFormData(res.schools[0]);
      } else if (selectedSchool) {
        const updated = res.schools.find(s => s.id === selectedSchool.id);
        if (updated) {
          setSelectedSchool(updated);
          setFormData(updated);
        }
      }
    }
  };

  const handleSelectSchool = (s: School) => {
    setSelectedSchool(s);
    setFormData(s);
    setIsCreatingNew(false);
    setActionSuccessMsg('');
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedSchool(null);
    setFormData({
      name: '',
      npsn: '',
      status: 'Negeri',
      level: 'SD',
      address: '',
      village: '',
      subdistrict: '',
      district: 'Kota Cirebon',
      province: 'Jawa Barat',
      postalCode: '',
      headmasterName: '',
      headmasterNip: '',
      treasurerName: '',
      treasurerNip: '',
      bankAccount: '',
      bankName: 'Bank BJB',
      npwp: '',
      phone: '',
      email: '',
      verificationStatus: 'TERVERIFIKASI',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isCreatingNew) {
        const res = await api.createSchool(formData);
        if (res.success) {
          setSaveSuccess(true);
          await loadSchools();
          setSelectedSchool(res.school);
          setFormData(res.school);
          setIsCreatingNew(false);
          onRefreshSchool();
        }
      } else if (selectedSchool) {
        const res = await api.updateSchool(selectedSchool.id, formData);
        if (res.success) {
          setSaveSuccess(true);
          await loadSchools();
          setSelectedSchool(res.school);
          setFormData(res.school);
          onRefreshSchool();
        }
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusAction = async (action: 'verify' | 'suspend' | 'activate') => {
    if (!selectedSchool) return;
    setIsSaving(true);
    try {
      const res = await api.updateSchoolStatus(selectedSchool.id, action, user.name);
      if (res.success && res.school) {
        setSelectedSchool(res.school);
        setFormData(res.school);
        setActionSuccessMsg(
          action === 'verify'
            ? `Akun sekolah ${res.school.name} berhasil DIVERIFIKASI dan DIAKTIFKAN.`
            : action === 'suspend'
            ? `Akun sekolah ${res.school.name} berhasil DINONAKTIFKAN SEMENTARA.`
            : `Akun sekolah ${res.school.name} berhasil DIAKTIFKAN KEMBALI.`
        );
        await loadSchools();
        onRefreshSchool();
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchool) return;
    setIsSaving(true);
    try {
      const res = await api.deleteSchool(selectedSchool.id);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setActionSuccessMsg(`Akun sekolah ${selectedSchool.name} dan seluruh data terkait telah berhasil dihapus.`);
        setSelectedSchool(null);
        await loadSchools();
        onRefreshSchool();
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Standard list of 38 Indonesian Provinces + any custom ones
  const distinctProvince = useMemo(() => {
    const list = [...PROVINSI_LIST];
    schools.forEach(s => {
      const p = s.province?.trim();
      if (p && !list.includes(p)) list.push(p);
    });
    return list;
  }, [schools]);

  // Standard list of Kabupaten / Kota filtered by selected province + custom ones
  const distinctKabupaten = useMemo(() => {
    const extraDistricts = schools.map(s => s.district || '').filter(Boolean);
    return getKabupatenOptions(filterProvince, extraDistricts);
  }, [filterProvince, schools]);

  // Standard list of Kecamatan filtered by selected province + custom ones
  const distinctKecamatan = useMemo(() => {
    const extraSubs = schools.map(s => s.subdistrict || '').filter(Boolean);
    return getKecamatanOptions(filterProvince, extraSubs);
  }, [filterProvince, schools]);

  // Filter schools for Admin
  const filteredSchools = schools.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      s.name.toLowerCase().includes(q) ||
      s.npsn.includes(q) ||
      (s.subdistrict && s.subdistrict.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.province && s.province.toLowerCase().includes(q))
    );
    if (!matchesQuery) return false;
    if (filterProvince !== 'ALL' && s.province?.toLowerCase() !== filterProvince.toLowerCase()) return false;
    if (filterKabupaten !== 'ALL' && s.district?.toLowerCase() !== filterKabupaten.toLowerCase()) return false;
    if (filterKecamatan !== 'ALL' && s.subdistrict?.toLowerCase() !== filterKecamatan.toLowerCase()) return false;
    if (statusFilter === 'ALL') return true;
    return (s.verificationStatus || 'TERVERIFIKASI') === statusFilter;
  });

  const pendingCount = schools.filter(s => (s.verificationStatus || 'TERVERIFIKASI') === 'MENUNGGU_VERIFIKASI').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0B5D3B]" />
            <span>Master Data Profil & Verifikasi Satuan Pendidikan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan identitas resmi sekolah, verifikasi pendaftaran mandiri, penonaktifan sementara, dan penghapusan akun sekolah.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sekolah Baru</span>
          </button>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* School List Sidebar for Admin Dinas */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daftar Sekolah ({filteredSchools.length}/{schools.length})
              </p>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold animate-pulse">
                  {pendingCount} Menunggu
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, NPSN, kec, atau prov..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#0B5D3B]"
              />
            </div>

            {/* Filter Wilayah: Provinsi, Kabupaten/Kota, & Kecamatan */}
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Filter Provinsi</label>
                <select
                  value={filterProvince}
                  onChange={(e) => {
                    setFilterProvince(e.target.value);
                    setFilterKabupaten('ALL');
                    setFilterKecamatan('ALL');
                  }}
                  className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-[#0B5D3B]"
                >
                  <option value="ALL">Semua Provinsi</option>
                  {distinctProvince.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Filter Kab/Kota</label>
                  <select
                    value={filterKabupaten}
                    onChange={(e) => setFilterKabupaten(e.target.value)}
                    className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-[#0B5D3B]"
                  >
                    <option value="ALL">Semua Kab/Kota</option>
                    {distinctKabupaten.map((kab) => (
                      <option key={kab} value={kab}>
                        {kab}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Filter Kecamatan</label>
                  <select
                    value={filterKecamatan}
                    onChange={(e) => setFilterKecamatan(e.target.value)}
                    className="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-[#0B5D3B]"
                  >
                    <option value="ALL">Semua Kec.</option>
                    {distinctKecamatan.map((kec) => (
                      <option key={kec} value={kec}>
                        Kec. {kec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {(searchQuery || filterProvince !== 'ALL' || filterKabupaten !== 'ALL' || filterKecamatan !== 'ALL') && (
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span>Filter aktif</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterProvince('ALL');
                    setFilterKabupaten('ALL');
                    setFilterKecamatan('ALL');
                  }}
                  className="text-red-600 hover:underline font-semibold cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 text-[10px] font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'ALL' ? 'bg-[#0B5D3B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('MENUNGGU_VERIFIKASI')}
                className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  statusFilter === 'MENUNGGU_VERIFIKASI' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('TERVERIFIKASI')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'TERVERIFIKASI' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setStatusFilter('DINONAKTIFKAN')}
                className={`px-2 py-1 rounded transition-colors ${
                  statusFilter === 'DINONAKTIFKAN' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Nonaktif
              </button>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredSchools.map((s) => {
                const isSelected = selectedSchool?.id === s.id && !isCreatingNew;
                const status = s.verificationStatus || 'TERVERIFIKASI';

                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSchool(s)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-[#0B5D3B] text-slate-900 font-semibold shadow-xs ring-1 ring-[#0B5D3B]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-bold truncate text-xs">{s.name}</p>
                      {status === 'MENUNGGU_VERIFIKASI' && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Menunggu
                        </span>
                      )}
                      {status === 'DINONAKTIFKAN' && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                          Nonaktif
                        </span>
                      )}
                      {status === 'TERVERIFIKASI' && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>NPSN: {s.npsn}</span>
                      <span className="font-semibold text-slate-600">{s.status} · {s.level}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 truncate font-medium">
                      <span>📍</span>
                      <span className="truncate">{s.subdistrict ? `Kec. ${s.subdistrict}` : '-'}, {s.province || 'Jawa Barat'}</span>
                    </div>
                  </button>
                );
              })}

              {filteredSchools.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Tidak ada sekolah sesuai filter.</p>
              )}
            </div>
          </div>
        )}

        {/* Profile Form & Admin Management Controls */}
        <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-xs ${isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          
          {/* Header & Verification Controls Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isCreatingNew
                    ? 'Registrasi Satuan Pendidikan Baru'
                    : `Profil: ${selectedSchool?.name || ''}`}
                </h3>
                {selectedSchool && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    (selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'MENUNGGU_VERIFIKASI'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : (selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'DINONAKTIFKAN'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {(selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'MENUNGGU_VERIFIKASI'
                      ? 'Menunggu Verifikasi Dinas'
                      : (selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'DINONAKTIFKAN'
                      ? 'Dinonaktifkan Sementara'
                      : 'Terverifikasi & Aktif'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCreatingNew 
                  ? 'Input data sekolah baru langsung oleh Tim Manajemen Dinas Pendidikan.'
                  : `NPSN: ${selectedSchool?.npsn || '-'} · ${selectedSchool?.address || ''}, ${selectedSchool?.district || ''}`}
              </p>
            </div>

            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <Check className="w-4 h-4" /> Data Berhasil Disimpan
              </span>
            )}
          </div>

          {/* ADMIN VERIFICATION / SUSPENSION / DELETE CONTROLS */}
          {isAdmin && selectedSchool && !isCreatingNew && (
            <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B5D3B]" />
                  Kontrol Hak Akses Satuan Pendidikan
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kelola status verifikasi pendaftaran mandiri, nonaktifkan akses sementara bila terdapat audit internal, atau hapus akun sekolah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* When pending verification */}
                {(selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'MENUNGGU_VERIFIKASI' && (
                  <button
                    type="button"
                    onClick={() => handleStatusAction('verify')}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verifikasi & Aktifkan</span>
                  </button>
                )}

                {/* When active */}
                {(selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'TERVERIFIKASI' && (
                  <button
                    type="button"
                    onClick={() => handleStatusAction('suspend')}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Nonaktifkan Sementara</span>
                  </button>
                )}

                {/* When suspended */}
                {(selectedSchool.verificationStatus || 'TERVERIFIKASI') === 'DINONAKTIFKAN' && (
                  <button
                    type="button"
                    onClick={() => handleStatusAction('activate')}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Aktifkan Kembali</span>
                  </button>
                )}

                {/* Delete School Button */}
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Akun</span>
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Konfirmasi Hapus Akun Sekolah</h4>
                    <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan!</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data satuan pendidikan <strong>{selectedSchool?.name}</strong> (NPSN: {selectedSchool?.npsn})? 
                  Seluruh akun bendahara, anggaran RKAS, pembukuan kas umum, kuitansi, dan rekonsiliasi yang berkaitan akan dihapus permanen dari basis data.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSchool}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    Ya, Hapus Permanen
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Identitas Pokok */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] mb-3">
                1. Identitas Pokok & Alamat Satuan Pendidikan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Resmi Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NPSN (Nomor Pokok Sekolah Nasional) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formData.npsn || ''}
                    onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Status Sekolah *
                  </label>
                  <select
                    value={formData.status || 'Negeri'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                  >
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jenjang Pendidikan *
                  </label>
                  <select
                    value={formData.level || 'SD'}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                  >
                    <option value="SD">SD / MI</option>
                    <option value="SMP">SMP / MTs</option>
                    <option value="SMA">SMA / MA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Alamat Jalan / Gedung
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Desa / Kelurahan
                  </label>
                  <input
                    type="text"
                    value={formData.village || ''}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kecamatan *
                  </label>
                  <input
                    type="text"
                    required
                    list="form-kecamatan-list"
                    placeholder="Pilih atau ketik kecamatan..."
                    value={formData.subdistrict || ''}
                    onChange={(e) => setFormData({ ...formData, subdistrict: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                  />
                  <datalist id="form-kecamatan-list">
                    {getKecamatanOptions(formData.province).map((kec) => (
                      <option key={kec} value={kec} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kabupaten / Kota *
                  </label>
                  <input
                    type="text"
                    required
                    list="form-kabupaten-list"
                    placeholder="Pilih atau ketik kab/kota..."
                    value={formData.district || ''}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                  />
                  <datalist id="form-kabupaten-list">
                    {getKabupatenOptions(formData.province).map((kab) => (
                      <option key={kab} value={kab} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Provinsi *
                  </label>
                  <select
                    required
                    value={formData.province || 'Jawa Barat'}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                  >
                    {PROVINSI_LIST.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Pejabat & Penandatangan */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] mb-3">
                2. Pejabat Penandatangan Dokumen Resmi & Kuitansi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Kepala Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.headmasterName || ''}
                    onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.headmasterNip || ''}
                    onChange={(e) => setFormData({ ...formData, headmasterNip: e.target.value })}
                    placeholder="Contoh: 19690310 199303 2 004 (atau - jika swasta)"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Bendahara BOSP *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.treasurerName || ''}
                    onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Komite Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.committeeName || ''}
                    onChange={(e) => setFormData({ ...formData, committeeName: e.target.value })}
                    placeholder="Contoh: Drs. H. Ahmad Fauzi"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Rekening & Pajak */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] mb-3">
                3. Rekening Penampung BOSP & Perpajakan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Bank Penampung *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nomor Rekening Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankAccount || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    NPWP Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.npwp || ''}
                    onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Logo Satuan Pendidikan (Folder Google Drive / Unggah) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>4. Logo Resmi Satuan Pendidikan (Kop Surat & Cetakan Berkas)</span>
              </h4>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Live Preview Box */}
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-1.5 shrink-0 shadow-2xs overflow-hidden relative">
                    <img
                      src={formatDriveImageUrl(formData.logoUrl) || '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg'}
                      alt="Preview Logo Sekolah"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-bold text-slate-800">
                      {formData.logoUrl ? 'Logo Kustom Sekolah Terpasang' : 'Logo Standar Aktif (Belum Mengunggah Logo Sendiri)'}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Logo ini akan dicetak secara otomatis dengan ukuran proporsional di samping kiri kop surat resmi sekolah (Surat Tugas, SPTJM, SPPD, Kuitansi, dan Berita Acara).
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-[#0B5D3B]" />
                        <span>Pilih File Gambar Logo (JPG/PNG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setFormData({ ...formData, logoUrl: base64 });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Hapus / Kembalikan Standar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input Tautan / ID File Google Drive dari Folder Logo Anda */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Atau Tempelkan Link Berbagi / ID File Google Drive dari Folder Logo Anda
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.logoUrl || ''}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      placeholder="Contoh: https://drive.google.com/file/d/1A2B3C4D5E.../view?usp=sharing atau ID file Google Drive"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white font-mono"
                    />
                    {formData.logoUrl && formData.logoUrl.startsWith('http') && (
                      <a
                        href={formData.logoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 shrink-0 transition-colors"
                        title="Buka tautan file di Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 <strong>Tips Google Drive:</strong> Cukup buka folder Google Drive Anda &gt; Klik kanan file logo &gt; Bagikan (*Share*) &gt; Pilih "Siapa saja yang memiliki link" (*Anyone with the link*) &gt; Salin link lalu tempelkan di sini. Logo otomatis sinkron dan tersimpan permanen di database spreadsheet tanpa perlu upload berulang kali.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
