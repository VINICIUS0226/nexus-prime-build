import { useCallback, useRef } from 'react';

export const usePrint = () => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback((title: string = 'Recibo') => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    
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
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              background: white;
              color: black;
              padding: 10px;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-b-2 { border-bottom: 2px dashed #000; }
            .border-t { border-top: 1px dotted #000; }
            .pb-3 { padding-bottom: 12px; }
            .pb-4 { padding-bottom: 16px; }
            .pt-2 { padding-top: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .text-xs { font-size: 10px; }
            .text-sm { font-size: 12px; }
            .text-lg { font-size: 16px; }
            .text-xl { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .w-full { width: 100%; }
            h1 { font-size: 18px; }
            p { margin: 2px 0; }
            @media print {
              body { 
                width: 80mm;
                margin: 0 auto;
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
    }, 250);
  }, []);

  return { printRef, handlePrint };
};
