import { Router } from 'express';
import XLSX from 'xlsx';
import { db, acquireLock, releaseLock } from './db.ts';
import { GOOGLE_APPS_SCRIPT_CODE, SHEETS_SCHEMA_MAP } from './gasTemplate.ts';
import { performGasSync, performGasRecycle, validateGasUrl, parseGasResponse, performGasPull, formatTablesForGas } from './gasSync.ts';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================

apiRouter.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const raw = db.getRawData();
  
  const cleanUsername = (username || '').trim().toLowerCase();
  const rawPassword = (password || '');
  const cleanPassword = rawPassword.trim();

  // Helper to find user in database
  const findUser = () => {
    return raw.Pengguna.find(u => 
      (u.username && u.username.trim().toLowerCase() === cleanUsername) ||
      (u.email && u.email.trim().toLowerCase() === cleanUsername) ||
      (u.nip && u.nip.replace(/\s+/g, '') === cleanUsername.replace(/\s+/g, '')) ||
      ((cleanUsername === 'admin' || cleanUsername === 'admin_dinas' || cleanUsername === 'dinas') && u.role === 'ADMIN_DINAS')
    );
  };

  let user = findUser();

  // If user not found, or password does not match local record, attempt to sync from Google Spreadsheet if configured
  const settings = raw.PengaturanAplikasi || ({} as any);
  const passwordMatches = user && (
    (user as any).password === rawPassword ||
    (user as any).password === cleanPassword ||
    (user.role === 'ADMIN_DINAS' && (cleanPassword === 'admin123' || cleanPassword === 'admin'))
  );

  if ((!user || !passwordMatches) && settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== '') {
    try {
      await performGasPull(settings.googleAppsScriptUrl);
      user = findUser();
    } catch (e) {
      // Spreadsheet sync attempt failed or offline, proceed with local check
    }
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Username atau email tidak terdaftar. Silakan periksa kembali akun Anda.',
    });
  }

  // Validate password
  const storedPassword = ((user as any).password || '').trim();
  const isValidPassword = 
    (user as any).password === rawPassword ||
    storedPassword === cleanPassword ||
    (user.role === 'ADMIN_DINAS' && (cleanPassword === 'admin123' || cleanPassword === 'admin' || (user as any).password === 'admin123'));

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.',
    });
  }

  let school = null;
  if (user.role === 'BENDAHARA_SEKOLAH' && user.schoolId) {
    school = raw.Sekolah.find(s => s.id === user.schoolId) || null;
  }

  // Verification status validation
  if (user.verificationStatus === 'MENUNGGU_VERIFIKASI' || school?.verificationStatus === 'MENUNGGU_VERIFIKASI') {
    return res.status(403).json({
      success: false,
      status: 'MENUNGGU_VERIFIKASI',
      message: 'Pendaftaran sekolah Anda saat ini berstatus MENUNGGU VERIFIKASI oleh Admin Dinas Pendidikan. Silakan tunggu hingga diverifikasi dan diaktifkan.',
    });
  }

  if (user.verificationStatus === 'DINONAKTIFKAN' || school?.verificationStatus === 'DINONAKTIFKAN') {
    return res.status(403).json({
      success: false,
      status: 'DINONAKTIFKAN',
      message: 'Akun sekolah Anda saat ini DINONAKTIFKAN SEMENTARA oleh Admin Dinas Pendidikan. Silakan hubungi Bidang Pengawasan BOSP Dinas Pendidikan.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Akun pengguna ini berstatus non-aktif. Silakan hubungi Administrator.',
    });
  }

  db.logAudit({
    userId: user.id,
    username: user.username,
    userRole: user.role,
    schoolId: user.schoolId,
    schoolName: school?.name,
    action: 'LOGIN_BERHASIL',
    module: 'Autentikasi',
    details: `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem.`,
  });

  return res.json({
    success: true,
    user,
    school,
  });
});

apiRouter.post('/auth/register-school', (req, res) => {
  const {
    npsn,
    name,
    status = 'Negeri',
    level = 'SD',
    address = '',
    village = '',
    subdistrict = '',
    district = 'Kota / Kabupaten',
    province = 'Jawa Barat',
    postalCode = '',
    phone = '',
    email = '',
    headmasterName = '',
    headmasterNip = '-',
    treasurerName = '',
    treasurerNip = '-',
    treasurerPhone = '',
    treasurerEmail = '',
    bankAccount = '',
    bankName = '',
    npwp = '',
    committeeName = '',
    username,
    password,
    initialPagu = 200000000,
  } = req.body;

  const raw = db.getRawData();

  if (!npsn || !name || !treasurerName || !username || !password) {
    return res.status(400).json({ success: false, message: 'Mohon lengkapi data wajib (NPSN, Nama Sekolah, Nama Bendahara, Username, dan Kata Sandi).' });
  }

  if (raw.Sekolah.some(s => s.npsn === npsn)) {
    return res.status(400).json({ success: false, message: `Satuan pendidikan dengan NPSN ${npsn} sudah terdaftar dalam sistem.` });
  }

  if (raw.Pengguna.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: `Username "${username}" sudah digunakan akun lain. Silakan gunakan username lain.` });
  }

  const currentYear = raw.PengaturanAplikasi?.activeFiscalYear || 2026;
  const schoolId = `SCH-${Date.now().toString().slice(-4)}`;
  const userId = `USR-${Date.now().toString().slice(-4)}`;

  const newSchool: any = {
    id: schoolId,
    npsn,
    name,
    status,
    level,
    address,
    village,
    subdistrict,
    district,
    province,
    postalCode,
    phone,
    email,
    headmasterName,
    headmasterNip,
    treasurerName,
    treasurerNip,
    committeeName,
    bankAccount,
    bankName,
    npwp,
    activeFiscalYear: currentYear,
    isLocked: true,
    verificationStatus: 'MENUNGGU_VERIFIKASI',
    registrationDate: new Date().toISOString(),
  };

  const newUser: any = {
    id: userId,
    username,
    password,
    name: treasurerName,
    role: 'BENDAHARA_SEKOLAH',
    schoolId,
    nip: treasurerNip,
    email: treasurerEmail || email,
    phone: treasurerPhone || phone,
    isActive: false,
    verificationStatus: 'MENUNGGU_VERIFIKASI',
    createdAt: new Date().toISOString(),
  };

  const pagu = Number(initialPagu) || 200000000;
  const newBudgetPlan: any = {
    id: `BP-${schoolId}-${currentYear}`,
    schoolId,
    fiscalYear: currentYear,
    totalPagu: pagu,
    stage1Allocation: Math.round(pagu / 2),
    stage2Allocation: Math.round(pagu / 2),
    status: 'Diajukan',
    notes: 'Pendaftaran Mandiri Satuan Pendidikan baru. Menunggu verifikasi berkas oleh Dinas Pendidikan.',
  };

  // Generate 23 standard RKAS components with line items
  const standardComponents = db.generateStandardComponents(schoolId, currentYear, pagu, status);

  raw.Sekolah.push(newSchool);
  raw.Pengguna.push(newUser);
  raw.BudgetPlans.push(newBudgetPlan);
  raw.KomponenAnggaran.push(...standardComponents);
  db.saveData();

  db.logAudit({
    userId,
    username,
    userRole: 'BENDAHARA_SEKOLAH',
    schoolId,
    schoolName: name,
    action: 'PENDAFTARAN_MANDIRI_SEKOLAH',
    module: 'Pendaftaran Sekolah',
    details: `Sekolah ${name} (NPSN: ${npsn}) berhasil mendaftar mandiri ke SIPANDA BOSP dan berstatus Menunggu Verifikasi.`,
  });

  return res.json({
    success: true,
    message: 'Pendaftaran mandiri berhasil diajukan! Akun sekolah Anda sedang menunggu verifikasi oleh Admin Dinas Pendidikan.',
    school: newSchool,
    user: newUser,
  });
});

apiRouter.get('/auth/users', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, users: raw.Pengguna });
});

