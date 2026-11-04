import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatDriveImageUrl, getDriveFolderUrl } from '../../utils/driveHelper.ts';
import { 
  Save, 
  Check, 
  Upload, 
  Building2, 
  Image as ImageIcon, 
  ExternalLink, 
  FolderOpen, 
  Sparkles, 
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface SystemSettingsViewProps {
  user: User;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({ user }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const res = await api.getSettings();
    if (res.success) {
      setSettings(res.settings);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        setSettings(res.settings);
        setSuccessMsg('Pengaturan sistem, logo dinas, dan logo aplikasi berhasil disimpan dan disinkronkan ke Spreadsheet!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Memuat konfigurasi sistem & branding...
      </div>
    );
  }

  const dinasLogoPreview = formatDriveImageUrl(settings.logoDinasUrl);
  const appLogoPreview = formatDriveImageUrl(settings.logoAppUrl) || '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#0B5D3B]" />
          <span>Pengaturan Sistem, Branding & Folder Google Drive</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola logo Dinas Pendidikan, logo brand aplikasi, dan tautan folder Google Drive tempat penyimpanan logo tanpa memerlukan API berbayar atau izin rumit.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Logo Branding (Dinas & Aplikasi) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <ImageIcon className="w-4 h-4" />
            <span>1. Manajemen Logo Dinas & Logo Aplikasi (Google Drive / Berkas)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Logo Dinas Pendidikan */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#0B5D3B]" />
                    <span>Logo Dinas Pendidikan</span>
                  </label>
                  {settings.logoDinasUrl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Terpasang
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akan dicetak di sisi kanan / atas kop surat resmi kedinasan dan laporan pengawasan BOSP.
                </p>

                {/* Preview & Action */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-1.5 shrink-0 shadow-2xs overflow-hidden">
                    {dinasLogoPreview ? (
                      <img
                        src={dinasLogoPreview}
                        alt="Logo Dinas"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
                        }}
                      />
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto" />
                        <span className="text-[9px] text-slate-400 block mt-0.5">Belum Ada</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors w-fit">
                      <Upload className="w-3.5 h-3.5 text-[#0B5D3B]" />
                      <span>Pilih File Gambar</span>
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
                              setSettings({ ...settings, logoDinasUrl: base64 });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {settings.logoDinasUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoDinasUrl: '' })}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo Dinas</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Input Google Drive File Link */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Atau Tempelkan Link / ID File Google Drive:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={settings.logoDinasUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoDinasUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view atau ID file"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white font-mono"
                  />
                  {settings.logoDinasUrl && settings.logoDinasUrl.startsWith('http') && (
                    <a
                      href={settings.logoDinasUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Logo Aplikasi SIPANDA BOSP */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Logo Aplikasi (Brand SIPANDA BOSP)</span>
                  </label>
                  {settings.logoAppUrl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Kustom Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tampil pada header aplikasi, menu samping, dan layar intro pembuka aplikasi.
                </p>

                {/* Preview & Action */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center p-1.5 shrink-0 shadow-2xs overflow-hidden">
                    <img
                      src={appLogoPreview}
                      alt="Logo Aplikasi"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-2xs cursor-pointer transition-colors w-fit">
                      <Upload className="w-3.5 h-3.5 text-[#0B5D3B]" />
                      <span>Pilih File Gambar</span>
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
                              setSettings({ ...settings, logoAppUrl: base64 });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {settings.logoAppUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoAppUrl: '' })}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kembalikan Emblem Bawaan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Input Google Drive File Link */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Atau Tempelkan Link / ID File Google Drive:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={settings.logoAppUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoAppUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/.../view atau ID file"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B5D3B] bg-white font-mono"
                  />
                  {settings.logoAppUrl && settings.logoAppUrl.startsWith('http') && (
                    <a
                      href={settings.logoAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Folder Google Drive Khusus Tempat Logo */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span>2. Folder Google Drive Penyimpanan Logo Terpusat</span>
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Anda dapat menentukan tautan folder Google Drive yang Anda sediakan. Folder ini digunakan sebagai tempat mengumpulkan seluruh berkas logo sekolah dan kedinasan.
          </p>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              URL / Link Berbagi Folder Google Drive
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.driveFolderUrl || ''}
                onChange={(e) => setSettings({ ...settings, driveFolderUrl: e.target.value })}
                placeholder="Contoh: https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ?usp=sharing"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white font-mono"
              />
              {settings.driveFolderUrl && (
                <a
                  href={getDriveFolderUrl(settings.driveFolderUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-amber-700" />
                  <span>Buka Folder Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>💡</span> Cara Penggunaan Praktis Folder Google Drive:
              </p>
              <p>1. Buat sebuah folder di Google Drive Anda (misalnya dinamai <strong>"Logo SIPANDA BOSP"</strong>).</p>
              <p>2. Klik kanan folder tersebut &gt; <strong>Bagikan (Share)</strong> &gt; Ubah akses menjadi <strong>"Siapa saja yang memiliki link"</strong> (Anyone with the link).</p>
              <p>3. Unggah gambar logo sekolah / dinas ke dalam folder tersebut.</p>
              <p>4. Untuk memasang logo, cukup klik kanan file logo di dalam folder Drive &gt; Salin Link &gt; Tempelkan pada kolom logo sekolah atau logo dinas di atas. Selesai!</p>
            </div>
          </div>
        </div>

        {/* Section 3: Identitas Aplikasi & Pejabat Dinas */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4" />
            <span>3. Identitas Aplikasi & Pimpinan Dinas Pendidikan</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Resmi Aplikasi
              </label>
              <input
                type="text"
                required
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tahun Anggaran Aktif
              </label>
              <input
                type="number"
                value={settings.activeFiscalYear}
                onChange={(e) => setSettings({ ...settings, activeFiscalYear: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Lembaga / Dinas Pendidikan
              </label>
              <input
                type="text"
                value={settings.dinasPendidikanName || ''}
                onChange={(e) => setSettings({ ...settings, dinasPendidikanName: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Kepala Dinas Pendidikan
              </label>
              <input
                type="text"
                value={settings.dinasHeadName || ''}
                onChange={(e) => setSettings({ ...settings, dinasHeadName: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                NIP Kepala Dinas Pendidikan
              </label>
              <input
                type="text"
                value={settings.dinasHeadNip || ''}
                onChange={(e) => setSettings({ ...settings, dinasHeadNip: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Sinkronisasi Google Spreadsheet (28 Sheet) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B5D3B] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>4. Database Google Spreadsheet (28 Sheet Lengkap)</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Tanpa Biaya / 100% Gratis
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Seluruh data transaksi, kuitansi, pembukuan kas umum (BKU), pajak, dan tautan logo tersimpan aman dalam Google Spreadsheet 28 Sheet melalui Google Apps Script Web App gratis tanpa memerlukan Google Cloud Billing.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="/api/database/excel-export"
              download
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Unduh File Excel Database (.xlsx)</span>
            </a>

            <a
              href="/api/database/backup"
              download
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>Unduh Cadangan JSON</span>
            </a>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-7 py-3 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-xl shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan & Menyinkronkan...' : 'Simpan Seluruh Pengaturan & Tautan Logo'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
