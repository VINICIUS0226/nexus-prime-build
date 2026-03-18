import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import loginIllustration from '@/assets/login-illustration.png';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Só redireciona depois que o usuário estiver definido
    // e o papel (userRole) já tiver sido carregado do backend.
    if (authLoading) {
      return;
    }

    if (!user) {
      return;
    }

    if (userRole === 'admin' || userRole === 'employee' || userRole === 'super_admin') {
      navigate('/dashboard');
    } else {
      // Client users go to the catalog/shopping flow
      navigate('/client/products');
    }
  }, [user, userRole, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = loginSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });

      // Não faz redirecionamento direto aqui.
      // O AuthContext vai atualizar user e userRole,
      // e o useEffect acima decide a rota correta (dashboard x cliente)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          description: error.message || "Verifique suas credenciais",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#E8DDD3] items-center justify-center p-12  overflow-hidden">
        <img 
          src={loginIllustration} 
          alt="PQueninos Ilustração" 
          className="max-w-full h-auto object-contain rounded-xl"
        />
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Seja bem-vindo!</h1>
            <p className="text-sm text-muted-foreground">Acesse o sistema utilizando suas credenciais</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-mail*</Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha*</Label>
              <Input
                id="password"
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-background"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-foreground cursor-pointer">
                  Lembrar-me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-[#7B2869] hover:underline">
                Esqueci a senha!
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#7B2869] hover:bg-[#6A2159] text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Não possui acesso?{' '}
            <Link to="/signup" className="text-[#7B2869] hover:underline font-semibold">
              Criar sua conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