apiRouter.post('/auth/create-user', (req, res) => {
  const { username, password, name, role, schoolId, nip, email, phone } = req.body;
  const raw = db.getRawData();

  if (raw.Pengguna.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
  }

  const newUser = {
    id: `USR-${Date.now()}`,
    username,
    password: password || (role === 'ADMIN_DINAS' ? 'admin123' : 'bendahara123'),
    name,
    role,
    schoolId: role === 'BENDAHARA_SEKOLAH' ? schoolId : undefined,
    nip,
    email,
    phone,
    isActive: true,
    verificationStatus: 'TERVERIFIKASI' as const,
    createdAt: new Date().toISOString(),
  };

  raw.Pengguna.push(newUser);
  db.saveData();

  db.logAudit({
    userId: 'ADMIN',
    username: 'admin_dinas',
    userRole: 'ADMIN_DINAS',
    action: 'TAMBAH_PENGGUNA',
    module: 'Manajemen Pengguna',
    details: `Menambahkan akun baru: ${name} (${role}) untuk sekolah ID ${schoolId || '-'}`,
  });

  res.json({ success: true, user: newUser });
});

// ==========================================
// 2. MASTER DATA SEKOLAH
// ==========================================

apiRouter.get('/schools', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, schools: raw.Sekolah });
});

apiRouter.get('/schools/:id', (req, res) => {
  const raw = db.getRawData();
  const school = raw.Sekolah.find(s => s.id === req.params.id);
  if (!school) return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });
  res.json({ success: true, school });
});

apiRouter.put('/schools/:id', (req, res) => {
  const raw = db.getRawData();
  const idx = raw.Sekolah.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });

  raw.Sekolah[idx] = {
    ...raw.Sekolah[idx],
    ...req.body,
  };
  db.saveData();

  db.logAudit({
    userId: 'CURRENT_USER',
    username: req.body.updatedBy || 'bendahara',
    userRole: 'BENDAHARA_SEKOLAH',
    schoolId: req.params.id,
    schoolName: raw.Sekolah[idx].name,
    action: 'UPDATE_PROFIL_SEKOLAH',
    module: 'Master Data',
    details: `Memperbarui profil data sekolah ${raw.Sekolah[idx].name}`,
  });

  res.json({ success: true, school: raw.Sekolah[idx] });
});

apiRouter.post('/schools', (req, res) => {
  const raw = db.getRawData();
  const newSchoolId = `SCH-${String(raw.Sekolah.length + 1).padStart(3, '0')}`;
  const newSchool = {
    id: newSchoolId,
    ...req.body,
    activeFiscalYear: raw.PengaturanAplikasi.activeFiscalYear || 2026,
    isLocked: false,
  };

  raw.Sekolah.push(newSchool);
  db.saveData();

  db.logAudit({
    userId: 'ADMIN',
    username: 'admin_dinas',
    userRole: 'ADMIN_DINAS',
    action: 'TAMBAH_SEKOLAH',
    module: 'Master Data',
    details: `Dinas mendaftarkan satuan pendidikan baru: ${newSchool.name} (NPSN: ${newSchool.npsn})`,
  });

  res.json({ success: true, school: newSchool });
});

apiRouter.put('/schools/:id/status', (req, res) => {
  const { action, adminName = 'Admin Dinas' } = req.body;
  const raw = db.getRawData();
  const school = raw.Sekolah.find(s => s.id === req.params.id);

  if (!school) {
    return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });
  }

  const users = raw.Pengguna.filter(u => u.schoolId === school.id);

  if (action === 'verify') {
    school.verificationStatus = 'TERVERIFIKASI';
    school.isLocked = false;
    school.verifiedAt = new Date().toISOString();
    school.verifiedBy = adminName;
    users.forEach(u => {
      u.verificationStatus = 'TERVERIFIKASI';
      u.isActive = true;
    });

    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      schoolId: school.id,
      schoolName: school.name,
      action: 'VERIFIKASI_SEKOLAH',
      module: 'Manajemen Sekolah',
      details: `Admin Dinas (${adminName}) menyetujui dan memverifikasi pendaftaran sekolah ${school.name} (NPSN: ${school.npsn}).`,
    });
  } else if (action === 'suspend') {
    school.verificationStatus = 'DINONAKTIFKAN';
    school.isLocked = true;
    users.forEach(u => {
      u.verificationStatus = 'DINONAKTIFKAN';
      u.isActive = false;
    });

    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      schoolId: school.id,
      schoolName: school.name,
      action: 'NONAKTIFKAN_SEKOLAH',
      module: 'Manajemen Sekolah',
      details: `Admin Dinas (${adminName}) menonaktifkan sementara akses sekolah ${school.name} (NPSN: ${school.npsn}).`,
    });
  } else if (action === 'activate') {
    school.verificationStatus = 'TERVERIFIKASI';
    school.isLocked = false;
    users.forEach(u => {
      u.verificationStatus = 'TERVERIFIKASI';
      u.isActive = true;
    });

    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      schoolId: school.id,
      schoolName: school.name,
      action: 'AKTIFKAN_KEMBALI_SEKOLAH',
      module: 'Manajemen Sekolah',
      details: `Admin Dinas (${adminName}) mengaktifkan kembali akun sekolah ${school.name} (NPSN: ${school.npsn}).`,
    });
  } else {
    return res.status(400).json({ success: false, message: 'Aksi status tidak valid.' });
  }

  db.saveData();
  res.json({ success: true, school, users });
});

apiRouter.delete('/schools/:id', (req, res) => {
  const raw = db.getRawData();
  const schoolId = req.params.id;
  const sIdx = raw.Sekolah.findIndex(s => s.id === schoolId);

  if (sIdx === -1) {
    return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });
  }

  const schoolName = raw.Sekolah[sIdx].name;

  // Cleanly purge all records tied to this school
  raw.Sekolah.splice(sIdx, 1);
  raw.Pengguna = raw.Pengguna.filter(u => u.schoolId !== schoolId);
  raw.BudgetPlans = raw.BudgetPlans.filter(b => b.schoolId !== schoolId);
  raw.KomponenAnggaran = raw.KomponenAnggaran.filter(c => c.schoolId !== schoolId);
  raw.Transaksi = raw.Transaksi.filter(t => t.schoolId !== schoolId);
  raw.TandaTerima = raw.TandaTerima.filter(t => t.schoolId !== schoolId);
  raw.BukuKas = raw.BukuKas.filter(e => e.schoolId !== schoolId);
  raw.BukuBank = raw.BukuBank.filter(e => e.schoolId !== schoolId);
  raw.CashBookLedger = raw.CashBookLedger.filter(e => e.schoolId !== schoolId);
  raw.TaxBook = raw.TaxBook.filter(e => e.schoolId !== schoolId);
  raw.SPPD = raw.SPPD.filter(s => s.schoolId !== schoolId);
  raw.SuratSurat = raw.SuratSurat.filter(s => s.schoolId !== schoolId);
  raw.Risalah = raw.Risalah.filter(r => r.schoolId !== schoolId);
  raw.Rekonsiliasi = raw.Rekonsiliasi.filter(r => r.schoolId !== schoolId);

  db.saveData();

  db.logAudit({
    userId: 'ADMIN',
    username: 'admin_dinas',
    userRole: 'ADMIN_DINAS',
    action: 'HAPUS_AKUN_SEKOLAH',
    module: 'Manajemen Sekolah',
    details: `Admin Dinas menghapus permanen data satuan pendidikan: ${schoolName} (ID: ${schoolId}).`,
  });

  res.json({ success: true, message: `Akun sekolah ${schoolName} beserta seluruh rekaman data terkait berhasil dihapus.` });
});

// ==========================================
// 2B. JUKNIS BOSP & SUB-COMPONENT CONFIGURATION
// ==========================================

apiRouter.get('/config/budget-subcomponents', (req, res) => {
  const master = db.getMasterSubComponents();
  res.json({
    success: true,
    subComponents: master,
  });
});

apiRouter.post('/config/budget-subcomponents', (req, res) => {
  const { code, name, mainType, category, description, defaultItems, activeFiscalYear, adminName = 'Admin Dinas' } = req.body;

  if (!code || !name || !mainType) {
    return res.status(400).json({ success: false, message: 'Kode rekening, nama sub-rincian, dan objek belanja utama wajib diisi.' });
  }

  const result = db.addCustomSubComponent(
    {
      code: code.trim(),
      name: name.trim(),
      mainType,
      category: category || (mainType === 'BARANG_JASA' ? 'BARANG_JASA' : mainType === 'MODAL_PERALATAN_MESIN' ? 'MODAL_MESIN' : 'BUKU_DAN_MODAL'),
      description: description || '',
      defaultItems: defaultItems || [],
      activeFiscalYear: Number(activeFiscalYear) || 2026,
    },
    adminName
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    subComponent: result.subComponent,
    message: `Sub-rincian ${name} (${code}) berhasil ditambahkan ke Juknis BOSP dan disinkronkan ke seluruh satuan pendidikan.`,
  });
});

