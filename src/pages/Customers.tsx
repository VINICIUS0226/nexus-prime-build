import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ChevronDown, Edit, Trash2, Eye, UserCheck, UserX, Users, Briefcase, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type CustomerType = 'client' | 'seller' | 'manager';

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  cpf: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  data_consent: boolean;
  user_type: CustomerType;
}

const USER_TYPE_LABELS: Record<CustomerType, string> = {
  client: 'Cliente',
  seller: 'Vendedor',
  manager: 'Gerente',
};

const USER_TYPE_ICONS: Record<CustomerType, React.ReactNode> = {
  client: <ShoppingBag className="h-3 w-3" />,
  seller: <Briefcase className="h-3 w-3" />,
  manager: <Users className="h-3 w-3" />,
};

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState<CustomerType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    data_consent: false,
    user_type: 'client' as CustomerType,
  });

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone,
            cpf: formData.cpf || null,
            cep: formData.cep || null,
            street: formData.street || null,
            number: formData.number || null,
            complement: formData.complement || null,
            neighborhood: formData.neighborhood || null,
            city: formData.city || null,
            state: formData.state || null,
            data_consent: formData.data_consent,
            user_type: formData.user_type,
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;

        toast({
          title: "Usuário atualizado!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase.from('customers').insert([{
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone,
          cpf: formData.cpf || null,
          cep: formData.cep || null,
          street: formData.street || null,
          number: formData.number || null,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          data_consent: formData.data_consent,
          user_type: formData.user_type,
        }]);

        if (error) throw error;

        toast({
          title: "Cliente cadastrado!",
          description: "O cliente foi adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        title: editingCustomer ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "O cliente foi removido com sucesso.",
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name,
      email: customer.email || '',
      phone: customer.phone,
      cpf: customer.cpf || '',
      cep: customer.cep || '',
      street: customer.street || '',
      number: customer.number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      state: customer.state || '',
      data_consent: customer.data_consent,
      user_type: customer.user_type || 'client',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      cpf: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      data_consent: false,
      user_type: 'client',
    });
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.cpf?.includes(searchTerm);
    
    const matchesType = filterType === 'all' || customer.user_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && customer.data_consent) ||
      (filterStatus === 'inactive' && !customer.data_consent);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortBy === 'name') {
      return a.full_name.localeCompare(b.full_name);
    }
    return 0;
  });

  const activeCustomers = customers.filter(c => c.data_consent).length;
  const clientsCount = customers.filter(c => c.user_type === 'client').length;
  const sellersCount = customers.filter(c => c.user_type === 'seller').length;
  const managersCount = customers.filter(c => c.user_type === 'manager').length;
  const formatPhone = (phone: any) => {
    if (!phone) return "-";
    const value = String(phone).replace(/\D/g, "");
    if (value.length === 11) return value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (value.length === 10) return value.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return value;
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-primary text-primary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="text-sm font-medium opacity-90">Total de Usuários</div>
              <div className="text-3xl font-bold mt-1">{customers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-accent text-accent-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="text-sm font-medium opacity-90 flex items-center gap-1">
                <Users className="h-4 w-4" /> Gerentes
              </div>
              <div className="text-3xl font-bold mt-1">{managersCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="text-sm font-medium opacity-90 flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> Vendedores
              </div>
              <div className="text-3xl font-bold mt-1">{sellersCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary text-secondary-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="text-sm font-medium opacity-90 flex items-center gap-1">
                <ShoppingBag className="h-4 w-4" /> Clientes
              </div>
              <div className="text-3xl font-bold mt-1">{clientsCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-success text-success-foreground border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="text-sm font-medium opacity-90">Usuários Ativos</div>
              <div className="text-3xl font-bold mt-1">{activeCustomers}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant">
                <Plus className="mr-2 h-5 w-5" />
                Cadastrar usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, cep: value });
                        if (value.replace(/\D/g, '').length === 8) {
                          fetchAddressByCep(value);
                        }
                      }}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="street">Endereço</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      maxLength={2}
                      placeholder="UF"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_type">Tipo de Usuário *</Label>
                    <Select 
                      value={formData.user_type} 
                      onValueChange={(value: CustomerType) => setFormData({ ...formData, user_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" /> Cliente
                          </div>
                        </SelectItem>
                        <SelectItem value="seller">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Vendedor
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Gerente
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_consent">Status</Label>
                    <div className="flex items-center gap-3 h-10">
                      <Switch
                        id="data_consent"
                        checked={formData.data_consent}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, data_consent: checked })
                        }
                      />
                      <Label htmlFor="data_consent" className="text-sm font-normal cursor-pointer">
                        {formData.data_consent ? (
                          <span className="text-success font-medium">Ativo</span>
                        ) : (
                          <span className="text-destructive font-medium">Inativo</span>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ao ativar, o usuário consente com o uso de seus dados pessoais (LGPD)
                </p>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {editingCustomer ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex gap-2 flex-wrap">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as CustomerType | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Clientes
                  </div>
                </SelectItem>
                <SelectItem value="seller">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Vendedores
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Gerentes
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="recent">Mais recente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Clientes */}
        <Card className="border-2 shadow-elegant">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="w-[50px] text-primary-foreground"></TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Nome</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Perfil</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Telefone</TableHead>
                  <TableHead className="text-primary-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-right text-primary-foreground font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : sortedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{customer.full_name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          customer.user_type === 'manager' 
                            ? 'bg-accent/10 text-accent' 
                            : customer.user_type === 'seller'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {USER_TYPE_ICONS[customer.user_type || 'client']}
                          {USER_TYPE_LABELS[customer.user_type || 'client']}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatPhone(customer.phone)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          customer.data_consent 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {customer.data_consent ? (
                            <>
                              <UserCheck className="h-3 w-3" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3" />
                              Inativo
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/customers/${customer.id}`)}
                            className="h-8 w-8 text-accent hover:bg-accent/10 hover:text-accent"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                            title="Editar cliente"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Excluir cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
