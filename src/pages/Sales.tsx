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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, DollarSign, Trash2, Eye, Search, Package, 
  CreditCard, Banknote, QrCode, Receipt, TrendingUp,
  Minus, CheckCircle, Clock, User, Calendar, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SaleReceipt } from '@/components/SaleReceipt';
import { usePrint } from '@/hooks/usePrint';
import { useStoreConfig } from '@/hooks/useStoreConfig';

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
  variation?: ProductVariation;
}

interface Reservation {
  id: string;
  customer_id: string;
  status: string;
  bag_code: string | null;
  customer?: Customer;
  reservation_items?: ReservationItem[];
}

interface Payment {
  id: string;
  sale_id: string;
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'bank_slip';
  amount: number;
  status: 'pending' | 'approved' | 'cancelled' | 'rejected';
  paid_at: string | null;
}

interface SaleItem {
  product_name: string;
  variation_info: string;
  quantity: number;
  unit_price: number;
}

interface Sale {
  id: string;
  reservation_id: string | null;
  customer_id: string;
  subtotal: number;
  freight_value: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  reservation?: Reservation;
  payments?: Payment[];
  items?: SaleItem[];
}

interface CartItem {
  variation: ProductVariation;
  quantity: number;
  unit_price: number;
}

interface PaymentEntry {
  method: 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'bank_slip';
  amount: number;
}

const paymentMethodLabels: Record<string, { label: string; icon: any }> = {
  pix: { label: 'PIX', icon: QrCode },
  credit_card: { label: 'Cartão de Crédito', icon: CreditCard },
  debit_card: { label: 'Cartão de Débito', icon: CreditCard },
  cash: { label: 'Dinheiro', icon: Banknote },
  bank_slip: { label: 'Boleto', icon: Receipt }
};

