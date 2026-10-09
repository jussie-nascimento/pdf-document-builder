import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, CheckCircle, XCircle, Clock, LogOut, FileText, BarChart3 } from "lucide-react";

type AccessRequest = {
  id: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "blocked";
  created_at: string;
};

const ADMIN_EMAIL = "jnascime06@gmail.com";

type ReportRow = { email: string; logins: number; exports: number; docs: Record<string, number> };

const Admin = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<ReportRow[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
      if (session.user.email !== ADMIN_EMAIL) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      fetchRequests();
      fetchReport(reportMonth);
    });
  }, [navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar solicitações", description: error.message, variant: "destructive" });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchReport = async (month: string) => {
    setReportLoading(true);
    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1).toISOString();
    const to = new Date(y, m, 1).toISOString();
    const { data, error } = await supabase
      .from("access_logs")
      .select("email,event,doc_type")
      .gte("created_at", from)
      .lt("created_at", to)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      toast({ title: "Erro ao carregar relatório", description: error.message, variant: "destructive" });
      setReport(null);
    } else {
      const map = new Map<string, ReportRow>();
      for (const row of (data || []) as Array<{ email: string; event: string; doc_type: string | null }>) {
        let r = map.get(row.email);
        if (!r) { r = { email: row.email, logins: 0, exports: 0, docs: {} }; map.set(row.email, r); }
        if (row.event === "login") r.logins += 1;
        else if (row.event === "export") {
          r.exports += 1;
          const dt = row.doc_type || "outro";
          r.docs[dt] = (r.docs[dt] ?? 0) + 1;
        }
      }
      setReport([...map.values()].sort((a, b) => b.exports - a.exports || b.logins - a.logins));
    }
    setReportLoading(false);
  };

  const updateStatus = async (id: string, status: "approved" | "blocked") => {
    setActionLoading(id + status);
    const { error } = await supabase
      .from("access_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: status === "approved" ? "Acesso liberado! ✅" : "Acesso bloqueado 🚫",
        description: `O usuário foi ${status === "approved" ? "aprovado" : "bloqueado"} com sucesso.`,
      });
      fetchRequests();
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600 hover:bg-green-700">Aprovado</Badge>;
    if (status === "blocked") return <Badge variant="destructive">Bloqueado</Badge>;
    return <Badge variant="outline" className="text-yellow-400 border-yellow-500">Pendente</Badge>;
  };

  if (isAdmin === null) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Esta área é restrita ao administrador do sistema.</p>
        <Button onClick={() => navigate("/")} variant="outline">Voltar ao sistema</Button>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel Admin</h1>
              <p className="text-sm text-muted-foreground">Controle de Acesso – Automatiza DOC IESA BYD / Denza</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/modelos")}>
            <FileText className="h-4 w-4 mr-1" /> Textos
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            title="Sair"
          >
            <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pendentes", value: requests.filter(r => r.status === "pending").length, icon: Clock, color: "text-yellow-400" },
            { label: "Aprovados", value: requests.filter(r => r.status === "approved").length, icon: CheckCircle, color: "text-green-500" },
            { label: "Bloqueados", value: requests.filter(r => r.status === "blocked").length, icon: XCircle, color: "text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card/60 border-border/50">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requests Table */}
        <Card className="bg-card/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Solicitações de Acesso</CardTitle>
              <CardDescription>Aprove ou bloqueie usuários com um clique</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma solicitação encontrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-background/50 border border-border/40"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{req.email}</span>
                        {statusBadge(req.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        📱 {req.phone} &nbsp;·&nbsp; {new Date(req.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={req.status === "approved" || !!actionLoading}
                        onClick={() => updateStatus(req.id, "approved")}
                      >
                        {actionLoading === req.id + "approved" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-1" /> Aprovar</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={req.status === "blocked" || !!actionLoading}
                        onClick={() => updateStatus(req.id, "blocked")}
                      >
                        {actionLoading === req.id + "blocked" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><XCircle className="h-4 w-4 mr-1" /> Bloquear</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relatório de uso por login */}
        <Card className="bg-card/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Acessos por login</CardTitle>
              <CardDescription>Logins e documentos exportados no mês</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={reportMonth}
                onChange={(e) => { setReportMonth(e.target.value); if (e.target.value) fetchReport(e.target.value); }}
                className="w-auto"
              />
              <Button variant="outline" size="sm" onClick={() => fetchReport(reportMonth)} disabled={reportLoading}>
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : !report || report.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Sem registros neste mês.</p>
            ) : (
              <div className="space-y-3">
                {report.map((r) => (
                  <div key={r.email} className="p-4 rounded-lg bg-background/50 border border-border/40">
                    <p className="font-medium text-sm truncate">{r.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.logins} acesso(s) · {r.exports} documento(s) exportado(s)
                    </p>
                    {Object.keys(r.docs).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(r.docs).map(([dt, n]) => (
                          <Badge key={dt} variant="outline" className="text-xs">{dt} ×{n}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="link" className="text-muted-foreground" onClick={() => navigate("/")}>
            ← Voltar ao sistema
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
