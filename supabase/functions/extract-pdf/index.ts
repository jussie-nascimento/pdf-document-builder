import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DocKind = "veiculo" | "pedido_vendas" | "nota_fiscal_byd" | "outro";

function detectDocKind(text: string): DocKind {
  const t = text.toUpperCase();
  if (t.includes("BYD") && (t.includes("NOTA FISCAL") || t.includes("DANFE") || t.includes("NF-E") || t.includes("NFE"))) {
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
    const text = new TextDecoder("latin1").decode(pdfBytes);
    const docKind = detectDocKind(text);

    const fields: Record<string, string> = {};

    if (docKind === "nota_fiscal_byd") {
      // Patterns for BYD invoice (Nota Fiscal)
      const nfPatterns: [string, RegExp][] = [
        ["veiculoNovo.chassi", /(?:chassi|CHASSI)[:\s]*([A-Z0-9]{17})/i],
        ["veiculoNovo.modelo", /(?:modelo|MODELO|descri[çc][ãa]o)[:\s]*([A-Z0-9\s\-\/]+?)(?:\n|chassi|cor|$)/i],
        ["veiculoNovo.cor", /(?:cor|COR)[:\s]*([A-ZÀ-Úa-zà-ú\s]+?)(?:\n|$)/i],
        ["veiculoNovo.anoFabricacao", /(?:ano[\s\/]*fab(?:rica[çc][ãa]o)?)[:\s]*(\d{4})/i],
        ["veiculoNovo.anoModelo", /(?:ano[\s\/]*mod(?:elo)?)[:\s]*(\d{4})/i],
        ["veiculoNovo.valorVenda", /(?:valor\s*total|valor\s*da\s*nota|valor\s*do\s*produto)[:\s]*R?\$?\s*([\d\.,]+)/i],
        ["veiculoNovo.numeroNotaFiscal", /(?:n(?:[º°]|umero)?\s*(?:da\s*)?nota|NF[\-\s]*e?\s*n[º°]?)[:\s]*(\d+)/i],
      ];
      for (const [name, regex] of nfPatterns) {
        const m = text.match(regex);
        if (m && m[1]) fields[name] = m[1].trim();
      }
      // Marca is always BYD for these invoices
      fields["veiculoNovo.marca"] = "BYD";
    } else {
      const patterns: [string, RegExp][] = [
        ["proprietario.nome", /(?:nome|NOME|Nome)[:\s]*([A-ZÀ-Ú\s]+?)(?:\n|CPF|$)/i],
        ["proprietario.cpfCnpj", /(?:CPF|CNPJ)[/:\s]*(\d{2,3}[\.\s]?\d{3}[\.\s]?\d{3}[/\.\s]?\d{4}[\-\s]?\d{2}|\d{3}\.\d{3}\.\d{3}\-\d{2})/i],
        ["proprietario.rg", /(?:RG|R\.G\.)[:\s]*([0-9\.\-\/]+)/i],
        ["proprietario.endereco", /(?:endere[çc]o|ENDERE[ÇC]O)[:\s]*(.+?)(?:\n|CEP|$)/i],
        ["proprietario.cidade", /(?:cidade|munic[íi]pio)[:\s]*([A-ZÀ-Úa-zà-ú\s]+?)(?:\n|\/|estado|$)/i],
        ["proprietario.estado", /(?:estado|UF)[:\s]*([A-Z]{2})/i],
        ["veiculo.placa", /(?:placa|PLACA)[:\s]*([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})/i],
        ["veiculo.marca", /(?:marca|MARCA)[:\s]*([A-ZÀ-Ú\s\/]+?)(?:\n|modelo|$)/i],
        ["veiculo.modelo", /(?:modelo|MODELO)[:\s]*(.+?)(?:\n|chassi|ano|$)/i],
        ["veiculo.chassi", /(?:chassi|CHASSI)[:\s]*([A-Z0-9]{17})/i],
        ["veiculo.renavam", /(?:renavam|RENAVAM)[:\s]*(\d{9,11})/i],
        ["veiculo.cor", /(?:cor|COR)[:\s]*([A-ZÀ-Úa-zà-ú\s]+?)(?:\n|$)/i],
        ["veiculo.anoFabricacao", /(?:ano[\s\/]*fab(?:rica[çc][ãa]o)?)[:\s]*(\d{4})/i],
        ["veiculo.anoModelo", /(?:ano[\s\/]*mod(?:elo)?)[:\s]*(\d{4})/i],
        ["veiculo.km", /(?:km|quilometragem|KM)[:\s]*([\d\.]+)/i],
      ];

      for (const [fieldName, regex] of patterns) {
        const match = text.match(regex);
        if (match && match[1]) {
          fields[fieldName] = match[1].trim();
        }
      }
    }

    let personName = fields["proprietario.nome"] || "";
    if (docKind === "pedido_vendas") {
      const buyerMatch =
        text.match(/(?:comprador|cliente|adquirente)[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,})/i) ||
        text.match(/(?:nome|NOME)[:\s]*([A-ZÀ-Ú][A-ZÀ-Ú\s]{4,})/);
      if (buyerMatch && buyerMatch[1]) personName = buyerMatch[1].trim();
    }

    return new Response(
      JSON.stringify({
        fields,
        documentKind: docKind,
        personName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error extracting PDF:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract PDF data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
