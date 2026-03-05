import { useCallback, useRef } from 'react';

export const usePrint = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback((title: string = 'Recibo', format: 'receipt' | 'a4' = 'receipt') => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const isA4 = format === 'a4';
    const printWindow = window.open('', '_blank', isA4 ? 'width=900,height=1100' : 'width=450,height=600');
    
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o recibo.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: ${isA4 ? "'Segoe UI', Arial, sans-serif" : "'Courier New', monospace"};
              font-size: ${isA4 ? '12px' : '12px'};
              line-height: 1.4;
              background: white;
              color: black;
              padding: ${isA4 ? '0' : '10px'};
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; }
            img { max-width: 100%; }
            svg { max-width: 100%; }
            @media print {
              body { 
                ${isA4 ? 'width: 210mm; margin: 0 auto;' : 'width: 80mm; margin: 0 auto;'}
              }
              @page {
                ${isA4 ? 'size: A4; margin: 10mm;' : 'size: 80mm auto; margin: 0;'}
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  }, []);

  return { printRef, handlePrint };
};
