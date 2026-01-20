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
        // Set prefilled customer if available
        if (prefilledCustomer) {
          setSelectedCustomer(prefilledCustomer.id);
        }
        setDialogOpen(true);
        // Clear location state to prevent re-loading on navigation
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
        unit_price: variation.product?.selling_price || 0
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
      // Create reservation
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

      // Create reservation items in batches to avoid issues with many items
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

      // Update reserved_quantity for all items in batches
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
      // Return stock for each item
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

      // Update reservation status
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

  // Stats
  const activeReservations = reservations.filter(r => r.status === 'active').length;
  const completedReservations = reservations.filter(r => r.status === 'completed').length;
  const totalReservedValue = reservations
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + getReservationTotal(r), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie cestas de compras e reservas de produtos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant">
                <Plus className="mr-2 h-5 w-5" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" preventCloseOnOutsideClick>
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
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{variation.product?.name}</p>
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
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
                            {customer.full_name} - {customer.phone}
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
                          <div 
                            key={item.variation.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.variation.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.variation.size && `${item.variation.size}`}
                                {item.variation.size && item.variation.color && ' / '}
                                {item.variation.color}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.variation.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.variation.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="w-20 text-right text-sm font-medium">
                                {formatCurrency(item.unit_price * item.quantity)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeFromCart(item.variation.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 bg-primary hover:bg-primary/90"
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
            <SelectTrigger className="w-[180px]">
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
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold">Código</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Cliente</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Itens</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Total</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Data</TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold">Ações</TableHead>
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
                        <div>
                          <p className="font-medium">{reservation.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{reservation.customer?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reservation.reservation_items?.reduce((sum, item) => sum + item.quantity, 0) || 0} itens
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {getReservationTotal(reservation).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedReservation.customer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedReservation.customer?.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Código da Sacola</Label>
                    <p className="font-medium font-mono">
                      {selectedReservation.bag_code || selectedReservation.id.slice(0, 8)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReservation.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data</Label>
                    <p className="font-medium">
                      {format(new Date(selectedReservation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm">{selectedReservation.notes}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground mb-2 block">Itens da Reserva</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Variação</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Valor Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReservation.reservation_items?.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {(item.variation as any)?.product?.name || 'Produto'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {(item.variation as any)?.size && `Tam: ${(item.variation as any).size}`}
                              {(item.variation as any)?.size && (item.variation as any)?.color && ' | '}
                              {(item.variation as any)?.color && `Cor: ${(item.variation as any).color}`}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">R$ {item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {(item.unit_price * item.quantity).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-semibold">Total da Reserva:</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {getReservationTotal(selectedReservation).toFixed(2)}
                  </span>
                </div>

                {selectedReservation.status === 'active' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => {
                        handleCancelReservation(selectedReservation);
                        setDetailsOpen(false);
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Reserva
                    </Button>
                    <Button 
                      className="flex-1 bg-success text-success-foreground hover:bg-success/90"
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
