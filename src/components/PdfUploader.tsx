import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onDataExtracted: (data: Record<string, string>) => void;
}

const PdfUploader = ({ onDataExtracted }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
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
      const allFields: Record<string, string> = {};

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const { data, error } = await supabase.functions.invoke("extract-pdf", {
          body: { pdf: base64 },
        });

        if (error) throw error;
        if (data?.fields) {
          // Merge: newer values overwrite only if non-empty
          for (const [key, value] of Object.entries(data.fields)) {
            if (value) allFields[key] = value as string;
          }
        }
      }

      onDataExtracted(allFields);
      toast({
        title: "Dados extraídos com sucesso!",
        description: `${files.length} arquivo(s) processado(s). Campos preenchidos automaticamente.`,
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Extraindo dados..." : `Extrair Dados de ${files.length} arquivo(s)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfUploader;
