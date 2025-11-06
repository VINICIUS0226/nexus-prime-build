import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const Payments = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Pagamentos
          </h1>
          <p className="text-muted-foreground mt-2">
            Controle de pagamentos e transações financeiras
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transações
            </CardTitle>
            <CardDescription>
              Em desenvolvimento - Gestão de pagamentos e integração com Asaas
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

export default Payments;