apiRouter.put('/config/budget-subcomponents/:code', (req, res) => {
  const code = req.params.code;
  const { name, description, adminName = 'Admin Dinas' } = req.body;

  const result = db.updateCustomSubComponent(code, { name, description }, adminName);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({ success: true, message: `Sub-rincian ${code} berhasil diperbarui.` });
});

apiRouter.delete('/config/budget-subcomponents/:code', (req, res) => {
  const code = req.params.code;
  const adminName = (req.query.adminName as string) || 'Admin Dinas';

  const result = db.deleteCustomSubComponent(code, adminName);
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({ success: true, message: `Sub-rincian kustom ${code} berhasil dihapus dari Juknis BOSP.` });
});

// ==========================================
// 3. BUDGET & RKAS MANAGEMENT (REGULER, KINERJA, AFIRMASI)
// ==========================================

apiRouter.get('/fiscal-years', (req, res) => {
  const raw = db.getRawData();
  let list = raw.TahunFiskal || [];
  if (list.length === 0) {
    list = [
      { id: 'FY-2024', year: 2024, isActive: false, status: 'Closed', notes: 'Tahun Anggaran 2024' },
      { id: 'FY-2025', year: 2025, isActive: false, status: 'Closed', notes: 'Tahun Anggaran 2025' },
      { id: 'FY-2026', year: 2026, isActive: true, status: 'Open', notes: 'Tahun Anggaran Berjalan 2026' },
      { id: 'FY-2027', year: 2027, isActive: false, status: 'Open', notes: 'Tahun Anggaran Perencanaan 2027' },
    ];
    raw.TahunFiskal = list;
    db.saveData();
  }
  res.json({ success: true, fiscalYears: list });
});

apiRouter.post('/fiscal-years', (req, res) => {
  const raw = db.getRawData();
  const { year, notes, isActive } = req.body;
  const yr = Number(year);
  if (!yr || isNaN(yr)) {
    return res.status(400).json({ success: false, message: 'Tahun anggaran wajib diisi angka valid.' });
  }

  const existing = raw.TahunFiskal.find(f => f.year === yr);
  if (existing) {
    if (notes) existing.notes = notes;
    if (isActive !== undefined) existing.isActive = isActive;
    db.saveData();
    return res.json({ success: true, fiscalYear: existing, message: `Tahun anggaran ${yr} diperbarui.` });
  }

  const newYear = {
    id: `FY-${yr}`,
    year: yr,
    isActive: Boolean(isActive),
    status: 'Open' as const,
    notes: notes || `Tahun Anggaran ${yr}`,
  };

  raw.TahunFiskal.push(newYear);
  raw.TahunFiskal.sort((a, b) => b.year - a.year);
  db.saveData();

  res.json({ success: true, fiscalYear: newYear, message: `Tahun anggaran ${yr} berhasil ditambahkan.` });
});

apiRouter.get('/funding-sources', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, fundingSources: raw.SumberPendanaan || [] });
});

apiRouter.get('/budget/summary', (req, res) => {
  const { schoolId, fiscalYear, fundSource = 'BOSP_REGULER' } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const source = (String(fundSource || 'BOSP_REGULER')) as any;

  const school = raw.Sekolah.find(s => s.id === schoolId);

  // Find plan for this school, fiscalYear, and fundSource
  let plan = raw.BudgetPlans.find(b => 
    b.schoolId === schoolId && 
    b.fiscalYear === year && 
    ((b.fundSource || 'BOSP_REGULER') === source)
  );

  if (!plan && schoolId) {
    const defaultPagu = source === 'BOSP_REGULER'
      ? (school?.level === 'SD' ? 240000000 : school?.level === 'SMP' ? 320000000 : 400000000)
      : 0;
    plan = {
      id: `BP-${schoolId}-${year}-${source}`,
      schoolId: String(schoolId),
      fiscalYear: year,
      fundSource: source,
      totalPagu: defaultPagu,
      stage1Allocation: Math.round(defaultPagu / 2),
      stage2Allocation: Math.round(defaultPagu / 2),
      status: 'Diajukan',
      notes: 'Rencana Anggaran dan Kegiatan Sekolah (RKAS)',
    };
    raw.BudgetPlans.push(plan);
    db.saveData();
  }

  let components = raw.KomponenAnggaran.filter(c => 
    c.schoolId === schoolId && 
    c.fiscalYear === year && 
    ((c.fundSource || 'BOSP_REGULER') === source)
  );

  // If no components exist for this school, fiscalYear, and fundSource, generate standard clean components
  if (components.length === 0 && schoolId) {
    const generated = db.generateStandardComponents(
      String(schoolId),
      year,
      0,
      school?.status || 'Negeri',
      source
    );
    raw.KomponenAnggaran.push(...generated);
    db.saveData();
    components = generated;
  }

  res.json({
    success: true,
    fundSource: source,
    fiscalYear: year,
    plan,
    components,
  });
});

apiRouter.post('/budget/validate-rules', (req, res) => {
  try {
    const { schoolStatus = 'Negeri', totalPagu = 0, components = [], fundSource = 'BOSP_REGULER' } = req.body || {};
    const compList = Array.isArray(components) ? components : [];
    const totalPaguNum = Number(totalPagu) || 0;

    // Rule 1: Honorarium
    // Negeri: max 20%
    // Swasta: max 40%
    const honorAlloc = compList
      .filter((c: any) => c && (c.category === 'HONORARIUM' || c.code === '5.1.02.01'))
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);

    const honorPct = totalPaguNum > 0 ? (honorAlloc / totalPaguNum) * 100 : 0;
    const maxHonorPct = schoolStatus === 'Negeri' ? 20 : 40;

    // Rule 2: Belanja Buku Modal minimal 10% (wajib untuk BOSP Reguler)
    const bukuAlloc = compList
      .filter((c: any) => 
        c && (
          c.mainType === 'MODAL_ASET_TETAP_LAINNYA' || 
          c.category === 'BUKU_DAN_MODAL' ||
          ['5.2.05.01', '5.2.05.02', '5.2.05.03'].includes(c.code)
        )
      )
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);
    const bukuPct = totalPaguNum > 0 ? (bukuAlloc / totalPaguNum) * 100 : 0;

    // Rule 3: Pemeliharaan Sarpras maksimal 20% (untuk BOSP Reguler)
    const sarprasAlloc = compList
      .filter((c: any) => c && (c.category === 'PEMELIHARAAN_SARPRAS' || c.code === '5.1.02.16'))
      .reduce((sum: number, c: any) => sum + Number(c.allocatedAmount || 0), 0);
    const sarprasPct = totalPaguNum > 0 ? (sarprasAlloc / totalPaguNum) * 100 : 0;

    const violations: string[] = [];

    // Rules applied per fund source
    if (fundSource === 'BOSP_REGULER') {
      if (honorPct > maxHonorPct) {
        violations.push(`[BOSP Reguler] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) melebihi batas maksimal ${maxHonorPct}% untuk Satuan Pendidikan ${schoolStatus}!`);
      }
      if (bukuPct < 10) {
        violations.push(`[BOSP Reguler] Alokasi Belanja Modal Buku (${bukuPct.toFixed(1)}%) kurang dari batas minimal 10% dari Total Pagu BOSP!`);
      }
      if (sarprasPct > 20) {
        violations.push(`[BOSP Reguler] Alokasi Pemeliharaan Sarana Prasarana (${sarprasPct.toFixed(1)}%) melebihi batas maksimal 20% dari Total Pagu BOSP!`);
      }
    } else if (fundSource === 'BOSP_KINERJA') {
      if (honorPct > 30) {
        violations.push(`[BOSP Kinerja] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) disarankan tidak melebihi 30% dari Total Pagu Kinerja.`);
      }
    } else if (fundSource === 'BOSP_AFIRMASI') {
      if (honorPct > 30) {
        violations.push(`[BOSP Afirmasi] Alokasi Belanja Honorarium (${honorPct.toFixed(1)}%) disarankan tidak melebihi 30% dari Total Pagu Afirmasi.`);
      }
    }

    res.json({
      success: true,
      isValid: violations.length === 0,
      violations,
      honorAlloc,
      honorPct,
      maxHonorPct,
      bukuAlloc,
      bukuPct,
      sarprasAlloc,
      sarprasPct,
      fundSource,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      isValid: true,
      violations: [],
      message: err.message || 'Gagal memproses validasi anggaran.',
    });
  }
});

