import { UseFormReturn, FieldPath } from "react-hook-form";
import { FormData } from "@/types/document";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

interface Props {
  form: UseFormReturn<FormData>;
  prefix: "proprietario" | "avalista";
  title: string;
}

const PersonDataForm = ({ form, prefix, title }: Props) => {
  const fields: { name: FieldPath<FormData>; label: string }[] = [
    { name: `${prefix}.nome`, label: "Nome Completo" },
    { name: `${prefix}.cpfCnpj`, label: "CPF/CNPJ" },
    { name: `${prefix}.rg`, label: "RG" },
    { name: `${prefix}.endereco`, label: "Endereço Completo" },
    { name: `${prefix}.nacionalidade`, label: "Nacionalidade" },
    { name: `${prefix}.estadoCivil`, label: "Estado Civil" },
    { name: `${prefix}.profissao`, label: "Profissão" },
    { name: `${prefix}.telefone`, label: "Telefone" },
    { name: `${prefix}.email`, label: "E-mail" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          {title}
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
                    <Input {...field} value={(field.value as string) ?? ""} />
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

export default PersonDataForm;
