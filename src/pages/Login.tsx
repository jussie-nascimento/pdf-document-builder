import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, UserPlus, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "login" | "request";

// Formats phone to (xx)xxxxx-xxxx as user types
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
  return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const Login = () => {
  const [mode, setMode] = useState<Mode>("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Request fields
  const [reqEmail, setReqEmail] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqPasswordConfirm, setReqPasswordConfirm] = useState("");
  const [reqPhone, setReqPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  // Derived password match state (only show after user starts typing confirm)
  const passwordsMatch = reqPassword === reqPasswordConfirm;
  const showPasswordError = reqPasswordConfirm.length > 0 && !passwordsMatch;

  // ─── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setIsLoading(false);
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas. Verifique seu e-mail e senha.",
        variant: "destructive",
      });
      return;
    }

    // Check approval status
    const { data: request, error: reqError } = await supabase
      .from("access_requests")
      .select("status")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (reqError) {
      // Table may not exist yet (first run). Allow admin through.
      console.warn("access_requests query error:", reqError.message);
      setIsLoading(false);
      navigate("/");
      return;
    }

    // No record = admin user created manually in Supabase → allow through
    if (!request) {
      setIsLoading(false);
      navigate("/");
      return;
    }

    if (request.status !== "approved") {
      await supabase.auth.signOut();
      setIsLoading(false);
      const msg =
        request.status === "pending"
          ? "Sua solicitação está aguardando aprovação do administrador."
          : "Seu acesso foi bloqueado. Entre em contato com o administrador.";
      toast({ title: "Acesso não liberado", description: msg, variant: "destructive" });
      return;
    }

    setIsLoading(false);
    navigate("/");
  };

  // ─── REQUEST ACCESS ───────────────────────────────────────────────────────────
  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast({ title: "Senhas não coincidem", description: "A confirmação de senha deve ser igual à senha.", variant: "destructive" });
      return;
    }
    if (reqPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify if email already has a request
      const { data: existing } = await supabase
        .from("access_requests")
        .select("status")
        .eq("email", reqEmail.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        setIsLoading(false);
        const msg =
          existing.status === "pending"
            ? "Já existe uma solicitação pendente com este e-mail. Aguarde aprovação."
            : existing.status === "approved"
            ? "Este e-mail já possui acesso liberado. Faça o login."
            : "Este e-mail está bloqueado. Entre em contato com o administrador.";
        toast({ title: "E-mail já cadastrado", description: msg, variant: "destructive" });
        return;
      }

      // 2. Create the auth account
      const { error: signUpError } = await supabase.auth.signUp({
        email: reqEmail.trim(),
        password: reqPassword,
      });

      // Sign out immediately — user must wait for approval
      await supabase.auth.signOut();

      if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
        const isRateLimit = signUpError.message.toLowerCase().includes("rate limit");
        if (isRateLimit) {
          setIsLoading(false);
          toast({
            title: "Limite de tentativas excedido",
            description: "O Supabase atingiu o limite temporário de envios de e-mail. Desative a opção 'Confirm Email' no painel do Supabase (Authentication -> Providers -> Email) para liberar novos cadastros sem restrições.",
            variant: "destructive",
          });
          return;
        }
        setIsLoading(false);
        toast({ title: "Erro ao cadastrar", description: signUpError.message, variant: "destructive" });
        return;
      }

      // 3. Insert/upsert into access_requests
      const { error: insertError } = await supabase.from("access_requests").upsert(
        {
          email: reqEmail.toLowerCase().trim(),
          phone: reqPhone,
          status: "pending",
        },
        { onConflict: "email" }
      );

      if (insertError) {
        setIsLoading(false);
        toast({ title: "Erro ao registrar solicitação", description: insertError.message, variant: "destructive" });
        return;
      }

      // 4. Notify admin
      await supabase.functions.invoke("notify-access-request", {
        body: { email: reqEmail, phone: reqPhone },
      });

      setIsLoading(false);
      toast({
        title: "Solicitação enviada! ✅",
        description: "O administrador será notificado. Aguarde a liberação do seu acesso.",
      });

      // Reset and go back to login
      setMode("login");
      setReqEmail("");
      setReqPassword("");
      setReqPasswordConfirm("");
      setReqPhone("");
    } catch (err: any) {
      setIsLoading(false);
      toast({ title: "Erro inesperado", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-background to-background" />

      <div className="z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <img src="/LOGO_IESA.jpg" alt="BYD IESA Logo" className="h-16 object-contain rounded bg-white p-2 shadow-lg shadow-primary/20" />
        </div>

        {/* ── LOGIN ── */}
        {mode === "login" && (
          <Card className="bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardHeader className="space-y-2 text-center pb-6">
              <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Portal Exclusivo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Automatiza DOC IESA BYD / Denza
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 border-input/50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
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
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                  {isLoading ? "Autenticando..." : "ACESSAR SISTEMA"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
              <div className="w-full border-t border-border/40 pt-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">Ainda não tem acesso?</p>
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setMode("request")}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Solicitar Acesso
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* ── SOLICITAR ACESSO ── */}
        {mode === "request" && (
          <Card className="bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardHeader className="space-y-2 text-center pb-6">
              <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-2">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Solicitar Acesso</CardTitle>
              <CardDescription className="text-muted-foreground">
                Preencha os dados abaixo. O administrador irá liberar seu acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="req-email">E-mail</Label>
                  <Input
                    id="req-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    required
                    className="bg-background/50 border-input/50 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="req-phone">Telefone / WhatsApp</Label>
                  <Input
                    id="req-phone"
                    type="tel"
                    placeholder="(51)99999-9999"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(formatPhone(e.target.value))}
                    required
                    maxLength={14}
                    className="bg-background/50 border-input/50 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="req-password">Senha desejada</Label>
                  <Input
                    id="req-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={reqPassword}
                    onChange={(e) => setReqPassword(e.target.value)}
                    required
                    className="bg-background/50 border-input/50 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="req-password-confirm">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="req-password-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={reqPasswordConfirm}
                      onChange={(e) => setReqPasswordConfirm(e.target.value)}
                      required
                      className={`bg-background/50 border-input/50 focus-visible:ring-primary pr-10 ${
                        showPasswordError
                          ? "border-red-500 focus-visible:ring-red-500"
                          : reqPasswordConfirm.length > 0 && passwordsMatch
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                      }`}
                    />
                    {reqPasswordConfirm.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {showPasswordError && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                  )}
                  {reqPasswordConfirm.length > 0 && passwordsMatch && (
                    <p className="text-xs text-green-500 mt-1">Senhas coincidem. ✓</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full font-bold tracking-wide mt-6 h-12 shadow-lg shadow-primary/30"
                  disabled={isLoading || showPasswordError}
                >
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                  {isLoading ? "Enviando..." : "ENVIAR SOLICITAÇÃO"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center pt-2 pb-6">
              <Button variant="ghost" className="text-muted-foreground" onClick={() => setMode("login")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center z-10 animate-in fade-in duration-700 delay-300">
        <p className="text-xs text-muted-foreground tracking-wide">
          Desenvolvido por <span className="text-primary font-medium">Jussie Nascimento</span>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD).
        </p>
      </div>
    </div>
  );
};

export default Login;
