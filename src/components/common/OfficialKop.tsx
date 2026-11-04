import React, { useState, useEffect } from 'react';
import { School } from '../../types/index.ts';
import { formatDriveImageUrl } from '../../utils/driveHelper.ts';
import { api } from '../../services/api.ts';

interface OfficialKopProps {
  school: School;
  customLogoUrl?: string;
}

export const OfficialKop: React.FC<OfficialKopProps> = ({ school, customLogoUrl }) => {
  const [dinasLogo, setDinasLogo] = useState<string>('');

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.success && res.settings?.logoDinasUrl) {
        setDinasLogo(res.settings.logoDinasUrl);
      }
    }).catch(() => {});
  }, []);

  // School logo prioritized, with fallback to emblem
  const schoolLogoSrc = formatDriveImageUrl(customLogoUrl || school.logoUrl) || '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
  const dinasLogoSrc = formatDriveImageUrl(dinasLogo);

  return (
    <div className="w-full text-center mb-6 border-b-4 border-black pb-3 print:mb-4">
      <div className="flex items-center justify-between gap-3 px-2">
        {/* Logo Sekolah di samping kiri kop surat (hasil cetakan kecil rapi) */}
        <div className="w-16 h-14 shrink-0 flex items-center justify-center overflow-hidden">
          <img
            src={schoolLogoSrc}
            alt="Logo Sekolah"
            style={{ maxHeight: '50px', maxWidth: '55px', width: 'auto', height: 'auto', objectFit: 'contain' }}
            className="w-14 h-12 object-contain max-h-12 max-w-14"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to default emblem if custom fails
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg') {
                target.src = '/src/assets/images/sipanda_logo_emblem_1793504282746.jpg';
              }
            }}
          />
        </div>

        {/* Center Kop Text */}
        <div className="flex-1 text-center leading-snug">
          <p className="text-xs uppercase font-serif tracking-wider font-semibold text-slate-800">
            PEMERINTAH DAERAH PROVINSI {school.province?.toUpperCase() || 'JAWA BARAT'}
          </p>
          <p className="text-sm uppercase font-serif tracking-widest font-bold text-slate-900">
            DINAS PENDIDIKAN {school.district?.toUpperCase() || 'KOTA CIREBON'}
          </p>
          <h1 className="text-xl font-serif font-black uppercase text-black tracking-tight my-0.5">
            {school.name}
          </h1>
          <p className="text-xs font-serif text-slate-700">
            NPSN: <span className="font-mono">{school.npsn}</span> | Status: Sekolah {school.status} | Jenjang: {school.level}
          </p>
          <p className="text-[11px] font-serif text-slate-600">
            {school.address}, Kel. {school.village}, Kec. {school.subdistrict}, {school.district} {school.postalCode}
            {school.phone && ` · Telp: ${school.phone}`}
            {school.email && ` · Email: ${school.email}`}
          </p>
        </div>

        {/* Logo Kanan (Logo Dinas bila disetel di Pengaturan Dinas, atau spasi penyeimbang) */}
        <div className="w-16 h-14 shrink-0 flex items-center justify-center overflow-hidden">
          {dinasLogoSrc ? (
            <img
              src={dinasLogoSrc}
              alt="Logo Dinas"
              style={{ maxHeight: '50px', maxWidth: '55px', width: 'auto', height: 'auto', objectFit: 'contain' }}
              className="w-14 h-12 object-contain max-h-12 max-w-14"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 shrink-0" />
          )}
        </div>
      </div>
      {/* Secondary thin divider */}
      <div className="border-b border-black mt-1"></div>
    </div>
  );
};
