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
import { ArrowLeft, ArrowRight, Download, Loader2, FileText } from "lucide-react";

const steps = ["Dados", "Revisão", "Documentos", "Download"];

const Index = () => {
  const [step, setStep] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      veiculo: {},
      proprietario: {},
      avalista: {},
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Gerador de Documentos</h1>
          <span className="text-xs text-muted-foreground ml-2">Trinita Veículos</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <StepperIndicator steps={steps} currentStep={step} />

        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {step === 0 && (
              <>
                <PdfUploader onDataExtracted={handleExtractedData} />
                <VehicleDataForm form={form} />
                <PersonDataForm form={form} prefix="proprietario" title="Proprietário / Outorgante" />
                <PersonDataForm form={form} prefix="avalista" title="Avalista / Fiador" />
                <CoafDataForm form={form} />
                <div className="max-w-xs">
                  <Label htmlFor="data">Data do Documento</Label>
                  <Input
                    id="data"
                    value={form.watch("data") ?? ""}
                    onChange={(e) => form.setValue("data", e.target.value)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <DataReview data={form.getValues()} selectedDocs={selectedDocs} />
            )}

            {step === 2 && (
              <DocumentSelector selected={selectedDocs} onChange={setSelectedDocs} />
            )}

            {step === 3 && (
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
                  {generating ? "Gerando..." : "Gerar e Baixar PDFs"}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              {step < 3 && (
                <Button type="button" onClick={() => setStep((s) => s + 1)}>
                  Avançar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </main>
    </div>
  );
};

export default Index;
