import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormData, formSchema, DocumentType } from "@/types/document";
import StepperIndicator from "@/components/StepperIndicator";
import PdfUploader, { ExtractionResult } from "@/components/PdfUploader";
import VehicleDataForm from "@/components/forms/VehicleDataForm";
import NewVehicleDataForm from "@/components/forms/NewVehicleDataForm";
import PersonDataForm from "@/components/forms/PersonDataForm";
import CoafDataForm from "@/components/forms/CoafDataForm";
import DocumentSelector from "@/components/DocumentSelector";
import DataReview from "@/components/DataReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Download, Loader2, FileText, LogOut, ShieldCheck } from "lucide-react";

const steps = ["Dados", "Revisão", "Documentos", "Download"];

const Index = () => {
  const [step, setStep] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>([
    "procuracao_0km", "coaf", "termo_responsabilidade", "procuracao_usado"
  ]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      veiculo: {},
      veiculoNovo: {},
      proprietario: { nacionalidade: "Brasileira" },
      avalista: { nacionalidade: "Brasileira" },
      coaf: { pep: "nao", csnu: "nao", membros: [] },
      data: new Date().toLocaleDateString("pt-BR"),
    },
  });

  const handleExtractedData = (result: ExtractionResult) => {
    Object.entries(result.fields).forEach(([key, value]) => {
      try {
        form.setValue(key as any, value);
      } catch {
        // field path not found, skip
      }
    });

    // Auto-select correct Termo de Responsabilidade variant
    setSelectedDocs((prev) => {
      const without = prev.filter(
        (d) => d !== "termo_responsabilidade" && d !== "termo_responsabilidade_avalista"
      );
      const variant: DocumentType = result.requiresAvalista
        ? "termo_responsabilidade_avalista"
        : "termo_responsabilidade";
      return [...without, variant];
    });
  };

  const generateDocuments = async () => {
    if (selectedDocs.length === 0) {
      toast({ title: "Selecione ao menos um documento", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      for (const docType of selectedDocs) {
        const { data, error } = await supabase.functions.invoke("generate-pdf", {
          body: { type: docType, data: form.getValues() },
        });

        if (error) throw error;

        // data is base64 PDF
        if (data?.pdf) {
          const byteCharacters = atob(data.pdf);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${docType}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
      toast({ title: "Documentos gerados!", description: `${selectedDocs.length} documento(s) baixado(s).` });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar", description: "Verifique os dados e tente novamente.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b bg-card/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/LOGO_IESA.jpg" alt="BYD IESA Logo" className="h-12 object-contain rounded bg-white p-1" />
            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-300 bg-clip-text text-transparent">Sistema de Documentação Venda Direta BYD</h1>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">BYD IESA</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-primary border-primary/50 shadow-[0_0_10px_rgba(37,99,235,0.2)] hidden sm:flex">Portal Premium</Badge>
            <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} title="Sair com Segurança">
              <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        <StepperIndicator steps={steps} currentStep={step} />

        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className={step === 0 ? 'block' : 'hidden'}>
                <PdfUploader onDataExtracted={handleExtractedData} />
                <PersonDataForm form={form} prefix="proprietario" title="Comprador / Avalista" />
                <NewVehicleDataForm form={form} />
                <PersonDataForm form={form} prefix="avalista" title="Proprietário do Usado" />
                <VehicleDataForm form={form} />
                <CoafDataForm form={form} />
                <div className="max-w-xs pt-4">
                  <Label htmlFor="data">Data do Documento</Label>
                  <Input
                    id="data"
                    value={form.watch("data") ?? ""}
                    onChange={(e) => form.setValue("data", e.target.value)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
            </div>

            <div className={step === 1 ? 'block' : 'hidden'}>
              <DataReview selectedDocs={selectedDocs} />
            </div>

            <div className={step === 2 ? 'block' : 'hidden'}>
              <DocumentSelector selected={selectedDocs} onChange={setSelectedDocs} />
            </div>

            <div className={step === 3 ? 'block' : 'hidden'}>
              <div className="text-center space-y-6 py-12">
                <Download className="h-16 w-16 mx-auto text-primary" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Pronto para gerar!</h2>
                  <p className="text-muted-foreground">
                    {selectedDocs.length} documento(s) selecionado(s). Clique abaixo para gerar e baixar.
                  </p>
                </div>
                <Button size="lg" onClick={generateDocuments} disabled={generating}>
                  {generating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                  <span>{generating ? "Gerando..." : "Gerar e Baixar PDFs"}</span>
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> <span>Voltar</span>
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep((s) => s + 1)} 
                className={step < 3 ? 'inline-flex' : 'hidden'}
              >
                <span>Avançar</span> <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </FormProvider>
      </main>

      <footer className="mt-8 border-t bg-card/60 backdrop-blur py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-background to-blue-900/10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <p className="text-sm font-medium text-foreground tracking-wide">
            Desenvolvido por <span className="text-primary font-bold">Jussie Nascimento</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest bg-gradient-to-r from-muted-foreground to-primary bg-clip-text text-transparent">
            Executivo de Vendas Diretas BYD IESA
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-4 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
