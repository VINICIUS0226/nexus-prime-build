import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { estimateCorreios, type CorreiosEstimate, type CorreiosService } from '@/lib/shipping/correiosEstimate';

const ClientCheckout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  type ViaCepData = {
    cep: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
  };

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const [cep, setCep] = useState<string>('');
  const initialState = (location.state ?? {}) as {
    cep?: string;
    selectedFreight?: 'pac' | 'sedex' | 'sedex10' | 'mototaxi' | 'retirada_loja';
  };
  const initialCep = String(initialState?.cep ?? '');
  const initialSelectedFreight = initialState?.selectedFreight;

  const [viaCepData, setViaCepData] = useState<ViaCepData | null>(null);
  const [viaCepLoading, setViaCepLoading] = useState(false);
  const [viaCepError, setViaCepError] = useState<string | null>(null);

  const [storeCityState, setStoreCityState] = useState<{
    city: string | null;
    state: string | null;
  } | null>(null);

  type FreightConfigRow = {
    id: string;
    name: string;
    base_value: number;
    is_active: boolean;
  };

  const [freightConfigs, setFreightConfigs] = useState<FreightConfigRow[]>([]);

  const [selectedFreight, setSelectedFreight] = useState<
    'pac' | 'sedex' | 'sedex10' | 'mototaxi' | 'retirada_loja'
  >('pac');

  const cleanCep = useMemo(() => cep.replace(/\D/g, ''), [cep]);

  useEffect(() => {
    if (initialCep) setCep(initialCep);
  }, [initialCep]);

  useEffect(() => {
    if (initialSelectedFreight) setSelectedFreight(initialSelectedFreight);
  }, [initialSelectedFreight]);

  useEffect(() => {
    const fetchCustomerAndStore = async () => {
      if (!user?.email) return;
      try {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, zip_code, store_id')
          .eq('email', user.email)
          .maybeSingle();

        if (customerError) throw customerError;

        if (!cep.trim() && customer?.zip_code) {
          setCep(String(customer.zip_code));
        }

        const storeId = customer?.store_id as string | null | undefined;
        if (!storeId) {
          setStoreCityState(null);
          return;
        }

        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('city, state')
          .eq('id', storeId)
          .maybeSingle();

        if (storeError) {
          // Se RLS impedir, ocultamos apenas as opções de mesma cidade.
          console.warn('Não foi possível carregar dados da loja:', storeError.message);
          setStoreCityState(null);
          return;
        }

        setStoreCityState({
          city: store?.city ?? null,
          state: store?.state ?? null,
        });
      } catch (err) {
        console.warn('Erro ao buscar cliente/loja no checkout:', err instanceof Error ? err.message : err);
        setStoreCityState(null);
      }
    };

    fetchCustomerAndStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    const lookupViaCep = async () => {
      if (cleanCep.length !== 8) {
        setViaCepData(null);
        setViaCepError(null);
        return;
      }

      setViaCepLoading(true);
      setViaCepError(null);

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = (await response.json()) as ViaCepData & { erro?: boolean };

        if (data.erro) {
          setViaCepData(null);
          setViaCepError('CEP não encontrado.');
          return;
        }

        setViaCepData(data);
      } catch (err) {
        setViaCepData(null);
        setViaCepError('Falha ao consultar ViaCEP. Tente novamente.');
      } finally {
        setViaCepLoading(false);
      }
    };

    lookupViaCep();
  }, [cleanCep]);

  useEffect(() => {
    const fetchFreightConfigs = async () => {
      if (!user?.email) return;
      try {
        const { data, error } = await supabase
          .from('freight_configs')
          .select('id, name, base_value, is_active')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setFreightConfigs((data || []) as FreightConfigRow[]);
      } catch (err: unknown) {
        console.warn('Não foi possível carregar configs de frete:', err instanceof Error ? err.message : err);
        setFreightConfigs([]);
      }
    };

    fetchFreightConfigs();
  }, [user?.email]);

  const sameCity = useMemo(() => {
    const normalizeCityKey = (value: string | null | undefined) => {
      if (!value) return '';
      const base = value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');

      // remove pontuações/traços e colapsa espaços
      const cleaned = base.replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return '';

      // remove UF (ex.: "RS") se estiver como último "token" (2 letras)
      const tokens = cleaned.split(' ').filter(Boolean);
      if (tokens.length > 1) {
        const last = tokens[tokens.length - 1];
        if (last.length === 2) tokens.pop();
      }
      return tokens.join(' ');
    };

    if (!viaCepData?.localidade || !storeCityState?.city) return false;
    return normalizeCityKey(viaCepData.localidade) === normalizeCityKey(storeCityState.city);
  }, [viaCepData?.localidade, storeCityState?.city]);

  const sameUF = useMemo(() => {
    if (!viaCepData?.uf || !storeCityState?.state) return false;
    return String(viaCepData.uf).trim().toUpperCase() === String(storeCityState.state).trim().toUpperCase();
  }, [viaCepData?.uf, storeCityState?.state]);

  // Fallback: se não der para garantir o nome da cidade, usamos ao menos a UF.
  // Isso evita caso de pequenas variações de texto (ex.: abreviações/pontuação).
  const sameDelivery = sameCity || sameUF;

  useEffect(() => {
    // Se não for mesma cidade, desabilita mototaxi/retirada na loja e volta para PAC.
    if (!sameDelivery && (selectedFreight === 'mototaxi' || selectedFreight === 'retirada_loja')) {
      setSelectedFreight('pac');
    }
  }, [sameDelivery, selectedFreight]);

  const normalizeKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const freightFlags = useMemo(() => {
    const entries = freightConfigs.map((fc) => ({ ...fc, k: normalizeKey(fc.name) }));

    // Fallback: se por algum motivo a tabela não carregar (ex.: RLS/configuração),
    // não deixe o usuário sem opções. Mantém PAC/SEDEX/SEDEX10 habilitados
    // e oferece retirada/mototaxi quando for mesma cidade/UF.
    if (entries.length === 0) {
      return {
        pacEnabled: true,
        sedexEnabled: true,
        sedex10Enabled: true,
        mototaxiEnabled: true,
        retiradaEnabled: true,
        pacConfig: null,
        sedexConfig: null,
        sedex10Config: null,
        mototaxiConfig: null,
        retiradaConfig: null,
      };
    }

    const pac = entries.find((e) => e.k.includes('pac'));
    const sedex10 = entries.find((e) => e.k.includes('sedex10') || (e.k.includes('sedex') && e.k.includes('10')));
    const sedex = entries.find((e) => e.k.includes('sedex') && !e.k.includes('sedex10') && !e.k.endsWith('10'));

    const mototaxi = entries.find((e) => e.k.includes('mototaxi'));
    const retirada = entries.find((e) => e.k.includes('retirada') && e.k.includes('loja'));

    return {
      pacEnabled: !!pac,
      sedexEnabled: !!sedex,
      sedex10Enabled: !!sedex10,
      mototaxiEnabled: !!mototaxi,
      retiradaEnabled: !!retirada,
      pacConfig: pac ?? null,
      sedexConfig: sedex ?? null,
      sedex10Config: sedex10 ?? null,
      mototaxiConfig: mototaxi ?? null,
      retiradaConfig: retirada ?? null,
    };
  }, [freightConfigs]);

  const hasCep = cleanCep.length === 8;
  const canShowFreightOptions = hasCep && !viaCepLoading && !viaCepError;
  const anyFreightOptions =
    freightFlags.pacEnabled ||
    freightFlags.sedexEnabled ||
    freightFlags.sedex10Enabled ||
    (sameDelivery && (freightFlags.mototaxiEnabled || freightFlags.retiradaEnabled));

  useEffect(() => {
    if (!canShowFreightOptions) return;

    const isSelectedEnabled =
      (selectedFreight === 'pac' && freightFlags.pacEnabled) ||
      (selectedFreight === 'sedex' && freightFlags.sedexEnabled) ||
      (selectedFreight === 'sedex10' && freightFlags.sedex10Enabled) ||
      (selectedFreight === 'mototaxi' && sameDelivery && freightFlags.mototaxiEnabled) ||
      (selectedFreight === 'retirada_loja' && sameDelivery && freightFlags.retiradaEnabled);

    if (isSelectedEnabled) return;

    const firstBase =
      freightFlags.pacEnabled ? 'pac' : freightFlags.sedexEnabled ? 'sedex' : freightFlags.sedex10Enabled ? 'sedex10' : null;

    if (firstBase) setSelectedFreight(firstBase);
  }, [canShowFreightOptions, selectedFreight, freightFlags, sameDelivery]);

  const weightKg = useMemo(() => {
    // Peso padrão para UI (todavia, corrigimos depois se você quiser peso real)
    const totalItems = items.reduce((sum, it) => sum + it.quantity, 0);
    return Math.max(0.1, totalItems * 1); // 1kg por unidade
  }, [items]);

  const selectedFreightMeta = useMemo(() => {
    const mkCorreiosMeta = (service: CorreiosService) => {
      const estimate = estimateCorreios(service, weightKg, sameUF, sameCity) as CorreiosEstimate;
      return {
        label:
          service === 'pac' ? 'PAC' : service === 'sedex' ? 'SEDEX' : 'SEDEX10',
        price: estimate.price,
        prazoMin: estimate.prazoMin,
        prazoMax: estimate.prazoMax,
        type: service,
      } as const;
    };

    switch (selectedFreight) {
      case 'pac':
        return mkCorreiosMeta('pac');
      case 'sedex':
        return mkCorreiosMeta('sedex');
      case 'sedex10':
        return mkCorreiosMeta('sedex10');
      case 'mototaxi': {
        const fallback = 15 + weightKg * 2;
        const price = Number((freightFlags.mototaxiConfig?.base_value ?? fallback).toFixed(2));
        return { label: 'Mototaxi (mesma cidade)', price, prazoMin: 0, prazoMax: 1, type: 'mototaxi' } as const;
      }
      case 'retirada_loja':
        return {
          label: 'Retirada na loja',
          price: Number(freightFlags.retiradaConfig?.base_value ?? 0),
          prazoMin: 0,
          prazoMax: 0,
          type: 'retirada_loja',
        } as const;
      default:
        return mkCorreiosMeta('pac');
    }
  }, [sameCity, sameUF, selectedFreight, weightKg, freightFlags]);

  const freightValue = selectedFreightMeta.price;
  const totalWithFreight = totalValue + freightValue;

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

      const cepToUse = (cleanCep || String(customer.zip_code || '')).toString();
      const destinationCity = viaCepData?.localidade ?? null;
      const destinationUF = viaCepData?.uf ?? null;

      if (cepToUse.length !== 8) {
        toast({
          title: 'CEP inválido',
          description: 'Informe um CEP com 8 dígitos para calcular o frete.',
          variant: 'destructive',
        });
        return;
      }

      if (!canShowFreightOptions) {
        toast({
          title: 'CEP necessário',
          description: 'Informe um CEP válido para calcular o frete antes de confirmar.',
          variant: 'destructive',
        });
        return;
      }

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
            `CEP: ${cepToUse}`,
            destinationCity && destinationUF ? `Destino: ${destinationCity}/${destinationUF}` : null,
            `Frete: ${selectedFreightMeta.label}`,
            `Valor estimado: R$ ${selectedFreightMeta.price.toFixed(2)}`,
            selectedFreightMeta.prazoMax > 0
              ? `Prazo estimado: ${selectedFreightMeta.prazoMin} a ${selectedFreightMeta.prazoMax} dias`
              : `Prazo estimado: a confirmar`,
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
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div className="text-center">
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
            <div className="space-y-2">
              <Label className="text-xs">CEP</Label>
              <Input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Ex: 00000-000"
              />
              {viaCepLoading && (
                <p className="text-xs text-muted-foreground">Consultando ViaCEP...</p>
              )}
              {viaCepError && (
                <p className="text-xs text-destructive">{viaCepError}</p>
              )}
              {viaCepData?.localidade && viaCepData?.uf && (
                <p className="text-xs text-muted-foreground">
                  Destino: {viaCepData.localidade}/{viaCepData.uf}
                </p>
              )}
                {storeCityState?.city && storeCityState?.state && (
                <p className="text-[11px] text-muted-foreground">
                  Loja: {storeCityState.city}/{storeCityState.state}
                    {sameDelivery ? ' • mesma cidade/UF' : ''}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Opções de frete</Label>
              {!canShowFreightOptions ? (
                <p className="text-xs text-muted-foreground">
                  {viaCepLoading ? 'Consultando ViaCEP...' : 'Informe o CEP para ver as opções de frete.'}
                </p>
              ) : !anyFreightOptions ? (
                <p className="text-xs text-muted-foreground">Não há opções de frete cadastradas para este destino.</p>
              ) : (
                <RadioGroup
                  value={selectedFreight}
                  onValueChange={(v) => setSelectedFreight(v as typeof selectedFreight)}
                  className="grid gap-2"
                >
                  {freightFlags.pacEnabled && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="pac" />
                      <div className="flex-1">
                        <p className="font-semibold">PAC</p>
                        <p className="text-xs text-muted-foreground">
                          Estimado: R$ {estimateCorreios('pac', weightKg, sameUF, sameCity).price.toFixed(2)} •{' '}
                          {estimateCorreios('pac', weightKg, sameUF, sameCity).prazoMin} a{' '}
                          {estimateCorreios('pac', weightKg, sameUF, sameCity).prazoMax} dias
                        </p>
                      </div>
                    </div>
                  )}

                  {freightFlags.sedexEnabled && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="sedex" />
                      <div className="flex-1">
                        <p className="font-semibold">SEDEX</p>
                        <p className="text-xs text-muted-foreground">
                          Estimado: R$ {estimateCorreios('sedex', weightKg, sameUF, sameCity).price.toFixed(2)} •{' '}
                          {estimateCorreios('sedex', weightKg, sameUF, sameCity).prazoMin} a{' '}
                          {estimateCorreios('sedex', weightKg, sameUF, sameCity).prazoMax} dias
                        </p>
                      </div>
                    </div>
                  )}

                  {freightFlags.sedex10Enabled && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="sedex10" />
                      <div className="flex-1">
                        <p className="font-semibold">SEDEX 10</p>
                        <p className="text-xs text-muted-foreground">
                          Estimado: R$ {estimateCorreios('sedex10', weightKg, sameUF, sameCity).price.toFixed(2)} •{' '}
                          {estimateCorreios('sedex10', weightKg, sameUF, sameCity).prazoMin} a{' '}
                          {estimateCorreios('sedex10', weightKg, sameUF, sameCity).prazoMax} dias
                        </p>
                      </div>
                    </div>
                  )}

                  {sameDelivery && freightFlags.mototaxiEnabled && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="mototaxi" />
                      <div className="flex-1">
                        <p className="font-semibold">Mototaxi (mesma cidade)</p>
                        <p className="text-xs text-muted-foreground">
                          Estimado: R$ {(freightFlags.mototaxiConfig?.base_value ?? 15 + weightKg * 2).toFixed(2)} • até 1 dia
                        </p>
                      </div>
                    </div>
                  )}

                  {sameDelivery && freightFlags.retiradaEnabled && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="retirada_loja" />
                      <div className="flex-1">
                        <p className="font-semibold">Retirada na loja</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(freightFlags.retiradaConfig?.base_value ?? 0) > 0
                            ? `R$ ${(freightFlags.retiradaConfig?.base_value ?? 0).toFixed(2)} • a confirmar`
                            : 'Grátis • a confirmar'}
                        </p>
                      </div>
                    </div>
                  )}
                </RadioGroup>
              )}
            </div>

            {canShowFreightOptions && anyFreightOptions ? (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Frete estimado</span>
                <span className="text-sm font-semibold text-foreground">R$ {freightValue.toFixed(2)}</span>
              </div>
            ) : null}
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
                    R$ {(canShowFreightOptions ? totalWithFreight : totalValue).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
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

