import { UseFormReturn } from "react-hook-form";
import { FormData } from "@/types/document";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

interface Props {
  form: UseFormReturn<FormData>;
}

const ConcessionariaDataForm = ({ form }: Props) => {
  const fields = [
    { name: "concessionaria.razaoSocial" as const, label: "Razão Social" },
    { name: "concessionaria.cnpj" as const, label: "CNPJ" },
    { name: "concessionaria.endereco" as const, label: "Endereço" },
    { name: "concessionaria.cidadeUf" as const, label: "Cidade/UF" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Concessionária Recebedora
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

export default ConcessionariaDataForm;
