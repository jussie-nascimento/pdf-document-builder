import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ExtractionResult {
  fields: Record<string, string>;
  /** true when proprietário do veículo difere do comprador no Pedido de Vendas */
  requiresAvalista: boolean;
  ownerName?: string;
  buyerName?: string;
}

interface Props {
  onDataExtracted: (result: ExtractionResult) => void;
}

const normalize = (s: string) =>
  s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const PdfUploader = ({ onDataExtracted }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);
  const { toast } = useToast();

  const addFiles = (newFiles: FileList | File[]) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) return;
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const extractData = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const merged: Record<string, string> = {};
      let ownerName: string | undefined; // CRLV
      let buyerName: string | undefined; // Pedido de vendas
      let ownerFields: Record<string, string> = {};
      let buyerFields: Record<string, string> = {};

      for (const file of files) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke("extract-pdf", {
          body: { pdf: base64 },
        });

        if (error) throw error;

        console.log("=== RAW PDF TEXT FROM EXTRACTOR ===");
        console.log(data.rawText);
        console.log("===================================");

        const fields = (data?.fields ?? {}) as Record<string, string>;
        const kind = data?.documentKind as
          | "veiculo"
          | "pedido_vendas"
          | "nota_fiscal_byd"
          | "outro"
          | undefined;
        const personName = data?.personName as string | undefined;

        if (kind === "veiculo") {
          ownerFields = { ...ownerFields, ...fields };
          if (personName) ownerName = personName;
        } else if (kind === "pedido_vendas") {
          buyerFields = { ...buyerFields, ...fields };
          if (personName) buyerName = personName;
        } else if (kind === "nota_fiscal_byd") {
          // Always merge BYD invoice fields directly (veiculoNovo.*)
          for (const [k, v] of Object.entries(fields)) if (v) merged[k] = v;
        } else {
          for (const [k, v] of Object.entries(fields)) if (v) merged[k] = v;
        }
      }

      // Compose merged according to detection
      const sameName =
        ownerName && buyerName ? normalize(ownerName) === normalize(buyerName) : true;
      const requiresAvalista = !!ownerName && !!buyerName && !sameName;

      const mergedResult: Record<string, string> = { ...ownerFields, ...merged };

      // Vehicle data: prefer CRLV/Avaliação
      for (const [k, v] of Object.entries(ownerFields))
        if (k.startsWith("veiculo.") && v) mergedResult[k] = v;
      for (const [k, v] of Object.entries(buyerFields))
        if (k.startsWith("veiculo.") && v && !mergedResult[k]) mergedResult[k] = v;

      // Se houver divergência de nome, tratamos Proprietário vs Avalista
      if (requiresAvalista) {
        // Pedido de Vendas dita quem é o Proprietário/Outorgante oficial
        for (const [k, v] of Object.entries(buyerFields))
          if (k.startsWith("proprietario.") && v) mergedResult[k] = v;

        // Limpa o CPF/CNPJ do avalista por padrão
        mergedResult["avalista.cpfCnpj"] = "";

        // Puxa Nome, Telefone e Email do Avaliação (ownerFields) para o Avalista
        if (ownerFields["proprietario.nome"]) mergedResult["avalista.nome"] = ownerFields["proprietario.nome"];
        if (ownerFields["proprietario.telefone"]) mergedResult["avalista.telefone"] = ownerFields["proprietario.telefone"];
        if (ownerFields["proprietario.email"]) mergedResult["avalista.email"] = ownerFields["proprietario.email"];

        // Os demais itens do Avalista replicam do Proprietário (buyerFields)
        for (const [k, v] of Object.entries(mergedResult)) {
          if (k.startsWith("proprietario.") && v) {
            const field = k.replace("proprietario.", "");
            if (!["nome", "telefone", "email", "cpfCnpj"].includes(field)) {
              mergedResult[`avalista.${field}`] = v;
            }
          }
        }
      } else {
        // Sem divergência: preferimos os dados da Avaliação; e os faltantes pegamos do Pedido
        for (const [k, v] of Object.entries(ownerFields))
          if (k.startsWith("proprietario.") && v) mergedResult[k] = v;
        for (const [k, v] of Object.entries(buyerFields))
          if (k.startsWith("proprietario.") && v && !mergedResult[k]) mergedResult[k] = v;
      }

      // Preenchimento Automático do COAF refletindo o Proprietário
      if (mergedResult["proprietario.nome"]) mergedResult["coaf.nomeRazaoSocial"] = mergedResult["proprietario.nome"];
      if (mergedResult["proprietario.cpfCnpj"]) mergedResult["coaf.cpfCnpj"] = mergedResult["proprietario.cpfCnpj"];

      const result: ExtractionResult = {
        fields: mergedResult,
        requiresAvalista,
        ownerName,
        buyerName,
      };
      setLastResult(result);
      onDataExtracted(result);

      toast({
        title: "Dados extraídos com sucesso!",
        description: requiresAvalista
          ? `Nomes divergentes detectados — usar Termo com Avalista.`
          : `${files.length} arquivo(s) processado(s).`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na extração", description: "Não foi possível extrair dados do PDF.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5" />
          Upload de Contratos / Formulários (opcional)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            Arraste PDFs aqui ou clique para selecionar (múltiplos arquivos)
          </p>
          <label>
            <input type="file" accept=".pdf" multiple className="hidden" onChange={handleFileChange} />
            <Button variant="outline" size="sm" asChild>
              <span>Selecionar PDFs</span>
            </Button>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeFile(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={extractData} disabled={loading} className="w-full">
              <Loader2 className={`h-4 w-4 animate-spin mr-2 ${loading ? "inline-block" : "hidden"}`} />
              <span className={loading ? "hidden" : "inline-block"}>Extrair Dados de {files.length} arquivo(s)</span>
              <span className={loading ? "inline-block" : "hidden"}>Extraindo dados...</span>
            </Button>
          </div>
        )}

        {lastResult?.requiresAvalista && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Divergência de nomes detectada:</strong> proprietário do veículo
              ({lastResult.ownerName}) é diferente do comprador ({lastResult.buyerName}).
              O <em>Termo de Responsabilidade com Avalista</em> será selecionado automaticamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfUploader;
