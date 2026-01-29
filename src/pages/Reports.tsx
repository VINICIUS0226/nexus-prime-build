import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  CalendarIcon,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date;
  to: Date;
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(197, 78%, 54%)',
  'hsl(142, 76%, 45%)',
  'hsl(25, 95%, 53%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 82%, 52%)',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const Reports = () => {
  const [period, setPeriod] = useState<string>('30');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Update date range when period changes
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const now = new Date();
    
    switch (value) {
      case '7':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case '30':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case '90':
        setDateRange({ from: subDays(now, 90), to: now });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
    }
  };

  // Fetch sales data
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['reports-sales', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          total,
          subtotal,
          discount,
          freight_value,
          created_at,
          customer:customers(full_name),
          payments(method, amount, status)
        `)
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch reservation items for product analysis
  const { data: reservationItems, isLoading: loadingItems } = useQuery({
    queryKey: ['reports-items', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservation_items')
        .select(`
          quantity,
          unit_price,
          variation:product_variations(
            id,
            size,
            color,
            product:products(id, name, category)
          ),
          reservation:reservations!inner(
            status,
            created_at
          )
        `)
        .gte('reservation.created_at', startOfDay(dateRange.from).toISOString())
        .lte('reservation.created_at', endOfDay(dateRange.to).toISOString())
        .eq('reservation.status', 'completed');

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch customers count
  const { data: customersData } = useQuery({
    queryKey: ['reports-customers', dateRange],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch previous period for comparison
  const previousPeriodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  const previousDateRange = {
    from: subDays(dateRange.from, previousPeriodDays),
    to: subDays(dateRange.to, previousPeriodDays)
  };

  const { data: previousSalesData } = useQuery({
    queryKey: ['reports-sales-previous', previousDateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', startOfDay(previousDateRange.from).toISOString())
        .lte('created_at', endOfDay(previousDateRange.to).toISOString());

      if (error) throw error;
      return data || [];
    }
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!salesData) return null;

    const totalRevenue = salesData.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalSales = salesData.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const totalDiscount = salesData.reduce((sum, sale) => sum + Number(sale.discount), 0);

    const previousRevenue = previousSalesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
    const previousSalesCount = previousSalesData?.length || 0;

    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    const salesChange = previousSalesCount > 0 
      ? ((totalSales - previousSalesCount) / previousSalesCount) * 100 
      : 0;

    return {
      totalRevenue,
      totalSales,
      averageTicket,
      totalDiscount,
      revenueChange,
      salesChange,
      newCustomers: customersData || 0
    };
  }, [salesData, previousSalesData, customersData]);

  // Chart data - Sales by day
  const chartData = useMemo(() => {
    if (!salesData) return [];

    const salesByDay: Record<string, { date: string; vendas: number; receita: number }> = {};

    salesData.forEach((sale) => {
      const date = format(parseISO(sale.created_at), 'dd/MM', { locale: ptBR });
      if (!salesByDay[date]) {
        salesByDay[date] = { date, vendas: 0, receita: 0 };
      }
      salesByDay[date].vendas += 1;
      salesByDay[date].receita += Number(sale.total);
    });

    return Object.values(salesByDay).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA - monthB || dayA - dayB;
    });
  }, [salesData]);

  // Payment methods distribution
  const paymentMethodsData = useMemo(() => {
    if (!salesData) return [];

    const methodCounts: Record<string, number> = {};
    const methodLabels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Crédito',
      debit_card: 'Débito',
      cash: 'Dinheiro',
      bank_slip: 'Boleto'
    };

    salesData.forEach((sale) => {
      sale.payments?.forEach((payment) => {
        const label = methodLabels[payment.method] || payment.method;
        methodCounts[label] = (methodCounts[label] || 0) + Number(payment.amount);
      });
    });

    return Object.entries(methodCounts).map(([name, value]) => ({ name, value }));
  }, [salesData]);

  // Top products
  const topProducts = useMemo(() => {
    if (!reservationItems) return [];

    const productStats: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};

    reservationItems.forEach((item) => {
      const productName = item.variation?.product?.name || 'Produto desconhecido';
      const category = item.variation?.product?.category || 'Sem categoria';
      const key = item.variation?.product?.id || productName;

      if (!productStats[key]) {
        productStats[key] = { name: productName, category, quantity: 0, revenue: 0 };
      }
      productStats[key].quantity += item.quantity;
      productStats[key].revenue += item.quantity * Number(item.unit_price);
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [reservationItems]);

  // Category distribution
  const categoryData = useMemo(() => {
    if (!reservationItems) return [];

    const categoryStats: Record<string, number> = {};

    reservationItems.forEach((item) => {
      const category = item.variation?.product?.category || 'Sem categoria';
      categoryStats[category] = (categoryStats[category] || 0) + (item.quantity * Number(item.unit_price));
    });

    return Object.entries(categoryStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reservationItems]);

  const isLoading = loadingSales || loadingItems;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Relatórios
            </h1>
            <p className="text-muted-foreground mt-1">
              Análises e métricas de desempenho da loja
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="lastMonth">Mês passado</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setPeriod('custom');
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Period indicator */}
        <div className="text-sm text-muted-foreground">
          Período: {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(metrics?.totalRevenue || 0)}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {metrics?.revenueChange !== undefined && metrics.revenueChange !== 0 && (
                      <>
                        {metrics.revenueChange > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={metrics.revenueChange > 0 ? 'text-green-500' : 'text-red-500'}>
                          {Math.abs(metrics.revenueChange).toFixed(1)}%
                        </span>
                        <span className="ml-1">vs período anterior</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics?.totalSales || 0}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {metrics?.salesChange !== undefined && metrics.salesChange !== 0 && (
                      <>
                        {metrics.salesChange > 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={metrics.salesChange > 0 ? 'text-green-500' : 'text-red-500'}>
                          {Math.abs(metrics.salesChange).toFixed(1)}%
                        </span>
                        <span className="ml-1">vs período anterior</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(metrics?.averageTicket || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">por venda</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics?.newCustomers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">cadastrados no período</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="vendas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="vendas" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Sales over time */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Vendas por Dia
                  </CardTitle>
                  <CardDescription>
                    Evolução das vendas no período selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `R$ ${value}`}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'receita' ? formatCurrency(value) : value,
                            name === 'receita' ? 'Receita' : 'Vendas'
                          ]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="vendas" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          name="vendas"
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="receita" 
                          stroke="hsl(197, 78%, 54%)" 
                          strokeWidth={2}
                          dot={false}
                          name="receita"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhuma venda no período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent sales table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Vendas Recentes</CardTitle>
                  <CardDescription>
                    Últimas vendas realizadas no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : salesData && salesData.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.slice(0, 10).map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-xs">
                                #{sale.id.slice(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell>{sale.customer?.full_name || '-'}</TableCell>
                              <TableCell>
                                {format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(Number(sale.total))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma venda no período
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Top products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Mais Vendidos
                  </CardTitle>
                  <CardDescription>
                    Top 10 produtos por receita
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6">
                              {index + 1}º
                            </span>
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.quantity} unidades
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {formatCurrency(product.revenue)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum produto vendido no período
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Category distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Categoria</CardTitle>
                  <CardDescription>
                    Distribuição de receita por categoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pagamentos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Payment methods chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pagamento</CardTitle>
                  <CardDescription>
                    Distribuição por forma de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : paymentMethodsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={paymentMethodsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentMethodsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum pagamento no período
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment methods breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento</CardTitle>
                  <CardDescription>
                    Valores por método de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : paymentMethodsData.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethodsData.map((method, index) => {
                        const total = paymentMethodsData.reduce((sum, m) => sum + m.value, 0);
                        const percentage = total > 0 ? (method.value / total) * 100 : 0;
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{method.name}</span>
                              <span>{formatCurrency(method.value)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum pagamento no período
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Discounts card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Resumo de Descontos</CardTitle>
                  <CardDescription>
                    Total de descontos aplicados no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingDown className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(metrics?.totalDiscount || 0)}</p>
                      <p className="text-sm text-muted-foreground">
                        em descontos concedidos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
