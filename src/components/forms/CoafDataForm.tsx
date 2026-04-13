import { UseFormReturn, useFieldArray } from "react-hook-form";
import { FormData } from "@/types/document";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Plus, Trash2 } from "lucide-react";

interface Props {
  form: UseFormReturn<FormData>;
}

const CoafDataForm = ({ form }: Props) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coaf.membros",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          COAF - Autodeclaração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="coaf.nomeRazaoSocial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome / Razão Social</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coaf.cpfCnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF/CNPJ</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="coaf.pep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pessoa Exposta Politicamente (PEP)?</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="sim" id="pep-sim" />
                      <Label htmlFor="pep-sim">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="nao" id="pep-nao" />
                      <Label htmlFor="pep-nao">Não</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coaf.csnu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resolução CSNU 1267?</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="sim" id="csnu-sim" />
                      <Label htmlFor="csnu-sim">Sim</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="nao" id="csnu-nao" />
                      <Label htmlFor="csnu-nao">Não</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="coaf.cidade"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
            </FormItem>
          )}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Quadro Administrativo / Societário</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nome: "", cpf: "", percentualCapital: "", poderes: "", pep: false, beneficiarioFinal: false })}
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          {fields.map((member, index) => (
            <div key={member.id} className="border rounded-md p-4 mb-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Membro {index + 1}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField control={form.control} name={`coaf.membros.${index}.nome`} render={({ field }) => (
                  <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`coaf.membros.${index}.cpf`} render={({ field }) => (
                  <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`coaf.membros.${index}.percentualCapital`} render={({ field }) => (
                  <FormItem><FormLabel>% Capital</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name={`coaf.membros.${index}.poderes`} render={({ field }) => (
                  <FormItem><FormLabel>Poderes</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
              </div>
              <div className="flex gap-6">
                <FormField control={form.control} name={`coaf.membros.${index}.pep`} render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">PEP</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name={`coaf.membros.${index}.beneficiarioFinal`} render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="!mt-0">Beneficiário Final</FormLabel>
                  </FormItem>
                )} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CoafDataForm;
