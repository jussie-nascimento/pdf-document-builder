import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save, RotateCcw, FileText } from "lucide-react";

const ADMIN_EMAIL = "jnascime06@gmail.com";

type FieldDef = { key: string; label: string; hint: string };
type DocDef = { type: string; label: string; fields: FieldDef[] };

const VARS_BUYER_VEHICLE =
  "{{nome}} {{cpfCnpj}} {{endereco}} {{marca}} {{modelo}} {{chassi}} {{cor}} {{anoFabricacao}} {{anoModelo}} {{placa}} {{renavam}} {{valorAvaliacao}}";

const DOCS: DocDef[] = [
  {
    type: "procuracao_0km",
    label: "Procuração 0KM",
    fields: [
      { key: "outorga", label: "Outorga e poderes", hint: "Variáveis: {{nome}} {{cpfCnpj}} {{endereco}}" },
      { key: "clausulas", label: "Cláusulas a), b), c)", hint: "Texto livre" },
    ],
  },
  {
    type: "procuracao_0km_emplacado",
    label: "Procuração 0KM Emplacado",
    fields: [
      { key: "transferencia", label: "Transferência no CRVA/Detran", hint: `Variáveis: ${VARS_BUYER_VEHICLE} {{valor}} {{valorExtenso}}` },
      { key: "causa_propria", label: "Causa própria (Art. 685)", hint: "Texto livre" },
    ],
  },
  {
    type: "termo_responsabilidade",
    label: "Termo de Responsabilidade (simples e com avalista)",
    fields: [
      { key: "corpo", label: "Responsabilidade 12 meses", hint: "Texto livre" },
      { key: "condicao", label: "Condição da proposta", hint: "Texto livre" },
    ],
  },
  {
    type: "procuracao_usado",
    label: "Procuração Veículo Usado",
    fields: [
      { key: "poderes", label: "Poderes do procurador", hint: `Variáveis: ${VARS_BUYER_VEHICLE}` },
      { key: "causa_propria", label: "Causa própria (Art. 685)", hint: "Texto livre" },
    ],
  },
  {
    type: "coaf",
    label: "COAF Autodeclaração",
    fields: [
      { key: "capacidade", label: "Capacidade econômica", hint: "Texto livre" },
      { key: "pep", label: "Parágrafo PEP", hint: "Texto livre" },
      { key: "pep_nota", label: "Nota de rodapé PEP (*)", hint: "Texto livre" },
      { key: "csnu", label: "Parágrafo CSNU", hint: "Texto livre" },
      { key: "beneficiario", label: "Beneficiário final", hint: "Texto livre" },
    ],
  },
  {
    type: "comprovante_residencia_detran",
    label: "Comprovante de Residência DETRAN",
    fields: [{ key: "declaracao", label: "Declaração de residência", hint: "Texto livre" }],
  },
  {
    type: "comum",
    label: "Comum (todos os documentos)",
    fields: [{ key: "rodape", label: "Rodapé da empresa", hint: "Aparece no Termo e no Comprovante" }],
  },
];

const mapKey = (t: string, k: string) => `${t}.${k}`;

const Modelos = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
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
      fetchTexts();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchTexts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("document_texts").select("doc_type,key,content");
    if (error) {
      toast({ title: "Erro ao carregar textos", description: error.message, variant: "destructive" });
    } else {
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as Array<{ doc_type: string; key: string; content: string }>) {
        map[mapKey(r.doc_type, r.key)] = r.content ?? "";
      }
      setTexts(map);
      setSaved(map);
    }
    setLoading(false);
  };

  const saveDoc = async (doc: DocDef) => {
    setSaving(doc.type);
    const rows = doc.fields.map((f) => ({
      doc_type: doc.type,
      key: f.key,
      content: texts[mapKey(doc.type, f.key)] ?? "",
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("document_texts").upsert(rows, { onConflict: "doc_type,key" });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setSaved((prev) => {
        const next = { ...prev };
        for (const r of rows) next[mapKey(r.doc_type, r.key)] = r.content;
        return next;
      });
      toast({ title: "Texto atualizado!", description: `${doc.label} passa a gerar PDFs com o novo texto.` });
    }
    setSaving(null);
  };

  const restoreDoc = async (doc: DocDef) => {
    if (!window.confirm(`Restaurar o texto padrão do sistema em "${doc.label}"? O personalizado será apagado.`)) return;
    setSaving(doc.type);
    const { error } = await supabase.from("document_texts").delete().eq("doc_type", doc.type);
    if (error) {
      toast({ title: "Erro ao restaurar", description: error.message, variant: "destructive" });
    } else {
      setTexts((prev) => {
        const next = { ...prev };
        for (const f of doc.fields) delete next[mapKey(doc.type, f.key)];
        return next;
      });
      setSaved((prev) => {
        const next = { ...prev };
        for (const f of doc.fields) delete next[mapKey(doc.type, f.key)];
        return next;
      });
      toast({ title: "Padrão restaurado", description: doc.label });
    }
    setSaving(null);
  };

  if (isAdmin === null || loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Esta área é restrita ao administrador do sistema.</p>
        <Button onClick={() => navigate("/")} variant="outline">Voltar ao sistema</Button>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Textos dos Documentos</h1>
              <p className="text-sm text-muted-foreground">Edite os parágrafos usados na geração dos PDFs</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
        </div>

        {DOCS.map((doc) => (
          <Card key={doc.type} className="bg-card/60 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{doc.label}</CardTitle>
              <CardDescription>
                {"{{nome}} {{cpfCnpj}} etc. viram os dados do processo (em negrito). Apagar tudo volta ao padrão."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {doc.fields.map((f) => {
                const k = mapKey(doc.type, f.key);
                const custom = k in saved;
                const dirty = (texts[k] ?? "") !== (saved[k] ?? "");
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      {custom && <Badge variant="secondary" className="text-xs">personalizado</Badge>}
                      {dirty && <Badge variant="outline" className="text-xs">não salvo</Badge>}
                    </div>
                    <Textarea
                      value={texts[k] ?? ""}
                      onChange={(e) => setTexts((prev) => ({ ...prev, [k]: e.target.value }))}
                      rows={6}
                      className="bg-background/50 font-mono text-xs"
                      placeholder="Vazio = usa o texto padrão do sistema"
                    />
                    <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => saveDoc(doc)} disabled={saving === doc.type}>
                  {saving === doc.type ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => restoreDoc(doc)} disabled={saving === doc.type}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Restaurar padrão
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Modelos;
