import { z } from "zod";

export const vehicleSchema = z.object({
  placa: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  chassi: z.string().optional(),
  renavam: z.string().optional(),
  anoFabricacao: z.string().optional(),
  anoModelo: z.string().optional(),
  cor: z.string().optional(),
  km: z.string().optional(),
  valorAvaliacao: z.string().optional(),
  valorVenda: z.string().optional(),
});

export const newVehicleSchema = z.object({
  marca: z.string().default("BYD"),
  modelo: z.string().optional(),
  chassi: z.string().optional(),
  cor: z.string().optional(),
  anoFabricacao: z.string().optional(),
  anoModelo: z.string().optional(),
  valorVenda: z.string().optional(),
  numeroNotaFiscal: z.string().optional(),
});

export const personSchema = z.object({
  nome: z.string().optional(),
  cpfCnpj: z.string().optional(),
  rg: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  nacionalidade: z.string().optional(),
  estadoCivil: z.string().optional(),
  profissao: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
});

export const coafMemberSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  percentualCapital: z.string().optional(),
  poderes: z.string().optional(),
  pep: z.boolean().default(false),
  beneficiarioFinal: z.boolean().default(false),
});

export const coafSchema = z.object({
  nomeRazaoSocial: z.string().optional(),
  cpfCnpj: z.string().optional(),
  pep: z.enum(["sim", "nao"]).default("nao"),
  csnu: z.enum(["sim", "nao"]).default("nao"),
  membros: z.array(coafMemberSchema).default([]),
  cidade: z.string().optional(),
});

export const formSchema = z.object({
  veiculo: vehicleSchema.default({}),
  veiculoNovo: newVehicleSchema.default({ marca: "BYD" }),
  proprietario: personSchema.default({}),
  avalista: personSchema.default({}),
  coaf: coafSchema.default({ pep: "nao", csnu: "nao", membros: [] }),
  data: z.string().optional(),
});

export type VehicleData = z.infer<typeof vehicleSchema>;
export type NewVehicleData = z.infer<typeof newVehicleSchema>;
export type PersonData = z.infer<typeof personSchema>;
export type CoafMember = z.infer<typeof coafMemberSchema>;
export type CoafData = z.infer<typeof coafSchema>;
export type FormData = z.infer<typeof formSchema>;

export type DocumentType =
  | "termo_responsabilidade"
  | "termo_responsabilidade_avalista"
  | "procuracao_usado"
  | "procuracao_0km"
  | "coaf";

export const documentLabels: Record<DocumentType, string> = {
  termo_responsabilidade: "Termo de Responsabilidade (Simples)",
  termo_responsabilidade_avalista: "Termo de Responsabilidade com Avalista",
  procuracao_usado: "Procuração Veículo Usado",
  procuracao_0km: "Procuração 0KM",
  coaf: "COAF - Autodeclaração",
};
