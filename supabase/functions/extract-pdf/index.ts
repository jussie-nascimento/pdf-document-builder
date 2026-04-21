import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DocKind = "veiculo" | "pedido_vendas" | "nota_fiscal_byd" | "outro";

function detectDocKind(text: string): DocKind {
  const t = text.toUpperCase();
  if (
    t.includes("BYD") &&
    (t.includes("DANFE") || t.includes("NOTA FISCAL") || t.includes("NF-E") || t.includes("NFE"))
  ) {
    return "nota_fiscal_byd";
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
    t.includes("CRLV") ||
    t.includes("CRV") ||
    t.includes("CERTIFICADO DE REGISTRO") ||
    t.includes("LICENCIAMENTO") ||
    t.includes("RENAVAM")
  ) {
    return "veiculo";
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

  // MODELO — look for BYD followed by model words (DOLPHIN, SONG PLUS, YUAN PLUS, KING, SEAL, HAN, TAN, etc.)
  // Try product description block first.
  const modelo = firstMatch(text, [
    /\bBYD[\s\-]*([A-Z0-9][A-Z0-9\s\-\.\/]{2,40}?)(?=\s+(?:COR|CHASSI|ANO|\d{17}|R\$|PRETO|BRANCO|PRATA|AZUL|VERMELHO|CINZA|VERDE)|$)/im,
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

  // VALOR — prefer "VALOR TOTAL DA NOTA"
  const valor = firstMatch(text, [
    /VALOR\s+TOTAL\s+DA\s+NOTA[\s:]*R?\$?\s*([\d\.\,]+)/i,
    /VALOR\s+TOTAL\s+DOS?\s+PRODUTOS?[\s:]*R?\$?\s*([\d\.\,]+)/i,
    /V\.?\s*TOTAL\s+DA\s+NOTA[\s:]*R?\$?\s*([\d\.\,]+)/i,
  ]);
  if (valor) fields["veiculoNovo.valorVenda"] = valor;

  // Número da NF
  const numero = firstMatch(text, [
    /N[ºo°]\.?\s*(\d{3}\.?\d{3}\.?\d{3})/i,
    /N[ºo°]\s*[:\-]?\s*(\d{6,9})\b/,
    /NF[\-\s]*e?\s*N[ºo°]?[:\s]*(\d{4,9})/i,
  ]);
  if (numero) fields["veiculoNovo.numeroNotaFiscal"] = numero;

  return fields;
}

/** Generic extraction for CRLV/Pedido de Vendas/etc. */
function extractGeneric(rawText: string): Record<string, string> {
  const text = normalizeSpaces(rawText);
  const fields: Record<string, string> = {};

  const patterns: Array<[string, RegExp[]]> = [
    ["proprietario.nome", [/(?:nome|NOME|Nome)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,}?)(?=\n|CPF|CNPJ|RG)/]],
    [
      "proprietario.cpfCnpj",
      [
        /(?:CPF|CNPJ)[\/:\s]*(\d{2,3}\.?\d{3}\.?\d{3}[\/\.]?\d{0,4}\-?\d{2})/i,
        /\b(\d{3}\.\d{3}\.\d{3}\-\d{2})\b/,
        /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})\b/,
      ],
    ],
    ["proprietario.rg", [/(?:RG|R\.G\.)[:\s]+([0-9]{1,3}[\.\-\/0-9]{4,15})/i]],
    ["proprietario.endereco", [/(?:endere[çc]o|ENDERE[ÇC]O)[:\s]+(.{8,80}?)(?=\n|CEP|BAIRRO)/i]],
    ["proprietario.cidade", [/(?:cidade|munic[íi]pio)[:\s]+([A-ZÀ-Úa-zà-ú\s]{3,30}?)(?=\n|\/|UF|ESTADO)/i]],
    ["proprietario.estado", [/(?:UF|estado)[:\s]+([A-Z]{2})\b/i]],
    ["proprietario.cep", [/CEP[:\s]+(\d{5}\-?\d{3})/i]],
    ["veiculo.placa", [/(?:placa|PLACA)[:\s]+([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})/i]],
    ["veiculo.marca", [/(?:marca|MARCA)[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s\/\-]{1,20}?)(?=\n|MODELO)/i]],
    ["veiculo.modelo", [/(?:modelo|MODELO)[:\s]+([A-Z0-9][A-Z0-9\s\.\-\/]{2,40}?)(?=\n|CHASSI|ANO)/i]],
    ["veiculo.chassi", [/(?:chassi|CHASSI)[:\s]+([A-HJ-NPR-Z0-9]{17})/i]],
    ["veiculo.renavam", [/(?:renavam|RENAVAM)[:\s]+(\d{9,11})/i]],
    ["veiculo.cor", [/(?:cor|COR)[:\s]+([A-ZÀ-Úa-zà-ú]{3,20})/i]],
    ["veiculo.anoFabricacao", [/ANO[\s\/]*FAB(?:RICA[ÇC][ÃA]O)?[:\s]*(\d{4})/i]],
    ["veiculo.anoModelo", [/ANO[\s\/]*MOD(?:ELO)?[:\s]*(\d{4})/i]],
    ["veiculo.km", [/(?:km|quilometragem|KM)[:\s]+([\d\.]{1,10})/i]],
  ];

  for (const [name, regexes] of patterns) {
    const v = firstMatch(text, regexes);
    if (v) fields[name] = v;
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
    const { pdf } = await req.json();
    if (!pdf || typeof pdf !== "string") {
      return new Response(JSON.stringify({ error: "PDF base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
    const text = await pdfToText(pdfBytes);
    const docKind = detectDocKind(text);

    console.log(`[extract-pdf] kind=${docKind}, length=${text.length}`);

    let fields: Record<string, string>;
    if (docKind === "nota_fiscal_byd") {
      fields = extractBydInvoice(text);
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
      JSON.stringify({ fields, documentKind: docKind, personName }),
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