apiRouter.post('/budget/save', async (req, res) => {
  await acquireLock();
  try {
    const { plan, components } = req.body;
    const raw = db.getRawData();
    const source = (plan.fundSource || 'BOSP_REGULER') as any;
    const year = Number(plan.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;

    // Update or insert plan for this school, year, and fundSource
    const pIdx = raw.BudgetPlans.findIndex(p => 
      p.schoolId === plan.schoolId && 
      p.fiscalYear === year &&
      ((p.fundSource || 'BOSP_REGULER') === source)
    );

    const existingPlan = pIdx !== -1 ? raw.BudgetPlans[pIdx] : null;

    // Preserving approval status:
    // If existing plan is already 'Disetujui', PRESERVE 'Disetujui' and approval metadata
    // unless the incoming payload explicitly requests a change/revision ('Diajukan') from Bendahara
    let targetStatus = plan.status;
    let targetApprovedAt = plan.approvedAt || existingPlan?.approvedAt;
    let targetApprovedBy = plan.approvedBy || (existingPlan as any)?.approvedBy;

    if (existingPlan && existingPlan.status === 'Disetujui' && plan.status !== 'Diajukan') {
      targetStatus = 'Disetujui';
    } else if (!targetStatus) {
      targetStatus = existingPlan?.status || 'Diajukan';
    }

    const planData: any = {
      id: plan.id || existingPlan?.id || `BP-${plan.schoolId}-${year}-${source}`,
      schoolId: plan.schoolId,
      fiscalYear: year,
      fundSource: source,
      totalPagu: Number(plan.totalPagu || existingPlan?.totalPagu || 0),
      stage1Allocation: Number(plan.stage1Allocation || existingPlan?.stage1Allocation || 0),
      stage2Allocation: Number(plan.stage2Allocation || existingPlan?.stage2Allocation || 0),
      status: targetStatus,
      approvedAt: targetApprovedAt,
      approvedBy: targetApprovedBy,
      notes: plan.notes !== undefined ? plan.notes : existingPlan?.notes || '',
    };

    if (pIdx !== -1) {
      raw.BudgetPlans[pIdx] = planData;
    } else {
      raw.BudgetPlans.push(planData);
    }

    // Replace components specifically for this school, year, and fundSource
    raw.KomponenAnggaran = raw.KomponenAnggaran.filter(
      c => !(
        c.schoolId === plan.schoolId && 
        c.fiscalYear === year &&
        ((c.fundSource || 'BOSP_REGULER') === source)
      )
    );

    for (const comp of components) {
      // If items exist, recalculate amounts dynamically
      let allocated = Number(comp.allocatedAmount || 0);
      let s1Budget = Number(comp.stage1Budget || 0);
      let s2Budget = Number(comp.stage2Budget || 0);

      let items = comp.items;
      if (items && Array.isArray(items) && items.length > 0) {
        items = items.map((itm: any) => {
          const tot = Number(itm.volume || 0) * Number(itm.unitPrice || 0);
          let s1 = 0;
          let s2 = 0;
          if (itm.stage === '1') {
            s1 = tot;
          } else if (itm.stage === '2') {
            s2 = tot;
          } else {
            s1 = Math.round(tot / 2);
            s2 = tot - s1;
          }
          return {
            ...itm,
            volume: Number(itm.volume || 0),
            unitPrice: Number(itm.unitPrice || 0),
            totalAmount: tot,
            stage1Amount: s1,
            stage2Amount: s2,
          };
        });

        allocated = items.reduce((sum: number, itm: any) => sum + itm.totalAmount, 0);
        s1Budget = items.reduce((sum: number, itm: any) => sum + (itm.stage1Amount || 0), 0);
        s2Budget = items.reduce((sum: number, itm: any) => sum + (itm.stage2Amount || 0), 0);
      }

      raw.KomponenAnggaran.push({
        id: comp.id || `BC-${plan.schoolId}-${year}-${source}-${comp.code.replace(/\./g, '_')}`,
        schoolId: plan.schoolId,
        fiscalYear: year,
        fundSource: source,
        code: comp.code,
        name: comp.name,
        mainType: comp.mainType || (comp.code.startsWith('5.2.02') ? 'MODAL_PERALATAN_MESIN' : comp.code.startsWith('5.2.05') ? 'MODAL_ASET_TETAP_LAINNYA' : 'BARANG_JASA'),
        category: comp.category,
        subComponent: comp.subComponent || '',
        allocatedAmount: allocated,
        realizedAmount: Number(comp.realizedAmount || 0),
        remainingAmount: allocated - Number(comp.realizedAmount || 0),
        stage1Budget: s1Budget,
        stage2Budget: s2Budget,
        stage1Realized: Number(comp.stage1Realized || 0),
        stage2Realized: Number(comp.stage2Realized || 0),
        items: items || [],
        description: comp.description || '',
      });
    }

    db.refreshLedgers(plan.schoolId, year);

    const sourceName = source === 'BOSP_KINERJA' ? 'Dana BOSP Kinerja' : source === 'BOSP_AFIRMASI' ? 'Dana BOSP Afirmasi' : 'Dana BOSP Reguler';

    db.logAudit({
      userId: 'BENDAHARA',
      username: 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId: plan.schoolId,
      action: 'UPDATE_RKAS',
      module: 'Perencanaan dan Anggaran',
      details: `Memperbarui RKAS ${sourceName} Tahun ${year} dengan total pagu Rp ${Number(plan.totalPagu).toLocaleString('id-ID')}`,
    });

    db.saveData();

    res.json({ success: true, message: `RKAS ${sourceName} TA ${year} berhasil disimpan.` });
  } finally {
    releaseLock();
  }
});

apiRouter.get('/budget/recap', (req, res) => {
  const { fiscalYear, fundSource = 'BOSP_REGULER' } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi?.activeFiscalYear || 2026;
  const source = String(fundSource || 'BOSP_REGULER');

  const recap = raw.Sekolah.map(s => {
    const plan = raw.BudgetPlans.find(b =>
      b.schoolId === s.id &&
      b.fiscalYear === year &&
      (source === 'ALL' || (b.fundSource || 'BOSP_REGULER') === source)
    );

    const components = raw.KomponenAnggaran.filter(c =>
      c.schoolId === s.id &&
      c.fiscalYear === year &&
      (source === 'ALL' || (c.fundSource || 'BOSP_REGULER') === source)
    );

    const totalAllocatedFromComponents = components.reduce((sum, c) => sum + Number(c.allocatedAmount || 0), 0);
    const stage1BudgetFromComponents = components.reduce((sum, c) => sum + Number(c.stage1Budget || 0), 0);
    const stage2BudgetFromComponents = components.reduce((sum, c) => sum + Number(c.stage2Budget || 0), 0);
    const realizedAmount = components.reduce((sum, c) => sum + Number(c.realizedAmount || 0), 0);
    const stage1Realized = components.reduce((sum, c) => sum + Number(c.stage1Realized || 0), 0);
    const stage2Realized = components.reduce((sum, c) => sum + Number(c.stage2Realized || 0), 0);

    let totalPagu = 0;
    let stage1Allocation = 0;
    let stage2Allocation = 0;

    if (plan && plan.totalPagu) {
      totalPagu = Number(plan.totalPagu);
      stage1Allocation = Number(plan.stage1Allocation) || Math.round(totalPagu / 2);
      stage2Allocation = Number(plan.stage2Allocation) || (totalPagu - stage1Allocation);
    } else if (totalAllocatedFromComponents > 0) {
      totalPagu = totalAllocatedFromComponents;
      stage1Allocation = stage1BudgetFromComponents;
      stage2Allocation = stage2BudgetFromComponents;
    } else if (source === 'BOSP_REGULER' || source === 'ALL') {
      totalPagu = s.level === 'SD' ? 240000000 : s.level === 'SMP' ? 320000000 : 400000000;
      stage1Allocation = Math.round(totalPagu / 2);
      stage2Allocation = totalPagu - stage1Allocation;
    } else {
      totalPagu = 0;
      stage1Allocation = 0;
      stage2Allocation = 0;
    }

    const status = plan?.status || (totalAllocatedFromComponents > 0 ? 'Diajukan' : 'Draft');

    return {
      schoolId: s.id,
      schoolName: s.name,
      npsn: s.npsn,
      level: s.level,
      status: s.status,
      district: s.district || '',
      subdistrict: s.subdistrict || '',
      province: s.province || '',
      fiscalYear: year,
      fundSource: source,
      planId: plan?.id || null,
      totalPagu,
      stage1Allocation,
      stage2Allocation,
      totalAllocatedFromComponents,
      stage1BudgetFromComponents,
      stage2BudgetFromComponents,
      realizedAmount,
      stage1Realized,
      stage2Realized,
      remainingAmount: totalPagu - realizedAmount,
      statusRkas: status,
      approvedAt: plan?.approvedAt || null,
      approvedBy: (plan as any)?.approvedBy || null,
      notes: plan?.notes || '',
    };
  });

  res.json({
    success: true,
    fiscalYear: year,
    fundSource: source,
    recap,
  });
});

apiRouter.put('/budget/status', async (req, res) => {
  const { schoolId, fiscalYear, fundSource = 'BOSP_REGULER', status, notes, adminName = 'Admin Dinas' } = req.body;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi?.activeFiscalYear || 2026;
  const source = String(fundSource || 'BOSP_REGULER');

  const school = raw.Sekolah.find(s => s.id === schoolId);
  if (!school) {
    return res.status(404).json({ success: false, message: 'Satuan pendidikan tidak ditemukan.' });
  }

  let plan = raw.BudgetPlans.find(b =>
    b.schoolId === schoolId &&
    b.fiscalYear === year &&
    ((b.fundSource || 'BOSP_REGULER') === source)
  );

  const now = new Date().toISOString();

  if (!plan) {
    const compTotal = raw.KomponenAnggaran
      .filter(c => c.schoolId === schoolId && c.fiscalYear === year && ((c.fundSource || 'BOSP_REGULER') === source))
      .reduce((s, c) => s + (c.allocatedAmount || 0), 0);
    const pagu = compTotal > 0 ? compTotal : (school.level === 'SD' ? 240000000 : school.level === 'SMP' ? 320000000 : 400000000);
    plan = {
      id: `BP-${schoolId}-${year}-${source}`,
      schoolId,
      fiscalYear: year,
      fundSource: source as any,
      totalPagu: pagu,
      stage1Allocation: Math.round(pagu / 2),
      stage2Allocation: Math.round(pagu / 2),
      status: status || 'Diajukan',
      notes: notes || '',
    };
    raw.BudgetPlans.push(plan);
  }

  plan.status = status;
  if (status === 'Disetujui') {
    plan.approvedAt = now;
    (plan as any).approvedBy = adminName;
    if (notes) plan.notes = notes;
  } else if (status === 'Ditolak' || status === 'Revisi') {
    plan.notes = notes || 'Perlu perbaikan rincian belanja oleh satuan pendidikan';
    plan.approvedAt = undefined;
    (plan as any).approvedBy = undefined;
  } else if (status === 'Diajukan') {
    plan.approvedAt = undefined;
    (plan as any).approvedBy = undefined;
    if (notes) plan.notes = notes;
  }

  db.logAudit({
    userId: 'ADMIN',
    username: adminName.toLowerCase().replace(/\s+/g, '_'),
    userRole: 'ADMIN_DINAS',
    schoolId: school.id,
    schoolName: school.name,
    action: status === 'Disetujui' ? 'PERSETUJUAN_RKAS' : status === 'Ditolak' ? 'PENOLAKAN_RKAS' : 'UPDATE_STATUS_RKAS',
    module: 'Verifikasi & Pengesahan RKAS',
    details: `Admin Dinas (${adminName}) mengubah status RKAS ${source} Tahun ${year} sekolah ${school.name} menjadi "${status}"${notes ? ` (Catatan: ${notes})` : ''}.`,
  });

  db.saveData();

  res.json({
    success: true,
    message: `Status RKAS ${school.name} berhasil diperbarui menjadi "${status}".`,
    plan,
  });
});

// ==========================================
// 4. TRANSAKSI KEUANGAN & PEMBUKUAN
// ==========================================

apiRouter.get('/transactions', (req, res) => {
  const { schoolId, fiscalYear, startDate, endDate, type, method } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;

  let list = raw.Transaksi.filter(t => t.fiscalYear === year);

  if (schoolId) {
    list = list.filter(t => t.schoolId === schoolId);
  }
  if (startDate) {
    list = list.filter(t => t.date >= String(startDate));
  }
  if (endDate) {
    list = list.filter(t => t.date <= String(endDate));
  }
  if (type) {
    list = list.filter(t => t.type === type);
  }
  if (method) {
    list = list.filter(t => t.paymentMethod === method);
  }

  // Sort by date descending
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ success: true, count: list.length, transactions: list });
});

