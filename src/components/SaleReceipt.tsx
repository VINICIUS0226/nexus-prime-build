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

interface SaleReceiptProps {
  sale: Sale;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
}

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  bank_slip: 'Boleto'
};

export const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ sale, companyName = "Minha Loja", companyAddress, companyPhone }, ref) => {
    return (
      <div 
        ref={ref}
        className="bg-white text-black p-6 max-w-[400px] mx-auto font-mono text-sm"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
          <h1 className="text-xl font-bold uppercase">{companyName}</h1>
          {companyAddress && <p className="text-xs mt-1">{companyAddress}</p>}
          {companyPhone && <p className="text-xs">{companyPhone}</p>}
          <p className="text-xs mt-2">COMPROVANTE DE VENDA</p>
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
