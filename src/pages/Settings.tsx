import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon, Store, Upload, Loader2, Save } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { toast } from 'sonner';

const Settings = () => {
  const { config, loading, saving, saveConfig } = useStoreConfig();
  const [formData, setFormData] = useState({
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_cnpj: '',
    store_logo_url: '',
  });

  useEffect(() => {
    if (!loading) {
      setFormData({
        store_name: config.store_name || '',
        store_phone: config.store_phone || '',
        store_email: config.store_email || '',
        store_address: config.store_address || '',
        store_cnpj: config.store_cnpj || '',
        store_logo_url: config.store_logo_url || '',
      });
    }
  }, [config, loading]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const result = await saveConfig(formData);
    if (result.success) {
      toast.success('Configurações salvas com sucesso!');
    } else {
      toast.error('Erro ao salvar configurações');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Configure os dados da loja e preferências do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Dados da Loja
            </CardTitle>
            <CardDescription>
              Estas informações aparecem nos recibos de venda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Preview */}
            <div className="space-y-2">
              <Label>Logo da Loja</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {formData.store_logo_url ? (
                    <img 
                      src={formData.store_logo_url} 
                      alt="Logo da loja" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="URL da imagem do logo"
                    value={formData.store_logo_url}
                    onChange={(e) => handleInputChange('store_logo_url', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Insira a URL de uma imagem hospedada externamente
                  </p>
                </div>
              </div>
            </div>

            {/* Store Name */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nome da Loja *</Label>
                <Input
                  id="store_name"
                  placeholder="Nome da sua loja"
                  value={formData.store_name}
                  onChange={(e) => handleInputChange('store_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_cnpj">CNPJ</Label>
                <Input
                  id="store_cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.store_cnpj}
                  onChange={(e) => handleInputChange('store_cnpj', formatCNPJ(e.target.value))}
                  maxLength={18}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store_phone">Telefone</Label>
                <Input
                  id="store_phone"
                  placeholder="(00) 00000-0000"
                  value={formData.store_phone}
                  onChange={(e) => handleInputChange('store_phone', formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_email">E-mail</Label>
                <Input
                  id="store_email"
                  type="email"
                  placeholder="contato@loja.com.br"
                  value={formData.store_email}
                  onChange={(e) => handleInputChange('store_email', e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="store_address">Endereço Completo</Label>
              <Textarea
                id="store_address"
                placeholder="Rua, número, bairro, cidade - UF, CEP"
                value={formData.store_address}
                onChange={(e) => handleInputChange('store_address', e.target.value)}
                rows={2}
              />
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                Prévia do Cabeçalho do Recibo
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 text-center font-mono text-sm border">
                {formData.store_logo_url && (
                  <img 
                    src={formData.store_logo_url} 
                    alt="Logo" 
                    className="h-12 mx-auto mb-2 object-contain"
                  />
                )}
                <p className="font-bold text-lg">
                  {formData.store_name || 'Nome da Loja'}
                </p>
                {formData.store_cnpj && (
                  <p className="text-xs text-muted-foreground">
                    CNPJ: {formData.store_cnpj}
                  </p>
                )}
                {formData.store_address && (
                  <p className="text-xs mt-1">{formData.store_address}</p>
                )}
                {(formData.store_phone || formData.store_email) && (
                  <p className="text-xs">
                    {[formData.store_phone, formData.store_email].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
