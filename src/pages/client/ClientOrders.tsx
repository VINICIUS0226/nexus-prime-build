import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, ReceiptText, RotateCcw } from 'lucide-react';

type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'bank_slip';
type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type Payment = {
  id: string;
  method: PaymentMethod;
  amount: number | string;
  status: PaymentStatus;
  paid_at: string | null;
};

type Sale = {
  id: string;
  reservation_id: string | null;
  created_at: string;
  subtotal: number | string;
  freight_value: number | string;
  discount: number | string;
  total: number | string;
  notes: string | null;
  payments: Payment[];
};

type ReservationStatus =
  | 'active'
  | 'in_client_possession'
  | 'returned'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled';

type Reservation = {
  id: string;
  created_at: string;
  status: ReservationStatus;
  bag_code: string | null;
  notes: string | null;
};

const statusToReservationBadge = (status: ReservationStatus) => {
  switch (status) {
    case 'active':
      return { variant: 'secondary' as const, label: 'Em andamento' };
    case 'in_client_possession':
      return { variant: 'outline' as const, label: 'Com o cliente' };
    case 'awaiting_payment':
      return { variant: 'outline' as const, label: 'Aguardando pagamento' };
    case 'completed':
      return { variant: 'default' as const, label: 'Concluído' };
    case 'returned':
      return { variant: 'destructive' as const, label: 'Devolvido' };
    case 'cancelled':
      return { variant: 'destructive' as const, label: 'Cancelado' };
    default:
      return { variant: 'secondary' as const, label: status };
  }
};

const paymentStatusToBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'approved':
      return { variant: 'default' as const, label: 'Pago' };
    case 'pending':
      return { variant: 'secondary' as const, label: 'Pendente' };
    case 'rejected':
      return { variant: 'destructive' as const, label: 'Rejeitado' };
    case 'cancelled':
      return { variant: 'destructive' as const, label: 'Cancelado' };
    default:
      return { variant: 'secondary' as const, label: status };
  }
};

const ClientOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.email) return;
      setLoading(true);

      try {
        const { data: customer, error: customerErr } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (customerErr) throw customerErr;

        if (!customer) {
          setSales([]);
          return;
        }

        const [reservationsRes, salesRes] = await Promise.all([
          supabase
            .from('reservations')
            .select('id, created_at, status, bag_code, notes')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sales')
            .select(
              'id, reservation_id, created_at, subtotal, freight_value, discount, total, notes, payments(id, method, amount, status, paid_at)'
            )
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false }),
        ]);

        if (reservationsRes.error) throw reservationsRes.error;
        if (salesRes.error) throw salesRes.error;

        setReservations((reservationsRes.data || []) as Reservation[]);
        setSales((salesRes.data || []) as Sale[]);
      } catch (err: unknown) {
        console.error('Erro ao carregar pedidos do cliente:', err);
        toast({
          title: 'Erro ao carregar pedidos',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.email, toast, refreshIndex]);

  const emptyState = useMemo(
    () =>
      !loading && reservations.length === 0 && sales.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Você ainda não fez compras no portal.
          </CardContent>
        </Card>
      ) : null,
    [loading, reservations.length, sales.length]
  );

  return (
    <ClientLayout>
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas compras</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o status das suas compras e pagamentos no portal.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setRefreshIndex((i) => i + 1)}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>

            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/client/products">
                Ir para produtos <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando pedidos...
            </CardContent>
          </Card>
        ) : (
          <>
            {emptyState}

            {reservations.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Rastreamento (em processamento)</h2>
                <div className="space-y-3">
                  {reservations.map((r) => {
                    const badge = statusToReservationBadge(r.status);
                    return (
                      <Card key={r.id}>
                        <CardHeader>
                          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="break-all">Pedido #{r.id.slice(0, 8)}</span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                            <span>
                              Criado em{' '}
                              {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            <span>{r.bag_code ? `Bag: ${r.bag_code}` : 'Sem bag code'}</span>
                          </div>

                          {r.notes ? (
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{r.notes}</pre>
                          ) : (
                            <p className="text-sm text-muted-foreground">Sem observações.</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {sales.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Compras e pagamentos</h2>
                <div className="space-y-3">
                  {sales.map((s) => {
                    const firstPayment = s.payments && s.payments.length > 0 ? s.payments[0] : null;
                    const badge = firstPayment ? paymentStatusToBadge(firstPayment.status) : { variant: 'secondary' as const, label: 'Sem pagamento' };
                    const totalNumber = Number(s.total);

                    return (
                      <Card key={s.id}>
                        <CardHeader>
                          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="break-all">Venda #{s.id.slice(0, 8)}</span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                            <span>
                              Criado em{' '}
                              {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            <span className="font-medium text-foreground">Total: R$ {Number.isFinite(totalNumber) ? totalNumber.toFixed(2) : '-'}</span>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {firstPayment
                              ? `Pagamento: ${firstPayment.method.toUpperCase()} • ${firstPayment.paid_at ? 'pago em ' + format(new Date(firstPayment.paid_at), 'dd/MM/yyyy', { locale: ptBR }) : 'pendente'}`
                              : 'Pagamento não informado.'}
                          </p>

                          {s.notes ? <p className="text-sm text-muted-foreground">{s.notes}</p> : null}

                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toast({
                                  title: 'Detalhes da venda',
                                  description: 'Itens do pedido ainda não foram exibidos nesta etapa.',
                                })
                              }
                              className="gap-2"
                            >
                              <ReceiptText className="h-4 w-4" />
                              Ver detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientOrders;

