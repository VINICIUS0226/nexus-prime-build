import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
}

interface CustomerCatalog {
  id: string;
  name: string;
  customer_id: string | null;
  filters: any | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  customer?: Customer;
}

const AdminCatalogs = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalogs, setCatalogs] = useState<CustomerCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CustomerCatalog | null>(null);
  const [form, setForm] = useState({
    name: '',
    customer_id: '',
    categories: '',
    min_price: '',
    max_price: '',
    is_active: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customersRes, catalogsRes] = await Promise.all([
          supabase.from('customers').select('id, full_name, email').order('full_name'),
          supabase
            .from('customer_catalogs')
            .select('*, customer:customers(id, full_name, email)')
            .order('created_at', { ascending: false }),
        ]);

        if (customersRes.error) throw customersRes.error;
        if (catalogsRes.error) throw catalogsRes.error;

        setCustomers(customersRes.data || []);
        setCatalogs((catalogsRes.data as any) || []);
      } catch (error: any) {
        console.error('Erro ao carregar catálogos:', error);
        toast({
          title: 'Erro ao carregar catálogos',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const openNewCatalog = () => {
    setEditingCatalog(null);
    setForm({
      name: '',
      customer_id: '',
      categories: '',
      min_price: '',
      max_price: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditCatalog = (catalog: CustomerCatalog) => {
    const filters = catalog.filters || {};
    setEditingCatalog(catalog);
    setForm({
      name: catalog.name,
      customer_id: catalog.customer_id || '',
      categories: (filters.categories || []).join(', '),
      min_price: filters.price_min ? String(filters.price_min) : '',
      max_price: filters.price_max ? String(filters.price_max) : '',
      is_active: catalog.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o catálogo.',
        variant: 'destructive',
      });
      return;
    }

    const filters: any = {};
    if (form.categories.trim()) {
      filters.categories = form.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }
    if (form.min_price) filters.price_min = Number(form.min_price);
    if (form.max_price) filters.price_max = Number(form.max_price);

    const payload = {
      name: form.name,
      customer_id: form.customer_id || null,
      filters,
      is_active: form.is_active,
    };

    try {
      if (editingCatalog) {
        const { error } = await supabase
          .from('customer_catalogs')
          .update(payload)
          .eq('id', editingCatalog.id);
        if (error) throw error;
        toast({ title: 'Catálogo atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('customer_catalogs').insert(payload);
        if (error) throw error;
        toast({ title: 'Catálogo criado com sucesso!' });
      }

      setDialogOpen(false);
      // reload
      const { data, error } = await supabase
        .from('customer_catalogs')
        .select('*, customer:customers(id, full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCatalogs((data as any) || []);
    } catch (error: any) {
      console.error('Erro ao salvar catálogo:', error);
      toast({
        title: 'Erro ao salvar catálogo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este catálogo?')) return;
    try {
      const { error } = await supabase.from('customer_catalogs').delete().eq('id', id);
      if (error) throw error;
      setCatalogs((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Catálogo removido.' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover catálogo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catálogos de Clientes</h1>
            <p className="text-muted-foreground mt-2">
              Crie e gerencie catálogos personalizados para cada cliente.
            </p>
          </div>
          <Button onClick={openNewCatalog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Catálogo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Catálogos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : catalogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum catálogo cadastrado até o momento.
              </p>
            ) : (
              <div className="space-y-2">
                {catalogs.map((catalog) => (
                  <div
                    key={catalog.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-lg p-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{catalog.name}</span>
                        {catalog.is_active ? (
                          <Badge variant="secondary">Ativo</Badge>
                        ) : (
                          <Badge variant="outline">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliente:{' '}
                        {catalog.customer?.full_name ||
                          catalog.customer_id ||
                          'Todos os clientes'}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditCatalog(catalog)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(catalog.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCatalog ? 'Editar Catálogo' : 'Novo Catálogo'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Catálogo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Coleção Inverno - Cliente X"
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, customer_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} {c.email ? `- ${c.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categorias (separadas por vírgula)</Label>
                <Input
                  value={form.categories}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, categories: e.target.value }))
                  }
                  placeholder="Ex: Vestidos, Blusas, Calças"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço mínimo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.min_price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, min_price: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço máximo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.max_price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, max_price: e.target.value }))
                    }
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações internas</Label>
                <Textarea
                  placeholder="Notas sobre o objetivo deste catálogo (não é exibido ao cliente)"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminCatalogs;

