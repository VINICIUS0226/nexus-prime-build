import { useState } from 'react';
import { useStores, Store } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

const emptyStore: Omit<Store, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  is_active: true,
};

export const StoresManagement = () => {
  const { stores, loading, createStore, updateStore, deleteStore } = useStores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState(emptyStore);
  const [saving, setSaving] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        cnpj: store.cnpj || '',
        email: store.email || '',
        phone: store.phone || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        zip_code: store.zip_code || '',
        is_active: store.is_active,
      });
    } else {
      setEditingStore(null);
      setFormData(emptyStore);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStore(null);
    setFormData(emptyStore);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingStore) {
      await updateStore(editingStore.id, formData);
    } else {
      await createStore(formData);
    }

    setSaving(false);
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;
    await deleteStore(storeToDelete.id);
    setIsDeleteDialogOpen(false);
    setStoreToDelete(null);
  };

  const confirmDelete = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gerenciamento de Lojas</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Loja
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingStore ? 'Editar Loja' : 'Nova Loja'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStore
                      ? 'Atualize as informações da loja'
                      : 'Preencha os dados para criar uma nova loja'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj || ''}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">CEP</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code || ''}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Loja ativa</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingStore ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Nenhuma loja encontrada' : 'Nenhuma loja cadastrada'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.cnpj || '-'}</TableCell>
                    <TableCell>{store.city || '-'}</TableCell>
                    <TableCell>{store.phone || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        store.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {store.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(store)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a loja "{storeToDelete?.name}"?
              Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
