import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, ShoppingBag, ShieldCheck, Smartphone } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Topbar */}
      <header className="w-full border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-lg">PQueninos</span>
              <span className="text-[11px] text-muted-foreground">
                Moda infantil com portal do cliente
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Área do Cliente
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 w-full">
        <section className="max-w-5xl mx-auto px-4 py-10 md:py-16 grid gap-10 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              Portal do Cliente para{" "}
              <span className="text-primary">compras rápidas e reservadas</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              Seus clientes acessam o catálogo, consultam disponibilidade por tamanho/cor e
              fazem pedidos direto pelo portal, de qualquer lugar, no computador ou celular.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/login" className="flex-1">
                <Button className="w-full h-11 text-base bg-primary text-primary-foreground hover:bg-primary/90">
                  Acessar Área do Cliente
                </Button>
              </Link>

              {/* Futuro: pode apontar para um formulário de pedido de acesso */}
              <Link to="/login" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-11 text-base border-primary/30 text-primary hover:bg-primary/5"
                >
                  Quero ser cliente
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 pt-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-3 w-3 text-primary" />
                Catálogo sempre atualizado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Acesso seguro por login/senha
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3 w-3 text-primary" />
                Funciona bem em celular
              </span>
            </div>
          </div>

          {/* Mock visual do portal */}
          <div className="relative">
            <div className="rounded-2xl border bg-white shadow-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Portal do Cliente</p>
                  <p className="font-semibold text-sm">Catálogo PQueninos</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Online
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="border rounded-xl p-2 flex flex-col gap-1 bg-slate-50">
                  <div className="h-10 rounded-md bg-slate-200" />
                  <span className="font-medium truncate">Vestido Floral</span>
                  <span className="text-primary font-semibold">R$ 99,90</span>
                  <span className="text-[10px] text-muted-foreground">Tamanhos: P, M, G</span>
                </div>
                <div className="border rounded-xl p-2 flex flex-col gap-1 bg-slate-50">
                  <div className="h-10 rounded-md bg-slate-200" />
                  <span className="font-medium truncate">Conjunto Jeans</span>
                  <span className="text-primary font-semibold">R$ 129,90</span>
                  <span className="text-[10px] text-muted-foreground">Cores: Azul, Preto</span>
                </div>
                <div className="border rounded-xl p-2 flex flex-col gap-1 bg-slate-50">
                  <div className="h-10 rounded-md bg-slate-200" />
                  <span className="font-medium truncate">Body Infantil</span>
                  <span className="text-primary font-semibold">R$ 59,90</span>
                  <span className="text-[10px] text-muted-foreground">Pronta entrega</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Seus clientes entram aqui, escolhem os produtos e você recebe os pedidos
                organizados no painel.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="w-full border-t bg-white/80">
        <div className="max-w-5xl mx-auto px-4 py-3 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} PQueninos. Todos os direitos reservados.</span>
          <span>Portal desenvolvido para uso interno e acesso dos clientes autorizados.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

