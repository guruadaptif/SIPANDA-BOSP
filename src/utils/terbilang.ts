/**
 * Indonesian Number to Words Generator (Terbilang Rupiah)
 * Converts numbers to formal Indonesian words for Receipts, SPPD, and Berita Acara
 * e.g. 1550000 -> "Satu Juta Lima Ratus Lima Puluh Ribu Rupiah"
 */

export function terbilang(angka: number): string {
  if (isNaN(angka) || angka === null || angka === undefined) return 'Nol Rupiah';

  const bilangan = Math.floor(Math.abs(angka));
  if (bilangan === 0) return 'Nol Rupiah';

  const kata = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    if (n < 12) {
      return kata[n];
    } else if (n < 20) {
      return konversi(n - 10) + ' Belas';
    } else if (n < 100) {
      return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10);
    } else if (n < 200) {
      return 'Seratus ' + konversi(n - 100);
    } else if (n < 1000) {
      return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100);
    } else if (n < 2000) {
      return 'Seribu ' + konversi(n - 1000);
    } else if (n < 1000000) {
      return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000);
    } else if (n < 1000000000) {
      return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000);
    } else if (n < 1000000000000) {
      return konversi(Math.floor(n / 1000000000)) + ' Miliar ' + konversi(n % 1000000000);
    } else if (n < 1000000000000000) {
      return konversi(Math.floor(n / 1000000000000)) + ' Triliun ' + konversi(n % 1000000000000);
    }
    return '';
  }

  const hasil = konversi(bilangan)
    .replace(/\s+/g, ' ')
    .trim();

  return `${hasil} Rupiah`;
}

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberOnly(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
