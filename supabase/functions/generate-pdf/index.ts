import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF generation using raw PDF syntax
function createPdf(pages: string[]): Uint8Array {
  // We'll build a minimal PDF document
  const objects: string[] = [];
  let objCount = 0;
  
  const addObj = (content: string) => {
    objCount++;
    objects.push(content);
    return objCount;
  };

  // Catalog
  const catalogId = addObj(""); // placeholder
  // Pages
  const pagesId = addObj(""); // placeholder
  
  // Font
  const fontId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  const fontBoldId = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  
  const pageIds: number[] = [];
  
  for (const pageContent of pages) {
    const streamId = addObj(`<< /Length ${pageContent.length} >>\nstream\n${pageContent}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`);
    pageIds.push(pageId);
  }
  
  // Update pages object
  const kidsStr = pageIds.map(id => `${id} 0 R`).join(" ");
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageIds.length} >>`;
  
  // Update catalog
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  
  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  
  return new TextEncoder().encode(pdf);
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function drawText(x: number, y: number, text: string, fontSize = 10, bold = false): string {
  const font = bold ? "/F2" : "/F1";
  return `BT ${font} ${fontSize} Tf ${x} ${y} Td (${escapeText(text)}) Tj ET\n`;
}

function drawLine(x1: number, y1: number, x2: number, y2: number): string {
  return `${x1} ${y1} m ${x2} ${y2} l S\n`;
}

interface FormDataInput {
  veiculo: Record<string, string>;
  proprietario: Record<string, string>;
  avalista: Record<string, string>;
  coaf: {
    nomeRazaoSocial?: string;
    cpfCnpj?: string;
    pep?: string;
    csnu?: string;
    membros?: Array<{
      nome?: string;
      cpf?: string;
      percentualCapital?: string;
      poderes?: string;
      pep?: boolean;
      beneficiarioFinal?: boolean;
    }>;
    cidade?: string;
  };
  data?: string;
}

function generateTermoResponsabilidadeAvalista(d: FormDataInput): string {
  let c = "";
  let y = 790;
  
  c += drawText(180, y, "TERMO DE RESPONSABILIDADE", 14, true);
  y -= 30;
  c += drawText(50, y, "IESA - TRINITA VEICULOS", 10, true);
  y -= 25;
  
  c += drawText(50, y, "DADOS DO VEICULO", 11, true);
  y -= 18;
  c += drawLine(50, y, 545, y);
  y -= 15;
  
  const vehicleFields = [
    ["Placa", d.veiculo.placa || ""],
    ["Marca", d.veiculo.marca || ""],
    ["Modelo", d.veiculo.modelo || ""],
    ["Chassi", d.veiculo.chassi || ""],
    ["RENAVAM", d.veiculo.renavam || ""],
    ["Ano Fab/Mod", `${d.veiculo.anoFabricacao || ""}/${d.veiculo.anoModelo || ""}`],
    ["Cor", d.veiculo.cor || ""],
    ["KM", d.veiculo.km || ""],
  ];
  
  for (const [label, value] of vehicleFields) {
    c += drawText(50, y, `${label}: ${value}`, 9);
    y -= 14;
  }
  
  y -= 10;
  c += drawText(50, y, "DADOS DO PROPRIETARIO", 11, true);
  y -= 18;
  c += drawLine(50, y, 545, y);
  y -= 15;
  
  const ownerFields = [
    ["Nome", d.proprietario.nome || ""],
    ["CPF/CNPJ", d.proprietario.cpfCnpj || ""],
    ["RG", d.proprietario.rg || ""],
    ["Endereco", d.proprietario.endereco || ""],
    ["Bairro", d.proprietario.bairro || ""],
    ["Cidade/Estado", `${d.proprietario.cidade || ""} / ${d.proprietario.estado || ""}`],
    ["CEP", d.proprietario.cep || ""],
    ["Nacionalidade", d.proprietario.nacionalidade || ""],
    ["Estado Civil", d.proprietario.estadoCivil || ""],
  ];
  
  for (const [label, value] of ownerFields) {
    c += drawText(50, y, `${label}: ${value}`, 9);
    y -= 14;
  }
  
  y -= 10;
  c += drawText(50, y, "DADOS DO AVALISTA / FIADOR", 11, true);
  y -= 18;
  c += drawLine(50, y, 545, y);
  y -= 15;
  
  const guarantorFields = [
    ["Nome", d.avalista.nome || ""],
    ["CPF/CNPJ", d.avalista.cpfCnpj || ""],
    ["RG", d.avalista.rg || ""],
    ["Endereco", d.avalista.endereco || ""],
    ["Cidade/Estado", `${d.avalista.cidade || ""} / ${d.avalista.estado || ""}`],
  ];
  
  for (const [label, value] of guarantorFields) {
    c += drawText(50, y, `${label}: ${value}`, 9);
    y -= 14;
  }
  
  y -= 15;
  c += drawText(50, y, `Valor de Avaliacao: R$ ${d.veiculo.valorAvaliacao || "___________"}`, 9);
  y -= 30;
  
  c += drawText(50, y, "Declaro que recebi o veiculo acima descrito em perfeitas condicoes de uso,", 8);
  y -= 12;
  c += drawText(50, y, "responsabilizando-me por quaisquer danos ou avarias que venham a ocorrer", 8);
  y -= 12;
  c += drawText(50, y, "durante o periodo em que o veiculo estiver sob minha responsabilidade.", 8);
  
  y -= 40;
  c += drawText(50, y, `Data: ${d.data || "____/____/________"}`, 9);
  y -= 40;
  c += drawLine(50, y, 250, y);
  c += drawText(70, y - 12, "Proprietario", 8);
  c += drawLine(320, y, 520, y);
  c += drawText(370, y - 12, "Avalista", 8);
  
  return c;
}

function generateTermoResponsabilidadeSimples(d: FormDataInput): string {
  let c = "";
  let y = 790;

  c += drawText(180, y, "TERMO DE RESPONSABILIDADE", 14, true);
  y -= 30;
  c += drawText(50, y, "IESA - TRINITA VEICULOS", 10, true);
  y -= 25;

  c += drawText(50, y, "DADOS DO VEICULO", 11, true);
  y -= 18;
  c += drawLine(50, y, 545, y);
  y -= 15;

  const vehicleFields = [
    ["Placa", d.veiculo.placa || ""],
    ["Marca", d.veiculo.marca || ""],
    ["Modelo", d.veiculo.modelo || ""],
    ["Chassi", d.veiculo.chassi || ""],
    ["RENAVAM", d.veiculo.renavam || ""],
    ["Ano Fab/Mod", `${d.veiculo.anoFabricacao || ""}/${d.veiculo.anoModelo || ""}`],
    ["Cor", d.veiculo.cor || ""],
    ["KM", d.veiculo.km || ""],
  ];

  for (const [label, value] of vehicleFields) {
    c += drawText(50, y, `${label}: ${value}`, 9);
    y -= 14;
  }

  y -= 10;
  c += drawText(50, y, "DADOS DO PROPRIETARIO", 11, true);
  y -= 18;
  c += drawLine(50, y, 545, y);
  y -= 15;

  const ownerFields = [
    ["Nome", d.proprietario.nome || ""],
    ["CPF/CNPJ", d.proprietario.cpfCnpj || ""],
    ["RG", d.proprietario.rg || ""],
    ["Endereco", d.proprietario.endereco || ""],
    ["Bairro", d.proprietario.bairro || ""],
    ["Cidade/Estado", `${d.proprietario.cidade || ""} / ${d.proprietario.estado || ""}`],
    ["CEP", d.proprietario.cep || ""],
    ["Nacionalidade", d.proprietario.nacionalidade || ""],
    ["Estado Civil", d.proprietario.estadoCivil || ""],
  ];

  for (const [label, value] of ownerFields) {
    c += drawText(50, y, `${label}: ${value}`, 9);
    y -= 14;
  }

  y -= 15;
  c += drawText(50, y, `Valor de Avaliacao: R$ ${d.veiculo.valorAvaliacao || "___________"}`, 9);
  y -= 30;

  c += drawText(50, y, "Declaro que recebi o veiculo acima descrito em perfeitas condicoes de uso,", 8);
  y -= 12;
  c += drawText(50, y, "responsabilizando-me por quaisquer danos ou avarias que venham a ocorrer", 8);
  y -= 12;
  c += drawText(50, y, "durante o periodo em que o veiculo estiver sob minha responsabilidade.", 8);

  y -= 40;
  c += drawText(50, y, `Data: ${d.data || "____/____/________"}`, 9);
  y -= 40;
  c += drawLine(200, y, 400, y);
  c += drawText(265, y - 12, "Proprietario", 8);

  return c;
}

function generateProcuracaoUsado(d: FormDataInput): string {
  let c = "";
  let y = 790;
  
  c += drawText(220, y, "PROCURACAO", 14, true);
  y -= 25;
  c += drawText(160, y, "VEICULO USADO - COMPRA E VENDA", 12, true);
  y -= 30;
  
  c += drawText(50, y, "OUTORGANTE:", 10, true);
  y -= 18;
  c += drawText(50, y, `Nome: ${d.proprietario.nome || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `CPF/CNPJ: ${d.proprietario.cpfCnpj || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `RG: ${d.proprietario.rg || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Endereco: ${d.proprietario.endereco || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Bairro: ${d.proprietario.bairro || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Municipio: ${d.proprietario.cidade || ""} - ${d.proprietario.estado || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `CEP: ${d.proprietario.cep || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Nacionalidade: ${d.proprietario.nacionalidade || ""} - Estado Civil: ${d.proprietario.estadoCivil || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Profissao: ${d.proprietario.profissao || ""}`, 9);
  
  y -= 25;
  c += drawText(50, y, "OUTORGADO: IESA - TRINITA VEICULOS LTDA", 10, true);
  y -= 14;
  c += drawText(50, y, "CNPJ: XX.XXX.XXX/XXXX-XX", 9);
  
  y -= 25;
  c += drawText(50, y, "VEICULO:", 10, true);
  y -= 18;
  c += drawText(50, y, `Marca/Modelo: ${d.veiculo.marca || ""} / ${d.veiculo.modelo || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Chassi: ${d.veiculo.chassi || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Cor: ${d.veiculo.cor || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Ano: ${d.veiculo.anoFabricacao || ""}/${d.veiculo.anoModelo || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Placa: ${d.veiculo.placa || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `RENAVAM: ${d.veiculo.renavam || ""}`, 9);
  
  y -= 25;
  c += drawText(50, y, `Valor de Venda: R$ ${d.veiculo.valorVenda || "___________"}`, 9);
  
  y -= 30;
  const bodyText = [
    "Pelo presente instrumento particular de procuracao, o(a) outorgante acima",
    "qualificado(a) nomeia e constitui seu(sua) bastante procurador(a) a empresa",
    "IESA - TRINITA VEICULOS LTDA, para o fim especial de representar o(a)",
    "outorgante perante o DETRAN e demais orgaos competentes, podendo assinar,",
    "requerer, transferir, e praticar todos os atos necessarios para a",
    "transferencia do veiculo acima descrito.",
  ];
  
  for (const line of bodyText) {
    c += drawText(50, y, line, 8);
    y -= 12;
  }
  
  y -= 30;
  c += drawText(50, y, `Data: ${d.data || "____/____/________"}`, 9);
  y -= 40;
  c += drawLine(50, y, 280, y);
  c += drawText(100, y - 12, "Outorgante", 8);
  
  return c;
}

function generateProcuracao0km(d: FormDataInput): string {
  let c = "";
  let y = 790;
  
  c += drawText(220, y, "PROCURACAO", 14, true);
  y -= 25;
  c += drawText(190, y, "VEICULO 0KM", 12, true);
  y -= 30;
  
  c += drawText(50, y, "OUTORGANTE:", 10, true);
  y -= 18;
  c += drawText(50, y, `Nome/Razao Social: ${d.proprietario.nome || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `CPF/CNPJ: ${d.proprietario.cpfCnpj || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Endereco: ${d.proprietario.endereco || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Bairro: ${d.proprietario.bairro || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Cidade: ${d.proprietario.cidade || ""} - UF: ${d.proprietario.estado || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `CEP: ${d.proprietario.cep || ""}`, 9);
  
  y -= 25;
  c += drawText(50, y, "OUTORGADO: IESA - TRINITA VEICULOS LTDA", 10, true);
  
  y -= 25;
  c += drawText(50, y, "VEICULO:", 10, true);
  y -= 18;
  c += drawText(50, y, `Marca/Modelo: ${d.veiculo.marca || ""} / ${d.veiculo.modelo || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `Chassi: ${d.veiculo.chassi || ""}`, 9);
  
  y -= 30;
  const bodyText = [
    "Pelo presente instrumento particular de procuracao, o(a) outorgante acima",
    "qualificado(a) nomeia e constitui seu(sua) bastante procurador(a) a empresa",
    "IESA - TRINITA VEICULOS LTDA, para o fim especial de representar o(a)",
    "outorgante perante a fabrica/montadora, DETRAN e demais orgaos competentes,",
    "podendo assinar, requerer, emplacar e praticar todos os atos necessarios",
    "para o emplacamento e registro do veiculo 0KM acima descrito.",
  ];
  
  for (const line of bodyText) {
    c += drawText(50, y, line, 8);
    y -= 12;
  }
  
  y -= 30;
  c += drawText(50, y, `Data: ${d.data || "____/____/________"}`, 9);
  y -= 40;
  c += drawLine(50, y, 280, y);
  c += drawText(100, y - 12, "Outorgante", 8);
  
  return c;
}

function generateCoaf(d: FormDataInput): string {
  let c = "";
  let y = 790;
  
  c += drawText(140, y, "AUTODECLARACAO - COAF", 14, true);
  y -= 25;
  c += drawText(80, y, "Resolucao COAF n. 40/2021 e Circular BACEN n. 3.978/2020", 8);
  y -= 30;
  
  c += drawText(50, y, `Nome/Razao Social: ${d.coaf.nomeRazaoSocial || ""}`, 9);
  y -= 14;
  c += drawText(50, y, `CPF/CNPJ: ${d.coaf.cpfCnpj || ""}`, 9);
  
  y -= 25;
  c += drawText(50, y, "1. PESSOA EXPOSTA POLITICAMENTE (PEP)", 10, true);
  y -= 18;
  c += drawText(50, y, "Declaro que eu ou algum de meus socios, administradores ou representantes legais:", 8);
  y -= 14;
  c += drawText(50, y, d.coaf.pep === "sim" ? "(X) SIM, sou ou tenho relacionamento com PEP" : "(X) NAO sou nem tenho relacionamento com PEP", 8);
  
  y -= 25;
  c += drawText(50, y, "2. RESOLUCAO CSNU 1267", 10, true);
  y -= 18;
  c += drawText(50, y, d.coaf.csnu === "sim" ? "(X) SIM, estou relacionado na lista CSNU 1267" : "(X) NAO estou relacionado na lista CSNU 1267", 8);
  
  if (d.coaf.membros && d.coaf.membros.length > 0) {
    y -= 25;
    c += drawText(50, y, "QUADRO ADMINISTRATIVO / SOCIETARIO", 10, true);
    y -= 18;
    c += drawText(50, y, "Nome", 8, true);
    c += drawText(200, y, "CPF", 8, true);
    c += drawText(310, y, "% Cap.", 8, true);
    c += drawText(360, y, "PEP", 8, true);
    c += drawText(400, y, "Benef. Final", 8, true);
    y -= 5;
    c += drawLine(50, y, 545, y);
    y -= 12;
    
    for (const m of d.coaf.membros) {
      c += drawText(50, y, m.nome || "", 8);
      c += drawText(200, y, m.cpf || "", 8);
      c += drawText(310, y, m.percentualCapital || "", 8);
      c += drawText(360, y, m.pep ? "Sim" : "Nao", 8);
      c += drawText(400, y, m.beneficiarioFinal ? "Sim" : "Nao", 8);
      y -= 14;
    }
  }
  
  y -= 30;
  c += drawText(50, y, "Declaro, sob as penas da lei, que as informacoes acima prestadas sao verdadeiras.", 8);
  
  y -= 30;
  c += drawText(50, y, `${d.coaf.cidade || "___________"}, ${d.data || "____/____/________"}`, 9);
  y -= 40;
  c += drawLine(50, y, 280, y);
  c += drawText(80, y - 12, "Assinatura do Declarante", 8);
  
  return c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    
    if (!type || !data) {
      return new Response(JSON.stringify({ error: "type and data are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pageContent: string;
    
    switch (type) {
      case "termo_responsabilidade":
        pageContent = generateTermoResponsabilidade(data);
        break;
      case "procuracao_usado":
        pageContent = generateProcuracaoUsado(data);
        break;
      case "procuracao_0km":
        pageContent = generateProcuracao0km(data);
        break;
      case "coaf":
        pageContent = generateCoaf(data);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown document type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const pdfBytes = createPdf([pageContent]);
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(JSON.stringify({ pdf: base64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