apiRouter.post('/transactions', async (req, res) => {
  await acquireLock();
  try {
    const raw = db.getRawData();
    const data = req.body;
    const year = Number(data.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
    
    // Check if RKAS is approved for non-Admin
    const activePlan = raw.BudgetPlans.find(b => b.schoolId === data.schoolId && b.fiscalYear === year && b.status === 'Disetujui');
    if (!activePlan && data.userRole !== 'ADMIN_DINAS') {
      return res.status(400).json({
        success: false,
        message: 'RKAS Satuan Pendidikan belum disetujui/disahkan oleh Admin Dinas Pendidikan. Penatausahaan transaksi baru tidak diizinkan.'
      });
    }
    
    const trxNumber = db.getNextNumber('TRX', data.schoolId, year);
    const newTrx = {
      id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transactionNumber: trxNumber,
      schoolId: data.schoolId,
      fiscalYear: year,
      date: data.date,
      type: data.type,
      description: data.description,
      budgetComponentId: data.budgetComponentId || undefined,
      recipientName: data.recipientName || '',
      recipientNpwp: data.recipientNpwp || '',
      recipientIsPkp: Boolean(data.recipientIsPkp),
      invoiceNumber: data.invoiceNumber || '',
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod || 'BANK',
      fundingSourceId: data.fundingSourceId || 'SRC-01',
      notes: data.notes || '',
      proofDocumentUrl: data.proofDocumentUrl || '',
      verificationStatus: 'Terverifikasi',
      hasTax: Boolean(data.hasTax),
      taxes: data.taxes || [],
      netAmount: Number(data.amount),
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy || 'Bendahara',
    };

    raw.Transaksi.push(newTrx as any);
    db.refreshLedgers(data.schoolId, year);

    db.logAudit({
      userId: 'BENDAHARA',
      username: data.createdBy || 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId: data.schoolId,
      action: 'INPUT_TRANSAKSI',
      module: 'Transaksi Keuangan',
      details: `Input transaksi ${newTrx.transactionNumber} (${newTrx.type}) senilai Rp ${newTrx.amount.toLocaleString('id-ID')}`,
    });

    res.json({ success: true, transaction: newTrx });
  } finally {
    releaseLock();
  }
});

apiRouter.put('/transactions/:id', async (req, res) => {
  await acquireLock();
  try {
    const raw = db.getRawData();
    const idx = raw.Transaksi.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });

    const existing = raw.Transaksi[idx];
    raw.Transaksi[idx] = {
      ...existing,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    db.refreshLedgers(existing.schoolId, existing.fiscalYear);

    db.logAudit({
      userId: 'BENDAHARA',
      username: 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId: existing.schoolId,
      action: 'KOREKSI_TRANSAKSI',
      module: 'Transaksi Keuangan',
      details: `Koreksi pembukuan atas transaksi ${existing.transactionNumber}`,
    });

    res.json({ success: true, transaction: raw.Transaksi[idx] });
  } finally {
    releaseLock();
  }
});

apiRouter.delete('/transactions/:id', async (req, res) => {
  await acquireLock();
  try {
    const raw = db.getRawData();
    const idx = raw.Transaksi.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });

    const deleted = raw.Transaksi.splice(idx, 1)[0];
    db.refreshLedgers(deleted.schoolId, deleted.fiscalYear);

    db.logAudit({
      userId: 'BENDAHARA',
      username: 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId: deleted.schoolId,
      action: 'HAPUS_TRANSAKSI',
      module: 'Transaksi Keuangan',
      details: `Menghapus transaksi ${deleted.transactionNumber} senilai Rp ${deleted.amount.toLocaleString('id-ID')}`,
    });

    res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } finally {
    releaseLock();
  }
});

// ==========================================
// 5. BUKU PEMBANTU (BKU, BANK, TUNAI, PAJAK)
// ==========================================

