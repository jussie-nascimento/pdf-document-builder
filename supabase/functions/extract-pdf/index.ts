import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DocKind = "veiculo" | "pedido_vendas" | "nota_fiscal_byd" | "proposta_nbs" | "outro";

function detectDocKind(text: string, mode?: string): DocKind {
  const t = text.toUpperCase();

  // DANFE is absolute priority
  if (
    t.includes("DANFE") ||
    t.includes("DOCUMENTO AUXILIAR DA NOTA FISCAL") ||
    t.includes("CHAVE DE ACESSO") ||
    t.includes("NATUREZA DA OPERA") ||
    t.includes("PROTOCOLO DE AUTORIZA")
  ) {
    return "nota_fiscal_byd";
  }

  // CRLV / Avaliação de Veículo Usado / Laudo de Troca
  if (
    t.includes("CRLV") ||
    t.includes("CRV") ||
    t.includes("CERTIFICADO DE REGISTRO") ||
    t.includes("LICENCIAMENTO") ||
    t.includes("LAUDO DE AVALIA") ||
    t.includes("AVALIAÇÃO DE VEÍCULO") ||
    t.includes("AVALIACAO DE VEICULO") ||
    t.includes("VEÍCULO AVALIADO") ||
    t.includes("VEICULO AVALIADO") ||
    t.includes("VALOR DA AVALIA")
  ) {
    return "veiculo";
  }

  // NBS Proposal — check markers or fallback if mode === 'varejo_nbs'
  if (
    t.includes("PROPOSTA NBS") ||
    t.includes("PROPOSTA DE VENDA") ||
    t.includes("COD. FINAME") ||
    t.includes("COD FINAME") ||
    t.includes("COR INTERNA") ||
    (t.includes("CLIENTE:") && t.includes("VEICULO:")) ||
    (t.includes("N° MOTOR") && t.includes("RENAVAM")) ||
    (t.includes("PATIO") && t.includes("N° MOTOR")) ||
    (t.includes("PATÍO") && t.includes("RENAVAM")) ||
    (t.includes("NCM") && t.includes("COR INTERNA")) ||
    mode === "varejo_nbs"
  ) {
    return "proposta_nbs";
  }

  if (
    t.includes("PEDIDO DE VENDAS DIRETAS") ||
    t.includes("PEDIDO DE VENDA DIRETA") ||
    t.includes("VENDAS DIRETAS") ||
    t.includes("PEDIDO DE VENDA")
  ) {
    return "pedido_vendas";
  }

  if (
    t.includes("BYD") &&
    (t.includes("NOTA FISCAL") || t.includes("NF-E") || t.includes("NFE"))
  ) {
    return "nota_fiscal_byd";
  }

  return "outro";
}

