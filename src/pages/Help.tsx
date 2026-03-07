import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  Search,
  LayoutDashboard,
  Package,
  Users,
  Box,
  ShoppingCart,
  DollarSign,
  CreditCard,
  BarChart3,
  Settings,
  LogIn,
  BookOpen,
} from 'lucide-react';

const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const helpContent: Array<{
    id: string;
    icon: React.ElementType;
    title: string;
    searchText: string;
    keywords: string[];
    content: React.ReactNode;
  }> = [
    {
      id: 'apresentacao',
      icon: BookOpen,
      title: 'Apresentação',
      searchText: 'sistema PQUENINOS ERP vendas empreendedores organização controle gestão negócio plataforma rotinas comerciais cadastrar gerenciar clientes produtos SKU estoque registrar vendas reservas pagamentos relatórios informações análises decisões',
      content: (
        <div className="space-y-3 text-muted-foreground">
          <p>
            O sistema PQUENINOS é um ERP de vendas desenvolvido para auxiliar pequenos empreendedores na organização, 
            controle e gestão do negócio de forma simples e eficiente. A plataforma centraliza as principais rotinas 
            comerciais em um único ambiente, reduzindo erros operacionais e oferecendo maior segurança nas informações.
          </p>
          <p>
            O sistema permite cadastrar e gerenciar clientes, controlar produtos identificados por SKU, acompanhar 
            estoque com precisão, registrar vendas e reservas, e acompanhar pagamentos. Por meio dos relatórios, 
            você tem acesso a informações consolidadas para análises e tomada de decisões.
          </p>
        </div>
      ),
      keywords: ['sistema', 'erp', 'vendas', 'gestão', 'sobre'],
    },
    {
      id: 'acesso',
      icon: LogIn,
      title: 'Acesso ao Sistema',
      searchText: 'acesso autenticação usuário senha credenciais login logout sair administrador redefinição',
      content: (
        <div className="space-y-3 text-muted-foreground">
          <p>
            O acesso é realizado por meio de autenticação com usuário e senha. Cada usuário possui credenciais 
            individuais, o que permite identificar as ações realizadas dentro do sistema.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Login:</strong> Insira suas credenciais nos campos correspondentes e confirme o login.</li>
            <li><strong>Credenciais incorretas:</strong> O sistema exibirá uma mensagem de aviso.</li>
            <li><strong>Esqueci minha senha:</strong> Entre em contato com o administrador para redefinição.</li>
            <li><strong>Logout:</strong> Utilize a opção Sair no menu lateral, especialmente em computadores compartilhados.</li>
          </ul>
        </div>
      ),
      keywords: ['login', 'senha', 'acesso', 'logout', 'entrar'],
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: 'Dashboard',
      searchText: 'tela inicial centro comando negócio indicadores vendas hoje mês ticket médio reservas ativas gráficos faturamento formas pagamento PIX cartão produtos clientes estoque baixo',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>A tela inicial é o centro de comando do seu negócio, com visão geral em tempo real.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Indicadores principais</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Vendas Hoje:</strong> Valor total faturado no dia atual.</li>
              <li><strong>Vendas no Mês:</strong> Acúmulo financeiro do mês vigente.</li>
              <li><strong>Ticket Médio:</strong> Valor médio por compra (últimos 30 dias).</li>
              <li><strong>Reservas Ativas:</strong> Cestas em aberto aguardando processamento.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Gráficos</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Vendas nos Últimos 30 Dias:</strong> Evolução diária do faturamento.</li>
              <li><strong>Formas de Pagamento:</strong> Segmentação da receita (PIX, Cartão, etc.).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Resumo operacional</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Total de Produtos:</strong> Itens cadastrados no catálogo.</li>
              <li><strong>Clientes Cadastrados:</strong> Base de contatos.</li>
              <li><strong>Estoque Baixo:</strong> Alerta em vermelho – itens que precisam de reposição.</li>
            </ul>
          </div>
        </div>
      ),
      keywords: ['dashboard', 'início', 'principal', 'indicadores', 'gráficos'],
    },
    {
      id: 'produtos',
      icon: Package,
      title: 'Produtos',
      searchText: 'catálogo cadastrar editar excluir vendas reservas buscar filtrar nome categoria código barras tamanho cor preço novo produto dados custo margem lucro variações SKU quantidade estoque mínimo imagens JPG PNG WebP',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Gerenciamento do catálogo: cadastrar, editar, excluir e iniciar vendas/reservas.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Funcionalidades</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Buscar:</strong> Por nome, categoria ou código de barras.</li>
              <li><strong>Filtrar:</strong> Por categoria, tamanho, cor, faixa de preço e disponibilidade.</li>
              <li><strong>Novo Produto:</strong> Botão &quot;+ Novo Produto&quot; no canto superior direito.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Cadastro de produto</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados:</strong> Nome (obrigatório), categoria, descrição, código de barras, URL da imagem.</li>
              <li><strong>Preços:</strong> Custo, preço de venda e margem de lucro (calculada automaticamente).</li>
              <li><strong>Variações:</strong> SKU, quantidade, tamanho, cor, estoque mínimo.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Detalhes do produto</h4>
            <p>Clique em um produto para ver: informações completas, gerenciar imagens (JPG, PNG, WebP – máx. 5MB), editar dados, variações, avaliações e histórico de vendas.</p>
          </div>
        </div>
      ),
      keywords: ['produto', 'cadastro', 'catálogo', 'variação', 'sku', 'preço'],
    },
    {
      id: 'clientes',
      icon: Users,
      title: 'Clientes',
      searchText: 'gestão contas clientes perfis acesso base contatos indicadores usuários gerentes vendedores cadastrar dados pessoais nome email CPF telefone endereço CEP tipo status ativo inativo LGPD listagem buscar visualizar editar excluir',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Gestão de contas, clientes e perfis de acesso. Controle detalhado da base de contatos.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Indicadores</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Total de Usuários, Gerentes, Vendedores, Clientes e Usuários Ativos.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Cadastrar cliente</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados pessoais:</strong> Nome completo, e-mail, CPF, telefone.</li>
              <li><strong>Endereço:</strong> Preencha o CEP – o sistema preenche endereço, bairro, cidade e estado.</li>
              <li><strong>Tipo de usuário:</strong> Cliente, Vendedor ou Gerente.</li>
              <li><strong>Status:</strong> Toggle para Ativo/Inativo. Ao ativar, o usuário consente com o uso de dados (LGPD).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Na listagem</h4>
            <p>Busca por nome, e-mail, telefone ou CPF. Filtros por tipo e status. Ações: visualizar, editar ou excluir.</p>
          </div>
        </div>
      ),
      keywords: ['cliente', 'usuário', 'cadastro', 'endereço', 'lgpd'],
    },
    {
      id: 'estoque',
      icon: Box,
      title: 'Estoque',
      searchText: 'mercadorias quantidades saldos reservados entrada adicionar manual importar XML NF-e buscar SKU filtros cor tamanho status normal baixo produto variação quantidade preço custo venda tabela reservado disponível',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Controle de mercadorias, quantidades disponíveis, saldos reservados e status de cada item.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Funcionalidades</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Busca:</strong> Por SKU ou nome do produto.</li>
              <li><strong>Filtros:</strong> Cor, tamanho e status (Normal/Baixo).</li>
              <li><strong>Adicionar Manual:</strong> Entrada de produtos avulsos – produto existente ou novo.</li>
              <li><strong>Importar XML:</strong> Entrada automatizada a partir de NF-e (quando disponível).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Adicionar estoque manualmente</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Selecione o produto ou crie novo.</li>
              <li>Informe SKU, cor, tamanho, quantidade, estoque mínimo, preço de custo e venda.</li>
              <li>Clique em &quot;+ Adicionar&quot; para concluir.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Tabela de dados</h4>
            <p>Exibe Produto, SKU, Cor, Tamanho, Estoque Total, Reservado, Disponível, Status (Normal em verde, Baixo em vermelho) e Ações.</p>
          </div>
        </div>
      ),
      keywords: ['estoque', 'entrada', 'quantidade', 'xml', 'importar', 'sku'],
    },
    {
      id: 'reservas',
      icon: ShoppingCart,
      title: 'Reservas',
      searchText: 'cestas compras bloqueio temporário estoque ativas concluídas valor reservado nova reserva produtos cliente código sacola observações itens quantidade carrinho criar reserva',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Organização de cestas de compras e bloqueio temporário de itens no estoque.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Indicadores</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Ativas:</strong> Reservas em aberto.</li>
              <li><strong>Concluídas:</strong> Convertidas em vendas ou finalizadas.</li>
              <li><strong>Valor Reservado:</strong> Total financeiro das reservas ativas.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Criar nova reserva</h4>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Clique em &quot;+ Nova Reserva&quot;.</li>
              <li><strong>Seleção de produtos:</strong> Busque por nome, SKU, cor ou tamanho. Clique no &quot;+&quot; para adicionar. O sistema exibe a quantidade disponível.</li>
              <li><strong>Identificação:</strong> Selecione o cliente (obrigatório), informe o código da sacola (ex: SACOLA-001) e observações.</li>
              <li><strong>Itens:</strong> Ajuste quantidades com &quot;+&quot; e &quot;-&quot;, remova com o ícone de lixeira. O valor total é calculado em tempo real.</li>
              <li>Clique em &quot;Criar Reserva&quot; para finalizar.</li>
            </ol>
          </div>
        </div>
      ),
      keywords: ['reserva', 'cesta', 'sacola', 'bloquear', 'estoque'],
    },
    {
      id: 'vendas',
      icon: DollarSign,
      title: 'Vendas',
      searchText: 'venda direta reserva carrinho cliente frete desconto pagamentos PIX cartão dinheiro boleto finalizar código barras subtotal total',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Núcleo financeiro: vendas rápidas ou conversão de reservas em vendas finalizadas.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Indicadores</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Vendas Hoje, Faturamento Hoje, Faturamento Mês e Total de Vendas.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Venda direta</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Busque produtos ou use o leitor de código de barras e adicione ao carrinho.</li>
              <li>Selecione o cliente.</li>
              <li>Informe Frete (R$) e Desconto (R$) – o total é recalculado automaticamente.</li>
              <li>Clique em &quot;+ Adicionar&quot; em Pagamentos e defina PIX, Cartão, Dinheiro ou Boleto.</li>
              <li>O total dos pagamentos deve ser igual ao total da venda.</li>
              <li>Clique em &quot;Finalizar Venda&quot;.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Venda por reserva</h4>
            <p>Selecione a aba &quot;De Reserva&quot;, escolha a reserva ativa. O sistema carrega itens e cliente automaticamente. Ajuste frete e desconto e processe o pagamento.</p>
          </div>
        </div>
      ),
      keywords: ['venda', 'pagamento', 'carrinho', 'pix', 'cartão', 'frete', 'desconto'],
    },
    {
      id: 'pagamentos',
      icon: CreditCard,
      title: 'Pagamentos',
      searchText: 'transações status financeiro vendas integração Asaas PIX cartão boleto automatizado',
      content: (
        <div className="space-y-3 text-muted-foreground">
          <p>
            O módulo de Pagamentos permite o controle das transações e do status financeiro das vendas. 
            A integração com plataformas de pagamento (como Asaas) pode estar em desenvolvimento, 
            permitindo futuramente processar PIX, cartão e boleto de forma automatizada.
          </p>
        </div>
      ),
      keywords: ['pagamento', 'pix', 'boleto', 'transação', 'asaas'],
    },
    {
      id: 'relatorios',
      icon: BarChart3,
      title: 'Relatórios',
      searchText: 'métricas desempenho receita vendas ticket médio novos clientes período filtro abas gráfico exportar CSV',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Análise e acompanhamento das métricas de desempenho da loja.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Indicadores</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Receita Total:</strong> Valor arrecadado no período.</li>
              <li><strong>Total de Vendas:</strong> Quantidade de transações.</li>
              <li><strong>Ticket Médio:</strong> Valor médio por venda.</li>
              <li><strong>Novos Clientes:</strong> Cadastros no período.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Funcionalidades</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Filtro de Período:</strong> Últimos 7, 30 ou 90 dias, ou calendário personalizado.</li>
              <li><strong>Abas:</strong> Vendas, Produtos e Pagamentos para análises segmentadas.</li>
              <li><strong>Gráfico de Vendas por Dia:</strong> Evolução temporal com detalhes ao passar o cursor.</li>
              <li><strong>Exportar:</strong> Botão para exportar dados em CSV.</li>
            </ul>
          </div>
        </div>
      ),
      keywords: ['relatório', 'métrica', 'gráfico', 'exportar', 'csv', 'análise'],
    },
    {
      id: 'configuracoes',
      icon: Settings,
      title: 'Configurações',
      searchText: 'personalização loja logo imagem dados CNPJ telefone email endereço aparência tema claro escuro cor principal frete modalidades',
      content: (
        <div className="space-y-4 text-muted-foreground">
          <p>Personalização e gestão das informações base da loja.</p>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Dados da loja</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Logo:</strong> Enviar imagem (PNG, JPG, WebP – máx. 2MB).</li>
              <li><strong>Informações:</strong> Nome da loja, CNPJ, telefone, e-mail e endereço completo.</li>
              <li><strong>Prévia:</strong> Visualização do cabeçalho dos recibos em tempo real.</li>
              <li>Clique em &quot;Salvar Configurações&quot; para gravar.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Aparência</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Modo do Tema:</strong> Claro, Escuro ou conforme o sistema.</li>
              <li><strong>Cor Principal:</strong> Paleta para definir o tom de destaque da plataforma.</li>
              <li><strong>Prévia do Tema:</strong> Demonstração visual dos botões.</li>
              <li>Clique em &quot;Salvar Tema&quot; para aplicar.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Frete</h4>
            <p>Configure modalidades de frete (nome, valor base, regra de cálculo) para uso nas vendas.</p>
          </div>
        </div>
      ),
      keywords: ['configuração', 'logo', 'tema', 'frete', 'loja', 'aparência'],
    },
  ];

  const filteredContent = (() => {
    const term = searchTerm.trim();
    if (!term) return helpContent;

    const words = term
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2);

    if (words.length === 0) return helpContent;

    return helpContent.filter((item) => {
      const searchableText = `${item.title} ${item.keywords.join(' ')} ${item.searchText}`.toLowerCase();
      return words.some((word) => searchableText.includes(word));
    });
  })();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            Central de Ajuda
          </h1>
          <p className="text-muted-foreground mt-2">
            Encontre orientações e tire dúvidas sobre o uso do sistema PQUENINOS
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar na ajuda</CardTitle>
            <CardDescription>
              Digite palavras-chave como &quot;venda&quot;, &quot;reserva&quot;, &quot;produto&quot; ou &quot;estoque&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: como cadastrar um produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {filteredContent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum resultado encontrado para &quot;{searchTerm}&quot;. Tente outros termos.
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible defaultValue={filteredContent[0]?.id} key={searchTerm} className="space-y-2">
            {filteredContent.map((item) => {
              const Icon = item.icon;
              return (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border rounded-lg px-4 bg-card shadow-sm"
                >
                  <AccordionTrigger className="hover:no-underline hover:bg-muted/50 rounded-t-lg -mx-4 px-4 py-4">
                    <span className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">{item.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-0">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Dúvidas ou problemas?</strong> Entre em contato com o administrador do sistema para suporte técnico.
              Este manual foi elaborado com base na documentação oficial do software PQUENINOS (versão 1).
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Help;
