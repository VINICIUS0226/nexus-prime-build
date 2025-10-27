import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    activeReservations: 0,
    totalSales: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [products, customers, reservations, sales, lowStock] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sales').select('total'),
        supabase.from('product_variations').select('id', { count: 'exact', head: true }).lt('stock_quantity', 5),
      ]);

      const totalSalesValue = sales.data?.reduce((sum, sale) => sum + Number(sale.total || 0), 0) || 0;

      setStats({
        totalProducts: products.count || 0,
        totalCustomers: customers.count || 0,
        activeReservations: reservations.count || 0,
        totalSales: totalSalesValue,
        lowStockItems: lowStock.count || 0,
      });
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

  const statCards = [
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
    {
      title: 'Reservas Ativas',
      value: stats.activeReservations,
      icon: ShoppingCart,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Total em Vendas',
      value: `R$ ${stats.totalSales.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Bem-vindo ao Sistema PQUENINOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use o menu lateral para navegar entre as diferentes seções do sistema:
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><strong>Produtos:</strong> Cadastre e gerencie seus produtos</li>
              <li><strong>Clientes:</strong> Mantenha o cadastro dos seus clientes</li>
              <li><strong>Reservas:</strong> Crie cestas virtuais para seus clientes</li>
              <li><strong>Vendas:</strong> Registre e acompanhe suas vendas</li>
              <li><strong>Relatórios:</strong> Visualize relatórios de desempenho</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
