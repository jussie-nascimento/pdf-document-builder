import { UseFormReturn } from "react-hook-form";
import { FormData } from "@/types/document";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Props {
  form: UseFormReturn<FormData>;
}

const NewVehicleDataForm = ({ form }: Props) => {
  const fields = [
    { name: "veiculoNovo.marca" as const, label: "Marca" },
    { name: "veiculoNovo.modelo" as const, label: "Modelo" },
    { name: "veiculoNovo.chassi" as const, label: "Chassi" },
    { name: "veiculoNovo.cor" as const, label: "Cor" },
    { name: "veiculoNovo.anoFabricacao" as const, label: "Ano Fabricação" },
    { name: "veiculoNovo.anoModelo" as const, label: "Ano Modelo" },
    { name: "veiculoNovo.valorVenda" as const, label: "Valor de Venda (R$)" },
    { name: "veiculoNovo.numeroNotaFiscal" as const, label: "Nº Nota Fiscal" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          Dados do Veículo Novo (BYD - Nota Fiscal)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewVehicleDataForm;
