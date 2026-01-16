import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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

      const [products, customers, reservations, allSales, lowStock, monthlySalesData, todaySalesData, payments] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sales').select('*').gte('created_at', last30Days).order('created_at', { ascending: false }),
        supabase.from('product_variations').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5),
        supabase.from('sales').select('total').gte('created_at', monthStart).lte('created_at', monthEnd),
        supabase.from('sales').select('total').gte('created_at', startOfToday),
        supabase.from('payments').select('*').gte('created_at', last30Days),
      ]);

      const totalSalesValue = allSales.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const monthlyTotal = monthlySalesData.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const todayTotal = todaySalesData.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;
      const avgTicket = allSales.data && allSales.data.length > 0 ? totalSalesValue / allSales.data.length : 0;

      setStats({
        totalProducts: products.count || 0,
        totalCustomers: customers.count || 0,
        activeReservations: reservations.count || 0,
        totalSales: totalSalesValue,
        lowStockItems: lowStock.count || 0,
        monthlySales: monthlyTotal,
        todaySales: todayTotal,
        averageTicket: avgTicket,
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

      // Process sales by payment method
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

  const statCards = [
    {
      title: 'Vendas Hoje',
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Vendas no Mês',
      value: formatCurrency(stats.monthlySales),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(stats.averageTicket),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Reservas Ativas',
      value: stats.activeReservations,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const secondaryStats = [
    {
      title: 'Total de Produtos',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Clientes',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

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
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-elegant transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales by Day Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Vendas nos Últimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={salesByDay} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Por Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesByPaymentMethod.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByPaymentMethod}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {salesByPaymentMethod.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {salesByPaymentMethod.map((method, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: method.color }}
                          />
                          <span className="text-muted-foreground">{method.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(method.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum pagamento registrado nos últimos 30 dias
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-4">
            {secondaryStats.map((stat, index) => (
              <Card key={index} className="hover:shadow-elegant transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Low Stock Alert */}
          {stats.lowStockItems > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Alerta de Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Você tem <strong>{stats.lowStockItems}</strong> item(ns) com estoque baixo. 
                  Considere reabastecer esses produtos.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Total Sales Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                Total em Vendas (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(stats.totalSales)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {recentSales.length} vendas realizadas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
