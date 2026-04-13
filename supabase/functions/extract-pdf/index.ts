import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Decode base64 to get raw PDF bytes
    const pdfBytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
    
    // Extract text from PDF using simple text extraction
    // We'll look for text between stream/endstream and extract readable strings
    const text = new TextDecoder("latin1").decode(pdfBytes);
    
    // Try to extract meaningful fields from the text
    const fields: Record<string, string> = {};
    
    // Common patterns in Brazilian vehicle documents
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

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error extracting PDF:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract PDF data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
