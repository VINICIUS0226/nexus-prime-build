import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerCatalog {
  id: string;
  name: string;
  customer_id: string | null;
  filters: any | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
}

const ClientCatalogs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<CustomerCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!user?.email) return;
      setLoading(true);
      try {
        // Tentativa simples: localizar cliente pelo e-mail cadastrado
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();

        if (customerError) throw customerError;

        const customerId = customers?.id ?? null;

        let query = supabase
          .from('customer_catalogs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        const { data, error } = await query;
        if (error) throw error;

        setCatalogs(data || []);
      } catch (error) {
        console.error('Erro ao carregar catálogos do cliente:', error);
        setCatalogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogs();
  }, [user?.email]);

  return (
    <ClientLayout>
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogos Disponíveis</h1>
          <p className="text-muted-foreground mt-2">
            Veja os catálogos de produtos enviados especialmente para você.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Carregando catálogos...
            </CardContent>
          </Card>
        ) : catalogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum catálogo disponível no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogs.map((catalog) => {
              const validade =
                catalog.valid_from || catalog.valid_to
                  ? `${catalog.valid_from ? format(new Date(catalog.valid_from), "dd/MM/yyyy", { locale: ptBR }) : 'Início'} - ${
                      catalog.valid_to ? format(new Date(catalog.valid_to), "dd/MM/yyyy", { locale: ptBR }) : 'Sem fim'
                    }`
                  : null;

              return (
                <Card key={catalog.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="truncate">{catalog.name}</span>
                      {catalog.is_active && <Badge variant="secondary">Ativo</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-3">
                    {validade && (
                      <p className="text-xs text-muted-foreground">
                        Validade: {validade}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      Catálogo personalizado com filtros definidos pelo administrador.
                    </p>
                    <div className="mt-auto pt-2">
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/client/catalogs/${catalog.id}`)}
                      >
                        Visualizar Catálogo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientCatalogs;

