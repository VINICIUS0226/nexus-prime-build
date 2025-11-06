import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

const Reservations = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Reservas
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie cestas de compras e reservas de produtos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Reservas Ativas
            </CardTitle>
            <CardDescription>
              Em desenvolvimento - Gestão de reservas e cestas de compras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Funcionalidade em construção
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reservations;
