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
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") setFile(selected);
  };

  const extractData = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error } = await supabase.functions.invoke("extract-pdf", {
        body: { pdf: base64 },
      });

      if (error) throw error;
      if (data?.fields) {
        onDataExtracted(data.fields);
        toast({ title: "Dados extraídos com sucesso!", description: "Os campos foram preenchidos automaticamente." });
      }
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
          Upload de Contrato (opcional)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste um PDF aqui ou clique para selecionar
              </p>
              <label>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                <Button variant="outline" size="sm" asChild>
                  <span>Selecionar PDF</span>
                </Button>
              </label>
            </div>
          )}
        </div>
        {file && (
          <Button onClick={extractData} disabled={loading} className="mt-4 w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Extraindo dados..." : "Extrair Dados do PDF"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfUploader;
