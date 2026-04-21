import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas. Verifique seu e-mail e senha.",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-background to-background" />
      
      <div className="z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <img src="/LOGO_IESA.jpg" alt="BYD IESA Logo" className="h-16 object-contain rounded bg-white p-2 shadow-lg shadow-primary/20" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Portal Exclusivo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sistema de Documentação Venda Direta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu.nome@grupoiesa.com.br" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background/50 border-input/50 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha de Segurança</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background/50 border-input/50 focus-visible:ring-primary"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full font-bold tracking-wide mt-6 h-12 shadow-lg shadow-primary/30" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                <span>{isLoading ? "Autenticando..." : "ACESSAR SISTEMA"}</span>
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pt-2 pb-6">
            <p className="text-xs text-muted-foreground/70 text-center">
              Acesso Restrito. Contate o administrador do sistema para novas credenciais.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
