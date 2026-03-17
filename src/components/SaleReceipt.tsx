import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhone } from '@/lib/utils';

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
  bank_slip: 'Boleto',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ sale, storeConfig }, ref) => {
    const storeName = storeConfig?.store_name || 'Minha Loja';
    const storeAddress = storeConfig?.store_address || '';
    const storePhone = storeConfig?.store_phone || '';
    const storeEmail = storeConfig?.store_email || '';
    const storeCnpj = storeConfig?.store_cnpj || '';

    const saleNumber = sale.id.slice(0, 8).toUpperCase();
    const saleDate = format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const s = {
      page: { fontFamily: "'Segoe UI', Arial, sans-serif", color: '#000', background: '#fff', padding: '32px 40px', maxWidth: '800px', margin: '0 auto', fontSize: '12px', lineHeight: '1.5' } as React.CSSProperties,
      header: { borderBottom: '3px solid #000', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } as React.CSSProperties,
      title: { fontSize: '18px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, marginBottom: '2px' },
      subtitle: { fontSize: '10px', color: '#555' },
      docTitle: { textAlign: 'center' as const, fontSize: '14px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, padding: '8px 0', borderBottom: '1px solid #ddd', borderTop: '1px solid #ddd', margin: '12px 0', letterSpacing: '2px' },
      section: { marginBottom: '16px' },
      sectionTitle: { fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const, borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: '#333', letterSpacing: '0.5px' },
      row: { display: 'flex', justifyContent: 'space-between', padding: '2px 0' } as React.CSSProperties,
      table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '4px' },
      th: { textAlign: 'left' as const, padding: '6px 4px', borderBottom: '2px solid #000', fontSize: '10px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const },
      thRight: { textAlign: 'right' as const, padding: '6px 4px', borderBottom: '2px solid #000', fontSize: '10px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const },
      thCenter: { textAlign: 'center' as const, padding: '6px 4px', borderBottom: '2px solid #000', fontSize: '10px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const },
      td: { padding: '5px 4px', borderBottom: '1px solid #eee', fontSize: '11px' },
      tdRight: { padding: '5px 4px', borderBottom: '1px solid #eee', fontSize: '11px', textAlign: 'right' as const },
      tdCenter: { padding: '5px 4px', borderBottom: '1px solid #eee', fontSize: '11px', textAlign: 'center' as const },
      totalRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' } as React.CSSProperties,
      grandTotal: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px', fontWeight: 'bold' as const, borderTop: '2px solid #000', marginTop: '4px' } as React.CSSProperties,
      footer: { borderTop: '2px solid #000', marginTop: '24px', paddingTop: '12px', textAlign: 'center' as const, fontSize: '10px', color: '#666' },
    };

    return (
      <div ref={ref} style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>{storeName}</div>
            {storeCnpj && <div style={s.subtitle}>CNPJ: {storeCnpj}</div>}
            {storeAddress && <div style={s.subtitle}>{storeAddress}</div>}
            {(storePhone || storeEmail) && (
              <div style={s.subtitle}>
                {[storePhone ? formatPhone(storePhone) : '', storeEmail].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#666' }}>Nº do Documento</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>#{saleNumber}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{saleDate}</div>
          </div>
        </div>

        {/* Document Title */}
        <div style={s.docTitle}>
          NFC-e — Nota Fiscal de Consumidor Eletrônica (Simplificada)
        </div>

        {/* Customer Info */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Dados do Consumidor</div>
          <div style={s.row}>
            <span>Nome:</span>
            <span style={{ fontWeight: 'bold' }}>{sale.customer?.full_name || '-'}</span>
          </div>
          <div style={s.row}>
            <span>Telefone:</span>
            <span>{formatPhone(sale.customer?.phone || '')}</span>
          </div>
          {sale.customer?.email && (
            <div style={s.row}>
              <span>E-mail:</span>
              <span>{sale.customer.email}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        {sale.items && sale.items.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Itens da Venda</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '30px' }}>#</th>
                  <th style={s.th}>Descrição do Produto</th>
                  <th style={s.thCenter}>Qtd</th>
                  <th style={s.thRight}>Vlr. Unit.</th>
                  <th style={s.thRight}>Vlr. Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={index}>
                    <td style={s.td}>{String(index + 1).padStart(2, '0')}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                      {item.variation_info && (
                        <div style={{ fontSize: '10px', color: '#777' }}>{item.variation_info}</div>
                      )}
                    </td>
                    <td style={s.tdCenter}>{item.quantity}</td>
                    <td style={s.tdRight}>{formatCurrency(item.unit_price)}</td>
                    <td style={s.tdRight}>{formatCurrency(item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Totais</div>
          <div style={s.totalRow}>
            <span>Subtotal dos Produtos:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.freight_value > 0 && (
            <div style={s.totalRow}>
              <span>Frete:</span>
              <span>{formatCurrency(sale.freight_value)}</span>
            </div>
          )}
          {sale.discount > 0 && (
            <div style={s.totalRow}>
              <span>Desconto:</span>
              <span style={{ color: '#c00' }}>- {formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div style={s.grandTotal}>
            <span>VALOR TOTAL</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Formas de Pagamento</div>
          {sale.payments?.map((payment, index) => (
            <div key={index} style={{ ...s.row, fontSize: '11px' }}>
              <span>{paymentMethodLabels[payment.method] || payment.method}</span>
              <span style={{ fontWeight: 'bold' }}>{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {sale.notes && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Informações Complementares</div>
            <div style={{ fontSize: '11px', padding: '6px', background: '#f9f9f9', border: '1px solid #eee' }}>
              {sale.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={s.footer}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Documento sem valor fiscal — Uso interno / Comprovante simplificado
          </p>
          <p>Emitido por {storeName} em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
          <p style={{ marginTop: '8px' }}>Obrigado pela preferência!</p>
        </div>
      </div>
    );
  }
);

SaleReceipt.displayName = 'SaleReceipt';

export default SaleReceipt;
