import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Store,
  ShoppingBag,
  ShieldCheck,
  Smartphone,
  Search,
  Package,
  Loader2,
  Truck,
  CreditCard,
  Headphones,
  MapPin,
  Sparkles,
} from "lucide-react";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductVariation {
  id: string;
  size: string | null;
  color: string | null;
  selling_price: number | null;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  selling_price: number | null;
  image_url: string | null;
  product_images: ProductImage[];
  product_variations: ProductVariation[];
}

const Landing = () => {
  // Enquanto você ajusta a Landing, redirecionamos a tela inicial para o login.
  // O restante da UI abaixo fica "comentada" (não renderizada) por enquanto.
  if (true) {
    return <Navigate to="/login" replace />;
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const heroSlides = [
    {
      badge: "Portal do Cliente",
      title: (
        <>
          Compre com{" "}
          <span className="text-primary">rapidez e segurança</span>
        </>
      ),
      description:
        "Catálogo sempre atualizado com reservas e pedidos direto pelo portal. A loja recebe sua solicitação organizada.",
    },
    {
      badge: "Reservas Inteligentes",
      title: (
        <>
          Escolha tamanho e cor,{" "}
          <span className="text-primary">e envie seu pedido</span>
        </>
      ),
      description:
        "Você adiciona itens ao carrinho, confirma e acompanha o status em “Meus pedidos”.",
    },
    {
      badge: "Mobile First",
      title: (
        <>
          Funciona bem no <span className="text-primary">celular</span>
        </>
      ),
      description:
        "Interface responsiva pensada para facilitar a navegação e o fechamento do pedido em qualquer dispositivo.",
    },
  ];

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, name, description, category, selling_price, image_url,
            product_images(id, image_url, is_primary, display_order),
            product_variations(id, size, color, selling_price, stock_quantity)
          `)
          .order("name");

        if (error) throw error;
        setProducts((data as Product[]) || []);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(t);
  }, []);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const getProductImage = (p: Product) => {
    const primary = p.product_images?.find((i) => i.is_primary);
    if (primary) return primary.image_url;
    if (p.product_images?.length > 0) return p.product_images[0].image_url;
    return p.image_url;
  };

  const getProductPrice = (p: Product) => {
    if (p.selling_price) return p.selling_price;
    const prices = p.product_variations
      ?.map((v) => v.selling_price)
      .filter(Boolean) as number[];
    return prices?.length > 0 ? Math.min(...prices) : null;
  };

  const getSizes = (p: Product) => {
    return Array.from(
      new Set(p.product_variations?.map((v) => v.size).filter(Boolean))
    );
  };

  const getColors = (p: Product) => {
    return Array.from(
      new Set(p.product_variations?.map((v) => v.color).filter(Boolean))
    );
  };

  const hasStock = (p: Product) => {
    return p.product_variations?.some((v) => v.stock_quantity > 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-lg text-foreground">PQueninos</span>
              <span className="text-[11px] text-muted-foreground hidden sm:block">
                Moda infantil
              </span>
            </div>
          </div>

          <div className="flex-1 max-w-xl px-3 hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no catálogo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Área do Cliente
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-primary/10 border-primary/20 text-primary">
                {heroSlides[heroIndex].badge}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {heroSlides[heroIndex].title}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {heroSlides[heroIndex].description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/login" className="flex-1">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Acessar Área do Cliente
                  </Button>
                </Link>
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                    Quero ser cliente
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3 pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                  Catálogo atualizado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Compra segura
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  Funciona no celular
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl border bg-background/70 backdrop-blur p-5 md:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Portal do Cliente</p>
                    <p className="font-semibold text-sm">
                      {heroIndex === 0
                        ? "Catálogo completo"
                        : heroIndex === 1
                          ? "Carrinho e confirmação"
                          : "Experiência mobile"}
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-primary/5 p-3">
                    <p className="text-[10px] text-muted-foreground">Reservas</p>
                    <p className="text-sm font-semibold">Ativas e organizadas</p>
                    <p className="text-xs text-muted-foreground mt-1">Acompanhe em tempo real</p>
                  </div>
                  <div className="rounded-xl border bg-primary/5 p-3">
                    <p className="text-[10px] text-muted-foreground">Catálogo</p>
                    <p className="text-sm font-semibold">Produtos por cliente</p>
                    <p className="text-xs text-muted-foreground mt-1">Filtro por tamanho e cor</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <div className="flex-1 rounded-xl bg-muted/40 h-24" />
                  <div className="flex-1 rounded-xl bg-muted/40 h-24" />
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  {heroSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        idx === heroIndex ? "bg-primary" : "bg-muted"
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="max-w-7xl mx-auto w-full px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full lg:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no catálogo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <div className="text-xs text-muted-foreground sm:ml-auto">
            Dica: use a busca no topo (ou no celular, pela seção de produtos).
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mb-3" />
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((product) => {
              const imageUrl = getProductImage(product);
              const price = getProductPrice(product);
              const sizes = getSizes(product);
              const colors = getColors(product);
              const inStock = hasStock(product);

              return (
                <Link to="/login" key={product.id}>
                  <Card className="group overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 h-full flex flex-col border-border/60">
                    {/* Image */}
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {product.category && (
                        <Badge
                          variant="secondary"
                          className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5"
                        >
                          {product.category}
                        </Badge>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <span className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded">
                            Indisponível
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <CardContent className="p-2.5 flex-1 flex flex-col gap-1">
                      <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                        {product.name}
                      </h3>

                      {price ? (
                        <p className="text-sm font-bold text-primary mt-auto">
                          R$ {price.toFixed(2).replace(".", ",")}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-auto">
                          Consulte o preço
                        </p>
                      )}

                      {sizes.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Tam: {sizes.join(", ")}
                        </p>
                      )}
                      {colors.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Cor: {colors.join(", ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* CTA Banner */}
      <section className="border-t bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">Compra pelo portal, do jeito certo</h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Clientes autorizados reservam itens, confirmam pedidos e acompanham tudo em um único lugar.
            A loja recebe as informações organizadas e prontas para atendimento.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link to="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Fazer Login
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Quero ser cliente</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Informações do portal */}
      <section className="max-w-7xl mx-auto w-full px-4 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <p className="font-semibold">Logística e prazos</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Atualizamos informações de atendimento conforme a disponibilidade da loja.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <p className="font-semibold">Pagamentos e segurança</p>
              </div>
              <p className="text-sm text-muted-foreground">
                O fluxo do portal garante rastreabilidade do pedido e transparência no acompanhamento.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" />
                <p className="font-semibold">Atendimento</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Suporte para clientes cadastrados, com orientações para reservas e pedidos.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">Como funciona</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">1</div>
                  <div>
                    Faça login na área do cliente e acesse o catálogo disponível.
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">2</div>
                  <div>
                    Adicione ao carrinho e confirme o pedido (reserva).
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">3</div>
                  <div>
                    Acompanhe em “Meus pedidos” e siga as orientações do atendimento.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} PQueninos. Todos os direitos reservados.</span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            Atendimento para clientes autorizados
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
