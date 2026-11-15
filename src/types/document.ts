import { z } from "zod";

export const vehicleSchema = z.object({
  placa: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  marcaModelo: z.string().optional(),
  ano: z.string().optional(),
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
  placa: z.string().optional(),
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
  nacionalidade: z.string().optional(),
  estadoCivil: z.string().optional(),
  profissao: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
});

// NOVO MODELO 2026 — Concessionária recebedora (editável, antes era TRINITA fixa)
export const concessionariaSchema = z.object({
  razaoSocial: z.string().optional(),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  cidadeUf: z.string().optional(),
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
  // CLIENTE/ADQUIRENTE (comprador do 0km)
  proprietario: personSchema.default({}),
  // PROPRIETÁRIO DO USADO (só quando distinto do cliente — antigo "avalista")
  avalista: personSchema.default({}),
  concessionaria: concessionariaSchema.default({
    razaoSocial: "TRINITA VEÍCULOS LTDA",
    cnpj: "11.475.046/0001-83",
    endereco: "Rua Edu Chaves, 390 São João – CEP 90240-620",
    cidadeUf: "Porto Alegre / RS",
  }),
  coaf: coafSchema.default({ pep: "nao", csnu: "nao", membros: [] }),
  local: z.string().optional(),
  data: z.string().optional(),
});

export type VehicleData = z.infer<typeof vehicleSchema>;
export type NewVehicleData = z.infer<typeof newVehicleSchema>;
export type PersonData = z.infer<typeof personSchema>;
export type ConcessionariaData = z.infer<typeof concessionariaSchema>;
export type CoafMember = z.infer<typeof coafMemberSchema>;
export type CoafData = z.infer<typeof coafSchema>;
export type FormData = z.infer<typeof formSchema>;

export type DocumentType =
  | "termo_responsabilidade"
  | "termo_responsabilidade_avalista"
  | "procuracao_usado"
  | "procuracao_0km"
  | "procuracao_0km_emplacado"
  | "coaf"
  | "comprovante_residencia_detran";

export const documentLabels: Record<DocumentType, string> = {
  termo_responsabilidade: "Termo Dação 2026 (Cliente = Proprietário)",
  termo_responsabilidade_avalista: "Termo Dação 2026 (Cliente + Proprietário distinto)",
  procuracao_usado: "Procuração Veículo Usado",
  procuracao_0km: "Procuração 0KM",
  procuracao_0km_emplacado: "Procuração 0KM Emplacado",
  coaf: "COAF - Autodeclaração",
  comprovante_residencia_detran: "Comprovante de Residência DETRAN",
};
