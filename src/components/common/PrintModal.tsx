import React, { useRef } from 'react';
import { Printer, Download, X, ExternalLink } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentNumber?: string;
  onExportExcel?: () => void;
  maxWidthClass?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  documentNumber,
  onExportExcel,
  maxWidthClass = 'max-w-5xl',
  headerExtra,
  children,
}) => {
  const printableAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Primary strategy: trigger standard window.print()
    try {
      window.print();
    } catch (err) {
      console.warn('Standard window.print() failed, trying iframe print:', err);
      handleIframePrint();
    }
  };

  const handleIframePrint = () => {
    if (!printableAreaRef.current) return;
    try {
      const existing = document.getElementById('sipanda-print-frame');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'sipanda-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <meta charset="utf-8">
              <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: "Times New Roman", Times, serif; font-size: 11px; color: black; background: white; margin: 0; padding: 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                th, td { border: 1px solid black; padding: 4px; font-size: 10px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
                .font-mono { font-family: monospace; }
                .border { border: 1px solid black; }
                .border-b { border-bottom: 1px solid black; }
                .border-t { border-top: 1px solid black; }
                .border-b-2 { border-bottom: 2px solid black; }
                .border-t-2 { border-top: 2px solid black; }
                .bg-slate-50 { background-color: #f8fafc; }
                .bg-slate-100 { background-color: #f1f5f9; }
                .bg-slate-200 { background-color: #e2e8f0; }
                .p-3 { padding: 12px; }
                .mb-4 { margin-bottom: 16px; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .gap-4 { gap: 16px; }
                .gap-x-6 { column-gap: 24px; }
                .gap-y-1 { row-gap: 4px; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                tfoot { display: table-row-group !important; }
                img { max-height: 50px !important; max-width: 55px !important; width: auto !important; height: auto !important; object-fit: contain !important; }
                .w-14, .h-14, .w-16, .h-16 { max-height: 50px !important; max-width: 55px !important; }
              </style>
            </head>
            <body>
              ${printableAreaRef.current.innerHTML}
            </body>
          </html>
        `);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      }
    } catch (e) {
      console.error('Iframe fallback failed:', e);
    }
  };

  const handleOpenCleanTab = () => {
    if (!printableAreaRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              body { font-family: "Times New Roman", Times, serif; font-size: 11px; color: black; background: white; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              tfoot { display: table-row-group !important; }
              img { max-height: 50px !important; max-width: 55px !important; width: auto !important; height: auto !important; object-fit: contain !important; }
              th, td { border: 1px solid black; padding: 4px; font-size: 10px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              .font-mono { font-family: monospace; }
              .border { border: 1px solid black; }
              .border-b { border-bottom: 1px solid black; }
              .border-t { border-top: 1px solid black; }
              .border-b-2 { border-bottom: 2px solid black; }
              .border-t-2 { border-top: 2px solid black; }
              .bg-slate-50 { background-color: #f8fafc; }
              .bg-slate-100 { background-color: #f1f5f9; }
              .bg-slate-200 { background-color: #e2e8f0; }
              .p-3 { padding: 12px; }
              .mb-4 { margin-bottom: 16px; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .gap-4 { gap: 16px; }
              .gap-x-6 { column-gap: 24px; }
              .gap-y-1 { row-gap: 4px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .uppercase { text-transform: uppercase; }
              .w-14, .h-14, .w-16, .h-16 { max-height: 50px !important; max-width: 55px !important; }
            </style>
          </head>
          <body>
            ${printableAreaRef.current.innerHTML}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white print:static print:block print:z-auto">
      <div className={`bg-white rounded-xl shadow-2xl ${maxWidthClass} w-full max-h-[92vh] flex flex-col border border-slate-200 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-auto print:rounded-none`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between bg-slate-50 rounded-t-xl print:hidden no-print gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {documentNumber && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                No. Registrasi: {documentNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Excel</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              title="Cetak langsung menggunakan dialog cetak peramban"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0B5D3B] hover:bg-[#16865A] rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>
            <button
              onClick={handleOpenCleanTab}
              title="Buka lembar cetak di tab baru untuk pencetakan mandiri jika iframe terbatas"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Buka Tab Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div 
            ref={printableAreaRef}
            className="bg-white shadow-md mx-auto max-w-[210mm] min-h-[297mm] p-8 border border-slate-300 rounded-sm font-serif text-black leading-relaxed print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:min-h-0 print:w-full"
          >
            {children}
          </div>
        </div>

        {/* Modal Footer Tip */}
        <div className="px-6 py-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between rounded-b-xl print:hidden no-print">
          <span>Format standar kedinasan: Kertas A4 (210 x 297 mm) margin standar. Klik "Cetak" atau "Buka Tab Cetak" untuk menyimpan PDF.</span>
          <span>SIPANDA BOSP Enterprise Print Engine</span>
        </div>
      </div>
    </div>
  );
};
