import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Eye, UserCheck, UserX, Users, Briefcase, ShoppingBag, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // Paginação
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

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
                      placeholder="Digite o nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Digite o e-mail"
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
                      placeholder="Informe o endereço do cliente"
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
                      placeholder="Informe o número"
                    />
                  </div>
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Informe um complemento (Ex: casa, apartamento, etc)"
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
                      placeholder="Informe o bairro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Informe o nome da cidade"
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

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Tabela de Usuários */}
        <Card className="border shadow-elegant overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary border-b-0">
                    <TableHead className="text-primary-foreground font-semibold py-4 px-6">Nome</TableHead>
                    <TableHead className="text-primary-foreground font-semibold py-4 px-4">E-mail</TableHead>
                    <TableHead className="text-primary-foreground font-semibold py-4 px-4">Perfil</TableHead>
                    <TableHead className="text-primary-foreground font-semibold py-4 px-4">Telefone</TableHead>
                    <TableHead className="text-primary-foreground font-semibold py-4 px-4">Status</TableHead>
                    <TableHead className="text-right text-primary-foreground font-semibold py-4 px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer, index) => (
                      <TableRow 
                        key={customer.id} 
                        className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                      >
                        <TableCell className="font-medium text-foreground py-4 px-6">
                          {customer.full_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4 px-4 text-sm">
                          {customer.email || '-'}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                            customer.user_type === 'manager' 
                              ? 'bg-accent/15 text-accent border border-accent/20' 
                              : customer.user_type === 'seller'
                              ? 'bg-primary/15 text-primary border border-primary/20'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {USER_TYPE_ICONS[customer.user_type || 'client']}
                            {USER_TYPE_LABELS[customer.user_type || 'client']}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4 px-4 font-mono text-sm">
                          {formatPhone(customer.phone)}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                            customer.data_consent 
                              ? 'bg-success/15 text-success border border-success/20' 
                              : 'bg-destructive/15 text-destructive border border-destructive/20'
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
                        <TableCell className="text-right py-4 px-6">
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
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Excluir"
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
            </div>

            {/* Rodapé com Paginação */}
            {!loading && sortedCustomers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-muted/30">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Exibindo {startIndex + 1} - {Math.min(endIndex, sortedCustomers.length)} de {sortedCustomers.length} usuários
                  </span>
                  <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
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
                    className="h-8 px-3"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
