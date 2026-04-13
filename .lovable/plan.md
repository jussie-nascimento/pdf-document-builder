

# Aplicativo de Geração de Documentos - Trinita Veículos

## Análise dos 5 Documentos

Identifiquei **4 templates únicos** (o modelo "Procuração Usado" aparece 2 vezes com dados diferentes):

| # | Documento | Campos variáveis |
|---|-----------|-----------------|
| 1 | **Termo de Responsabilidade** (com avalista) | Dados do veículo (placa, marca, modelo, chassi, RENAVAM, ano, cor, km), dados do proprietário (nome, endereço, cidade, CPF/CNPJ, estado civil, nacionalidade), dados do avalista (mesmos campos), valor de avaliação, data da avaliação, km |
| 2 | **Procuração Veículo Usado** | Nome, CPF/CNPJ, endereço, município do outorgante; dados do veículo (marca, modelo, chassi, cor, ano, placa, RENAVAM); valor de venda; data |
| 3 | **Procuração 0KM** | Nome/razão social, CPF/CNPJ, endereço completo do outorgante; marca/modelo e chassi do veículo; data |
| 4 | **COAF** (Autodeclaração) | Nome/razão social, CPF/CNPJ; opções PEP (sim/não); opções CSNU (sim/não); quadro administrativo (nome, CPF, % capital, poderes, PEP, beneficiário final); cidade, data |

## Fluxo do Aplicativo

```text
┌──────────────┐    ┌──────────────────┐    ┌────────────────┐    ┌──────────────┐
│  Upload PDF  │───▶│ Dados Extraídos  │───▶│ Escolher Docs  │───▶│ Download PDF │
│  + Formulário│    │ + Edição Manual  │    │ para Gerar     │    │              │
└──────────────┘    └──────────────────┘    └────────────────┘    └──────────────┘
```

## Plano de Implementação

### 1. Interface Principal (página única com stepper)
- **Etapa 1 — Entrada de Dados**: Upload de PDF de contrato (opcional) + formulário manual com todos os campos necessários agrupados em seções: Dados do Veículo, Dados do Proprietário/Outorgante, Dados do Avalista, Dados da Empresa (COAF)
- **Etapa 2 — Revisão**: Exibição consolidada de todos os dados, editáveis
- **Etapa 3 — Seleção de Documentos**: Checkboxes para escolher quais dos 4 templates gerar
- **Etapa 4 — Download**: Gerar e baixar cada PDF selecionado

### 2. Extração de Dados do PDF (Edge Function)
- Edge Function que recebe o PDF via upload
- Extrai texto usando biblioteca de parsing
- Retorna os campos identificados (nome, CPF, endereço, dados do veículo, etc.)
- Os dados preenchem automaticamente o formulário

### 3. Geração dos PDFs (Edge Function)
- Edge Function que recebe os dados do formulário + tipo de documento
- Gera o PDF com o layout fiel ao modelo original (logo IESA, textos jurídicos fixos, campos variáveis)
- Retorna o PDF para download
- Cada template tem seu layout codificado no servidor, reproduzindo fielmente a formatação dos modelos enviados

### 4. Componentes React
- `StepperForm` — navegação entre etapas
- `VehicleDataForm` — campos do veículo
- `OwnerDataForm` — campos do proprietário
- `GuarantorDataForm` — campos do avalista
- `CompanyDataForm` — campos da empresa (COAF)
- `DocumentSelector` — seleção dos documentos a gerar
- `DataReview` — revisão final antes da geração

### Detalhes Técnicos
- **Frontend**: React + react-hook-form + zod para validação
- **PDF Upload/Extração**: Supabase Edge Function com pdfplumber (ou pdf-parse)
- **Geração de PDF**: Supabase Edge Function usando jsPDF ou pdf-lib para montar os documentos finais com layout fiel aos modelos
- **Sem banco de dados**: Tudo é processado em tempo real, sem persistência (uso pessoal)
- **Logo IESA**: Embutida nos templates como base64

