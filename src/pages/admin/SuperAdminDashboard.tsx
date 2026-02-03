import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, ShieldCheck } from 'lucide-react';
import { SuperAdminLayout } from '@/components/admin/SuperAdminLayout';
import { StoresManagement } from '@/components/admin/StoresManagement';
import { RepresentativesManagement } from '@/components/admin/RepresentativesManagement';
import { useStores } from '@/hooks/useStores';
import { useRepresentatives } from '@/hooks/useRepresentatives';

const SuperAdminDashboard = () => {
  const { stores, loading: loadingStores } = useStores();
  const { representatives, loading: loadingReps } = useRepresentatives();
  const [activeTab, setActiveTab] = useState('overview');

  const activeStores = stores.filter((s) => s.is_active).length;
  const totalUsers = representatives.length;
  const adminUsers = representatives.filter((r) => r.role === 'admin' || r.role === 'super_admin').length;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Super Administrador</h1>
          <p className="text-muted-foreground">
            Gerencie lojas e usuários representantes do sistema
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="stores">Lojas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingStores ? '...' : activeStores}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    de {stores.length} lojas cadastradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingReps ? '...' : totalUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    representantes cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingReps ? '...' : adminUsers}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    usuários com privilégios admin
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Últimas Lojas</CardTitle>
                  <CardDescription>Lojas cadastradas recentemente</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStores ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : stores.length === 0 ? (
                    <p className="text-muted-foreground">Nenhuma loja cadastrada</p>
                  ) : (
                    <div className="space-y-3">
                      {stores.slice(0, 5).map((store) => (
                        <div key={store.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{store.name}</p>
                            <p className="text-sm text-muted-foreground">{store.city || 'Sem cidade'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {store.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Últimos Usuários</CardTitle>
                  <CardDescription>Usuários cadastrados recentemente</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReps ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : representatives.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                  ) : (
                    <div className="space-y-3">
                      {representatives.slice(0, 5).map((rep) => (
                        <div key={rep.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{rep.full_name}</p>
                            <p className="text-sm text-muted-foreground">{rep.store_name || 'Sem loja'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            rep.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                            rep.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rep.role === 'super_admin' ? 'Super Admin' :
                             rep.role === 'admin' ? 'Admin' : 
                             rep.role === 'employee' ? 'Funcionário' : 'Sem perfil'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stores">
            <StoresManagement />
          </TabsContent>

          <TabsContent value="users">
            <RepresentativesManagement />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
