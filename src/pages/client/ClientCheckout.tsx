import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const ClientCheckout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const [freightConfigs, setFreightConfigs] = useState<
    Array<{ id: string; name: string; base_value: number; calculation_rule: string }>
  >([]);
  const [selectedFreightId, setSelectedFreightId] = useState<string>('none');
  const [cep, setCep] = useState<string>('');

  const initialState = (location.state ?? {}) as { freightId?: string; cep?: string };
  const initialFreightId = String(initialState?.freightId ?? 'none');
  const initialCep = String(initialState?.cep ?? '');

  useEffect(() => {
    const fetchFreights = async () => {
      try {
        const { data, error } = await supabase
          .from('freight_configs')
          .select('id, name, base_value, calculation_rule')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setFreightConfigs(
          (data || []) as Array<{
            id: string;
            name: string;
            base_value: number;
            calculation_rule: string;
          }>
        );
        if ((data || []).length > 0) {
          setSelectedFreightId((prev) => {
            if (prev !== 'none') return prev;
            // if the wanted id exists in the fetched list, use it, otherwise keep first
            const exists = (data || []).some((f) => f.id === initialFreightId);
            if (exists && initialFreightId !== 'none') return initialFreightId;
            return prev;
          });
        }
      } catch (err: unknown) {
        console.warn(
          'Não foi possível carregar frete configs:',
          err instanceof Error ? err.message : err
        );
      }
    };

    if (initialCep) setCep(initialCep);
    fetchFreights();
  }, []);

  useEffect(() => {
    const fetchCustomerZip = async () => {
      if (!user?.email) return;
      if (cep.trim()) return;
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('zip_code')
          .eq('email', user.email)
          .maybeSingle();
        if (error) throw error;
        setCep((data?.zip_code as string) || '');
      } catch (err: unknown) {
        // não bloqueia checkout se não conseguir prefill
        console.warn(
          'Não foi possível pré-preencher CEP:',
          err instanceof Error ? err.message : err
        );
      }
    };

    fetchCustomerZip();
  }, [user?.email, cep]);

  const freightValue = useMemo(() => {
    if (selectedFreightId === 'none') return 0;
    const cfg = freightConfigs.find((f) => f.id === selectedFreightId);
    return cfg ? Number(cfg.base_value) : 0;
  }, [freightConfigs, selectedFreightId]);

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
        .select('id, full_name, phone, zip_code')
        .eq('email', user.email)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) {
        throw new Error('Cliente não encontrado para este usuário.');
      }

      const cepToUse = (cep || customer.zip_code || '').toString();

      // Cria uma reserva como pedido inicial (reutilizando fluxo existente)
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          customer_id: customer.id,
          created_by: user.id,
          status: 'active',
          bag_code: null,
          notes: [
            'Pedido criado pelo portal do cliente',
            cepToUse ? `CEP: ${cepToUse}` : null,
            `Frete: R$ ${freightValue.toFixed(2)} (${selectedFreightId === 'none' ? 'sem frete' : 'config selecionada'})`,
          ]
            .filter(Boolean)
            .join('\n'),
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
          'Seu pedido foi registrado para processamento. A loja entrará em contato para finalizar o pagamento.',
      });

      clearCart();
      navigate('/client/orders');
    } catch (error: unknown) {
      console.error('Erro ao criar pedido do cliente:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finalizar Pedido</h1>
          <p className="text-muted-foreground mt-2">
            Revise seus itens antes de confirmar. Após a confirmação, a loja receberá seu pedido para processamento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frete e condições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">CEP</Label>
                <Input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="Ex: 00000-000"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Modalidade</Label>
                <Select value={selectedFreightId} onValueChange={setSelectedFreightId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o frete" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem frete</SelectItem>
                    {freightConfigs.map((fc) => (
                      <SelectItem key={fc.id} value={fc.id}>
                        {fc.name} - R$ {fc.base_value.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Frete estimado</span>
              <span className="text-sm font-semibold text-foreground">
                R$ {freightValue.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

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
                    R$ {(totalValue + freightValue).toFixed(2)}
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
    </ClientLayout>
  );
};

export default ClientCheckout;