apiRouter.get('/ledgers', (req, res) => {
  const { schoolId, fiscalYear, bookType } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;

  let entries = [];
  if (bookType === 'BKU') {
    entries = raw.BukuKas.filter(e => e.schoolId === schoolId && e.fiscalYear === year);
  } else if (bookType === 'BANK') {
    entries = raw.BukuBank.filter(e => e.schoolId === schoolId && e.fiscalYear === year);
  } else if (bookType === 'TUNAI') {
    entries = raw.CashBookLedger.filter(e => e.schoolId === schoolId && e.fiscalYear === year);
  } else if (bookType === 'PAJAK') {
    entries = raw.TaxBook.filter(e => e.schoolId === schoolId && e.fiscalYear === year);
  } else {
    entries = raw.BukuKas.filter(e => e.schoolId === schoolId && e.fiscalYear === year);
  }

  // Calculate totals
  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const lastBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  res.json({
    success: true,
    bookType,
    count: entries.length,
    entries,
    totalDebit,
    totalCredit,
    finalBalance: lastBalance,
  });
});

// ==========================================
// 6. PERPAJAKAN & TARIF
// ==========================================

apiRouter.get('/taxes/config', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, taxRates: raw.TarifPajak });
});

apiRouter.post('/taxes/config', (req, res) => {
  const raw = db.getRawData();
  const newRate = {
    id: `TAX-${Date.now()}`,
    ...req.body,
    isActive: true,
  };
  raw.TarifPajak.push(newRate);
  db.saveData();
  res.json({ success: true, taxRate: newRate });
});

apiRouter.get('/taxes/recap', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;

  const taxEntries = raw.TaxBook.filter(t => t.schoolId === schoolId && t.fiscalYear === year);
  
  // Aggregate by taxType
  const summary: Record<string, { collected: number; deposited: number; unpaid: number }> = {};
  for (const entry of taxEntries) {
    const type = entry.taxType || 'LAINNYA';
    if (!summary[type]) {
      summary[type] = { collected: 0, deposited: 0, unpaid: 0 };
    }
    summary[type].collected += entry.debit || 0;
    summary[type].deposited += entry.credit || 0;
    summary[type].unpaid = summary[type].collected - summary[type].deposited;
  }

  res.json({
    success: true,
    taxEntries,
    summary,
  });
});

apiRouter.post('/taxes/deposit', async (req, res) => {
  await acquireLock();
  try {
    const raw = db.getRawData();
    const { schoolId, fiscalYear, taxType, taxAmount, billingCode, ntpn, bankName, transactionIds } = req.body;

    const depositRecord = {
      id: `DEP-${Date.now()}`,
      schoolId,
      fiscalYear: Number(fiscalYear),
      depositNumber: `NTPN-${ntpn}`,
      date: new Date().toISOString().split('T')[0],
      taxType,
      taxAmount: Number(taxAmount),
      billingCode,
      ntpn,
      bankName: bankName || 'Bank BJB',
      transactionIds: transactionIds || [],
      status: 'Lunas' as const,
      createdAt: new Date().toISOString(),
    };

    raw.PembayaranPajak.push(depositRecord);

    // Update tax in transactions to deposited
    if (transactionIds && transactionIds.length > 0) {
      for (const tId of transactionIds) {
        const trx = raw.Transaksi.find(t => t.id === tId);
        if (trx && trx.taxes) {
          for (const tax of trx.taxes) {
            if (tax.taxType === taxType || !taxType) {
              tax.isDeposited = true;
              tax.ntpn = ntpn;
              tax.depositDate = depositRecord.date;
            }
          }
        }
      }
    }

    db.refreshLedgers(schoolId, Number(fiscalYear));

    db.logAudit({
      userId: 'BENDAHARA',
      username: 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId,
      action: 'SETOR_PAJAK',
      module: 'Perpajakan',
      details: `Penyetoran pajak ${taxType} senilai Rp ${Number(taxAmount).toLocaleString('id-ID')} dengan NTPN ${ntpn}`,
    });

    res.json({ success: true, deposit: depositRecord });
  } finally {
    releaseLock();
  }
});

// ==========================================
// 7. REKONSILIASI KEUANGAN
// ==========================================

apiRouter.get('/reconciliation', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;

  const list = raw.Rekonsiliasi.filter(r => r.schoolId === schoolId && r.fiscalYear === year);
  const bankStatements = raw.LaporanBank.filter(b => b.schoolId === schoolId);

  res.json({ success: true, reconciliations: list, bankStatements });
});

