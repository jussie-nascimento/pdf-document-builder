import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X, AlertCircle, Building2, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export interface ExtractionResult {
  fields: Record<string, string>;
  /** true when proprietário do veículo difere do comprador no Pedido de Vendas */
  requiresAvalista: boolean;
  ownerName?: string;
  buyerName?: string;
}

export type ImportMode = "venda_direta" | "varejo_nbs";

interface Props {
  onDataExtracted: (result: ExtractionResult) => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
}

const normalize = (s: string) =>
  s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const PdfUploader = ({ onDataExtracted, importMode, onImportModeChange }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // ─── Venda Direta extraction (original logic) ──────────────────────────────
  const extractVendaDireta = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const merged: Record<string, string> = {};
      let ownerName: string | undefined;
      let buyerName: string | undefined;
      let ownerFields: Record<string, string> = {};
      let buyerFields: Record<string, string> = {};

      for (const file of files) {
        const base64 = await fileToBase64(file);

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
          | "proposta_nbs"
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
          for (const [k, v] of Object.entries(fields)) if (v) merged[k] = v;
        } else {
          for (const [k, v] of Object.entries(fields)) if (v) merged[k] = v;
        }
      }

      const ownerCpfCnpj = ownerFields["proprietario.cpfCnpj"]?.replace(/\D/g, "");
      const buyerCpfCnpj = buyerFields["proprietario.cpfCnpj"]?.replace(/\D/g, "");

      let requiresAvalista = false;
      if (ownerCpfCnpj && buyerCpfCnpj) {
        requiresAvalista = ownerCpfCnpj !== buyerCpfCnpj;
      } else {
        const sameName =
          ownerName && buyerName ? normalize(ownerName) === normalize(buyerName) : true;
        requiresAvalista = !!ownerName && !!buyerName && !sameName;
      }

      const mergedResult: Record<string, string> = { ...ownerFields, ...merged };

      for (const [k, v] of Object.entries(ownerFields))
        if (k.startsWith("veiculo.") && v) mergedResult[k] = v;
      for (const [k, v] of Object.entries(buyerFields))
        if (k.startsWith("veiculo.") && v && !mergedResult[k]) mergedResult[k] = v;

      if (requiresAvalista) {
        for (const [k, v] of Object.entries(buyerFields))
          if (k.startsWith("proprietario.") && v) mergedResult[k] = v;

        mergedResult["avalista.cpfCnpj"] = "";

        if (ownerFields["proprietario.nome"]) mergedResult["avalista.nome"] = ownerFields["proprietario.nome"];
        if (ownerFields["proprietario.telefone"]) mergedResult["avalista.telefone"] = ownerFields["proprietario.telefone"];
        if (ownerFields["proprietario.email"]) mergedResult["avalista.email"] = ownerFields["proprietario.email"];

        for (const [k, v] of Object.entries(mergedResult)) {
          if (k.startsWith("proprietario.") && v) {
            const field = k.replace("proprietario.", "");
            if (!["nome", "telefone", "email", "cpfCnpj"].includes(field)) {
              mergedResult[`avalista.${field}`] = v;
            }
          }
        }
      } else {
        for (const [k, v] of Object.entries(ownerFields))
          if (k.startsWith("proprietario.") && v) mergedResult[k] = v;
        for (const [k, v] of Object.entries(buyerFields))
          if (k.startsWith("proprietario.") && v && !mergedResult[k]) mergedResult[k] = v;
      }

      if (mergedResult["proprietario.nome"]) mergedResult["coaf.nomeRazaoSocial"] = mergedResult["proprietario.nome"];
      if (mergedResult["proprietario.cpfCnpj"]) mergedResult["coaf.cpfCnpj"] = mergedResult["proprietario.cpfCnpj"];

      combineAddressFields(mergedResult);

      const result: ExtractionResult = { fields: mergedResult, requiresAvalista, ownerName, buyerName };
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

  // ─── Varejo NBS extraction ─────────────────────────────────────────────────
  const extractVarejoNbs = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      let nbsFields: Record<string, string> = {};

      for (const file of files) {
        const base64 = await fileToBase64(file);

        const { data, error } = await supabase.functions.invoke("extract-pdf", {
          body: { pdf: base64 },
        });

        if (error) throw error;

        console.log("=== RAW NBS PDF TEXT ===");
        console.log(data.rawText);
        console.log("========================");

        const kind = data?.documentKind as string | undefined;
        const fields = (data?.fields ?? {}) as Record<string, string>;

        if (kind === "proposta_nbs") {
          // Merge NBS fields directly — buyer from Cliente tab, vehicle from Veículo tab
          for (const [k, v] of Object.entries(fields)) if (v) nbsFields[k] = v;
        } else {
          // If another doc type (e.g. nota fiscal) is also uploaded alongside NBS, merge without overwriting
          for (const [k, v] of Object.entries(fields)) if (v && !nbsFields[k]) nbsFields[k] = v;
        }
      }

      // Combine address parts into single field (NBS already combines inline)
      if (importMode !== "varejo_nbs") {
        combineAddressFields(nbsFields);
      }

      const result: ExtractionResult = {
        fields: nbsFields,
        requiresAvalista: false,
      };
      setLastResult(result);
      onDataExtracted(result);

      toast({
        title: "Proposta NBS importada!",
        description: `Dados do comprador e veículo extraídos com sucesso.`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na extração NBS", description: "Não foi possível extrair dados da proposta NBS.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const extractData = () => {
    if (importMode === "varejo_nbs") return extractVarejoNbs();
    return extractVendaDireta();
  };

  return (
    <div className="space-y-4">
      {/* ─── Mode Selector ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Modalidade de Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Venda Direta */}
            <button
              type="button"
              onClick={() => { onImportModeChange("venda_direta"); setFiles([]); setLastResult(null); }}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors ${
                importMode === "venda_direta"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <span className="font-semibold">Venda Direta</span>
                {importMode === "venda_direta" && (
                  <Badge variant="default" className="ml-auto text-xs">Ativo</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Importa a partir dos documentos padrão (Pedido de Vendas, CRLV, Nota Fiscal BYD).
              </p>
            </button>

            {/* Varejo NBS */}
            <button
              type="button"
              onClick={() => { onImportModeChange("varejo_nbs"); setFiles([]); setLastResult(null); }}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors ${
                importMode === "varejo_nbs"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Varejo (NBS)</span>
                {importMode === "varejo_nbs" && (
                  <Badge variant="default" className="ml-auto text-xs">Ativo</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Importa comprador (aba Cliente) e veículo novo (aba Veículo) diretamente da proposta NBS em PDF.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ─── File uploader ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            {importMode === "varejo_nbs"
              ? "Upload da Proposta NBS (PDF)"
              : "Upload de Contratos / Formulários (opcional)"}
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
              {importMode === "varejo_nbs"
                ? "Arraste a proposta NBS em PDF ou clique para selecionar"
                : "Arraste PDFs aqui ou clique para selecionar (múltiplos arquivos)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple={importMode === "venda_direta"}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar PDF{importMode === "venda_direta" ? "s" : ""}
            </Button>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, i) => (
                <div key={file.name + i} className="flex items-center gap-3 p-2 border rounded-md">
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
              <Button type="button" onClick={extractData} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                    <span>{importMode === "varejo_nbs" ? "Importando NBS..." : "Extraindo dados..."}</span>
                  </>
                ) : (
                  <span>
                    {importMode === "varejo_nbs"
                      ? `Importar Proposta NBS (${files.length} arquivo(s))`
                      : `Extrair Dados de ${files.length} arquivo(s)`}
                  </span>
                )}
              </Button>
            </div>
          )}

          {lastResult?.requiresAvalista && importMode === "venda_direta" && (
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
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function combineAddressFields(fields: Record<string, string>) {
  ["proprietario", "avalista"].forEach((prefix) => {
    const parts = [];
    if (fields[`${prefix}.endereco`]) parts.push(fields[`${prefix}.endereco`]);
    if (fields[`${prefix}.bairro`]) parts.push(fields[`${prefix}.bairro`]);

    const cityState = [];
    if (fields[`${prefix}.cidade`]) cityState.push(fields[`${prefix}.cidade`]);
    if (fields[`${prefix}.estado`]) cityState.push(fields[`${prefix}.estado`]);
    if (cityState.length > 0) parts.push(cityState.join(" - "));

    if (fields[`${prefix}.cep`]) parts.push(`CEP: ${fields[`${prefix}.cep`]}`);

    if (parts.length > 0) {
      fields[`${prefix}.endereco`] = parts.join(", ");
    }

    delete fields[`${prefix}.bairro`];
    delete fields[`${prefix}.cidade`];
    delete fields[`${prefix}.estado`];
    delete fields[`${prefix}.cep`];
  });
}

export default PdfUploader;
