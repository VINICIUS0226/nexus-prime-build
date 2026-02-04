import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Store {
  id: string;
  name: string;
  is_active: boolean;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
  onUserCreated: () => void;
}

export const CreateUserDialog = ({
  open,
  onOpenChange,
  stores,
  onUserCreated,
}: CreateUserDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    store_id: 'none',
    role: 'employee',
  });

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      store_id: 'none',
      role: 'employee',
    });
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.password) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios: Nome, E-mail e Senha',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone || null,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Usuário não foi criado');
      }

      const userId = authData.user.id;

      // Update profile with store_id and must_change_password
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          store_id: formData.store_id === 'none' ? null : formData.store_id,
          must_change_password: true,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't throw - user is created, just log the error
      }

      // Insert role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: formData.role as 'admin' | 'employee' | 'super_admin',
        });

      if (roleError) {
        console.error('Role insert error:', roleError);
        throw roleError;
      }

      toast({
        title: 'Usuário criado',
        description: `${formData.full_name} foi cadastrado com sucesso. Senha temporária: ${formData.password}`,
      });

      onUserCreated();
      handleClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro ao criar usuário',
        description: error.message || 'Ocorreu um erro ao criar o usuário',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Cadastre um novo usuário e vincule-o a uma loja
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome do usuário"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha Temporária *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                O usuário será obrigado a trocar a senha no primeiro login
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store">Loja</Label>
              <Select
                value={formData.store_id}
                onValueChange={(value) => setFormData({ ...formData, store_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (definir depois)</SelectItem>
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
                  <SelectItem value="admin">Administrador da Loja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
