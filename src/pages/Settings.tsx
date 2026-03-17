import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Store, Upload, Loader2, Save, X, Palette, Sun, Moon, Monitor, Check, Truck, Plus, Trash2, Edit, Lock } from 'lucide-react';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTheme, PRESET_COLORS, ThemeMode } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';

interface FreightConfig {
  id: string;
  name: string;
  description: string | null;
  base_value: number;
  calculation_rule: string;
  is_active: boolean;
}

const Settings = () => {
  const { config, loading, saving, saveConfig, refetch } = useStoreConfig();
  const { theme, loading: themeLoading, saveTheme } = useTheme();
  const [selectedMode, setSelectedMode] = useState<ThemeMode>('light');
  const [selectedColor, setSelectedColor] = useState('0 100% 71%');
  const [savingTheme, setSavingTheme] = useState(false);
  
  // Freight configs
  const [freightConfigs, setFreightConfigs] = useState<FreightConfig[]>([]);
  const [loadingFreight, setLoadingFreight] = useState(true);
  const [freightDialogOpen, setFreightDialogOpen] = useState(false);
  const [editingFreight, setEditingFreight] = useState<FreightConfig | null>(null);
  const [savingFreight, setSavingFreight] = useState(false);
  const [freightForm, setFreightForm] = useState({
    name: '',
    description: '',
    base_value: '',
    calculation_rule: 'fixed',
    is_active: true,
  });

  const [formData, setFormData] = useState({
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_cnpj: '',
    store_logo_url: '',
    asaas_enabled: 'false',
    asaas_api_key: '',
    asaas_environment: 'sandbox',
    asaas_billing_type: 'PIX',
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFormData({
        store_name: config.store_name || '',
        store_phone: config.store_phone || '',
        store_email: config.store_email || '',
        store_address: config.store_address || '',
        store_cnpj: config.store_cnpj || '',
        store_logo_url: config.store_logo_url || '',
        asaas_enabled: config.asaas_enabled || 'false',
        asaas_api_key: config.asaas_api_key || '',
        asaas_environment: config.asaas_environment || 'sandbox',
        asaas_billing_type: config.asaas_billing_type || 'PIX',
      });
    }
  }, [config, loading]);

  // Sync theme state
  useEffect(() => {
    if (!themeLoading) {
      setSelectedMode(theme.theme_mode);
      setSelectedColor(theme.primary_color);
    }
  }, [theme, themeLoading]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, store_logo_url: publicUrl }));
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, store_logo_url: '' }));
  };

  const handleSave = async () => {
    const result = await saveConfig(formData);
    if (result.success) {
      toast.success('Configurações salvas com sucesso!');
      refetch();
    } else {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    const result = await saveTheme({
      theme_mode: selectedMode,
      primary_color: selectedColor,
    });
    if (result.success) {
      toast.success('Tema salvo com sucesso!');
    } else {
      toast.error('Erro ao salvar tema');
    }
    setSavingTheme(false);
  };

  // Freight config management
  const fetchFreightConfigs = useCallback(async () => {
    setLoadingFreight(true);
    try {
      const { data, error } = await supabase
        .from('freight_configs')
        .select('*')
        .order('name');
      if (error) throw error;
      setFreightConfigs(data || []);
    } catch (error) {
      console.error('Error fetching freight configs:', error);
    } finally {
      setLoadingFreight(false);
    }
  }, []);

  useEffect(() => {
    fetchFreightConfigs();
  }, [fetchFreightConfigs]);

  const openFreightDialog = (config?: FreightConfig) => {
    if (config) {
      setEditingFreight(config);
      setFreightForm({
        name: config.name,
        description: config.description || '',
        base_value: config.base_value.toString(),
        calculation_rule: config.calculation_rule,
        is_active: config.is_active,
      });
    } else {
      setEditingFreight(null);
      setFreightForm({ name: '', description: '', base_value: '', calculation_rule: 'fixed', is_active: true });
    }
    setFreightDialogOpen(true);
  };

  const handleSaveFreight = async () => {
    if (!freightForm.name || !freightForm.base_value) {
      toast.error('Nome e valor são obrigatórios');
      return;
    }
    setSavingFreight(true);
    try {
      const payload = {
        name: freightForm.name,
        description: freightForm.description || null,
        base_value: parseFloat(freightForm.base_value),
        calculation_rule: freightForm.calculation_rule as any,
        is_active: freightForm.is_active,
      };

      if (editingFreight) {
        const { error } = await supabase.from('freight_configs').update(payload).eq('id', editingFreight.id);
        if (error) throw error;
        toast.success('Configuração de frete atualizada!');
      } else {
        const { error } = await supabase.from('freight_configs').insert(payload);
        if (error) throw error;
        toast.success('Configuração de frete criada!');
      }
      setFreightDialogOpen(false);
      fetchFreightConfigs();
    } catch (error: any) {
      toast.error('Erro ao salvar configuração de frete');
    } finally {
      setSavingFreight(false);
    }
  };

  const handleDeleteFreight = async (id: string) => {
    try {
      const { error } = await supabase.from('freight_configs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Configuração de frete removida!');
      fetchFreightConfigs();
    } catch (error) {
      toast.error('Erro ao remover configuração de frete');
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
              Estas informações aparecem nos recibos de venda e no sidebar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo da Loja</Label>
              {/* RESPONSIVIDADE: flex-col no mobile para empilhar a imagem e o botão */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-24 h-24 shrink-0 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center overflow-hidden bg-muted relative group">
                  {formData.store_logo_url ? (
                    <>
                      <img 
                        src={formData.store_logo_url} 
                        alt="Logo da loja" 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                {/* RESPONSIVIDADE: text-center no mobile, botão ocupando largura total (w-full) */}
                <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Logo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PNG, JPG, WEBP. Máximo 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Store Name - Colegas já deixaram responsivo (md:grid-cols-2) */}
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

            {/* Contact - Colegas já deixaram responsivo */}
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
              <div className="bg-muted/50 rounded-lg p-4 text-center font-mono text-sm border overflow-hidden">
                {formData.store_logo_url && (
                  <img 
                    src={formData.store_logo_url} 
                    alt="Logo" 
                    className="h-12 mx-auto mb-2 object-contain"
                  />
                )}
                <p className="font-bold text-lg truncate">
                  {formData.store_name || 'Nome da Loja'}
                </p>
                {formData.store_cnpj && (
                  <p className="text-xs text-muted-foreground truncate">
                    CNPJ: {formData.store_cnpj}
                  </p>
                )}
                {formData.store_address && (
                  <p className="text-xs mt-1 break-words">{formData.store_address}</p>
                )}
                {(formData.store_phone || formData.store_email) && (
                  <p className="text-xs break-words">
                    {[formData.store_phone, formData.store_email].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              {/* RESPONSIVIDADE: Botão w-full no mobile */}
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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

        {/* Pagamentos / Asaas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Pagamentos (Asaas)
            </CardTitle>
            <CardDescription>
              Configure a integração de pagamentos via Asaas para o portal do cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Ativar Asaas</Label>
                <Select
                  value={formData.asaas_enabled}
                  onValueChange={(v) => handleInputChange('asaas_enabled', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativado</SelectItem>
                    <SelectItem value="false">Desativado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, o checkout do cliente cria apenas a reserva, sem enviar cobrança ao Asaas.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  value={formData.asaas_environment}
                  onValueChange={(v) => handleInputChange('asaas_environment', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma padrão</Label>
                <Select
                  value={formData.asaas_billing_type}
                  onValueChange={(v) => handleInputChange('asaas_billing_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asaas_api_key">API Key do Asaas</Label>
              <Input
                id="asaas_api_key"
                type="password"
                placeholder="sk_live_..."
                value={formData.asaas_api_key}
                onChange={(e) => handleInputChange('asaas_api_key', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use a chave da API do painel Asaas para o ambiente selecionado. Ela será usada pelas funções de backend para criar cobranças.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize o tema e as cores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Mode */}
            <div className="space-y-3">
              <Label>Modo do Tema</Label>
              {/* RESPONSIVIDADE: Empilha os botões de tema verticalmente no celular */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant={selectedMode === 'light' ? 'default' : 'outline'}
                  className="flex-1 w-full"
                  onClick={() => setSelectedMode('light')}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Claro
                </Button>
                <Button
                  type="button"
                  variant={selectedMode === 'dark' ? 'default' : 'outline'}
                  className="flex-1 w-full"
                  onClick={() => setSelectedMode('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Escuro
                </Button>
                <Button
                  type="button"
                  variant={selectedMode === 'system' ? 'default' : 'outline'}
                  className="flex-1 w-full"
                  onClick={() => setSelectedMode('system')}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Sistema
                </Button>
              </div>
            </div>

            {/* Primary Color */}
            <div className="space-y-3">
              <Label>Cor Principal</Label>
              {/* RESPONSIVIDADE: grid-cols-2 no mobile, 4 no desktop (evita esmagar as cores) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.primary)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                      selectedColor === color.primary
                        ? 'border-foreground shadow-md'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full shadow-inner"
                      style={{ backgroundColor: `hsl(${color.primary})` }}
                    />
                    <span className="text-xs font-medium">{color.name}</span>
                    {selectedColor === color.primary && (
                      <div className="absolute top-1 right-1">
                        <Check className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                Prévia do Tema
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 border space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: `hsl(${selectedColor})` }}
                  />
                  <div>
                    <p className="font-semibold text-sm sm:text-base">Cor principal selecionada</p>
                    <p className="text-xs text-muted-foreground">
                      {PRESET_COLORS.find(c => c.primary === selectedColor)?.name || 'Personalizada'}
                    </p>
                  </div>
                </div>
                {/* RESPONSIVIDADE: Empilha os botões de prévia no celular */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    size="sm" 
                    className="w-full sm:w-auto"
                    style={{ backgroundColor: `hsl(${selectedColor})` }}
                  >
                    Botão Primário
                  </Button>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    Botão Secundário
                  </Button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              {/* RESPONSIVIDADE: w-full no mobile */}
              <Button onClick={handleSaveTheme} disabled={savingTheme} className="w-full sm:w-auto">
                {savingTheme ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Tema
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account / Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Conta e Segurança
            </CardTitle>
            <CardDescription>
              Gerencie a senha de acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recomendamos atualizar sua senha periodicamente para manter sua conta segura.
            </p>
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setPasswordModalOpen(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Freight Config */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Configurações de Frete
                </CardTitle>
                <CardDescription>
                  Gerencie as opções de frete disponíveis para vendas
                </CardDescription>
              </div>
              <Button onClick={() => openFreightDialog()} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Frete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingFreight ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : freightConfigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma configuração de frete cadastrada</p>
                <p className="text-sm">Adicione opções de frete para usar nas vendas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {freightConfigs.map((fc) => (
                  <div key={fc.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{fc.name}</p>
                        {!fc.is_active && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
                        )}
                      </div>
                      {fc.description && (
                        <p className="text-sm text-muted-foreground">{fc.description}</p>
                      )}
                      <p className="text-sm font-medium text-primary mt-1">
                        R$ {fc.base_value.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openFreightDialog(fc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteFreight(fc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Freight Dialog */}
        <Dialog open={freightDialogOpen} onOpenChange={setFreightDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFreight ? 'Editar Configuração de Frete' : 'Nova Configuração de Frete'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={freightForm.name}
                  onChange={(e) => setFreightForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Sedex, PAC, Motoboy"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={freightForm.description}
                  onChange={(e) => setFreightForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Base (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={freightForm.base_value}
                    onChange={(e) => setFreightForm(prev => ({ ...prev, base_value: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regra de Cálculo</Label>
                  <Select
                    value={freightForm.calculation_rule}
                    onValueChange={(v) => setFreightForm(prev => ({ ...prev, calculation_rule: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="free">Grátis</SelectItem>
                      <SelectItem value="by_value">Por valor</SelectItem>
                      <SelectItem value="by_weight">Por peso</SelectItem>
                      <SelectItem value="by_zip">Por CEP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={freightForm.is_active}
                  onCheckedChange={(v) => setFreightForm(prev => ({ ...prev, is_active: v }))}
                />
                <Label>Ativo</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setFreightDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveFreight} disabled={savingFreight}>
                  {savingFreight ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Alteração de Senha */}
        <ChangePasswordModal
          open={passwordModalOpen}
          onPasswordChanged={() => setPasswordModalOpen(false)}
          onOpenChange={setPasswordModalOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default Settings;