/** First non-empty match group from a list of regexes. */
function firstMatch(text: string, regexes: RegExp[]): string | undefined {
  for (const r of regexes) {
    const m = text.match(r);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return undefined;
}

/** Normalize multi-space/whitespace into single spaces (keeping line breaks). */
function normalizeSpaces(s: string): string {
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n");
}

/**
 * Parse the BYD DANFE invoice. DANFEs have very recognizable patterns:
 *  - Chassi: 17-char VIN (commonly preceded by "CHASSI")
 *  - Modelo/descrição do produto: line containing "BYD" + model name
 *  - Cor: "COR:" or after the model description
 *  - Valor: "VALOR TOTAL DA NOTA" or "VALOR TOTAL DOS PRODUTOS"
 *  - Nº NF: "Nº" near "DANFE"
 */
function extractBydInvoice(rawText: string): Record<string, string> {
  const text = normalizeSpaces(rawText);
  const fields: Record<string, string> = { "veiculoNovo.marca": "BYD" };

  // CHASSI — 17 alphanumeric (no I/O/Q in real VINs but be permissive)
  const chassi =
    firstMatch(text, [
      /CHASSI[\s:#]*([A-HJ-NPR-Z0-9]{17})/i,
      /\b([A-HJ-NPR-Z0-9]{17})\b/,
    ]);
  if (chassi) fields["veiculoNovo.chassi"] = chassi.toUpperCase();

  // MODELO — look for BYD followed by model words (DOLPHIN, SONG PLUS, YUAN PLUS, KING, SEAL, HAN, TAN, etc.) or MINI DOLPHIN
  const modelo = firstMatch(text, [
    // Matches explicit BYD models directly avoiding any headers
    /\b((?:DOLPHIN|SONG|YUAN|KING|SEAL|HAN|TAN|BYD)[\sA-Z0-9\-\.\/]{0,30}?)(?=\s+(?:PRETA|PRETO|BRANCA|BRANCO|PRATA|AZUL|VERMELHA|VERMELHO|CINZA|VERDE|AMARELA|AMARELO|MARROM|BEGE|DOURADA|DOURADO|COR\b))/i,
    // Skips standard DANFE table headers and product codes
    /Al\.?\s*IPI\s+(?:[A-Z0-9\-]{5,15})\s+([A-Z0-9\s\-\.\/]{3,50}?)(?=\s+(?:PRETA|PRETO|BRANCA|BRANCO|PRATA|AZUL|VERMELHA|VERMELHO|CINZA|VERDE|AMARELA|AMARELO|MARROM|BEGE|DOURADA|DOURADO|COR\b))/i,
    // Original fallback with constraints
    /DESCRI[ÇC][ÃA]O\s+DO(?:S)?\s+PRODUTO(?:S)?\/SERVI[ÇC]O(?:S)?[\s\S]{0,250}?(?:AL[ÍI]QUOTAS?)?[\s\S]{0,100}?\b([A-Z0-9\s\-\.\/]{5,100}?)(?=\s+(?:PRETA|PRETO|BRANCA|BRANCO|PRATA|AZUL|VERMELHA|VERMELHO|CINZA|VERDE|AMARELA|AMARELO|MARROM|BEGE|DOURADA|DOURADO|COR\b))/i,
    /MODELO[\s:]*([A-Z0-9][A-Z0-9\s\-\.\/]{2,40})/i,
    /DESCRI[ÇC][ÃA]O[\s\S]{0,80}?(BYD\s+[A-Z0-9][A-Z0-9\s\-\.\/]{2,40})/i,
  ]);
  if (modelo) fields["veiculoNovo.modelo"] = modelo.replace(/\s+/g, " ").trim();

  // COR — explicit "COR:" or one of the common car colors
  const cor =
    firstMatch(text, [
      /\bCOR[\s:]+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{2,25}?)(?=\s*(?:CHASSI|ANO|R\$|\d{17}|$))/i,
    ]) ||
    firstMatch(text, [
      /\b(PRETO|BRANCO|PRATA|AZUL|VERMELHO|CINZA|VERDE|AMARELO|MARROM|BEGE|DOURADO)(?:\s+[A-ZÀ-Úa-zà-ú]+)?/i,
    ]);
  if (cor) fields["veiculoNovo.cor"] = cor.trim();

  // ANO FAB / ANO MOD — pattern "AAAA/AAAA" common in invoices
  const anoMatch = text.match(/\b(20\d{2})\s*\/\s*(20\d{2})\b/);
  if (anoMatch) {
    fields["veiculoNovo.anoFabricacao"] = anoMatch[1];
    fields["veiculoNovo.anoModelo"] = anoMatch[2];
  } else {
    const fab = firstMatch(text, [/ANO[\s\/]*FAB(?:RICA[ÇC][ÃA]O)?[\s:]*?(20\d{2})/i]);
    const mod = firstMatch(text, [/ANO[\s\/]*MOD(?:ELO)?[\s:]*?(20\d{2})/i]);
    if (fab) fields["veiculoNovo.anoFabricacao"] = fab;
    if (mod) fields["veiculoNovo.anoModelo"] = mod;
  }

  // VALOR — prefer "VALOR TOTAL DA NOTA" ou "VALOR TOTAL DA NF"
  // Permite pular "0,00" de outras colunas exigindo pelo menos 1.000,00 (+4 dígitos ou separador de milhar)
  const valor = firstMatch(text, [
    /VALOR\s+TOTAL\s+DA\s+NF(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i,
    /VALOR\s+TOTAL\s+DA\s+NOTA(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i,
    /VALOR\s+TOTAL\s+DOS?\s+PRODUTOS?(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i,
    /V\.?\s*TOTAL\s+DA\s+NOTA(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i,
    // fallback
    /VALOR\s+TOTAL\s+DA\s+NF[\s:]*R?\$?\s*([\d\.\,]+)/i,
    /VALOR\s+TOTAL\s+DA\s+NOTA[\s:]*R?\$?\s*([\d\.\,]+)/i,
    /VALOR\s+TOTAL\s+DOS?\s+PRODUTOS?[\s:]*R?\$?\s*([\d\.\,]+)/i,
    /V\.?\s*TOTAL\s+DA\s+NOTA[\s:]*R?\$?\s*([\d\.\,]+)/i,
  ]);
  if (valor) fields["veiculoNovo.valorVenda"] = valor;

  // Número da NF
  const numero = firstMatch(text, [
    /N[ºo°]\.?\s*(\d{3}\.?\d{3}\.?\d{3})/i,
    /N[ºo°]\s*[:\-]?\s*(\d{6,9})\b/,
    /(?:N\.|N\s+)\s*(0*\d{5,9})/i,
    /NF[\-\s]*e?\s*N[ºo°]?[:\s]*(\d{4,9})/i,
  ]);
  if (numero) fields["veiculoNovo.numeroNotaFiscal"] = numero;

  return fields;
}

/**
 * Extract data from a NBS Proposal PDF.
 *
 * Maps to exactly the same form fields as Venda Direta:
 *   COMPRADOR → proprietario.nome, cpfCnpj, endereco (combined: End, Bairro, Cidade/UF, CEP), telefone, email
 *   VEÍCULO NOVO → veiculoNovo.marca (BYD), modelo, chassi, cor, anoFabricacao, anoModelo, valorVenda
 */
function extractNbsProposal(rawText: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // 1. Split sections: Client vs Vehicle
  const veiculoIdx = rawText.search(/Ve[íi]culo\s*:/i);
  const clienteSection = veiculoIdx !== -1 ? rawText.slice(0, veiculoIdx) : rawText;
  const veiculoSection = veiculoIdx !== -1 ? rawText.slice(veiculoIdx) : rawText;

  // 2. Cliente Name
  const nomeMatch = clienteSection.match(/Cliente\s*:\s*(.+?)(?=\s{2,}|CNPJ|CPF|End\.|Fone|CEP|[\r\n]|$)/i);
  if (nomeMatch && nomeMatch[1].trim()) {
    fields["proprietario.nome"] = nomeMatch[1].trim();
  } else {
    const nomeFallback = firstMatch(clienteSection, [
      /(?:Nome[\\/\s]Raz[ãa]o\s*Social|Nome\s*do\s*Cliente|Nome)[:\s]+(.+?)(?=\s{2,}|CNPJ|CPF|End\.|Fone|CEP|[\r\n]|$)/i,
    ]);
    if (nomeFallback) fields["proprietario.nome"] = nomeFallback.trim();
  }

  // 3. CPF / CNPJ
  const cnpjMatch = clienteSection.match(/(?:CNPJ|CPF)\s*:\s*([\d\.\-\/]+)/i);
  if (cnpjMatch) fields["proprietario.cpfCnpj"] = cnpjMatch[1].trim();

  // 4. Endereço (logradouro/número/complemento)
  const endMatch = clienteSection.match(/End\.?\s*:\s*(.+?)(?=\s{2,}|Fone|Bairro|CEP|Cidade|[\r\n]|$)/i);
  const endPart = endMatch ? endMatch[1].trim() : "";

  // Bairro
  const bairroMatch = clienteSection.match(/Bairro\s*:\s*(.+?)(?=\s{2,}|Fone|Cidade|CEP|UF|IE|[\r\n]|$)/i);
  const bairroPart = bairroMatch ? bairroMatch[1].trim() : "";

  // Cidade / UF
  const cidadeUfMatch = clienteSection.match(/Cidade\s*[\/\-]?\s*UF\s*:\s*([A-ZÀ-Úa-zà-ú\s]+?)\s*[\/\-]\s*([A-Z]{2})\b/i);
  const cidadePart = cidadeUfMatch ? cidadeUfMatch[1].trim() : "";
  const ufPart = cidadeUfMatch ? cidadeUfMatch[2].trim() : "";

  // CEP
  const cepMatch = clienteSection.match(/CEP\s*:\s*([\d]{5}\-?[\d]{3}|\d{8})/i);
  const cepPart = cepMatch ? cepMatch[1].trim() : "";

  // Combine Endereço Completo: End + Bairro + Cidade/UF + CEP
  const addressParts: string[] = [];
  if (endPart) addressParts.push(endPart);
  if (bairroPart) addressParts.push(bairroPart);
  if (cidadePart && ufPart) addressParts.push(`${cidadePart}/${ufPart}`);
  else if (cidadePart) addressParts.push(cidadePart);
  if (cepPart) addressParts.push(`CEP: ${cepPart}`);
  if (addressParts.length > 0) fields["proprietario.endereco"] = addressParts.join(", ");

  // Telefone — preferir Fone Cel; fallback para Fone Res ou Fone Com
  const foneCel = firstMatch(text, [
    /Fone\s*Cel[:\s]+([\d\s\(\)\-\+]{7,20})/i,
    /Celular[:\s]+([\d\s\(\)\-\+]{7,20})/i,
  ]);
  const foneRes = firstMatch(text, [
    /Fone\s*Res[:\s]+([\d\s\(\)\-\+]{7,20})/i,
  ]);
  // Telefone
  const foneCel = clienteSection.match(/Fone\s*Cel\s*:\s*([\d\s\(\)\-\+]{7,20})/i);
  const foneRes = clienteSection.match(/Fone\s*Res\s*:\s*([\d\s\(\)\-\+]{7,20})/i);
  const foneCom = clienteSection.match(/Fone\s*Com\s*:\s*([\d\s\(\)\-\+]{7,20})/i);
  const telefone = (foneCel || foneRes || foneCom)?.[1]?.trim();
  if (telefone) fields["proprietario.telefone"] = telefone;

  // E-mail DO CLIENTE (search after "Cliente:")
  const clienteOnlyIdx = clienteSection.search(/Cliente\s*:/i);
  const clienteSubText = clienteOnlyIdx !== -1 ? clienteSection.slice(clienteOnlyIdx) : clienteSection;
  const emailMatch = clienteSubText.match(/E-?mail\s*:\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) fields["proprietario.email"] = emailMatch[1].trim();

  // ── VEÍCULO NOVO (aba Veículo) ────────────────────────────────────────────
  fields["veiculoNovo.marca"] = "BYD";

  // Veiculo Modelo
  const modeloMatch = veiculoSection.match(/Ve[íi]culo\s*:\s*(.+?)(?=\s{2,}|Chassi|Ano|Cor|NCM|Motor|[\r\n]|$)/i);
  if (modeloMatch) fields["veiculoNovo.modelo"] = modeloMatch[1].trim();

  // Chassi
  const chassiMatch = veiculoSection.match(/Chassi\s*:\s*([A-Z0-9]{17})\b/i) || rawText.match(/Chassi\s*:\s*([A-Z0-9]{17})\b/i);
  if (chassiMatch) fields["veiculoNovo.chassi"] = chassiMatch[1].toUpperCase();

  // Cor (exterior — must match "Cor:" with colon, not "Cor Interna:")
  const corMatch = veiculoSection.match(/\bCor\s*:\s*([A-ZÀ-Úa-zà-ú]{3,20})/i);
  if (corMatch) fields["veiculoNovo.cor"] = corMatch[1].trim();

  // Ano Fab / Mod
  const anoMatch = veiculoSection.match(/Ano\s*[\/\-]\s*Modelo\s*:\s*(\d{2,4})\s*[\/\-]\s*(\d{2,4})/i) || rawText.match(/Ano\s*[\/\-]\s*Modelo\s*:\s*(\d{2,4})\s*[\/\-]\s*(\d{2,4})/i);
  if (anoMatch) {
    fields["veiculoNovo.anoFabricacao"] = anoMatch[1].length === 2 ? `20${anoMatch[1]}` : anoMatch[1];
    fields["veiculoNovo.anoModelo"]     = anoMatch[2].length === 2 ? `20${anoMatch[2]}` : anoMatch[2];
  }

  // Valor Nota Fiscal / Valor de Venda
  const valorMatch = rawText.match(/Valor\s+Nota\s+Fiscal[\s\S]{0,40}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})*[\.\,]\d{2})/i) || rawText.match(/Valor\s+(?:Nota\s+Fiscal|de\s+Venda|Venda)[:\s]*(?:R\$)?\s*([\d\.\,]+)/i);
  if (valorMatch) fields["veiculoNovo.valorVenda"] = valorMatch[1].trim();

  // ── COAF auto-fill ────────────────────────────────────────────────────────
  if (fields["proprietario.nome"])    fields["coaf.nomeRazaoSocial"] = fields["proprietario.nome"];
  if (fields["proprietario.cpfCnpj"]) fields["coaf.cpfCnpj"]        = fields["proprietario.cpfCnpj"];

  return fields;
}

/** Generic extraction for CRLV/Pedido de Vendas/etc. */
function extractGeneric(rawText: string): Record<string, string> {
  const text = normalizeSpaces(rawText);
  const fields: Record<string, string> = {};

  const patterns: Array<[string, RegExp[]]> = [
    ["proprietario.nome", [
      /Nome do cliente\s+(.+?)\s+(?:Telefone|Pa[íi]s|CPF\/CNPJ|E-mail|CEP|Endere[çc]o)/i,
      /(?:nome\/raz[ãa]o social|comprador|cliente|adquirente|nome|NOME|Nome)[:\s]+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+){1,7})/i
    ]],
    [
      "proprietario.cpfCnpj",
      [
        /CPF\/CNPJ\s+([\d\.\-\/]+)(?:\s+E-Mail|\s+CEP|\s+Cidade|\s+$)/i,
        /(?:CPF|CNPJ|cpf|cnpj)[\/:\s]*(\d{2,3}\.?\d{3}\.?\d{3}[\/\.]?\d{0,4}\-?\d{2})/i,
        /\b(\d{3}\.\d{3}\.\d{3}\-\d{2})\b/,
        /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})\b/,
      ],
    ],
    ["proprietario.endereco", [/(?:endere[çc]o|logradouro|ENDERE[ÇC]O)[:\s]+(.{8,80}?)(?=\n|CEP|BAIRRO|NUMERO|NÚMERO|NO\.)/i]],
    ["proprietario.bairro", [/(?:bairro|BAIRRO)[:\s]+([A-ZÀ-Úa-zà-ú\s]{3,30}?)(?=\n|CEP|CIDADE|MUNIC[ÍI]PIO|UF|ESTADO)/i]],
    ["proprietario.cidade", [
      /Cidade\s+([A-ZÀ-Úa-zà-ú\s]{3,30}?)\s+Endere[çc]o/i,
      /(?:cidade|munic[íi]pio)[:\s]+([A-ZÀ-Úa-zà-ú\s]{3,30}?)(?=\n|\/|UF|ESTADO)/i
    ]],
    ["proprietario.estado", [
      /Estado\s+([A-ZÀ-Úa-zà-ú\s]{2,30}?)\s+(?:CPF\/CNPJ|Pa[íi]s)/i,
      /(?:UF|estado|uf|ESTADO)[:\s]+([A-Z]{2})\b/i
    ]],
    ["proprietario.cep", [
      /CEP\s+(\d{5}\-?\d{3})/i,
      /CEP[:\s]+(\d{5}\-?\d{3})/i
    ]],
    ["proprietario.telefone", [
      /Telefone\s+([+0-9\-\(\)\s]+?)\s+(?:Pa[íi]s|Estado|CPF)/i,
      /(?:telefone|celular|fone)[:\s]+([\(\s]?\d{2}[\)\s]?\s*\d{4,5}[\-\s]?\d{4})/i
    ]],
    ["proprietario.email", [
      /E-Mail\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
      /(?:e[\-\s]?mail|E[\-\s]?MAIL)[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i
    ]],
    ["veiculo.placa", [/(?:placa|PLACA)[:\s]+([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})/i]],
    ["veiculo.marca", [/(?:marca|MARCA)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s\/\-]{1,20}?)(?=\n|MODELO|ANO|PLACA)/i]],
    ["veiculo.modelo", [
      /\b(?:modelo|MODELO)[:\s]+([A-Z0-9][A-Z0-9\s\.\-\/]{1,50}?)(?=$|[\n\r]|\s{2,}|CHASSI|ANO|PLACA|COR|MARCA|VALOR|KM|QUILO|VERS[AÃ]O|RENAVAM|DATA|M[ÊE]S)/i,
      /\b(?:ve[íi]culo avaliado|ve[íi]culo da troca|marca\/modelo|autom[oó]vel|descri[çc][ãa]o)[:\s]+([A-Z0-9][A-Z0-9\s\.\-\/]{1,50}?)(?=$|[\n\r]|\s{2,}|CHASSI|ANO|PLACA|COR|MARCA|VALOR|KM|QUILO|VERS[AÃ]O|RENAVAM|DATA|M[ÊE]S)/i,
      /\b(?:ve[íi]culo|VE[ÍI]CULO)[:\s]+([A-Z0-9][A-Z0-9\s\.\-\/]{1,50}?)(?=$|[\n\r]|\s{2,}|CHASSI|ANO|PLACA|COR|MARCA|VALOR|KM|QUILO|VERS[AÃ]O|RENAVAM|DATA|M[ÊE]S)/i,
    ]],
    ["veiculo.chassi", [/(?:chassi|CHASSI)[:\s]+([A-HJ-NPR-Z0-9]{17})/i]],
    ["veiculo.renavam", [/(?:renavam|RENAVAM)[:\s]+(\d{9,11})/i]],
    ["veiculo.cor", [/(?:cor|COR)[:\s]+([A-ZÀ-Úa-zà-ú]{3,20})/i]],
    ["veiculo.anoFabricacao", [/ANO[\s\/]*FAB(?:RICA[ÇC][ÃA]O)?[\s:]*(\d{4})/i]],
    ["veiculo.anoModelo", [/ANO[\s\/]*MOD(?:ELO)?[\s:]*(\d{4})/i]],
    ["veiculo.km", [/(?:km|quilometragem|quilo|QUILO|KM)[:\s]+([\d\.\,]{1,10})/i]],
    ["veiculo.valorAvaliacao", [/(?:valor da avalia[çc][ãa]o|avalia[çc][ãa]o|valor estimado|valor)[:\s.]*(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})*[\.\,]\d{2})/i, /R\$\s*([\d]{1,3}(?:[\.\,]\d{3})*[\.\,]\d{2})/i]],
  ];

  for (const [name, regexes] of patterns) {
    const v = firstMatch(text, regexes);
    if (v) fields[name] = v.replace(/\n/g, " ").trim();
  }

  // Address split logic "R INACIO FELISBERTO MAGNUS,111,QUADRAD01 LOTE 6,CENTENARIO,Torres-Rio Grande do Sul,95560-000"
  const enderecoCompletoMatch = text.match(/Endere[çc]o completo\s+([\s\S]+?)(?=\s+Classifica[çc][ãa]o|\s+INFORMA[ÇC][ÕO]ES)/i);
  if (enderecoCompletoMatch && enderecoCompletoMatch[1]) {
    const fullAddress = enderecoCompletoMatch[1].replace(/\n/g, " ").trim();
    if (!fields["proprietario.endereco"]) fields["proprietario.endereco"] = fullAddress;
  }

  // Fallback para Ano na forma: "Ano: 2018/2019" ou "2018 / 2019"
  if (!fields["veiculo.anoFabricacao"] || !fields["veiculo.anoModelo"]) {
    const anoMatch = text.match(/(?:ano|ANO|Ano)[\s\w:]*(\d{4})\s*[\/\-]\s*(\d{4})/);
    if (anoMatch) {
      if (!fields["veiculo.anoFabricacao"]) fields["veiculo.anoFabricacao"] = anoMatch[1];
      if (!fields["veiculo.anoModelo"]) fields["veiculo.anoModelo"] = anoMatch[2];
    }
  }

  // Remove redundant explicit prefix captured incorrectly due to unpdf layout flattening
  if (fields["proprietario.nome"]) {
    fields["proprietario.nome"] = fields["proprietario.nome"]
      .replace(/^Nome[:\-\s]+/i, "")
      .replace(/\s+[eE][\s\-\:\.]*$/i, "")
      .trim();
  }

  return fields;
}

