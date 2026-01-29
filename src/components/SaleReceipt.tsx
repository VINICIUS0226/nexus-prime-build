import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Payment {
  id: string;
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'bank_slip';
  amount: number;
  status: string;
}

interface SaleItem {
  product_name: string;
  variation_info: string;
  quantity: number;
  unit_price: number;
}

interface Sale {
  id: string;
  subtotal: number;
  freight_value: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  payments?: Payment[];
  items?: SaleItem[];
}

interface StoreConfig {
  store_name?: string;
  store_phone?: string;
  store_email?: string;
  store_address?: string;
  store_cnpj?: string;
  store_logo_url?: string;
}

interface SaleReceiptProps {
  sale: Sale;
  storeConfig?: StoreConfig;
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  bank_slip: 'Boleto'
};

export const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ sale, storeConfig }, ref) => {
    const storeName = storeConfig?.store_name || 'Minha Loja';
    const storeAddress = storeConfig?.store_address;
    const storePhone = storeConfig?.store_phone;
    const storeEmail = storeConfig?.store_email;
    const storeCnpj = storeConfig?.store_cnpj;
    const storeLogo = storeConfig?.store_logo_url;

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-6 max-w-[400px] mx-auto font-mono text-sm"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="border-b-2 border-dashed border-black pb-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            {storeLogo && (
              <img 
                src={storeLogo} 
                alt="Logo" 
                className="w-12 h-12 object-contain flex-shrink-0" 
              />
            )}
            <div className={storeLogo ? "text-left" : "text-center w-full"}>
              <h1 className="text-lg font-bold uppercase leading-tight">{storeName}</h1>
              {storeCnpj && <p className="text-[10px]">CNPJ: {storeCnpj}</p>}
            </div>
          </div>
          <div className="text-center">
            {storeAddress && <p className="text-[10px]">{storeAddress}</p>}
            {(storePhone || storeEmail) && (
              <p className="text-[10px]">{[storePhone, storeEmail].filter(Boolean).join(' | ')}</p>
            )}
            <p className="text-xs mt-2 font-bold">COMPROVANTE DE VENDA</p>
          </div>
        </div>

        {/* Sale Info */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <div className="flex justify-between">
            <span>Nº:</span>
            <span className="font-bold">#{sale.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <p className="font-bold mb-1">CLIENTE:</p>
          <p>{sale.customer?.full_name}</p>
          <p className="text-xs">{sale.customer?.phone}</p>
          {sale.customer?.email && <p className="text-xs">{sale.customer?.email}</p>}
        </div>

        {/* Items */}
        {sale.items && sale.items.length > 0 && (
          <div className="border-b border-dashed border-black pb-3 mb-3">
            <p className="font-bold mb-2">ITENS:</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dotted border-gray-400">
                  <th className="text-left py-1">Produto</th>
                  <th className="text-center py-1">Qtd</th>
                  <th className="text-right py-1">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={index} className="border-b border-dotted border-gray-200">
                    <td className="py-1">
                      <div>{item.product_name}</div>
                      {item.variation_info && (
                        <div className="text-[10px] text-gray-600">{item.variation_info}</div>
                      )}
                    </td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="text-right py-1">R$ {(item.unit_price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-b-2 border-dashed border-black pb-3 mb-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.freight_value > 0 && (
            <div className="flex justify-between">
              <span>Frete:</span>
              <span>R$ {sale.freight_value.toFixed(2)}</span>
            </div>
          )}
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span>Desconto:</span>
              <span>- R$ {sale.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-dotted border-black">
            <span>TOTAL:</span>
            <span>R$ {sale.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-b border-dashed border-black pb-3 mb-3">
          <p className="font-bold mb-1">PAGAMENTO:</p>
          {sale.payments?.map((payment, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span>{paymentMethodLabels[payment.method] || payment.method}</span>
              <span>R$ {payment.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="border-b border-dashed border-black pb-3 mb-3">
            <p className="font-bold mb-1">OBS:</p>
            <p className="text-xs">{sale.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs mt-4">
          <p>Obrigado pela preferência!</p>
          <p className="mt-2 text-[10px] text-gray-500">
            {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
          </p>
        </div>
      </div>
    );
  }
);

SaleReceipt.displayName = 'SaleReceipt';

export default SaleReceipt;
