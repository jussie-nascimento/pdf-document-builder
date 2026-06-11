import { DocumentType, documentLabels } from "@/types/document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface Props {
  selected: DocumentType[];
  onChange: (selected: DocumentType[]) => void;
}

const allDocs: DocumentType[] = [
  "termo_responsabilidade",
  "termo_responsabilidade_avalista",
  "procuracao_usado",
  "procuracao_0km",
  "coaf",
  "comprovante_residencia_detran",
];

const DocumentSelector = ({ selected, onChange }: Props) => {
  const toggle = (doc: DocumentType) => {
    if (selected.includes(doc)) {
      onChange(selected.filter((d) => d !== doc));
    } else {
      onChange([...selected, doc]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Selecione os Documentos para Gerar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allDocs.map((doc) => (
            <div key={doc} className="flex items-center gap-3 p-3 border rounded-md hover:bg-accent/50 transition-colors">
              <Checkbox
                id={doc}
                checked={selected.includes(doc)}
                onCheckedChange={() => toggle(doc)}
              />
              <Label htmlFor={doc} className="cursor-pointer flex-1">
                {documentLabels[doc]}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentSelector;
