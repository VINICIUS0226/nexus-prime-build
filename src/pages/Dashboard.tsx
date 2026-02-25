import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  freight_value: number;
  created_at: string;
  customer_id: string;
  reservation_id: string | null;
}

interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  method: string;
  status: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    activeReservations: 0,
    totalSales: 0,
    lowStockItems: 0,
    monthlySales: 0,
    todaySales: 0,
    averageTicket: 0,
    previousMonthSales: 0,
  });
  const [salesByDay, setSalesByDay] = useState<{ date: string; total: number; count: number }[]>([]);
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const last30Days = subDays(today, 30).toISOString();
      
      // Previous month for comparison
      const prevMonthStart = startOfMonth(subDays(startOfMonth(today), 1)).toISOString();
      const prevMonthEnd = endOfMonth(subDays(startOfMonth(today), 1)).toISOString();

      const [products, customers, reservations, allSales, lowStock, monthlySalesData, todaySalesData, payments, prevMonthSalesData] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sales').select('*').gte('created_at', last30Days).order('created_at', { ascending: false }),
        supabase.from('product_variations').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5),
        supabase.from('sales').select('total').gte('created_at', monthStart).lte('created_at', monthEnd),
        supabase.from('sales').select('total').gte('created_at', startOfToday),
        supabase.from('payments').select('*').gte('created_at', last30Days),
        supabase.from('sales').select('total').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd),
      ]);

      const totalSalesValue = allSales.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const monthlyTotal = monthlySalesData.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const todayTotal = todaySalesData.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const avgTicket = allSales.data && allSales.data.length > 0 ? totalSalesValue / allSales.data.length : 0;
      const prevMonthTotal = prevMonthSalesData.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;

      setStats({
        totalProducts: products.count || 0,
        totalCustomers: customers.count || 0,
        activeReservations: reservations.count || 0,
        totalSales: totalSalesValue,
        lowStockItems: lowStock.count || 0,
        monthlySales: monthlyTotal,
        todaySales: todayTotal,
        averageTicket: avgTicket,
        previousMonthSales: prevMonthTotal,
      });

      // Process sales by day for the last 30 days
      if (allSales.data) {
        const days = eachDayOfInterval({
          start: subDays(today, 29),
          end: today,
        });

        const salesByDayMap = new Map<string, { total: number; count: number }>();
        
        days.forEach(day => {
          salesByDayMap.set(format(day, 'yyyy-MM-dd'), { total: 0, count: 0 });
        });

        allSales.data.forEach(sale => {
          const saleDate = format(parseISO(sale.created_at), 'yyyy-MM-dd');
          const existing = salesByDayMap.get(saleDate);
          if (existing) {
            salesByDayMap.set(saleDate, {
              total: existing.total + Number(sale.total || 0),
              count: existing.count + 1,
            });
          }
        });

        const salesByDayArray = Array.from(salesByDayMap.entries()).map(([date, data]) => ({
          date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
          total: data.total,
          count: data.count,
        }));

        setSalesByDay(salesByDayArray);
        setRecentSales(allSales.data.slice(0, 5));
      }

      // Process sales by payment method with system colors
      if (payments.data) {
        const paymentMethodColors: Record<string, string> = {
          pix: 'hsl(var(--chart-1))',
          credit_card: 'hsl(var(--chart-2))',
          debit_card: 'hsl(var(--chart-3))',
          cash: 'hsl(var(--chart-4))',
          bank_slip: 'hsl(var(--chart-5))',
        };

        const paymentMethodLabels: Record<string, string> = {
          pix: 'PIX',
          credit_card: 'Cartão de Crédito',
          debit_card: 'Cartão de Débito',
          cash: 'Dinheiro',
          bank_slip: 'Boleto',
        };

        const methodTotals = new Map<string, number>();
        
        payments.data.forEach(payment => {
          if (payment.status === 'approved') {
            const current = methodTotals.get(payment.method) || 0;
            methodTotals.set(payment.method, current + Number(payment.amount || 0));
          }
        });

        const methodData = Array.from(methodTotals.entries())
          .map(([method, value]) => ({
            name: paymentMethodLabels[method] || method,
            value,
            color: paymentMethodColors[method] || 'hsl(var(--muted))',
          }))
          .sort((a, b) => b.value - a.value);

        setSalesByPaymentMethod(methodData);
      }

    } catch (error: any) {
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getMonthlyGrowth = () => {
    if (stats.previousMonthSales === 0) return null;
    const growth = ((stats.monthlySales - stats.previousMonthSales) / stats.previousMonthSales) * 100;
    return growth;
  };

  const monthlyGrowth = getMonthlyGrowth();

  const chartConfig = {
    total: {
      label: "Valor",
      color: "hsl(var(--primary))",
    },
    count: {
      label: "Qtd",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Main KPI Cards - RESPONSIVIDADE: grid-cols-1 no mobile para empilhar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today Sales */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas Hoje
              </CardTitle>
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-success/20" />
          </Card>

          {/* Monthly Sales */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas no Mês
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlySales)}</div>
              {monthlyGrowth !== null && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${monthlyGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthlyGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(monthlyGrowth).toFixed(1)}% vs mês anterior
                </div>
              )}
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20" />
          </Card>

          {/* Average Ticket */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <div className="p-2 rounded-lg bg-secondary/10">
                <ShoppingCart className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/20" />
          </Card>

          {/* Active Reservations */}
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reservas Ativas
              </CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeReservations}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando processamento</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent/20" />
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales by Day Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Vendas nos Últimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={salesByDay} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `R$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value: number) => formatCurrency(value)}
                    />} 
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Sales by Payment Method */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesByPaymentMethod.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByPaymentMethod}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="hsl(var(--background))"
                        >
                          {salesByPaymentMethod.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {salesByPaymentMethod.map((method, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: method.color }}
                          />
                          <span className="text-muted-foreground truncate">{method.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(method.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                  Nenhum pagamento nos últimos 30 dias
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - RESPONSIVIDADE: grid-cols-1 no mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Products */}
          <Card className="hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Produtos
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          {/* Customers */}
          <Card className="hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Cadastrados
              </CardTitle>
              <div className="p-2 rounded-lg bg-secondary/10">
                <Users className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          {stats.lowStockItems > 0 ? (
            <Card className="border-destructive/30 bg-destructive/5 hover:shadow-elegant transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  Estoque Baixo
                </CardTitle>
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.lowStockItems}</div>
                <p className="text-xs text-destructive/80 mt-1">Itens precisam reposição</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="hover:shadow-elegant transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estoque
                </CardTitle>
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium text-success">Tudo OK</div>
                <p className="text-xs text-muted-foreground mt-1">Nenhum item em baixa</p>
              </CardContent>
            </Card>
          )}

          {/* Total Sales 30 Days */}
          <Card className="bg-primary/5 border-primary/20 hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Total (30 dias)
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-primary/70 mt-1">{recentSales.length} vendas</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;