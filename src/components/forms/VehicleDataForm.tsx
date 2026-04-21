import { UseFormReturn } from "react-hook-form";
import { FormData } from "@/types/document";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";

interface Props {
  form: UseFormReturn<FormData>;
}

const VehicleDataForm = ({ form }: Props) => {
  const fields = [
    { name: "veiculo.placa" as const, label: "Placa" },
    { name: "veiculo.marca" as const, label: "Marca" },
    { name: "veiculo.modelo" as const, label: "Modelo" },
    { name: "veiculo.chassi" as const, label: "Chassi" },
    { name: "veiculo.renavam" as const, label: "RENAVAM" },
    { name: "veiculo.anoFabricacao" as const, label: "Ano Fabricação" },
    { name: "veiculo.anoModelo" as const, label: "Ano Modelo" },
    { name: "veiculo.cor" as const, label: "Cor" },
    { name: "veiculo.km" as const, label: "Quilometragem" },
    { name: "veiculo.valorAvaliacao" as const, label: "Valor de Avaliação (R$)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="h-5 w-5" />
          Dados do Veículo Usado (Troca)
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

export default VehicleDataForm;
