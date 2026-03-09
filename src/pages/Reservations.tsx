import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  Minus, ChevronLeft, ChevronRight, Printer, ScanBarcode
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhone } from '@/lib/utils';
import { usePrint } from '@/hooks/usePrint';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { ReservationReceipt } from '@/components/ReservationReceipt';

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
  barcode: string | null;
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
  const { printRef, handlePrint } = usePrint();
  const { config: storeConfig } = useStoreConfig();
  
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Cancel confirmation dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);

  // Barcode scanner integration
  const handleBarcodeScan = useCallback((scannedCode: string) => {
    const code = scannedCode.trim();

    // If the new reservation dialog is open, try to add product by barcode/SKU
    if (dialogOpen) {
      const matchedVariation = variations.find(v => 
        v.sku.toLowerCase() === code.toLowerCase() ||
        v.product?.name?.toLowerCase() === code.toLowerCase()
      );

      // Also check product barcode
      const matchedByBarcode = !matchedVariation 
        ? variations.find(v => {
            const product = products.find(p => p.id === v.product_id);
            return product?.barcode?.toLowerCase() === code.toLowerCase();
          })
        : null;

      const found = matchedVariation || matchedByBarcode;
      if (found) {
        addToCart(found);
        sonnerToast.success(`Adicionado: ${found.product?.name || found.sku}`);
      } else {
        sonnerToast.error(`Produto não encontrado: ${code}`);
      }
      return;
    }

    // If not in dialog, search for reservation by bag_code or ID prefix
    const matchedReservation = reservations.find(r => 
      r.bag_code?.toLowerCase() === code.toLowerCase() ||
      r.id.slice(0, 12).toUpperCase() === code.toUpperCase() ||
      r.id.slice(0, 8).toUpperCase() === code.toUpperCase()
    );

    if (matchedReservation) {
      setSelectedReservation(matchedReservation);
      setDetailsOpen(true);
      sonnerToast.success(`Reserva encontrada: ${matchedReservation.bag_code || matchedReservation.id.slice(0, 8)}`);
    } else {
      sonnerToast.error(`Nenhuma reserva encontrada para: ${code}`);
    }
  }, [dialogOpen, variations, products, reservations, addToCart]);

  useBarcodeScanner({ onScan: handleBarcodeScan });

  useEffect(() => {
    fetchData();
  }, []);
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
  }, [prefilledCart, variations, dialogOpen]);

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
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
      return;
    }

    try {
      // 1. Just-In-Time Validation: Checagem rigorosa de estoque antes de inserir
      for (const item of cart) {
        const { data: currentVar } = await supabase
          .from('product_variations')
          .select('stock_quantity, reserved_quantity')
          .eq('id', item.variation.id)
          .single();

        if (currentVar) {
          const availableNow = currentVar.stock_quantity - currentVar.reserved_quantity;
          if (availableNow < item.quantity) {
            throw new Error(`Estoque insuficiente! O item ${item.variation.product?.name} foi reservado por outro usuário agora mesmo.`);
          }
        }
      }

      // 2. Insere a Reserva
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

      // 3. Insere os Itens
      const BATCH_SIZE = 20;
      const itemsToInsert = cart.map(item => ({
        reservation_id: reservation.id,
        variation_id: item.variation.id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
        const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
        const { error: itemError } = await supabase.from('reservation_items').insert(batch);
        if (itemError) throw itemError;
      }

      // 4. Atualiza os estoques reservados lendo o valor atual do banco
      for (const item of cart) {
        const { data: freshVar } = await supabase
          .from('product_variations')
          .select('reserved_quantity')
          .eq('id', item.variation.id)
          .single();

        if (freshVar) {
          const { error: updateError } = await supabase
            .from('product_variations')
            .update({ reserved_quantity: freshVar.reserved_quantity + item.quantity })
            .eq('id', item.variation.id);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Reserva criada!",
        description: `Código: ${bagCode || reservation.id.slice(0, 8)}`,
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

  const openCancelDialog = (reservation: Reservation) => {
    setReservationToCancel(reservation);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancelReservation = async () => {
    if (!reservationToCancel) return;
    const reservation = reservationToCancel;

    try {
      // Libera o estoque lendo o valor mais recente do banco
      for (const item of reservation.reservation_items || []) {
        if (!item.variation_id) continue;

        const { data: freshVar } = await supabase
          .from('product_variations')
          .select('reserved_quantity')
          .eq('id', item.variation_id)
          .single();

        if (freshVar) {
          const { error: updateError } = await supabase
            .from('product_variations')
            .update({ 
              reserved_quantity: Math.max(0, freshVar.reserved_quantity - item.quantity)
            })
            .eq('id', item.variation_id);

          if (updateError) throw updateError;
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

      setCancelDialogOpen(false);
      setReservationToCancel(null);
      setDetailsOpen(false);
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

  // Logica de Paginação Front-end
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

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

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
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
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6" preventCloseOnOutsideClick>
              <DialogHeader>
                <DialogTitle>Criar Nova Reserva</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
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

        {/* Tabela com Paginação */}
        <Card className="border-2 shadow-elegant">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary border-b-0">
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Código</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Cliente</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Itens</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Total</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Status</TableHead>
                    <TableHead className="text-primary-foreground font-semibold whitespace-nowrap py-4">Data</TableHead>
                    <TableHead className="text-right text-primary-foreground font-semibold whitespace-nowrap py-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : paginatedReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Nenhuma reserva encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedReservations.map(reservation => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono text-sm py-4">
                          {reservation.bag_code || reservation.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="min-w-[150px]">
                            <p className="font-medium line-clamp-1">{reservation.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{formatPhone(reservation.customer?.phone || '')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="whitespace-nowrap">
                            {reservation.reservation_items?.reduce((sum, item) => sum + item.quantity, 0) || 0} itens
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap py-4">
                          R$ {getReservationTotal(reservation).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4">{getStatusBadge(reservation.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap py-4">
                          {format(new Date(reservation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right py-4">
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
                                  onClick={() => openCancelDialog(reservation)}
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

            {/* Rodapé com Paginação */}
            {!loading && filteredReservations.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t bg-muted/30">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground w-full md:w-auto text-center sm:text-left">
                  <span>
                    Exibindo {startIndex + 1} - {Math.min(endIndex, filteredReservations.length)} de {filteredReservations.length} reservas
                  </span>
                  <div className="flex items-center gap-2 justify-center">
                    <span>Por página:</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-8 w-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div className="flex justify-end">
                  <Button
                    onClick={() => handlePrint('Recibo de Reserva')}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Recibo / Etiquetas
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedReservation.customer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                    {formatPhone(selectedReservation.customer?.phone)}
                    </p>
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
                  <Label className="text-muted-foreground mb-2 block">
                    Itens da Reserva ({selectedReservation.reservation_items?.length || 0})
                  </Label>
                  <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
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
                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t flex-shrink-0">
                  <span className="text-lg font-semibold">Total da Reserva:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(getReservationTotal(selectedReservation))}
                  </span>
                </div>

                {selectedReservation.status === 'active' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => {
                        openCancelDialog(selectedReservation);
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

        {/* Diálogo de confirmação de cancelamento */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar esta reserva? O estoque será liberado. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setReservationToCancel(null)}>Não, manter reserva</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancelReservation}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, cancelar reserva
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Hidden receipt for printing */}
        <div className="hidden">
          {selectedReservation && (
            <ReservationReceipt
              ref={printRef}
              reservation={selectedReservation}
              storeConfig={storeConfig}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reservations;
