import { forwardRef, useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  selling_price: number | null;
  image_url: string | null;
}

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  product?: Product;
}

interface ReservationItem {
  id: string;
  variation_id: string;
  quantity: number;
  unit_price: number;
  is_returned: boolean;
  variation?: ProductVariation;
}

interface Reservation {
  id: string;
  customer_id: string;
  created_by: string;
  status: string;
  bag_code: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  reservation_items?: ReservationItem[];
}

interface StoreConfig {
  store_name?: string;
  store_phone?: string;
  store_email?: string;
  store_address?: string;
  store_cnpj?: string;
}

interface ReservationReceiptProps {
  reservation: Reservation;
  storeConfig?: StoreConfig;
  labelCopies?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPhone = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  return phone;
};

export const ReservationReceipt = forwardRef<HTMLDivElement, ReservationReceiptProps>(
  ({ reservation, storeConfig, labelCopies = 1 }, ref) => {
    const storeName = storeConfig?.store_name || 'Minha Loja';
    const storeAddress = storeConfig?.store_address || '';
    const storePhone = storeConfig?.store_phone || '';
    const storeEmail = storeConfig?.store_email || '';
    const storeCnpj = storeConfig?.store_cnpj || '';

    const code = reservation.bag_code || reservation.id.slice(0, 8).toUpperCase();
    const orderId = reservation.id.slice(0, 12).toUpperCase();

    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const barcodeRef = useRef<SVGSVGElement>(null);

    const totalItems = (reservation.reservation_items || []).reduce((s, i) => s + i.quantity, 0);
    const totalValue = (reservation.reservation_items || []).reduce((s, i) => s + i.quantity * Number(i.unit_price || 0), 0);

    useEffect(() => {
      const encoded = JSON.stringify({
        id: reservation.id,
        bag_code: reservation.bag_code,
        customer: reservation.customer?.full_name,
        created_at: reservation.created_at,
      });
      QRCode.toDataURL(encoded, { margin: 1, scale: 3, width: 80 })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    }, [reservation.id, reservation.bag_code, reservation.customer?.full_name, reservation.created_at]);

    useEffect(() => {
      if (barcodeRef.current) {
        try {
          JsBarcode(barcodeRef.current, orderId, {
            format: 'CODE128',
            width: 1.5,
            height: 50,
            displayValue: true,
            fontSize: 10,
            margin: 2,
          });
        } catch (e) {
          // fallback: barcode generation failed
        }
      }
    }, [orderId]);

    const labels = Array.from({ length: Math.max(1, Math.min(labelCopies, 4)) });

    return (
      <div
        ref={ref}
        className="bg-white text-black max-w-[420px] mx-auto font-sans text-xs"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
      >
        {/* === ETIQUETA DE ENVIO === */}
        <div style={{ border: '2px solid #000', padding: '0' }}>
          {/* Top bar - Store branding */}
          <div style={{ borderBottom: '2px solid #000', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>{storeName}</div>
              {storeCnpj && <div style={{ fontSize: '9px', color: '#666' }}>CNPJ: {storeCnpj}</div>}
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR" style={{ width: '48px', height: '48px' }} />
            )}
          </div>

          {/* Order ID + Barcode */}
          <div style={{ borderBottom: '2px solid #000', padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#666' }}>ID Reserva: </span>
                <span style={{ fontWeight: 'bold', fontSize: '11px' }}>#{orderId}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#666' }}>Sacola: </span>
                <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{code}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <svg ref={barcodeRef} style={{ width: '100%', maxHeight: '55px' }} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '9px', color: '#666' }}>
              {format(new Date(reservation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          {/* Recipient section */}
          <div style={{ borderBottom: '2px solid #000' }}>
            <div style={{ background: '#000', color: '#fff', padding: '3px 12px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>
              DESTINATÁRIO
            </div>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '2px' }}>
                {reservation.customer?.full_name || '-'}
              </div>
              <div style={{ fontSize: '10px', color: '#333' }}>
                {formatPhone(reservation.customer?.phone || '')}
              </div>
              {reservation.customer?.email && (
                <div style={{ fontSize: '10px', color: '#333' }}>{reservation.customer.email}</div>
              )}
            </div>
          </div>

          {/* Items summary */}
          <div style={{ borderBottom: '2px solid #000', padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '10px' }}>CONTEÚDO ({totalItems} itens)</span>
              <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{formatCurrency(totalValue)}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '2px 0', fontWeight: '600' }}>Produto</th>
                  <th style={{ textAlign: 'center', padding: '2px 0', fontWeight: '600', width: '30px' }}>Qtd</th>
                  <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: '600', width: '60px' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {(reservation.reservation_items || []).slice(0, 8).map((item) => {
                  const productName = item.variation?.product?.name || 'Produto';
                  const variationInfo = [item.variation?.size, item.variation?.color].filter(Boolean).join(' / ');
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px dotted #eee' }}>
                      <td style={{ padding: '2px 0' }}>
                        <div>{productName}</div>
                        {variationInfo && <div style={{ fontSize: '9px', color: '#888' }}>{variationInfo}</div>}
                      </td>
                      <td style={{ textAlign: 'center', padding: '2px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '2px 0' }}>{formatCurrency(item.unit_price * item.quantity)}</td>
                    </tr>
                  );
                })}
                {(reservation.reservation_items || []).length > 8 && (
                  <tr>
                    <td colSpan={3} style={{ fontSize: '9px', color: '#888', padding: '2px 0' }}>
                      + {(reservation.reservation_items || []).length - 8} itens adicionais
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sender section */}
          <div style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', marginBottom: '2px' }}>REMETENTE:</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{storeName}</div>
            {storeAddress && <div style={{ fontSize: '10px' }}>{storeAddress}</div>}
            {(storePhone || storeEmail) && (
              <div style={{ fontSize: '10px', color: '#555' }}>
                {[storePhone ? formatPhone(storePhone) : '', storeEmail].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div style={{ marginTop: '8px', padding: '6px 12px', border: '1px dashed #999', fontSize: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>OBS: </span>{reservation.notes}
          </div>
        )}

        {/* Status + Date footer */}
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#999', marginTop: '6px' }}>
          Status: {String(reservation.status || '').toUpperCase()} • Impresso em {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
        </div>

        {/* Extra label copies (cut-out bag labels) */}
        {labels.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', borderTop: '1px dashed #ccc', paddingTop: '8px' }}>
              ✂ ETIQUETA(S) DA SACOLA
            </div>
            {labels.map((_, idx) => (
              <div key={idx} style={{ border: '2px dashed #000', padding: '8px 10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{code}</div>
                  <div style={{ fontSize: '10px' }}>{reservation.customer?.full_name || '-'}</div>
                  <div style={{ fontSize: '9px', color: '#666' }}>{formatPhone(reservation.customer?.phone || '')}</div>
                  <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>
                    {totalItems} itens • {formatCurrency(totalValue)}
                  </div>
                </div>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QR" style={{ width: '36px', height: '36px' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

ReservationReceipt.displayName = 'ReservationReceipt';

export default ReservationReceipt;