async function pdfToText(pdfBytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(pdfBytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  } catch (e) {
    console.error("unpdf failed, falling back to raw decode:", e);
    return new TextDecoder("latin1").decode(pdfBytes);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdf, mode } = await req.json();
    if (!pdf || typeof pdf !== "string") {
      return new Response(JSON.stringify({ error: "PDF base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
    const text = await pdfToText(pdfBytes);
    const docKind = detectDocKind(text, mode);

    console.log(`[extract-pdf] kind=${docKind}, length=${text.length}`);

    let fields: Record<string, string>;
    if (docKind === "nota_fiscal_byd") {
      fields = extractBydInvoice(text);
    } else if (docKind === "proposta_nbs") {
      fields = extractNbsProposal(text);
    } else {
      fields = extractGeneric(text);
    }

    let personName = fields["proprietario.nome"] || "";
    if (docKind === "pedido_vendas") {
      const buyerMatch =
        text.match(/(?:comprador|cliente|adquirente)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,40})/i) ||
        text.match(/(?:nome|NOME)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,40})/);
      if (buyerMatch && buyerMatch[1]) personName = buyerMatch[1].trim();
    }

    return new Response(
      JSON.stringify({ fields, documentKind: docKind, personName, rawText: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting PDF:", error);
    return new Response(JSON.stringify({ error: "Failed to extract PDF data" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
