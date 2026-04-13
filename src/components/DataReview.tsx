import { FormData, DocumentType, documentLabels } from "@/types/document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface Props {
  data: FormData;
  selectedDocs: DocumentType[];
}

const Section = ({ title, items }: { title: string; items: [string, string | undefined][] }) => {
  const filled = items.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filled.map(([label, value]) => (
          <div key={label} className="text-sm">
            <span className="text-muted-foreground">{label}: </span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DataReview = ({ data, selectedDocs }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5" />
          Revisão dos Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section
          title="Veículo"
          items={[
            ["Placa", data.veiculo.placa],
            ["Marca", data.veiculo.marca],
            ["Modelo", data.veiculo.modelo],
            ["Chassi", data.veiculo.chassi],
            ["RENAVAM", data.veiculo.renavam],
            ["Ano Fab.", data.veiculo.anoFabricacao],
            ["Ano Mod.", data.veiculo.anoModelo],
            ["Cor", data.veiculo.cor],
            ["KM", data.veiculo.km],
            ["Valor Avaliação", data.veiculo.valorAvaliacao],
            ["Valor Venda", data.veiculo.valorVenda],
          ]}
        />
        <Section
          title="Proprietário / Outorgante"
          items={[
            ["Nome", data.proprietario.nome],
            ["CPF/CNPJ", data.proprietario.cpfCnpj],
            ["RG", data.proprietario.rg],
            ["Endereço", data.proprietario.endereco],
            ["Bairro", data.proprietario.bairro],
            ["Cidade", data.proprietario.cidade],
            ["Estado", data.proprietario.estado],
            ["CEP", data.proprietario.cep],
            ["Nacionalidade", data.proprietario.nacionalidade],
            ["Estado Civil", data.proprietario.estadoCivil],
            ["Profissão", data.proprietario.profissao],
          ]}
        />
        <Section
          title="Avalista"
          items={[
            ["Nome", data.avalista.nome],
            ["CPF/CNPJ", data.avalista.cpfCnpj],
            ["RG", data.avalista.rg],
            ["Endereço", data.avalista.endereco],
            ["Cidade", data.avalista.cidade],
            ["Estado", data.avalista.estado],
          ]}
        />
        {data.coaf.nomeRazaoSocial && (
          <Section
            title="COAF"
            items={[
              ["Nome/Razão Social", data.coaf.nomeRazaoSocial],
              ["CPF/CNPJ", data.coaf.cpfCnpj],
              ["PEP", data.coaf.pep === "sim" ? "Sim" : "Não"],
              ["CSNU", data.coaf.csnu === "sim" ? "Sim" : "Não"],
              ["Cidade", data.coaf.cidade],
            ]}
          />
        )}

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Documentos Selecionados</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDocs.map((doc) => (
              <Badge key={doc} variant="secondary">{documentLabels[doc]}</Badge>
            ))}
          </div>
        </div>

        {data.data && (
          <div className="text-sm">
            <span className="text-muted-foreground">Data: </span>
            <span className="font-medium">{data.data}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataReview;
