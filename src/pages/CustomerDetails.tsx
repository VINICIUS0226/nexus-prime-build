import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ShoppingCart, Package, Calendar, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  cpf: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  data_consent: boolean;
  created_at: string;
}

interface Sale {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount: number;
  freight_value: number;
  notes: string | null;
}

interface Reservation {
  id: string;
  created_at: string;
  status: string;
  notes: string | null;
  bag_code: string | null;
  reservation_items: Array<{
    quantity: number;
    unit_price: number;
  }>;
}

const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Buscar dados do cliente
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Buscar vendas do cliente
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);

      // Buscar reservas do cliente
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          reservation_items (
            quantity,
            unit_price
          )
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateReservationTotal = (reservation: Reservation) => {
    return reservation.reservation_items.reduce(
      (total, item) => total + (item.quantity * item.unit_price),
      0
    );
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalReservations = reservations.reduce(
    (sum, reservation) => sum + calculateReservationTotal(reservation),
    0
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-lg text-muted-foreground">Cliente não encontrado</div>
          <Button onClick={() => navigate('/dashboard/customers')}>
            Voltar para Clientes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/customers')}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold">{customer.full_name}</h1>
              <p className="text-muted-foreground">Detalhes do Cliente</p>
            </div>
          </div>
          <Badge variant={customer.data_consent ? "default" : "destructive"} className="text-base px-4 py-2">
            {customer.data_consent ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-primary text-white border-0 shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 opacity-80" />
                <div>
                  <div className="text-sm font-medium opacity-90">Total em Vendas</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 opacity-80" />
                <div>
                  <div className="text-sm font-medium opacity-90">Número de Vendas</div>
                  <div className="text-2xl font-bold">{sales.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-accent text-white border-0 shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 opacity-80" />
                <div>
                  <div className="text-sm font-medium opacity-90">Total em Reservas</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalReservations)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success text-success-foreground border-0 shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 opacity-80" />
                <div>
                  <div className="text-sm font-medium opacity-90">Reservas Ativas</div>
                  <div className="text-2xl font-bold">
                    {reservations.filter(r => r.status === 'active').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Cliente */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">E-mail</div>
                    <div className="font-medium">{customer.email}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Telefone</div>
                  <div className="font-medium">{customer.phone}</div>
                </div>
              </div>

              {customer.cpf && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">CPF</div>
                    <div className="font-medium">{customer.cpf}</div>
                  </div>
                </div>
              )}

              {(customer.street || customer.city) && (
                <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Endereço</div>
                    <div className="font-medium">
                      {customer.street && `${customer.street}${customer.number ? `, ${customer.number}` : ''}`}
                      {customer.complement && ` - ${customer.complement}`}
                      <br />
                      {customer.neighborhood && `${customer.neighborhood}, `}
                      {customer.city && `${customer.city}`}
                      {customer.state && ` - ${customer.state}`}
                      {customer.cep && ` - CEP: ${customer.cep}`}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm text-muted-foreground">Cliente desde</div>
                  <div className="font-medium">{formatDate(customer.created_at)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico */}
        <Card className="shadow-elegant">
          <CardContent className="p-6">
            <Tabs defaultValue="sales" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="sales" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Vendas ({sales.length})
                </TabsTrigger>
                <TabsTrigger value="reservations" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Reservas ({reservations.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sales">
                {sales.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda registrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-primary">
                        <TableHead className="text-white font-semibold">Data</TableHead>
                        <TableHead className="text-white font-semibold">Subtotal</TableHead>
                        <TableHead className="text-white font-semibold">Desconto</TableHead>
                        <TableHead className="text-white font-semibold">Frete</TableHead>
                        <TableHead className="text-white font-semibold">Total</TableHead>
                        <TableHead className="text-white font-semibold">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{formatDate(sale.created_at)}</TableCell>
                          <TableCell>{formatCurrency(sale.subtotal)}</TableCell>
                          <TableCell className="text-destructive">{formatCurrency(sale.discount)}</TableCell>
                          <TableCell>{formatCurrency(sale.freight_value)}</TableCell>
                          <TableCell className="font-bold text-success">{formatCurrency(sale.total)}</TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">
                            {sale.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="reservations">
                {reservations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma reserva registrada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-primary">
                        <TableHead className="text-white font-semibold">Data</TableHead>
                        <TableHead className="text-white font-semibold">Código da Sacola</TableHead>
                        <TableHead className="text-white font-semibold">Status</TableHead>
                        <TableHead className="text-white font-semibold">Total</TableHead>
                        <TableHead className="text-white font-semibold">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation) => (
                        <TableRow key={reservation.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{formatDate(reservation.created_at)}</TableCell>
                          <TableCell>{reservation.bag_code || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={reservation.status === 'active' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {reservation.status === 'active' ? 'Ativa' : reservation.status === 'completed' ? 'Concluída' : 'Cancelada'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {formatCurrency(calculateReservationTotal(reservation))}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">
                            {reservation.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