// Format phone number with mask (XX) XXXXX-XXXX
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Utility to sanitize and validate numeric inputs
const sanitizeNumericInput = (value: string): number => {
  // Remove leading zeros except for decimals (e.g., "0.5")
  let cleaned = value.replace(/^0+(?=\d)/, '');
  // Replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.');
  // Parse and ensure non-negative
  const num = parseFloat(cleaned);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

const Sales = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reservationIdParam = searchParams.get('reservation');
  const prefilledCart = (location.state as any)?.prefilledCart;
  const prefilledCustomer = (location.state as any)?.prefilledCustomer;
  const { printRef, handlePrint } = usePrint();
  const { config: storeConfig } = useStoreConfig();

  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [saleMode, setSaleMode] = useState<'direct' | 'reservation'>('direct');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedReservation, setSelectedReservation] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [freightValue, setFreightValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (reservationIdParam && reservations.length > 0) {
      const reservation = reservations.find(r => r.id === reservationIdParam);
      if (reservation) {
        loadReservationToSale(reservation);
        setDialogOpen(true);
      }
    }
  }, [reservationIdParam, reservations]);

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
      const [salesRes, customersRes, variationsRes, reservationsRes] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            customer:customers(id, full_name, phone, email),
            payments(id, method, amount, status, paid_at)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, phone, email').order('full_name'),
        supabase
          .from('product_variations')
          .select(`
            *,
            product:products(id, name, description, selling_price, image_url)
          `),
        supabase
          .from('reservations')
          .select(`
            *,
            customer:customers(id, full_name, phone, email),
            reservation_items(
              id, variation_id, quantity, unit_price,
              variation:product_variations(
                id, product_id, sku, size, color, stock_quantity, reserved_quantity,
                product:products(id, name, description, selling_price, image_url)
              )
            )
          `)
          .eq('status', 'active')
      ]);

      if (salesRes.error) throw salesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (variationsRes.error) throw variationsRes.error;
      if (reservationsRes.error) throw reservationsRes.error;

      setSales(salesRes.data as any || []);
      setCustomers(customersRes.data || []);
      setVariations(variationsRes.data as any || []);
      setReservations(reservationsRes.data as any || []);
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

  const fetchSaleItems = async (sale: Sale) => {
    try {
      if (sale.reservation_id) {
        // Fetch from reservation_items if sale was from a reservation
        const { data, error } = await supabase
          .from('reservation_items')
          .select(`
            quantity, unit_price,
            variation:product_variations(
              size, color,
              product:products(name)
            )
          `)
          .eq('reservation_id', sale.reservation_id);

        if (error) throw error;

        const items: SaleItem[] = (data || []).map((item: any) => ({
          product_name: item.variation?.product?.name || 'Produto',
          variation_info: [item.variation?.size, item.variation?.color].filter(Boolean).join(' / '),
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
        setSaleItems(items);
      } else {
        // For direct sales, we need to look at what was in the cart at time of sale
        // Since we don't have a sale_items table, we'll show the totals only
        setSaleItems([]);
      }
    } catch (error: any) {
      console.error('Error fetching sale items:', error);
      setSaleItems([]);
    }
  };

  const handleViewSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
    await fetchSaleItems(sale);
  };

  const loadReservationToSale = (reservation: Reservation) => {
    setSaleMode('reservation');
    setSelectedReservation(reservation.id);
    setSelectedCustomer(reservation.customer_id);
    
    const cartItems: CartItem[] = (reservation.reservation_items || []).map(item => ({
      variation: item.variation as ProductVariation,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    setCart(cartItems);
  };

  const addToCart = (variation: ProductVariation) => {
    const available = variation.stock_quantity - variation.reserved_quantity;
    if (available <= 0) {
      toast({
        title: "Sem estoque disponível",
        description: "Este produto não possui estoque disponível.",
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
        const available = item.variation.stock_quantity - (saleMode === 'reservation' ? 0 : item.variation.reserved_quantity);
        if (newQuantity < 1 || newQuantity > available) return item;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const getTotal = () => getSubtotal() + freightValue - discount;

  const addPayment = () => {
    const remaining = getTotal() - payments.reduce((sum, p) => sum + p.amount, 0);
    if (remaining <= 0) return;
    setPayments([...payments, { method: 'pix', amount: remaining }]);
  };

  const updatePayment = (index: number, field: keyof PaymentEntry, value: any) => {
    setPayments(payments.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getTotalPayments = () => payments.reduce((sum, p) => sum + p.amount, 0);

  const handleCreateSale = async () => {
    // Prevent double submissions
    if (isSubmitting) return;

    if (!selectedCustomer) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
      return;
    }
    if (payments.length === 0) {
      toast({ title: "Adicione formas de pagamento", variant: "destructive" });
      return;
    }
    
    const totalAmount = getTotal();
    const totalPaid = getTotalPayments();
    
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      toast({ 
        title: "Pagamento incorreto", 
        description: `O total dos pagamentos (R$ ${totalPaid.toFixed(2)}) deve ser igual ao total da venda (R$ ${totalAmount.toFixed(2)})`,
        variant: "destructive" 
      });
      return;
    }

    // Set submitting state to prevent multiple clicks
    setIsSubmitting(true);

    try {
      // For reservation sales, verify reservation is still active before proceeding
      if (saleMode === 'reservation' && selectedReservation) {
        const { data: reservationCheck, error: checkError } = await supabase
          .from('reservations')
          .select('status')
          .eq('id', selectedReservation)
          .single();
        
        if (checkError || !reservationCheck) {
          throw new Error('Reserva não encontrada');
        }
        
        if (reservationCheck.status !== 'active') {
          toast({ 
            title: "Reserva já processada", 
            description: "Esta reserva já foi concluída ou cancelada.",
            variant: "destructive" 
          });
          setIsSubmitting(false);
          setDialogOpen(false);
          resetForm();
          fetchData();
          return;
        }
      }

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          reservation_id: saleMode === 'reservation' ? selectedReservation : null,
          customer_id: selectedCustomer,
          created_by: user?.id,
          subtotal: getSubtotal(),
          freight_value: freightValue,
          discount: discount,
          total: totalAmount,
          notes: notes || null
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create payments
      for (const payment of payments) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            sale_id: sale.id,
            method: payment.method,
            amount: payment.amount,
            status: 'approved' as const,
            paid_at: new Date().toISOString()
          }]);
        if (paymentError) throw paymentError;
      }

      // Update stock
      for (const item of cart) {
        if (saleMode === 'reservation') {
          // From reservation: decrease both reserved and stock
          await supabase
            .from('product_variations')
            .update({
              stock_quantity: item.variation.stock_quantity - item.quantity,
              reserved_quantity: Math.max(0, item.variation.reserved_quantity - item.quantity)
            })
            .eq('id', item.variation.id);
        } else {
          // Direct sale: only decrease stock
          await supabase
            .from('product_variations')
            .update({
              stock_quantity: item.variation.stock_quantity - item.quantity
            })
            .eq('id', item.variation.id);
        }
      }

      // Update reservation status if from reservation
      if (saleMode === 'reservation' && selectedReservation) {
        await supabase
          .from('reservations')
          .update({ status: 'completed' })
          .eq('id', selectedReservation);
      }

      toast({
        title: "Venda realizada!",
        description: `Venda #${sale.id.slice(0, 8)} concluída com sucesso.`,
      });

      resetForm();
      setDialogOpen(false);
      navigate('/dashboard/sales');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao criar venda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSaleMode('direct');
    setSelectedCustomer('');
    setSelectedReservation('');
    setCart([]);
    setDiscount(0);
    setFreightValue(0);
    setNotes('');
    setPayments([]);
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

  const filteredSales = sales.filter(s => {
    if (dateFilter === 'all') return true;
    const saleDate = new Date(s.created_at);
    const today = new Date();
    if (dateFilter === 'today') {
      return saleDate.toDateString() === today.toDateString();
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      return saleDate >= weekAgo;
    }
    if (dateFilter === 'month') {
      return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
    }
    return true;
  });

  const getPaymentStatusBadge = (payments: Payment[]) => {
    const allPaid = payments?.every(p => p.status === 'approved');
    if (allPaid) return <Badge variant="default" className="bg-success">Pago</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  // Stats
  const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const monthTotal = sales
    .filter(s => {
      const d = new Date(s.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground mt-2">
            Histórico e gestão de vendas realizadas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Vendas Hoje</span>
              </div>
              <div className="text-3xl font-bold mt-1">{todaySales.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-success text-success-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Faturamento Hoje</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                R$ {todayTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Faturamento Mês</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                R$ {monthTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Total Vendas</span>
              </div>
              <div className="text-3xl font-bold mt-1">{sales.length}</div>
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
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" preventCloseOnOutsideClick>
              <DialogHeader>
                <DialogTitle>Registrar Venda</DialogTitle>
              </DialogHeader>
              
              <Tabs value={saleMode} onValueChange={(v) => {
                setSaleMode(v as 'direct' | 'reservation');
                if (v === 'direct') {
                  setSelectedReservation('');
                  setCart([]);
                }
              }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="direct">Venda Direta</TabsTrigger>
                  <TabsTrigger value="reservation">De Reserva</TabsTrigger>
                </TabsList>

                <TabsContent value="reservation" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecionar Reserva Ativa</Label>
                    <Select value={selectedReservation} onValueChange={(id) => {
                      const reservation = reservations.find(r => r.id === id);
                      if (reservation) loadReservationToSale(reservation);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma reserva" />
                      </SelectTrigger>
                      <SelectContent>
                        {reservations.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.bag_code || r.id.slice(0, 8)} - {r.customer?.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="direct" className="space-y-4">
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

                  <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredVariations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum produto encontrado
                      </p>
                    ) : (
                      filteredVariations.slice(0, 20).map(variation => {
                        const available = variation.stock_quantity - variation.reserved_quantity;
                        return (
                          <div 
                            key={variation.id}
                            className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {variation.product?.image_url ? (
                                <img 
                                  src={variation.product.image_url} 
                                  alt={variation.product?.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{variation.product?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {variation.size} {variation.color && `/ ${variation.color}`} | Disp: {available}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                R$ {variation.product?.selling_price?.toFixed(2)}
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
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Left: Cart */}
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

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-5 w-5" />
                      <span className="font-semibold">Itens da Venda</span>
                      <Badge variant="secondary">{cart.length}</Badge>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        {saleMode === 'reservation' ? 'Selecione uma reserva' : 'Adicione produtos'}
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
                                {item.variation.size} {item.variation.color && `/ ${item.variation.color}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.variation.id, -1)}
                                disabled={saleMode === 'reservation'}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateCartQuantity(item.variation.id, 1)}
                                disabled={saleMode === 'reservation'}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="w-20 text-right text-sm font-medium">
                                R$ {(item.unit_price * item.quantity).toFixed(2)}
                              </span>
                              {saleMode === 'direct' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeFromCart(item.variation.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frete (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={freightValue || ''}
                        onChange={(e) => setFreightValue(sanitizeNumericInput(e.target.value))}
                        onBlur={(e) => setFreightValue(sanitizeNumericInput(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={discount || ''}
                        onChange={(e) => setDiscount(sanitizeNumericInput(e.target.value))}
                        onBlur={(e) => setDiscount(sanitizeNumericInput(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações sobre a venda..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Right: Payment */}
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>R$ {getSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Frete:</span>
                        <span>R$ {freightValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Desconto:</span>
                        <span>- R$ {discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-primary">R$ {getTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <span className="font-semibold">Pagamentos</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={addPayment}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    </div>

                    {payments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        Adicione formas de pagamento
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Select
                              value={payment.method}
                              onValueChange={(v) => updatePayment(index, 'method', v)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(paymentMethodLabels).map(([key, { label }]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={payment.amount || ''}
                              onChange={(e) => updatePayment(index, 'amount', sanitizeNumericInput(e.target.value))}
                              onBlur={(e) => updatePayment(index, 'amount', sanitizeNumericInput(e.target.value))}
                              className="flex-1"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => removePayment(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <div className="flex justify-between items-center pt-2 border-t mt-2">
                          <span className="text-sm font-medium">Total Pagamentos:</span>
                          <span className={`font-bold ${Math.abs(getTotalPayments() - getTotal()) < 0.01 ? 'text-success' : 'text-destructive'}`}>
                            R$ {getTotalPayments().toFixed(2)}
                          </span>
                        </div>
                        {Math.abs(getTotalPayments() - getTotal()) > 0.01 && (
                          <p className="text-xs text-destructive">
                            {getTotalPayments() < getTotal() 
                              ? `Faltam R$ ${(getTotal() - getTotalPayments()).toFixed(2)}`
                              : `Excesso de R$ ${(getTotalPayments() - getTotal()).toFixed(2)}`
                            }
                          </p>
                        )}
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
                      className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                      onClick={handleCreateSale}
                      disabled={!selectedCustomer || cart.length === 0 || payments.length === 0 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Finalizar Venda
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sales Table */}
        <Card className="border-2 shadow-elegant">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground font-semibold">Código</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Cliente</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Origem</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Total</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Pagamento</TableHead>
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
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">
                        #{sale.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customer?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(sale.customer?.phone || '')}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.reservation_id ? 'default' : 'outline'}>
                          {sale.reservation_id ? 'Reserva' : 'Direta'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        R$ {sale.total.toFixed(2)}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(sale.payments || [])}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sale Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="pr-12">
              <DialogTitle>Detalhes da Venda #{selectedSale?.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-end">
                  <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Imprimir Recibo
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedSale.customer?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{formatPhone(selectedSale.customer?.phone || '')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data</Label>
                    <p className="font-medium">
                      {format(new Date(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {saleItems.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Itens da Venda</Label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {saleItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">{item.product_name}</p>
                            {item.variation_info && (
                              <p className="text-xs text-muted-foreground">{item.variation_info}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{item.quantity}x R$ {item.unit_price.toFixed(2)}</p>
                            <p className="font-medium text-sm">R$ {(item.quantity * item.unit_price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSale.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm">{selectedSale.notes}</p>
                  </div>
                )}

                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>R$ {selectedSale.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frete:</span>
                      <span>R$ {selectedSale.freight_value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Desconto:</span>
                      <span>- R$ {selectedSale.discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-primary">R$ {selectedSale.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">Pagamentos</Label>
                  <div className="space-y-2">
                    {selectedSale.payments?.map(payment => {
                      const PaymentIcon = paymentMethodLabels[payment.method]?.icon || CreditCard;
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="h-4 w-4" />
                            <span>{paymentMethodLabels[payment.method]?.label || payment.method}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">R$ {payment.amount.toFixed(2)}</span>
                            <Badge variant={payment.status === 'approved' ? 'default' : 'outline'} className={payment.status === 'approved' ? 'bg-success' : ''}>
                              {payment.status === 'approved' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Hidden Receipt for Printing */}
        <div className="hidden">
          {selectedSale && (
            <SaleReceipt
              ref={printRef}
              sale={{
                ...selectedSale,
                items: saleItems
              }}
              storeConfig={storeConfig}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
