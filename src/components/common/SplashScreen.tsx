import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  autoTransitionMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  autoTransitionMs = 2800,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Memulai Enjin Sistem SIPANDA BOSP...');
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / autoTransitionMs) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStatusText('Menginisialisasi Master Data & Objek Belanja...');
      } else if (pct < 65) {
        setStatusText('Menyiapkan Otomasi Pembukuan BKU & Perpajakan...');
      } else if (pct < 90) {
        setStatusText('Menghubungkan Integrasi Google Spreadsheet & Drive...');
      } else {
        setStatusText('Sistem Siap Digunakan!');
      }

      if (elapsed >= autoTransitionMs) {
        clearInterval(interval);
        handleComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [autoTransitionMs]);

  const handleComplete = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, #0D4E33 0%, #073421 45%, #031D12 100%)',
      }}
    >
      {/* Ambient background glow elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top action: Skip intro button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-sm"
        >
          <span>Lewati Intro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-7 shadow-lg backdrop-blur-sm animate-pulse">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Sistem Informasi Tata Kelola BOSP Enterprise</span>
        </div>

        {/* LOGO CONTAINER WITH MOTION & AURA */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Pulsing Aura */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/30 to-amber-400/30 blur-xl animate-pulse-aura" />
          
          {/* Rotating Decorative Outer Ring */}
          <div className="absolute w-36 h-36 rounded-full border border-dashed border-amber-300/40 animate-spin-slow pointer-events-none" />
          
          {/* Inner Golden Ring */}
          <div className="absolute w-32 h-32 rounded-full border-2 border-emerald-400/40 shadow-inner pointer-events-none" />

          {/* Core Logo Emblem with 3D Float */}
          <div className="relative w-28 h-28 rounded-full bg-slate-900 p-1.5 shadow-2xl border-2 border-amber-400/60 animate-logo-float overflow-hidden">
            <img
              src="/src/assets/images/sipanda_logo_emblem_1793504282746.jpg"
              alt="Logo SIPANDA BOSP"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        {/* APP NAME WITH GLOWING SHIMMER TEXT */}
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span className="text-gold-shimmer drop-shadow-md">SIPANDA</span>
            <span className="text-white drop-shadow-sm">BOSP</span>
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-emerald-200/90 tracking-wide uppercase">
            Sistem Informasi Pengelolaan & Administrasi Dana BOSP
          </p>

          <p className="text-[11px] text-slate-300/75 max-w-md mx-auto leading-relaxed pt-1">
            Edisi Profesional Terintegrasi · Rekonsiliasi Kas Otomatis, Standar Objek Belanja Juknis, dan Sinkronisasi 28 Sheet
          </p>
        </div>

        {/* PROGRESS BAR & STATUS */}
        <div className="w-full max-w-xs space-y-2.5">
          <div className="w-full bg-white/10 rounded-full h-2 p-0.5 border border-white/15 overflow-hidden backdrop-blur-xs">
            <div
              className="bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 h-full rounded-full transition-all duration-150 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-100/80 font-mono">
            <span className="truncate pr-2">{statusText}</span>
            <span className="font-bold text-amber-300">{progress}%</span>
          </div>
        </div>

        {/* Quick Launch CTA if complete */}
        <div className="mt-7">
          <button
            type="button"
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#0B5D3B] hover:from-emerald-500 hover:to-[#16865A] text-white text-xs font-bold border border-emerald-400/40 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Masuk ke Halaman Login</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-5 text-center text-[10px] text-emerald-300/50 space-y-0.5">
        <p>© 2026 SIPANDA BOSP Enterprise · Dikembangkan oleh Fadly Ginoga, S.Pd.</p>
        <p>Kementerian Pendidikan Dasar dan Menengah · Tata Kelola BOSP Akuntabel & Transparan</p>
      </div>
    </div>
  );
};
