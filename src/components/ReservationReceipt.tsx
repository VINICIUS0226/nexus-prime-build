import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export const ReservationReceipt = forwardRef<HTMLDivElement, ReservationReceiptProps>(
  ({ reservation, storeConfig, labelCopies = 2 }, ref) => {
    const storeName = storeConfig?.store_name || 'Minha Loja';
    const storeAddress = storeConfig?.store_address;
    const storePhone = storeConfig?.store_phone;
    const storeEmail = storeConfig?.store_email;
    const storeCnpj = storeConfig?.store_cnpj;

    const code = reservation.bag_code || reservation.id.slice(0, 8).toUpperCase();

    const { totalItems, totalValue } = useMemo(() => {
      const items = reservation.reservation_items || [];
      return {
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: items.reduce((sum, item) => sum + item.quantity * Number(item.unit_price || 0), 0),
      };
    }, [reservation.reservation_items]);

    const labels = Array.from({ length: Math.max(1, Math.min(labelCopies, 4)) });

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-[400px] mx-auto font-mono text-sm"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="border-b-2 border-dashed border-black pb-4 mb-4 text-center">
          <h1 className="text-lg font-bold uppercase leading-tight">{storeName}</h1>
          {storeCnpj && <p className="text-[10px]">CNPJ: {storeCnpj}</p>}
          {storeAddress && <p className="text-[10px]">{storeAddress}</p>}
          {(storePhone || storeEmail) && (
            <p className="text-[10px]">{[storePhone, storeEmail].filter(Boolean).join(' | ')}</p>
          )}
          <p className="text-xs mt-2 font-bold">RECIBO / CONTROLE DE RESERVA</p>
        </div>

        {/* Reservation Info */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <div className="flex justify-between">
            <span>Cód. sacola:</span>
            <span className="font-bold">{code}</span>
          </div>
          <div className="flex justify-between">
            <span>Reserva:</span>
            <span className="font-bold">#{reservation.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{format(new Date(reservation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-bold">{String(reservation.status || '').toUpperCase()}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <p className="font-bold mb-1">CLIENTE:</p>
          <p>{reservation.customer?.full_name || '-'}</p>
          <p className="text-xs">{reservation.customer?.phone || '-'}</p>
          {reservation.customer?.email && <p className="text-xs">{reservation.customer?.email}</p>}
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <div className="flex justify-between mb-2">
            <p className="font-bold">ITENS:</p>
            <p className="text-xs">
              {totalItems} un • {formatCurrency(totalValue)}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-dotted border-gray-400">
                <th className="text-left py-1 w-[26px]">OK</th>
                <th className="text-center py-1 w-[34px]">Qtd</th>
                <th className="text-left py-1">Produto</th>
                <th className="text-right py-1 w-[70px]">SKU</th>
              </tr>
            </thead>
            <tbody>
              {(reservation.reservation_items || []).map((item) => {
                const productName = item.variation?.product?.name || 'Produto';
                const variationInfo = [item.variation?.size, item.variation?.color].filter(Boolean).join(' / ');
                return (
                  <tr key={item.id} className="border-b border-dotted border-gray-200">
                    <td className="py-1">[ ]</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="py-1">
                      <div>{productName}</div>
                      {variationInfo && <div className="text-[10px] text-gray-600">{variationInfo}</div>}
                    </td>
                    <td className="text-right py-1">{item.variation?.sku || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Freight / Delivery control */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <p className="font-bold mb-2">CONTROLE DE FRETE / ENTREGA:</p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Modalidade:</span>
              <span>____________________</span>
            </div>
            <div className="flex justify-between">
              <span>Valor frete (R$):</span>
              <span>____________</span>
            </div>
            <div className="flex justify-between">
              <span>Pago:</span>
              <span>( ) SIM  ( ) NÃO</span>
            </div>
            <div className="flex justify-between">
              <span>Rastreio/OS:</span>
              <span>____________________</span>
            </div>
            <div className="mt-2">
              <div className="font-bold mb-1">Endereço (se entrega):</div>
              <div>________________________________________</div>
              <div>________________________________________</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div className="border-b border-dashed border-black pb-3 mb-3">
            <p className="font-bold mb-1">OBS:</p>
            <p className="text-xs">{reservation.notes}</p>
          </div>
        )}

        {/* Internal control */}
        <div className="border-b-2 border-dashed border-black pb-3 mb-3">
          <p className="font-bold mb-2">CONTROLE INTERNO:</p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Separado por:</span>
              <span>____________________</span>
            </div>
            <div className="flex justify-between">
              <span>Conferido por:</span>
              <span>____________________</span>
            </div>
            <div className="flex justify-between">
              <span>Retirada/Envio em:</span>
              <span>____/____/______  ____:____</span>
            </div>
            <div className="flex justify-between">
              <span>Ass. Cliente:</span>
              <span>____________________</span>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="text-center text-xs mt-4">
          <p className="font-bold mb-2">ETIQUETAS DA SACOLA</p>
        </div>

        {labels.map((_, idx) => (
          <div key={idx} className="border-2 border-dashed border-black p-3 mb-3">
            <div className="text-center">
              <div className="text-xl font-bold">{code}</div>
              <div className="text-xs mt-1">{reservation.customer?.full_name || '-'}</div>
              <div className="text-xs">{reservation.customer?.phone || '-'}</div>
              <div className="text-[10px] mt-1">
                {format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            </div>
            <div className="border-t border-dotted border-black mt-2 pt-2 text-[10px]">
              <div className="flex justify-between">
                <span>Itens:</span>
                <span className="font-bold">{totalItems} un</span>
              </div>
              <div className="flex justify-between">
                <span>Valor:</span>
                <span className="font-bold">{formatCurrency(totalValue)}</span>
              </div>
            </div>
            <div className="border-t border-dotted border-black mt-2 pt-2 text-[10px]">
              <div className="font-bold mb-1">Conteúdo:</div>
              {(reservation.reservation_items || []).slice(0, 10).map((item) => {
                const productName = item.variation?.product?.name || 'Produto';
                const variationInfo = [item.variation?.size, item.variation?.color].filter(Boolean).join(' / ');
                const line = [productName, variationInfo].filter(Boolean).join(' - ');
                return (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate pr-2" style={{ maxWidth: '260px' }}>
                      {line}
                    </span>
                    <span className="font-bold">{item.quantity}x</span>
                  </div>
                );
              })}
              {(reservation.reservation_items || []).length > 10 && (
                <div className="text-[10px] text-gray-600 mt-1">+ mais itens no recibo</div>
              )}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center text-xs mt-4">
          <p className="mt-2 text-[10px] text-gray-500">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </div>
    );
  }
);

ReservationReceipt.displayName = 'ReservationReceipt';

export default ReservationReceipt;