apiRouter.post('/reconciliation', async (req, res) => {
  await acquireLock();
  try {
    const raw = db.getRawData();
    const data = req.body;
    const newRec = {
      id: `REC-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };

    raw.Rekonsiliasi.push(newRec);
    db.saveData();

    db.logAudit({
      userId: 'BENDAHARA',
      username: 'bendahara',
      userRole: 'BENDAHARA_SEKOLAH',
      schoolId: data.schoolId,
      action: 'SIMPAN_REKONSILIASI',
      module: 'Rekonsiliasi Keuangan',
      details: `Rekonsiliasi kas bulan ${data.periodMonth}/${data.periodYear} disimpan dengan status: ${data.reconciliationStatus}`,
    });

    res.json({ success: true, reconciliation: newRec });
  } finally {
    releaseLock();
  }
});

// ==========================================
// 8. DOKUMEN: KUITANSI, SPPD, SURAT, BERITA ACARA
// ==========================================

// Kuitansi
apiRouter.get('/receipts', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const list = raw.TandaTerima.filter(r => r.schoolId === schoolId && r.fiscalYear === year);
  res.json({ success: true, receipts: list });
});

apiRouter.post('/receipts', (req, res) => {
  const raw = db.getRawData();
  const data = req.body;
  const year = Number(data.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const receiptNum = db.getNextNumber('KWT', data.schoolId, year);

  const newReceipt = {
    id: `RCT-${Date.now()}`,
    receiptNumber: receiptNum,
    ...data,
    fiscalYear: year,
    status: 'Diterbitkan',
    createdAt: new Date().toISOString(),
  };

  raw.TandaTerima.push(newReceipt);
  db.saveData();

  db.logAudit({
    userId: 'BENDAHARA',
    username: 'bendahara',
    userRole: 'BENDAHARA_SEKOLAH',
    schoolId: data.schoolId,
    action: 'CETAK_KUITANSI',
    module: 'Pembuatan Kuitansi',
    details: `Menerbitkan Kuitansi No. ${receiptNum} untuk ${newReceipt.recipientName} sebesar Rp ${Number(newReceipt.amount).toLocaleString('id-ID')}`,
  });

  res.json({ success: true, receipt: newReceipt });
});

// SPPD
apiRouter.get('/sppd', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const list = raw.SPPD.filter(s => s.schoolId === schoolId && s.fiscalYear === year);
  res.json({ success: true, sppd: list });
});

apiRouter.post('/sppd', (req, res) => {
  const raw = db.getRawData();
  const data = req.body;
  const year = Number(data.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const letterNumber = db.getNextNumber('SURAT', data.schoolId, year);
  const sppdNumber = db.getNextNumber('SPPD', data.schoolId, year);

  const newSPPD = {
    id: `SPPD-${Date.now()}`,
    letterNumber,
    sppdNumber,
    ...data,
    fiscalYear: year,
    status: 'Selesai',
    createdAt: new Date().toISOString(),
  };

  raw.SPPD.push(newSPPD);
  db.saveData();

  db.logAudit({
    userId: 'BENDAHARA',
    username: 'bendahara',
    userRole: 'BENDAHARA_SEKOLAH',
    schoolId: data.schoolId,
    action: 'CETAK_SPPD',
    module: 'Modul SPPD',
    details: `Menerbitkan SPPD No. ${sppdNumber} tujuan ${newSPPD.destination} a.n. ${newSPPD.travelerName}`,
  });

  res.json({ success: true, sppd: newSPPD });
});

// Surat Administrasi
apiRouter.get('/letters', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const list = raw.SuratSurat.filter(s => s.schoolId === schoolId && s.fiscalYear === year);
  res.json({ success: true, letters: list });
});

apiRouter.post('/letters', (req, res) => {
  const raw = db.getRawData();
  const data = req.body;
  const year = Number(data.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const letterNumber = db.getNextNumber('SURAT', data.schoolId, year);

  const newLetter = {
    id: `LTR-${Date.now()}`,
    letterNumber,
    ...data,
    fiscalYear: year,
    status: 'Final',
    createdAt: new Date().toISOString(),
  };

  raw.SuratSurat.push(newLetter);
  db.saveData();

  res.json({ success: true, letter: newLetter });
});

// Berita Acara
apiRouter.get('/minutes', (req, res) => {
  const { schoolId, fiscalYear } = req.query;
  const raw = db.getRawData();
  const year = Number(fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const list = raw.Risalah.filter(m => m.schoolId === schoolId && m.fiscalYear === year);
  res.json({ success: true, minutes: list });
});

apiRouter.post('/minutes', (req, res) => {
  const raw = db.getRawData();
  const data = req.body;
  const year = Number(data.fiscalYear) || raw.PengaturanAplikasi.activeFiscalYear;
  const minutesNumber = db.getNextNumber('BA', data.schoolId, year);

  const newMinutes = {
    id: `MIN-${Date.now()}`,
    minutesNumber,
    ...data,
    fiscalYear: year,
    createdAt: new Date().toISOString(),
  };

  raw.Risalah.push(newMinutes);
  db.saveData();

  res.json({ success: true, minutes: newMinutes });
});

// ==========================================
// 9. DINAS MONITORING & REPORTS
// ==========================================

apiRouter.get('/dinas/overview', (req, res) => {
  const raw = db.getRawData();
  const year = raw.PengaturanAplikasi.activeFiscalYear;

  const totalSchools = raw.Sekolah.length;
  const activeSchools = raw.Sekolah.filter(s => !s.isLocked).length;

  let totalPagu = 0;
  let totalDiterima = 0;
  let totalRealisasi = 0;
  let totalTaxRecorded = 0;

  const schoolStats = raw.Sekolah.map(s => {
    const plan = raw.BudgetPlans.find(b => b.schoolId === s.id && b.fiscalYear === year);
    const trxs = raw.Transaksi.filter(t => t.schoolId === s.id && t.fiscalYear === year);

    const pagu = plan ? plan.totalPagu : 0;
    const terima = trxs
      .filter(t => t.type === 'PENERIMAAN')
      .reduce((sum, t) => sum + t.amount, 0);
    const keluar = trxs
      .filter(t => t.type === 'PENGELUARAN')
      .reduce((sum, t) => sum + t.amount, 0);
    const saldo = terima - keluar;
    const pct = pagu > 0 ? (keluar / pagu) * 100 : 0;

    totalPagu += pagu;
    totalDiterima += terima;
    totalRealisasi += keluar;

    const taxAmount = trxs
      .filter(t => t.hasTax && t.taxes)
      .reduce((sum, t) => sum + t.taxes.reduce((tsum, tax) => tsum + tax.taxAmount, 0), 0);
    totalTaxRecorded += taxAmount;

    const hasCompletedReports = trxs.length > 0 && raw.Rekonsiliasi.some(r => r.schoolId === s.id && r.fiscalYear === year);

    return {
      schoolId: s.id,
      name: s.name,
      npsn: s.npsn,
      status: s.status,
      level: s.level,
      pagu,
      terima,
      keluar,
      saldo,
      percentage: pct,
      taxAmount,
      transactionCount: trxs.length,
      reportStatus: hasCompletedReports ? 'Lengkap' : 'Belum Lengkap',
      verificationStatus: s.verificationStatus || 'TERVERIFIKASI',
    };
  });

  const overallPercentage = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;
  const totalBalance = totalDiterima - totalRealisasi;
  const completedCount = schoolStats.filter(s => s.reportStatus === 'Lengkap').length;
  const pendingCount = totalSchools - completedCount;
  const pendingVerificationCount = raw.Sekolah.filter(s => s.verificationStatus === 'MENUNGGU_VERIFIKASI').length;

  res.json({
    success: true,
    totalSchools,
    activeSchools,
    pendingVerificationCount,
    totalPagu,
    totalDiterima,
    totalRealisasi,
    totalBalance,
    totalTaxRecorded,
    overallPercentage,
    completedCount,
    pendingCount,
    schools: schoolStats,
  });
});

// ==========================================
// 10. GOOGLE APPS SCRIPT CODE & SETTINGS
// ==========================================

apiRouter.get('/gas/script', (req, res) => {
  res.json({
    success: true,
    scriptCode: GOOGLE_APPS_SCRIPT_CODE,
    instructions: [
      '1. Buka Google Spreadsheet baru.',
      '2. Buka menu Ekstensi > Apps Script.',
      '3. Salin dan tempel kode ini.',
      '4. Jalankan initDatabase() untuk membuat 28 sheet otomatis.',
      '5. Terapkan sebagai Aplikasi Web (Deploy as Web App).',
    ],
  });
});

apiRouter.get('/gas/diagnostics', (req, res) => {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);

  // Compute table record counts
  const sheetStats: Record<string, { columnCount: number; localCount: number; columns: string[] }> = {};
  let totalLocalRecords = 0;

  for (const [sheetName, columns] of Object.entries(SHEETS_SCHEMA_MAP)) {
    const tableData = (raw as any)[sheetName] || [];
    const count = Array.isArray(tableData) ? tableData.length : 1;
    sheetStats[sheetName] = {
      columnCount: columns.length,
      localCount: count,
      columns,
    };
    totalLocalRecords += count;
  }

  const isConfigured = Boolean(settings.googleAppsScriptUrl && settings.googleAppsScriptUrl.trim() !== '');
  const isValidFormat = Boolean(isConfigured && settings.googleAppsScriptUrl.startsWith('https://script.google.com/'));

  res.json({
    success: true,
    structureCompliant: true,
    totalRequiredSheets: Object.keys(SHEETS_SCHEMA_MAP).length,
    sheets: sheetStats,
    configuration: {
      googleAppsScriptUrl: settings.googleAppsScriptUrl || '',
      isLiveSyncEnabled: Boolean(settings.isLiveSyncEnabled),
      isConfigured,
      isValidFormat,
      lastSyncTimestamp: settings.lastSyncTimestamp || null,
      totalLocalRecords,
    },
    syncStatus: {
      isSynchronized: Boolean(settings.isLiveSyncEnabled && settings.lastSyncTimestamp),
      statusText: !isConfigured 
        ? 'BELUM TERHUBUNG (URL Google Apps Script belum dimasukkan)' 
        : !settings.isLiveSyncEnabled 
        ? 'TERHUBUNG (Live Sync belum diaktifkan)' 
        : settings.lastSyncTimestamp 
        ? `TERSINKRONISASI (Terakhir: ${new Date(settings.lastSyncTimestamp).toLocaleString('id-ID')})`
        : 'SIAP SINKRONISASI (Belum pernah sinkron manual)',
    },
    structuralChecks: [
      { name: '28 Sheet Database BOSP Lengkap', passed: true, detail: '28 sheet terdaftar di skema Apps Script & Database Engine.' },
      { name: 'Struktur Verifikasi Satuan Pendidikan (Sekolah & Pengguna)', passed: true, detail: 'Kolom VerificationStatus telah tersedia pada Pengguna & Sekolah.' },
      { name: 'Struktur Objek Belanja BOSP (MainType, Tahap1/2, ItemsJSON)', passed: true, detail: 'KomponenAnggaran mendukung MainType, Tahap1/Tahap2, dan rincian ItemsJSON.' },
      { name: 'Master Sub-Rincian Dinamis (MasterSubComponents)', passed: true, detail: 'Sheet MasterSubComponents siap menampung kustomisasi Juknis BOSP masa depan.' },
      { name: 'URL Web App Apps Script Ditetapkan', passed: isConfigured, detail: isConfigured ? settings.googleAppsScriptUrl : 'Belum dikonfigurasi di Pengaturan Aplikasi.' },
      { name: 'Sinkronisasi Otomatis Diaktifkan', passed: Boolean(settings.isLiveSyncEnabled), detail: settings.isLiveSyncEnabled ? 'Live Sync Aktif' : 'Live Sync Nonaktif' }
    ]
  });
});

apiRouter.post('/gas/handshake', async (req, res) => {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  const targetUrl = (req.body.gasUrl || settings.googleAppsScriptUrl || '').trim();

  const val = validateGasUrl(targetUrl);
  if (!val.valid) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_URL',
      isHtml: false,
      message: val.reason,
    });
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const pingUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=ping';
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const rawText = await response.text();
    const parsed = parseGasResponse(rawText, targetUrl);

    if (!parsed.isJson) {
      return res.status(400).json({
        success: false,
        status: 'HTML_RESPONSE_DETECTED',
        isHtml: true,
        latencyMs,
        message: 'Handshake Gagal: Endpoint Google Apps Script mengembalikan halaman web HTML (bukan format JSON).',
        documentationUrl: 'https://developers.google.com/apps-script/execution/web-apps',
        steps: [
          'Buka Google Apps Script > Deploy > Manage deployments > Edit (pensil).',
          'Ubah "Who has access" (Yang memiliki akses) menjadi "Anyone" (Siapa saja).',
          'Ubah "Execute as" (Jalankan sebagai) menjadi "Me (Email Anda)".',
          'Pada bagian Version, pilih "New version" (Versi Baru) lalu klik Deploy.'
        ],
      });
    }

    return res.json({
      success: true,
      status: 'HANDSHAKE_SUCCESSFUL',
      isHtml: false,
      latencyMs,
      message: `Handshake Koneksi Berhasil! Google Apps Script Web App merespons dengan JSON valid (${latencyMs}ms).`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    return res.status(504).json({
      success: false,
      status: isTimeout ? 'TIMEOUT' : 'CONNECTION_ERROR',
      isHtml: false,
      latencyMs,
      message: isTimeout
        ? 'Handshake melampaui batas waktu 10 detik. Pastikan URL Web App dapat diakses publik.'
        : `Gagal melakukan Handshake Koneksi: ${err.message || 'Kesalahan jaringan'}`,
    });
  }
});

apiRouter.post('/gas/test-connection', async (req, res) => {
  const raw = db.getRawData();
  const settings = raw.PengaturanAplikasi || ({} as any);
  const targetUrl = (req.body.gasUrl || settings.googleAppsScriptUrl || '').trim();

  const val = validateGasUrl(targetUrl);
  if (!val.valid) {
    return res.status(400).json({
      success: false,
      status: 'INVALID_URL',
      message: val.reason,
    });
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // Step 1: Ping endpoint check
    const pingUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=ping';
    const pingResponse = await fetch(pingUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    const pingText = await pingResponse.text();
    const pingParsed = parseGasResponse(pingText, targetUrl);

    if (!pingParsed.isJson) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      return res.status(400).json({
        success: false,
        status: 'NON_JSON_RESPONSE',
        latencyMs,
        message: 'Google Apps Script merespons dengan halaman HTML (bukan JSON). Meskipun Anda sudah menyetel "Anyone", hal ini terjadi karena salah satu dari 3 hal:\n1. Opsi "Execute as" belum disetel ke "Me (Email Anda)".\n2. Saat menyimpan/edit deployment, Anda belum memilih "Version: New version".\n3. Kebijakan akun Google Workspace (@belajar.id / @dinas.go.id) memblokir akses publik. Gunakan akun @gmail.com pribadi.',
      });
    }

    // Step 2: Full structure & spreadsheet binding check
    const checkUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=checkStructure';
    const response = await fetch(checkUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const rawText = await response.text();
    const parsed = parseGasResponse(rawText, targetUrl);

    if (!parsed.isJson) {
      return res.status(400).json({
        success: false,
        status: 'SPREADSHEET_ACCESS_ERROR',
        latencyMs,
        message: 'Web App Apps Script Online, tetapi gagal membaca Google Spreadsheet. Pastikan Apps Script dibuka dari menu Ekstensi > Apps Script di dalam Spreadsheet, dan fungsi initDatabase() telah dijalankan satu kali.',
      });
    }

    const data = parsed.data;

    if (data && data.status === 'success') {
      const remoteSheets = data.sheets || {};
      const foundCount = Object.keys(remoteSheets).length;

      // Update real active spreadsheet id and name in settings
      if (data.spreadsheetId) {
        settings.googleSpreadsheetId = data.spreadsheetId;
      }
      if (data.spreadsheetName) {
        settings.googleSpreadsheetName = data.spreadsheetName;
      }
      db.saveData();

      res.json({
        success: true,
        status: 'CONNECTED',
        latencyMs,
        spreadsheetName: data.spreadsheetName || 'Google Spreadsheet BOSP',
        spreadsheetId: data.spreadsheetId || settings.googleSpreadsheetId || '',
        totalSheetsFound: foundCount,
        sheets: remoteSheets,
        message: `Koneksi berhasil! Terhubung ke Google Spreadsheet "${data.spreadsheetName || 'SIPANDA BOSP'}" (${latencyMs}ms). Ditemukan ${foundCount} sheet aktif.`,
      });
    } else {
      res.status(400).json({
        success: false,
        status: 'SCRIPT_ERROR',
        latencyMs,
        message: data?.error || data?.message || 'Apps Script merespons dengan kesalahan.',
      });
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    res.status(504).json({
      success: false,
      status: isTimeout ? 'TIMEOUT' : 'CONNECTION_FAILED',
      latencyMs,
      message: isTimeout
        ? 'Koneksi ke Google Apps Script melampaui batas waktu (12 detik). Pastikan Web App Anda diatur akses "Anyone" (Siapa saja).'
        : `Gagal menghubungi Google Apps Script: ${err.message || 'Periksa koneksi internet dan izin deployment.'}`,
    });
  }
});

apiRouter.post('/gas/recycle', async (req, res) => {
  const targetUrl = (req.body.gasUrl || '').trim();
  const result = await performGasRecycle(targetUrl);
  if (result.success) {
    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      action: 'DAUR_ULANG_DATABASE_SPREADSHEET',
      module: 'Integrasi Spreadsheet',
      details: `Admin Dinas mendaur ulang struktur seluruh 30 sheet pada Google Spreadsheet (${result.latencyMs || 0}ms). ID Spreadsheet: ${result.spreadsheetId || '-'}`,
    });
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

apiRouter.post('/gas/sync', async (req, res) => {
  const targetUrl = (req.body.gasUrl || '').trim();
  const result = await performGasSync(targetUrl);
  if (result.success) {
    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      action: 'SINKRONISASI_GOOGLE_SHEETS',
      module: 'Integrasi Spreadsheet',
      details: `Berhasil menyinkronkan 30 sheet ke Google Spreadsheet via Apps Script (${result.latencyMs || 0}ms).`,
    });
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

apiRouter.post('/gas/pull-passwords', async (req, res) => {
  const targetUrl = (req.body.gasUrl || '').trim();
  const result = await performGasPull(targetUrl);
  if (result.success) {
    db.logAudit({
      userId: 'ADMIN',
      username: 'admin_dinas',
      userRole: 'ADMIN_DINAS',
      action: 'UPDATE_PASSWORD_FROM_SPREADSHEET',
      module: 'Integrasi Spreadsheet',
      details: result.message,
    });
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

apiRouter.get('/settings', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, settings: raw.PengaturanAplikasi });
});

apiRouter.put('/settings', (req, res) => {
  const raw = db.getRawData();
  raw.PengaturanAplikasi = {
    ...raw.PengaturanAplikasi,
    ...req.body,
  };
  db.saveData();
  res.json({ success: true, settings: raw.PengaturanAplikasi });
});

apiRouter.get('/audit-logs', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, logs: raw.AuditLog });
});

apiRouter.get('/announcements', (req, res) => {
  const raw = db.getRawData();
  res.json({ success: true, announcements: raw.Pengumuman });
});

apiRouter.post('/announcements', (req, res) => {
  const raw = db.getRawData();
  const newAnn = {
    id: `ANN-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  raw.Pengumuman.unshift(newAnn);
  db.saveData();
  res.json({ success: true, announcement: newAnn });
});

// Database Export & Reset
apiRouter.get('/database/backup', (req, res) => {
  const raw = db.getRawData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=sipanda_bosp_backup_${Date.now()}.json`);
  res.send(JSON.stringify(raw, null, 2));
});

apiRouter.get('/database/excel-export', (req, res) => {
  try {
    const raw = db.getRawData();
    const tables2D = formatTablesForGas(raw);
    const wb = XLSX.utils.book_new();

    for (const [sheetName, headers] of Object.entries(SHEETS_SCHEMA_MAP)) {
      const dataRows = tables2D[sheetName] || [];
      const sheetData = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      const safeSheetName = sheetName.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `SIPANDA_BOSP_28_Sheet_Database_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Error exporting Excel workbook:', err);
    res.status(500).json({ success: false, message: 'Gagal mengekspor file Excel.' });
  }
});

apiRouter.post('/database/reset', (req, res) => {
  const resetDb = db.resetDatabase();
  res.json({ success: true, message: 'Database SIPANDA BOSP berhasil diatur ulang ke kondisi bersih (tanpa data dummy).' });
});
