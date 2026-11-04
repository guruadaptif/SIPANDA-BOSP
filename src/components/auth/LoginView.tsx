import React, { useState } from 'react';
import { User, School } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { SplashScreen } from '../common/SplashScreen.tsx';
import { 
  ShieldCheck, 
  UserCircle, 
  KeyRound, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  ArrowLeft, 
  Clock, 
  School as SchoolIcon, 
  Phone, 
  Mail, 
  CreditCard, 
  MapPin,
  FileText,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { PROVINSI_LIST, getKecamatanOptions } from '../../data/indonesiaRegions.ts';

interface LoginViewProps {
  onLoginSuccess: (user: User, school?: School | null) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Self-Registration form state
  const [regSuccess, setRegSuccess] = useState<boolean>(false);
  const [regMessage, setRegMessage] = useState<string>('');
  const [regData, setRegData] = useState({
    npsn: '',
    name: '',
    status: 'Negeri' as 'Negeri' | 'Swasta',
    level: 'SD' as 'SD' | 'SMP' | 'SMA' | 'SMK',
    address: '',
    village: '',
    subdistrict: '',
    district: '',
    province: 'Jawa Barat',
    postalCode: '',
    phone: '',
    email: '',
    headmasterName: '',
    headmasterNip: '',
    treasurerName: '',
    treasurerNip: '',
    treasurerPhone: '',
    treasurerEmail: '',
    committeeName: '',
    bankAccount: '',
    bankName: 'Bank BJB',
    npwp: '',
    initialPagu: 200000000,
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setErrorStatus('');
    try {
      const res = await api.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user, res.school);
      } else {
        setErrorMsg(res.message || 'Login gagal. Periksa username dan password.');
        if ((res as any).status) {
          setErrorStatus((res as any).status);
        }
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorStatus('');

    if (regData.password !== regData.confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!regData.npsn || regData.npsn.length < 8) {
      setErrorMsg('NPSN harus terdiri dari 8 digit angka.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.registerSchool(regData);
      if (res.success) {
        setRegSuccess(true);
        setRegMessage(res.message || 'Pendaftaran berhasil dikirim.');
      } else {
        setErrorMsg(res.message || 'Gagal mendaftarkan sekolah.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan saat mengirimkan data pendaftaran.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        {/* Official Emblem Logo */}
        <div className="mx-auto w-20 h-20 mb-3 flex items-center justify-center">
          <img
            src="/src/assets/images/sipanda_logo_emblem_1793504282746.jpg"
            alt="Emblem SIPANDA BOSP"
            className="w-20 h-20 object-contain rounded-full shadow-md border-2 border-emerald-700/30"
          />
        </div>

        <h1 className="text-2xl font-black text-[#0B5D3B] tracking-tight">
          SIPANDA BOSP
        </h1>
        <p className="text-xs font-semibold text-slate-700 mt-0.5 uppercase tracking-wider">
          Sistem Informasi Pengelolaan & Administrasi Dana BOSP
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Edisi Profesional Enterprise · Terintegrasi Standar Objek Belanja & Otomasi Pembukuan BOSP
        </p>
      </div>

      <div className={`mt-6 sm:mx-auto sm:w-full ${activeTab === 'LOGIN' ? 'sm:max-w-md' : 'sm:max-w-2xl'}`}>
        <div className="bg-white py-6 px-6 sm:px-8 shadow-lg rounded-2xl border border-slate-200">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mb-6 pb-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMsg('');
                setErrorStatus('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'LOGIN'
                  ? 'bg-[#0B5D3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Masuk ke Sistem
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMsg('');
                setErrorStatus('');
                setRegSuccess(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'REGISTER'
                  ? 'bg-[#0B5D3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Pendaftaran Mandiri Sekolah
            </button>
          </div>

          {/* Status & Error Alerts */}
          {errorMsg && (
            <div className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              errorStatus === 'MENUNGGU_VERIFIKASI'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : errorStatus === 'DINONAKTIFKAN'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {errorStatus === 'MENUNGGU_VERIFIKASI' ? (
                <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {errorStatus === 'MENUNGGU_VERIFIKASI'
                    ? 'Status: Menunggu Verifikasi Admin Dinas'
                    : errorStatus === 'DINONAKTIFKAN'
                    ? 'Peringatan: Akun Dinonaktifkan Sementara'
                    : 'Gagal Masuk'}
                </p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 1: MASUK KE SISTEM (LOGIN)                            */}
          {/* ========================================================== */}
          {activeTab === 'LOGIN' && (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Username / Akun Pengguna
                  </label>
                  <div className="relative">
                    <UserCircle className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username atau email..."
                      className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Sandi</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full text-xs pl-9 pr-10 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  {isLoading ? 'Memverifikasi Hak Akses...' : 'Masuk ke Aplikasi SIPANDA BOSP'}
                </button>
              </form>

              {/* Tombol Putar Ulang Animasi */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowSplash(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Putar Ulang Animasi Logo & Intro Pembuka</span>
                </button>
              </div>
            </>
          )}

          {/* ========================================================== */}
          {/* TAB 2: PENDAFTARAN MANDIRI SEKOLAH BARU                   */}
          {/* ========================================================== */}
          {activeTab === 'REGISTER' && (
            <div>
              {regSuccess ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Pendaftaran Berhasil Diajukan!</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {regMessage}
                    </p>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-700" />
                        Langkah Selanjutnya:
                      </p>
                      <p>1. Akun Anda saat ini berstatus <strong>Menunggu Verifikasi</strong>.</p>
                      <p>2. Admin Dinas Pendidikan akan meneliti kelengkapan berkas dan NPSN satuan pendidikan Anda.</p>
                      <p>3. Setelah diverifikasi dan diaktifkan oleh Dinas, Anda dapat langsung masuk menggunakan username <strong>{regData.username}</strong>.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(regData.username);
                      setPassword('');
                      setActiveTab('LOGIN');
                      setRegSuccess(false);
                    }}
                    className="px-6 py-2 bg-[#0B5D3B] text-white text-xs font-bold rounded-lg hover:bg-[#16865A] transition-colors"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-slate-700 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">Formulir Pendaftaran Mandiri Satuan Pendidikan</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Isikan data profil sekolah, penanggung jawab, rekening operasional BOSP, dan kredensial bendahara. Admin Dinas akan memverifikasi permohonan sebelum akun diaktifkan.
                      </p>
                    </div>
                  </div>

                  {/* Bagian 1: Identitas Satuan Pendidikan */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <SchoolIcon className="w-4 h-4 text-[#0B5D3B]" />
                      1. Identitas Satuan Pendidikan
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          NPSN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={regData.npsn}
                          onChange={(e) => setRegData({ ...regData, npsn: e.target.value })}
                          placeholder="8 Digit NPSN (e.g. 20104829)"
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#0B5D3B] outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nama Satuan Pendidikan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regData.name}
                          onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                          placeholder="Contoh: SMP Negeri 05 Nusantara"
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Status Sekolah <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={regData.status}
                          onChange={(e) => setRegData({ ...regData, status: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] outline-none bg-white"
                        >
                          <option value="Negeri">Negeri (Honor Max 20%)</option>
                          <option value="Swasta">Swasta (Honor Max 40%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Jenjang Pendidikan <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={regData.level}
                          onChange={(e) => setRegData({ ...regData, level: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B5D3B] outline-none bg-white"
                        >
                          <option value="SD">SD (Sekolah Dasar)</option>
                          <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                          <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                          <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Estimasi Pagu BOSP Tahunan (Rp)
                        </label>
                        <input
                          type="number"
                          step={1000000}
                          value={regData.initialPagu}
                          onChange={(e) => setRegData({ ...regData, initialPagu: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#0B5D3B] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Alamat Jalan / Gedung</label>
                        <input
                          type="text"
                          value={regData.address}
                          onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                          placeholder="Jalan, Nomor, RT/RW"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Kecamatan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          list="reg-subdistrict-list"
                          value={regData.subdistrict}
                          onChange={(e) => setRegData({ ...regData, subdistrict: e.target.value })}
                          placeholder="Pilih atau ketik kecamatan..."
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white text-xs"
                        />
                        <datalist id="reg-subdistrict-list">
                          {getKecamatanOptions(regData.province).map((kec) => (
                            <option key={kec} value={kec} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Kabupaten / Kota <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regData.district}
                          onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                          placeholder="Contoh: Kota Bandung, Kab. Sleman"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Provinsi <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={regData.province}
                          onChange={(e) => setRegData({ ...regData, province: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0B5D3B] bg-white text-xs"
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

                  {/* Bagian 2: Pejabat & Bendahara */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <UserCircle className="w-4 h-4 text-[#0B5D3B]" />
                      2. Pejabat Satuan Pendidikan & Rekening BOSP
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={regData.headmasterName}
                          onChange={(e) => setRegData({ ...regData, headmasterName: e.target.value })}
                          placeholder="Nama lengkap beserta gelar"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">NIP Kepala Sekolah</label>
                        <input
                          type="text"
                          value={regData.headmasterNip}
                          onChange={(e) => setRegData({ ...regData, headmasterNip: e.target.value })}
                          placeholder="197xxxxxx (atau - jika swasta)"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nama Bendahara BOSP <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regData.treasurerName}
                          onChange={(e) => setRegData({ ...regData, treasurerName: e.target.value })}
                          placeholder="Nama lengkap bendahara"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">NIP Bendahara</label>
                        <input
                          type="text"
                          value={regData.treasurerNip}
                          onChange={(e) => setRegData({ ...regData, treasurerNip: e.target.value })}
                          placeholder="198xxxxxx (atau - jika non-PNS)"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Nama Komite Sekolah <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regData.committeeName}
                          onChange={(e) => setRegData({ ...regData, committeeName: e.target.value })}
                          placeholder="Contoh: Drs. H. Ahmad Fauzi"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">No. Rekening Bank BOSP</label>
                        <input
                          type="text"
                          value={regData.bankAccount}
                          onChange={(e) => setRegData({ ...regData, bankAccount: e.target.value })}
                          placeholder="138-00-xxxxxxx-x"
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Nama Bank Penampung</label>
                        <input
                          type="text"
                          value={regData.bankName}
                          onChange={(e) => setRegData({ ...regData, bankName: e.target.value })}
                          placeholder="Bank BJB Cabang Cirebon"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Akun Pengguna Bendahara */}
                  <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <KeyRound className="w-4 h-4 text-[#0B5D3B]" />
                      3. Buat Kredensial Akun Bendahara
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Username Baru <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regData.username}
                          onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                          placeholder="bendahara_smp05"
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Kata Sandi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={regData.password}
                          onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                          placeholder="Minimal 6 karakter"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Ulangi Kata Sandi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={regData.confirmPassword}
                          onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                          placeholder="Sama dengan kata sandi"
                          className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('LOGIN')}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 font-bold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-sm transition-colors text-center"
                    >
                      {isLoading ? 'Mengirim Data Pendaftaran...' : 'Kirim Pendaftaran Mandiri ke Dinas Pendidikan'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        <div className="text-center mt-6 text-xs text-slate-500 space-y-1">
          <p>© 2026 Design by. Fadly Ginoga, S.Pd</p>
          <p>Tata Kelola Keuangan Satuan Pendidikan Akuntabel, Transparan, dan Terintegrasi</p>
        </div>
      </div>
    </div>
  );
};
