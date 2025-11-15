import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const Sales = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Vendas
          </h1>
          <p className="text-muted-foreground mt-2">
            Histórico e gestão de vendas realizadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Vendas Realizadas
            </CardTitle>
            <CardDescription>
              Em desenvolvimento - Histórico e relatórios de vendas
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

export default Sales;
