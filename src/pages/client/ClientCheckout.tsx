import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ClientCheckout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const handleConfirmOrder = async () => {
    if (!user?.email) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para concluir seu pedido.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao carrinho antes de finalizar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Encontrar cliente pelo e-mail
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, full_name, phone')
        .eq('email', user.email)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) {
        throw new Error('Cliente não encontrado para este usuário.');
      }

      // Cria uma reserva como pedido inicial (reutilizando fluxo existente)
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          customer_id: customer.id,
          created_by: user.id,
          status: 'active',
          bag_code: null,
          notes: 'Pedido criado pelo portal do cliente',
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // Itens da reserva
      const itemsToInsert = items.map((item) => ({
        reservation_id: reservation.id,
        variation_id: item.variationId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('reservation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Pedido recebido!',
        description:
          'Seu pedido foi registrado como reserva. A loja entrará em contato para finalizar o pagamento.',
      });

      clearCart();
      navigate('/client/catalogs');
    } catch (error: any) {
      console.error('Erro ao criar pedido do cliente:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finalizar Pedido</h1>
          <p className="text-muted-foreground mt-2">
            Revise seus itens antes de confirmar. Após a confirmação, a loja receberá seu pedido para processamento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Itens do Carrinho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há itens no carrinho.
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.variationId}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          {item.variationInfo && (
                            <p className="text-xs text-muted-foreground">
                              {item.variationInfo}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Qtd: {item.quantity} • R$ {item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold">
                        R$ {(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm font-medium">Total do Pedido:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={items.length === 0}
            onClick={handleConfirmOrder}
          >
            Confirmar Pedido
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientCheckout;

