import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, ShoppingCart, Trash2, Eye, Search, Package, 
  User, Calendar, CheckCircle, XCircle, Clock, DollarSign,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  selling_price: number | null;
  image_url: string | null;
}

interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  selling_price: number | null;
  cost_price: number | null;
  product?: Product;
}

interface ReservationItem {
  id: string;
  variation_id: string;
  quantity: number;
  unit_price: number;
  is_returned: boolean;
  variation?: ProductVariation;
}

interface Reservation {
  id: string;
  customer_id: string;
  created_by: string;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  bag_code: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  reservation_items?: ReservationItem[];
}

interface CartItem {
  variation: ProductVariation;
  quantity: number;
  unit_price: number;
}

// Format currency consistently
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Reservations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledCart = (location.state as any)?.prefilledCart;
  const prefilledCustomer = (location.state as any)?.prefilledCustomer;
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [bagCode, setBagCode] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  // Função para formatar o telefone
  const formatPhone = (phone: any) => {
    if (!phone) return "Sem telefone";
    const value = String(phone).replace(/\D/g, "");
    if (value.length === 11) {
      return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  // Load prefilled cart from products page
  useEffect(() => {
    if (prefilledCart && variations.length > 0 && !dialogOpen) {
      const cartItems: CartItem[] = [];
      for (const item of prefilledCart) {
        const variation = variations.find(v => v.id === item.variationId);
        if (variation) {
          cartItems.push({
            variation,
            quantity: item.quantity,
            unit_price: item.unitPrice
          });
        }
      }
      if (cartItems.length > 0) {
        setCart(cartItems);
        if (prefilledCustomer) {
          setSelectedCustomer(prefilledCustomer.id);
        }
        setDialogOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [prefilledCart, variations]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reservationsRes, customersRes, productsRes, variationsRes] = await Promise.all([
        supabase
          .from('reservations')
          .select(`
            *,
            customer:customers(id, full_name, phone, email),
            reservation_items(
              id, variation_id, quantity, unit_price, is_returned,
              variation:product_variations(
                id, product_id, sku, size, color, stock_quantity, reserved_quantity,
                product:products(id, name, description, selling_price, image_url)
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, phone, email').order('full_name'),
        supabase.from('products').select('*').order('name'),
        supabase
          .from('product_variations')
          .select(`
            *,
            product:products(id, name, description, selling_price, image_url)
          `)
      ]);

      if (reservationsRes.error) throw reservationsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (productsRes.error) throw productsRes.error;
      if (variationsRes.error) throw variationsRes.error;

      setReservations(reservationsRes.data as any || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setVariations(variationsRes.data as any || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (variation: ProductVariation) => {
    const available = variation.stock_quantity - variation.reserved_quantity;
    if (available <= 0) {
      toast({
        title: "Sem estoque disponível",
        description: "Este produto não possui estoque disponível para reserva.",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find(item => item.variation.id === variation.id);
    if (existingItem) {
      if (existingItem.quantity >= available) {
        toast({
          title: "Limite atingido",
          description: "Quantidade máxima disponível já adicionada.",
          variant: "destructive",
        });
        return;
      }
      setCart(cart.map(item => 
        item.variation.id === variation.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        variation,
        quantity: 1,
        unit_price: variation.selling_price ?? variation.product?.selling_price ?? 0
      }]);
    }
  };

  const removeFromCart = (variationId: string) => {
    setCart(cart.filter(item => item.variation.id !== variationId));
  };

  const updateCartQuantity = (variationId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.variation.id === variationId) {
        const newQuantity = item.quantity + delta;
        const available = item.variation.stock_quantity - item.variation.reserved_quantity;
        if (newQuantity < 1 || newQuantity > available) return item;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const handleCreateReservation = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para a reserva.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos à reserva.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          customer_id: selectedCustomer,
          created_by: user?.id,
          status: 'active',
          bag_code: bagCode || null,
          notes: notes || null
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      const BATCH_SIZE = 20;
      const itemsToInsert = cart.map(item => ({
        reservation_id: reservation.id,
        variation_id: item.variation.id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
        const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
        const { error: itemError } = await supabase
          .from('reservation_items')
          .insert(batch);

        if (itemError) throw itemError;
      }

      for (let i = 0; i < cart.length; i += BATCH_SIZE) {
        const batch = cart.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(item => 
          supabase
            .from('product_variations')
            .update({ 
              reserved_quantity: item.variation.reserved_quantity + item.quantity 
            })
            .eq('id', item.variation.id)
        ));
      }

      toast({
        title: "Reserva criada!",
        description: `Reserva criada com sucesso. Código: ${bagCode || reservation.id.slice(0, 8)}`,
      });

      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar reserva",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    if (!confirm('Tem certeza que deseja cancelar esta reserva? O estoque será liberado.')) return;

    try {
      for (const item of reservation.reservation_items || []) {
        if (item.variation) {
          await supabase
            .from('product_variations')
            .update({ 
              reserved_quantity: Math.max(0, item.variation.reserved_quantity - item.quantity)
            })
            .eq('id', item.variation_id);
        }
      }

      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: "Reserva cancelada",
        description: "O estoque foi liberado.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar reserva",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConvertToSale = (reservation: Reservation) => {
    navigate(`/dashboard/sales?reservation=${reservation.id}`);
  };

  const resetForm = () => {
    setSelectedCustomer('');
    setBagCode('');
    setNotes('');
    setCart([]);
    setProductSearch('');
  };

  const filteredVariations = variations.filter(v => {
    const product = v.product;
    if (!product) return false;
    const searchLower = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      v.sku.toLowerCase().includes(searchLower) ||
      v.color?.toLowerCase().includes(searchLower) ||
      v.size?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReservations = reservations.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativa', variant: 'default' },
      completed: { label: 'Concluída', variant: 'secondary' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
      expired: { label: 'Expirada', variant: 'outline' }
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReservationTotal = (reservation: Reservation) => {
    return reservation.reservation_items?.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity), 0
    ) || 0;
  };

  const activeReservations = reservations.filter(r => r.status === 'active').length;
  const completedReservations = reservations.filter(r => r.status === 'completed').length;
  const totalReservedValue = reservations
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + getReservationTotal(r), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie cestas de compras e reservas de produtos
          </p>
        </div>

        {/* RESPONSIVIDADE: grid-cols-1 no mobile para não esmagar os cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Ativas</span>
              </div>
              <div className="text-3xl font-bold mt-1">{activeReservations}</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Concluídas</span>
              </div>
              <div className="text-3xl font-bold mt-1">{completedReservations}</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Total</span>
              </div>
              <div className="text-3xl font-bold mt-1">{reservations.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-success text-success-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Valor Reservado</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                R$ {totalReservedValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RESPONSIVIDADE: Empilhamento de botões no mobile */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant">
                <Plus className="mr-2 h-5 w-5" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            {/* RESPONSIVIDADE: Limite de tamanho e scroll para o modal não cortar no celular */}
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6" preventCloseOnOutsideClick>
              <DialogHeader>
                <DialogTitle>Criar Nova Reserva</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Product Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar Produtos</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nome, SKU, cor ou tamanho..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredVariations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum produto encontrado
                      </p>
                    ) : (
                      filteredVariations.map(variation => {
                        const available = variation.stock_quantity - variation.reserved_quantity;
                        return (
                          <div 
                            key={variation.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {variation.product?.image_url ? (
                                <img 
                                  src={variation.product.image_url} 
                                  alt={variation.product?.name}
                                  className="w-12 h-12 object-cover rounded shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm line-clamp-1">{variation.product?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {variation.size && `Tam: ${variation.size}`}
                                  {variation.size && variation.color && ' | '}
                                  {variation.color && `Cor: ${variation.color}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  SKU: {variation.sku} | Disp: {available}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2 ml-2">
                              <span className="font-semibold text-sm whitespace-nowrap">
                                {formatCurrency(variation.product?.selling_price || 0)}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(variation)}
                                disabled={available <= 0}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Cart and Customer */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Cliente *</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name} - {formatPhone(customer.phone)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bagCode">Código da Sacola</Label>
                    <Input
                      id="bagCode"
                      value={bagCode}
                      onChange={(e) => setBagCode(e.target.value)}
                      placeholder="Ex: SACOLA-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                      placeholder="Observações sobre a reserva..."
                      rows={2}
                      maxLength={500}
                      className="resize-none max-h-20"
                    />
                    <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
                  </div>

                  {/* Cart */}
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-semibold">Itens da Reserva</span>
                      <Badge variant="secondary">{cart.length}</Badge>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        Adicione produtos à reserva
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {cart.map(item => (
                          // RESPONSIVIDADE: Empilha em telas muito finas, mantém em linha se tiver espaço
                          <div 
                            key={item.variation.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-muted/50 rounded gap-2"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-1">{item.variation.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.variation.size && `${item.variation.size}`}
                                {item.variation.size && item.variation.color && ' / '}
                                {item.variation.color}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 sm:h-6 sm:w-6"
                                  onClick={() => updateCartQuantity(item.variation.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 sm:w-6 text-center text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 sm:h-6 sm:w-6"
                                  onClick={() => updateCartQuantity(item.variation.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-20 text-right text-sm font-medium whitespace-nowrap">
                                  {formatCurrency(item.unit_price * item.quantity)}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 sm:h-6 sm:w-6 text-destructive shrink-0"
                                  onClick={() => removeFromCart(item.variation.id)}
                                >
                                  <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {cart.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(getCartTotal())}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* RESPONSIVIDADE: Botões ocupando w-full no mobile */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 w-full"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 w-full bg-primary hover:bg-primary/90"
                      onClick={handleCreateReservation}
                      disabled={!selectedCustomer || cart.length === 0}
                    >
                      Criar Reserva
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reservations Table */}
        <Card className="border-2 shadow-elegant">
          <CardContent className="p-0">
            {/* RESPONSIVIDADE: overflow-x-auto na tabela principal */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Código</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Itens</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap">Data</TableHead>
                    <TableHead className="text-right text-primary-foreground font-semibold whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma reserva encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map(reservation => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono text-sm">
                          {reservation.bag_code || reservation.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[150px]">
                            <p className="font-medium line-clamp-1">{reservation.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{formatPhone(reservation.customer?.phone || '')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {reservation.reservation_items?.reduce((sum, item) => sum + item.quantity, 0) || 0} itens
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          R$ {getReservationTotal(reservation).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(reservation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedReservation(reservation);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {reservation.status === 'active' && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-success"
                                  onClick={() => handleConvertToSale(reservation)}
                                  title="Converter em Venda"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleCancelReservation(reservation)}
                                  title="Cancelar Reserva"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0 pr-6">
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <Label className="text-muted-foreground text-xs">Cliente</Label>
                    <p className="font-medium">{selectedReservation.customer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                    {formatPhone(selectedReservation.customer?.phone)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <Label className="text-muted-foreground text-xs">Código da Sacola</Label>
                    <p className="font-medium font-mono">
                      {selectedReservation.bag_code || selectedReservation.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReservation.status)}</div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <Label className="text-muted-foreground text-xs">Data</Label>
                    <p className="font-medium">
                      {format(new Date(selectedReservation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm p-3 bg-muted/50 rounded-lg border">{selectedReservation.notes}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground mb-2 block">
                    Itens da Reserva ({selectedReservation.reservation_items?.length || 0})
                  </Label>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Produto</TableHead>
                          <TableHead className="whitespace-nowrap">Variação</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Qtd</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Valor Unit.</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReservation.reservation_items?.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium min-w-[150px]">
                              {(item.variation as any)?.product?.name || 'Produto'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {(item.variation as any)?.size && `Tam: ${(item.variation as any).size}`}
                              {(item.variation as any)?.size && (item.variation as any)?.color && ' | '}
                              {(item.variation as any)?.color && `Cor: ${(item.variation as any).color}`}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t flex-shrink-0 mt-4">
                  <span className="text-lg font-semibold">Total da Reserva:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(getReservationTotal(selectedReservation))}
                  </span>
                </div>

                {selectedReservation.status === 'active' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button 
                      variant="destructive" 
                      className="flex-1 w-full"
                      onClick={() => {
                        handleCancelReservation(selectedReservation);
                        setDetailsOpen(false);
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Reserva
                    </Button>
                    <Button 
                      className="flex-1 w-full bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => {
                        handleConvertToSale(selectedReservation);
                        setDetailsOpen(false);
                      }}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Converter em Venda
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Reservations;