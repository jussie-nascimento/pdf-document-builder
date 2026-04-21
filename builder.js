const fs = require('fs');

const logoB64 = fs.readFileSync('logo.txt', 'utf8').trim();

const code = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pdfMake from "https://esm.sh/pdfmake@0.2.14/build/pdfmake";
import pdfFonts from "https://esm.sh/pdfmake@0.2.14/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

${logoB64}

interface FormDataInput {
  veiculoNovo: any;
  veiculo: any;
  proprietario: any;
  avalista: any;
  coaf: any;
  data: string;
  documentType: string;
}

function getHeaderParams(text) {
  return {
    columns: [
      { image: LOGO, width: 120 },
      { text: text, fontSize: 14, bold: true, alignment: 'right', margin: [0, 10, 0, 0] }
    ],
    margin: [0, 0, 0, 20]
  };
}

function generateProcuracao0KM(d) {
  const p = d.proprietario || {};
  const v = d.veiculoNovo || {};

  return {
    content: [
      { text: "PROCURAÇÃO ZERO KM", style: 'header' },
      { text: "PROCURAÇÃO ESPECÍFICA 0KM", style: 'subheader', alignment: 'center', margin: [0, 10, 0, 20] },
      
      {
        text: [
          "Por este instrumento particular, eu ",
          { text: p.nome || "___________________________________________", bold: true },
          " portador do CPF/CNPJ: ",
          { text: p.cpfCnpj || "__________________", bold: true },
          " Residente à ", { text: p.endereco || "_____________________________________", bold: true },
          " Bairro: ", { text: p.bairro || "___________________", bold: true },
          ", CEP ", { text: p.cep || "___________", bold: true },
          " Cidade ", { text: p.cidade || "___________________________", bold: true },
          " - ", { text: p.estado || "___", bold: true },
          ". Constituo e nomeio meu bastante procurador o Sr. ESTEVAN DE REIS HEINSCH PRESTES, Portador do CPF: 054.480.480-56 e RG: 054.480.480-56, e/ou, Sr. WAGNER QUEIROZ DA SILVA, Portador do CPF: 803.783.660-68, RG: 4073166847 e/ou Sr. RAPHAEL MADALENA DA SILVA, Portador do CPF: 867.987.740-91 e RG: 4113150991, e/ou Sr. CONRADO QUEIROZ PIRES DA SILVA, Portador do CPF: 031.837.730-66 e RG: 9115753197 para fins especiais de assinar, a (GRT) GUIA DE RESPONSABILIDADE TÉCNICA, solicitar CRLV-E, assinar requerimentos, solicitar atpve, declarar endereço, fazer alterações e informações do veiculo, autorização de confecção e retirada de placa junto as EPIVs, autorização para encaminhamento de processo junto ao Detran/RS do veículo de minha propriedade com as características que seguem:"
        ],
        alignment: 'justify',
        margin: [0, 0, 0, 15]
      },
      
      { text: \`MARCA/MODELO: \${v.marca || ""} \${v.modelo || ""}\`, bold: true, margin: [0, 0, 0, 5] },
      { text: \`CHASSI: \${v.chassi || ""}\`, bold: true, margin: [0, 0, 0, 20] },
      
      { text: "DECLARO, sob as penas da lei e sem prejuízo de demais sanções administrativas/cíveis/criminais, que:", alignment: 'justify', bold: true, margin: [0, 0, 0, 10] },
      
      { text: "a) o(s) veículo(s) são novos (Zero quilômetro) e está(ão) fisicamente de acordo com o pré-cadastro na Base Indice Nacional – BIN da SENATRAN, Nota(s) Fiscal(is), bem como do Certificado de Adequação a Legislação de Trânsito – CAT e do Certificado de Capacitação Técnica – CCT, quando exigível(is);\n\nb) estou ciente de que no caso de qualquer alteração do veículo em relação ao pré-cadastro e/ou com o CAT/CCT quando solicitados, é de minha responsabilidade informar ao Centro de Registro de Veículos Automotores – CRVA, para correção/alteração das informações do veículo antes do primeiro emplacamento, para fins de adequação à legislação de Trânsito.\n\nc) os documentos entregues ao DETRAN/RS para o serviço requerido são todos autênticos e, quando cópias, condizem com o original, e que sou responsável por providenciar a estampagem e instalação da(s) placa(s) no veículo para o qual a estampagem foi autorizada.", alignment: 'justify', margin: [0, 0, 0, 30] },
      
      { text: \`\${p.cidade || "__________________"}, \${d.data || "____/____/________"}\`, margin: [0, 0, 0, 40] },
      
      { text: "________________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Outorgante", alignment: 'center', bold: true },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 9, margin: [0, 5, 0, 0] }
    ],
    defaultStyle: { fontSize: 10, alignment: 'justify' },
    styles: { header: { fontSize: 14, bold: true, alignment: 'center', margin: [0,0,0,20] }, subheader: { fontSize: 12, bold: true } }
  };
}

function generateCoaf(d) {
  const p = d.proprietario || {};
  const cInfo = d.coaf || {};

  return {
    content: [
      { text: "Autodeclaração capacidade econômica", style: 'header', alignment: 'center' },
      { text: "PREENCHIMENTO OBRIGATÓRIO PARA CLIENTES", alignment: 'center', bold: true, margin: [0,0,0,20] },
      
      { text: \`\${p.nome || "___________________________________________"} , Portador do CPF/CNPJ: \${p.cpfCnpj || "________________"}\`, bold: true, margin: [0,0,0,10] },
      
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de avaliar a compatibilidade entre a capacidade econômica – financeira e a compra realizada, nos termos da Resolução nº 25 do COAF, Declaro que tenho capacidade econômica – financeira, com renda de _______________ que é compatível com a operação.", alignment: 'justify', margin: [0,0,0,10]},
      
      { text: "Não desejo declarar o valor ( x )     Desejo declarar o valor (   )", margin: [0,0,0,20] },
      
      { text: "Autodeclaração Pessoa Exposta Politicamente - PEP", bold: true, margin: [0,0,0,10] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva identificar as Pessoas Expostas Politicamente Expostas – PEP, nos termos da Resolução COAF nº 40/2021*", alignment: 'justify', margin: [0,0,0,10] },
      { text: \`Sou ou possuo algum familiar que se enquadre como pessoa exposta politicamente*( \${cInfo.pep === 'sim' ? 'X' : ' '} ) SIM ( \${cInfo.pep === 'nao' ? 'X' : ' '} ) NÃO\`, margin: [0,0,0,5] },
      { text: "Caso a resposta seja \"sim\", indique abaixo a função exercida ou do familiar, informando o nome da pessoa e o grau de parentesco\n___________________________________________________________________", margin: [0,0,0,10] },
      { text: "*PEP - Pessoa Exposta Politicamente – quem desempenha ou tenha desempenhado, nos últimos cinco anos, no Brasil ou em países estrangeiras, cargos, empregos ou funções públicas relevantes, assim como seus representantes, familiares e/ou colaboradores, nos termos da Resolução COAF nº 40/2021.", fontSize: 8, alignment: 'justify', margin: [0,0,0,20] },
      
      { text: "Autodeclaração sanções do Conselho de Segurança das Nações Unidas – CSNU", bold: true, margin: [0,0,0,10] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de verificar se há sanções aplicadas pelo Conselho de Segurança das Nações Unidas – CSNU, nos termos da Resolução COAF Nº 31/2019.", alignment: 'justify', margin: [0,0,0,10] },
      { text: \`Possuo alguma sanção imposta pelo CSNU? ( \${cInfo.csnu === 'sim' ? 'X' : ' '} ) SIM ( \${cInfo.csnu === 'nao' ? 'X' : ' '} ) NÃO\`, margin: [0,0,0,20] },
      
      { text: "Autodeclaração beneficiário final / PEP – Pessoa Jurídica", bold: true, margin: [0,0,0,10] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de identificar o beneficiário final da operação, e identificar as Pessoas Expostas Politicamente Expostas – PEP, nos termos da Resolução COAF nº 36/2021 e 40/2021, preencha os dados societários abaixo:", alignment: 'justify', margin: [0,0,0,10] },
      
      { text: "QUADRO ADMINISTRATIVO DA EMPRESA", bold: true, alignment: 'center', margin: [0,0,0,10] },
      { text: "CPF / CNPJ                NOME / RAZÃO SOCIAL", fontSize: 9, bold: true, margin: [0,0,0,5] },
      { text: \`\${p.cpfCnpj || "________________"}          \${p.nome || "___________________________________________"}\`, fontSize: 9, margin: [0,0,0,20] },
      
      { text: "Pessoas jurídicas sob a forma de companhia aberta ou cooperativa, nos termos da legislação correspondente, podem ser dispensadas da identificação.", fontSize: 8, alignment: 'justify', margin: [0,0,0,30] },
      
      { text: \`CIDADE: \${p.cidade || "__________________"}\\nDATA: \${d.data || "____/____/________"}\`, margin: [0,0,0,40] },
      
      { text: "_________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Assinatura", alignment: 'center', bold: true },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 9, margin: [0, 5, 0, 0] }
    ],
    defaultStyle: { fontSize: 10, alignment: 'justify' },
    styles: { header: { fontSize: 14, bold: true } }
  };
}

function generateTermoResponsabilidade(d) {
  const p = d.proprietario || {};
  const v = d.veiculo || {};
  const a = d.avalista || {};
  const isAvalista = !!a.nome;
  
  return {
    content: [
      getHeaderParams("TERMO DE RESPONSABILIDADE"),
      { text: isAvalista ? "TERMO DE RESPONSABILIDADE SOBRE VEÍCULO DADO EM PAGAMENTO COM AVALISTA E INSTRUMENTO DE MANDATO" : "TERMO DE RESPONSABILIDADE SOBRE VEÍCULO DADO EM PAGAMENTO E INSTRUMENTO DE MANDATO", style: 'header', alignment: 'center', margin: [0,0,0,20] },
      
      { text: "VEÍCULO:", bold: true },
      { text: \`Placas/UF: \${v.placa || "_____"}   RENAVAM: \${v.renavam || "_____________"}   Chassi: \${v.chassi || "__________________"}\` },
      { text: \`Marca: \${v.marca || "_____"}   Modelo: \${v.modelo || "_____________"}   Ano/Modelo: \${v.anoFabricacao || ""}/\${v.anoModelo || ""}   Cor: \${v.cor || "____"}\` },
      { text: \`Quilometragem: \${v.km || "_____"}\`, margin: [0,0,0,15] },
      
      { text: "PROPRIETÁRIO:", bold: true },
      { text: \`Nome: \${p.nome || "___________________________________________"}\` },
      { text: \`Endereço: \${p.endereco || "______________________"}\` },
      { text: \`Cidade: \${p.cidade || "___________"} - \${p.estado || "___"}   Bairro: \${p.bairro || "_______"}   CEP: \${p.cep || "_______"}\` },
      { text: \`Nacionalidade: \${p.nacionalidade || "_________"}   Estado civil: \${p.estadoCivil || "_____"}\` },
      { text: \`Identidade/RG: \${p.rg || "__________"}   CPF/CNPJ: \${p.cpfCnpj || "_______________"}\` },
      { text: \`Valor de avaliação: R$ \${v.valorAvaliacao || "___________"}\`, margin: [0,0,0,15] },
      
      ...(isAvalista ? [
        { text: "AVALISTA:", bold: true },
        { text: \`Nome: \${a.nome || "___________________________________________"}\` },
        { text: \`Endereço: \${a.endereco || "______________________"}\` },
        { text: \`Cidade: \${a.cidade || "___________"} - \${a.estado || "___"}   Bairro: \${a.bairro || "_______"}   CEP: \${a.cep || "_______"}\` },
        { text: \`Nacionalidade: \${a.nacionalidade || "_________"}   Estado civil: \${a.estadoCivil || "_____"}\` },
        { text: \`Identidade/RG: \${a.rg || "__________"}   CPF/CNPJ: \${a.cpfCnpj || "_______________"}\`, margin: [0,0,0,15] },
      ] : []),
      
      { text: \`Pelo presente instrumento particular, na melhor forma de direito, o proprietário, acima nominado, assume total e geral responsabilidade pela entrega do veículo supracitado nas mesmas condições verificadas no ato da avaliação por quaisquer ônus, dívidas, ações ou encargos e gravames sobre o referido veículo e que eventualmente venha a diminuir sua avaliação ou obste sua alienação ou transferência. Neste sentido, o proprietário autoriza e outorga, pelo prazo de 12 meses, de forma irrevogável e irretratável à TRINITA VEÍCULOS LTDA, com sede na Rua Edu Chaves, 390 São João – CEP 90240-620 - Porto Alegre / RS, inscrita no CNPJ sob o nº 11.475.046/0001-83, para, caso haja algum tipo de impedimento ou restrição sobre o veículo entregue neste ato como dação em pagamento, a sacar Letra de Câmbio, de acordo com o valor correspondente ao valor da avaliação do veículo praticado no negócio com a concessionária e acrescido de juros legais e atualização monetária (IGPM), mediante prévia notificação e informação de disponibilidade para devolução do veículo, comprovadamente impedido de alienação ou transferência. Outrossim, o Proprietário assume total e geral responsabilidade pela entrega do veículo supracitado nas mesmas condições verificadas no ato da avaliação.\`, alignment: 'justify', margin: [0,0,0,10] },
      
      { text: "Fica estabelecido que o valor ofertado pela compra do veículo está condicionado a inocorrência de qualquer avaria ou alteração das condições apresentadas na data da avaliação, resguardando-se a TRINITA no direito de cancelar a proposta nesta circunstância, bem como fica o proprietário ciente que em caso de desfazimento do negócio, arcará com as despesas administrativas decorrentes.", alignment: 'justify', margin: [0,0,0,30] },
      
      {
        columns: isAvalista ? [
          { text: "_____________________________________\nProprietário\nASSINAR GOV.BR", alignment: 'center' },
          { text: "_____________________________________\nAvalista\nASSINAR GOV.BR", alignment: 'center' }
        ] : [
          { text: "_____________________________________\nProprietário\nASSINAR GOV.BR", alignment: 'center' }
        ],
        margin: [0,0,0,40]
      },
      
      { text: "TRINITA VEÍCULOS LTDA\nRua Edu Chaves, 390 São João – CEP 90240-620 Fone: (51) 3025-3080\nPorto Alegre – RS", fontSize: 9, alignment: 'center' }
    ],
    defaultStyle: { fontSize: 10, alignment: 'justify' },
    styles: { header: { fontSize: 13, bold: true } }
  };
}

function generateProcuracaoUsado(d) {
  const p = d.proprietario || {};
  const v = d.veiculo || {};

  return {
    content: [
      getHeaderParams("PROCURAÇÃO DO USADO"),
      { text: "PROCURAÇÃO", style: 'header', alignment: 'center', margin: [0,0,0,20] },
      
      {
        text: [
          "Por este instrumento eu ", { text: p.nome || "___________________________________________", bold: true },
          ", CPF/CNPJ: ", { text: p.cpfCnpj || "________________", bold: true },
          ", Residência: ", { text: p.endereco || "_____________________________________", bold: true },
          ", Bairro: ", { text: p.bairro || "___________________", bold: true },
          ", Município: ", { text: p.cidade || "_________________________", bold: true },
          " - ", { text: p.estado || "___", bold: true },
          ", nomeio e constituo meu bastante procurador a empresa TRINITA VEICULOS LTDA, por seus representantes legais, CNPJ 11.475.046/0001-83 com sede a Rua Edu Chaves, 390, para o fim especial de vender a quem bem entender, inclusive para seu próprio nome, e pelo preço que julgar conveniente um automóvel, Marca: ",
          { text: v.marca || "_________________", bold: true },
          ", Modelo: ", { text: v.modelo || "_________________________", bold: true },
          ", Chassi ", { text: v.chassi || "__________________________________", bold: true },
          ", Cor: ", { text: v.cor || "_________________", bold: true },
          ", Ano/modelo: ", { text: \`\${v.anoFabricacao || "____"}/\${v.anoModelo || "____"}\`, bold: true },
          ", emplacado na Delegacia de trânsito de _________________, placa: ", { text: v.placa || "______________", bold: true },
          ", RENAVAM: ", { text: v.renavam || "______________", bold: true },
          ". Declara-se expressamente que o veículo acima mencionado foi vendido pelo outorgante ao outorgado pelo valor de R$ ", { text: v.valorVenda || "__________________", bold: true },
          ", Correspondente ao preço ajustado no negócio jurídico celebrado entre as partes, não constituindo limitação para eventual revenda ou alteração do preço. Podendo ainda endossar o certificado de registro de veículo (CRV/ATPV-e), receber o preço da venda, dar recibo de quitação, assinar requerimentos e termos de transferência, assinar termos e solicitar 2ª via de CRV/CRLV, preencher declarações de responsabilidade, assinar carta de não-opção de compra, realizar troca de município de emplacamento do veículo, assinar de acordo no CRV ou ATPV-e, declarar endereço residencial, podendo assinar autorização (GRT) para despachante credenciado, assinar todo e qualquer tipo de termos de responsabilidade referente ao veículo, usar o veículo, manejando o mesmo em qualquer parte do território nacional, ficando civil e criminalmente responsável por qualquer multa e acidente envolvendo o veículo aqui descrito. Podendo ainda o procurador pagar taxas, multas e imposto, podendo requerer a autoridade aduaneira de qualquer país licença ou permissão de turismo. Podendo ainda o procurador retirar o veículo de depósito, incluir ou retirar restrição de suspeita de clone, quitar taxas de guincho e diárias de depósito, pode requerer parcelamento de débitos de multas, ipva e seguro do veículo, liberar restrições financeira ou de transferência, podendo ainda vender peças do veículo, firmar contratos de reserva de domínio, podendo ainda o procurador suspender temporariamente a comunicação de venda para fins de 2ª via do CRV, assinar requerimentos do DETRAN para inclusão ou cancelamentos de quaisquer restrições, solicitar a baixa definitiva do veículo, pode o procurador alterar informações e alterar características do veículo, podendo o procurador fazer boletim de ocorrências de perda de documentos em delegacias."
        ],
        alignment: 'justify',
        margin: [0, 0, 0, 15]
      },
      
      { text: "Procuração passada em causa própria conforme Art. 685 do Código Civil, a sua revogação não terá eficácia, nem se extinguirá pela morte de qualquer das partes, ficando o mandatário dispensado de prestar contas, ratificando todos os atos praticados anteriormente.", alignment: 'justify', margin: [0,0,0,30] },
      
      { text: \`\${p.cidade || "__________________"}, \${d.data || "____/____/________"}\`, margin: [0,0,0,40] },
      
      { text: "________________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Outorgante", alignment: 'center', bold: true },
      { text: "Reconhecer firma por autenticidade", alignment: 'center', fontSize: 9 },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 9, margin: [0, 5, 0, 0] }
    ],
    defaultStyle: { fontSize: 10, alignment: 'justify' },
    styles: { header: { fontSize: 14, bold: true } }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data = await req.json() as FormDataInput;
    let docDefinition;

    switch (data.documentType) {
      case "procuracao_0km":
        docDefinition = generateProcuracao0KM(data);
        break;
      case "termo_simples":
      case "termo_avalista":
        docDefinition = generateTermoResponsabilidade(data);
        break;
      case "coaf":
        docDefinition = generateCoaf(data);
        break;
      case "procuracao_usado":
        docDefinition = generateProcuracaoUsado(data);
        break;
      default:
        throw new Error("Invalid document type");
    }

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    // Wrap to convert base64 -> Uint8Array
    const pdfBase64 = await new Promise((resolve) => {
      pdfDocGenerator.getBase64((data) => resolve(data));
    });

    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
      },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
\`;

fs.writeFileSync('supabase/functions/generate-pdf/index.ts', code);
console.log('Builder finished.');
