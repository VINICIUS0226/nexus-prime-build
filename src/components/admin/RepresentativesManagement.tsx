import { useState } from 'react';
import { useRepresentatives, Representative } from '@/hooks/useRepresentatives';
import { useStores } from '@/hooks/useStores';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react';

export const RepresentativesManagement = () => {
  const { representatives, loading, updateRepresentative, deleteRepresentative } = useRepresentatives();
  const { stores } = useStores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [formData, setFormData] = useState({ store_id: 'none', role: '' });
  const [saving, setSaving] = useState(false);
  const [repToDelete, setRepToDelete] = useState<Representative | null>(null);

  const filteredReps = representatives.filter((rep) =>
    rep.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rep.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (rep: Representative) => {
    setEditingRep(rep);
    setFormData({
      store_id: rep.store_id || 'none',
      role: rep.role || '',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRep(null);
    setFormData({ store_id: 'none', role: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRep) return;

    setSaving(true);
    await updateRepresentative(editingRep.id, {
      store_id: formData.store_id === 'none' ? null : formData.store_id,
      role: formData.role,
    });
    setSaving(false);
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!repToDelete) return;
    await deleteRepresentative(repToDelete.id);
    setIsDeleteDialogOpen(false);
    setRepToDelete(null);
  };

  const confirmDelete = (rep: Representative) => {
    setRepToDelete(rep);
    setIsDeleteDialogOpen(true);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Super Admin</span>;
      case 'admin':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Admin</span>;
      case 'employee':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Funcionário</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Sem perfil</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, loja ou telefone..."
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
        ) : filteredReps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Trocar Senha</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.full_name}</TableCell>
                    <TableCell>{rep.phone || '-'}</TableCell>
                    <TableCell>{rep.store_name || '-'}</TableCell>
                    <TableCell>{getRoleBadge(rep.role)}</TableCell>
                    <TableCell>
                      {rep.must_change_password ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rep)}
                          disabled={rep.role === 'super_admin'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(rep)}
                          disabled={rep.role === 'super_admin'}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as permissões e vinculação de loja do usuário
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editingRep?.full_name || ''} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store">Loja Vinculada</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {stores.filter((s) => s.is_active).map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular o usuário "{repToDelete?.full_name}"?
              O usuário perderá acesso ao sistema mas sua conta permanecerá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
