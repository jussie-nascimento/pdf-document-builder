import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pdfMake from "https://esm.sh/pdfmake@0.2.14/build/pdfmake.js";
import pdfFonts from "https://esm.sh/pdfmake@0.2.14/build/vfs_fonts.js";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO = 'data:image/jpeg;base64,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';

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
      { text: text, fontSize: 13, bold: true, alignment: 'right', margin: [0, 5, 0, 0] }
    ],
    margin: [0, 0, 0, 10]
  };
}

function generateProcuracao0KM(d) {
  const p = d.proprietario || {};
  const v = d.veiculoNovo || {};

  return {
    content: [
      getHeaderParams("PROCURAÇÃO ZERO KM"),
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
      
      { text: `MARCA/MODELO: ${v.marca || ""} ${v.modelo || ""}`, bold: true, margin: [0, 0, 0, 5] },
      { text: `CHASSI: ${v.chassi || ""}`, bold: true, margin: [0, 0, 0, 20] },
      
      { text: "DECLARO, sob as penas da lei e sem prejuízo de demais sanções administrativas/cíveis/criminais, que:", alignment: 'justify', bold: true, margin: [0, 0, 0, 10] },
      
      { text: "a) o(s) veículo(s) são novos (Zero quilômetro) e está(ão) fisicamente de acordo com o pré-cadastro na Base Indice Nacional – BIN da SENATRAN, Nota(s) Fiscal(is), bem como do Certificado de Adequação a Legislação de Trânsito – CAT e do Certificado de Capacitação Técnica – CCT, quando exigível(is);\n\nb) estou ciente de que no caso de qualquer alteração do veículo em relação ao pré-cadastro e/ou com o CAT/CCT quando solicitados, é de minha responsabilidade informar ao Centro de Registro de Veículos Automotores – CRVA, para correção/alteração das informações do veículo antes do primeiro emplacamento, para fins de adequação à legislação de Trânsito.\n\nc) os documentos entregues ao DETRAN/RS para o serviço requerido são todos autênticos e, quando cópias, condizem com o original, e que sou responsável por providenciar a estampagem e instalação da(s) placa(s) no veículo para o qual a estampagem foi autorizada.", alignment: 'justify', margin: [0, 0, 0, 30] },
      
      { text: `${p.cidade || "__________________"}, ${d.data || "____/____/________"}`, margin: [0, 0, 0, 20] },
      
      { text: "________________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Outorgante", alignment: 'center', bold: true },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 9, margin: [0, 0, 0, 0] }
    ],
    defaultStyle: { fontSize: 9, alignment: 'justify' },
    styles: { header: { fontSize: 13, bold: true, alignment: 'center', margin: [0,0,0,15] }, subheader: { fontSize: 11, bold: true } }
  };
}

function generateCoaf(d) {
  const p = d.proprietario || {};
  const cInfo = d.coaf || {};

  return {
    content: [
      getHeaderParams("COAF"),
      { text: "Autodeclaração capacidade econômica", style: 'header', alignment: 'center', margin: [0,5,0,5] },
      { text: "PREENCHIMENTO OBRIGATÓRIO PARA CLIENTES", alignment: 'center', bold: true, margin: [0,0,0,10] },
      
      { text: `${p.nome || "___________________________________________"} , Portador do CPF/CNPJ: ${p.cpfCnpj || "________________"}`, bold: true, margin: [0,0,0,5] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de avaliar a compatibilidade entre a capacidade econômica – financeira e a compra realizada, nos termos da Resolução nº 25 do COAF, Declaro que tenho capacidade econômica – financeira, com renda de _______________ que é compatível com a operação.", alignment: 'justify', margin: [0,0,0,5]},
      { text: "Não desejo declarar o valor ( x )     Desejo declarar o valor (   )", margin: [0,0,0,10] },
      
      { text: "Autodeclaração Pessoa Exposta Politicamente - PEP", bold: true, margin: [0,0,0,5] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva identificar as Pessoas Expostas Politicamente Expostas – PEP, nos termos da Resolução COAF nº 40/2021*", alignment: 'justify', margin: [0,0,0,5] },
      { text: `Sou ou possuo algum familiar que se enquadre como pessoa exposta politicamente*( ${cInfo.pep === 'sim' ? 'X' : ' '} ) SIM ( ${cInfo.pep === 'nao' ? 'X' : ' '} ) NÃO`, margin: [0,0,0,5] },
      { text: "Caso a resposta seja \"sim\", indique abaixo a função exercida ou do familiar, informando o nome da pessoa e o grau de parentesco\n___________________________________________________________________", margin: [0,0,0,5] },
      { text: "*PEP - Pessoa Exposta Politicamente – quem desempenha ou tenha desempenhado, nos últimos cinco anos, no Brasil ou em países estrangeiras, cargos, empregos ou funções públicas relevantes, assim como seus representantes, familiares e/ou colaboradores, nos termos da Resolução COAF nº 40/2021.", fontSize: 7, alignment: 'justify', margin: [0,0,0,10] },
      
      { text: "Autodeclaração sanções do Conselho de Segurança das Nações Unidas – CSNU", bold: true, margin: [0,0,0,5] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de verificar se há sanções aplicadas pelo Conselho de Segurança das Nações Unidas – CSNU, nos termos da Resolução COAF Nº 31/2019.", alignment: 'justify', margin: [0,0,0,5] },
      { text: `Possuo alguma sanção imposta pelo CSNU? ( ${cInfo.csnu === 'sim' ? 'X' : ' '} ) SIM ( ${cInfo.csnu === 'nao' ? 'X' : ' '} ) NÃO`, margin: [0,0,0,10] },
      
      { text: "Autodeclaração beneficiário final / PEP – Pessoa Jurídica", bold: true, margin: [0,0,0,5] },
      { text: "Em atendimento à Lei nº 9.613/1998, alterada pela Lei nº 12.683/2012, relativas à Prevenção à Lavagem de Dinheiro, com a finalidade exclusiva de identificar o beneficiário final da operação, e identificar as Pessoas Expostas Politicamente Expostas – PEP, nos termos da Resolução COAF nº 36/2021 e 40/2021, preencha os dados societários abaixo:", alignment: 'justify', margin: [0,0,0,5] },
      
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
          headerRows: 2,
          body: [
            [{ text: 'QUADRO ADMINISTRATIVO DA EMPRESA', colSpan: 8, alignment: 'center', fontSize: 8, bold: true }, {}, {}, {}, {}, {}, {}, {}],
            [
              { text: 'NOME\n/RAZÃO SOCIAL', fontSize: 6, alignment: 'center', bold: true },
              { text: 'CPF / CNPJ', fontSize: 6, alignment: 'center', bold: true },
              { text: 'PROCURADOR\nCOM PODERES\nDE ADM\n(sim/não)', fontSize: 6, alignment: 'center', bold: true },
              { text: '% SOBRE\nCAPITAL DA\nEMPRESA', fontSize: 6, alignment: 'center', bold: true },
              { text: 'S/C *', fontSize: 6, alignment: 'center', bold: true },
              { text: 'PEP **\n(sim/não)', fontSize: 6, alignment: 'center', bold: true },
              { text: 'Função de PEP\nexercida', fontSize: 6, alignment: 'center', bold: true },
              { text: 'Beneficiário final ***', fontSize: 6, alignment: 'center', bold: true }
            ],
            // map members if any exist, or add empty rows
            ...(cInfo.membros && cInfo.membros.length > 0 
              ? cInfo.membros.map((m: any) => [
                  { text: m.nome || "", fontSize: 6, alignment: 'center' },
                  { text: m.cpf || "", fontSize: 6, alignment: 'center' },
                  { text: m.poderesAdm || "________", fontSize: 6, alignment: 'center' },
                  { text: m.percentualCapital || "________", fontSize: 6, alignment: 'center' },
                  { text: m.poderes || "________", fontSize: 6, alignment: 'center' },
                  { text: m.pep ? "S" : "N", fontSize: 6, alignment: 'center' },
                  { text: m.funcaoPep || "________", fontSize: 6, alignment: 'center' },
                  { text: m.beneficiarioFinal || "________________", fontSize: 6, alignment: 'center' }
                ])
              : [
                  [
                    { text: p.nome || "_________________________", fontSize: 6, alignment: 'center' },
                    { text: p.cpfCnpj || "________________", fontSize: 6, alignment: 'center' },
                    { text: "________", fontSize: 6, alignment: 'center' },
                    { text: "________", fontSize: 6, alignment: 'center' },
                    { text: "________", fontSize: 6, alignment: 'center' },
                    { text: "________", fontSize: 6, alignment: 'center' },
                    { text: "________", fontSize: 6, alignment: 'center' },
                    { text: "________________", fontSize: 6, alignment: 'center' }
                  ]
                ])
          ]
        },
        margin: [0,0,0,10]
      },
      { text: [
          { text: '* "S / C"', bold: true }, " – Conforme o Contrato Social da empresa compradora ou Procuração outorgada, a pessoa tem poderes para assinatura de documentos e firmar compromissos. INDICAR: ", { text: "S=Sozinho", bold: true }, " ou ", { text: "C=em Conjunto com outros.", bold: true }
        ], fontSize: 7, alignment: 'justify', margin: [0,0,0,2] },
      { text: [
          { text: '**PEP -', bold: true }, " Pessoa Exposta Politicamente - desempenha ou tenha desempenhado, nos últimos cinco anos, no Brasil ou em países estrangeiras, cargos, empregos ou funções públicas relevantes, assim como seus representantes, familiares e/ou colaboradores."
        ], fontSize: 7, alignment: 'justify', margin: [0,0,0,2] },
      { text: [
          { text: '***Beneficiário Final é (são) a(s)', bold: true }, " pessoa(s) física(s) que detenha(m), em última análise, o controle sobre a pessoa jurídica ou que detenha(m) poder determinante para a induzir, influenciar e utilizar ou para dela se beneficiar, independentemente de condições formais como as de controlador, administrador, dirigente, representante, procurador ou preposto. Admite-se a utilização de valor mínimo de referência de participação societária para a identificação de beneficiário final, o qual deve ser estabelecido com base na classificação de risco do cliente e não pode ser superior a 25% (vinte e cinco por cento) do capital social, considerada, em todo caso, a participação direta e indireta.\nPessoas jurídicas sob a forma de companhia aberta ou cooperativa, nos termos da legislação correspondente, podem ser dispensadas da identificação."
        ], fontSize: 7, alignment: 'justify', margin: [0,0,0,15] },
      
      { text: `CIDADE: ${p.cidade || "__________________"}\nDATA: ${d.data || "____/____/________"}`, margin: [0,0,0,20] },
      
      { text: "_________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Assinatura", alignment: 'center', bold: true },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 9, margin: [0, 0, 0, 0] }
    ],
    defaultStyle: { fontSize: 9, alignment: 'justify' },
    styles: { header: { fontSize: 11, bold: true } }
  };
}

function generateTermoResponsabilidade(d, docType) {
  let p = d.proprietario || {};
  const v = d.veiculo || {};
  let a = d.avalista || {};
  const isAvalista = docType === "termo_responsabilidade_avalista" || !!a.nome;
  
  if (docType === "termo_responsabilidade_avalista") {
    const temp = p;
    p = a;
    a = temp;
  }
  
  return {
    content: [
      getHeaderParams("TERMO DE RESPONSABILIDADE"),
      { text: isAvalista ? "TERMO DE RESPONSABILIDADE SOBRE VEÍCULO DADO EM PAGAMENTO\nCOM AVALISTA E INSTRUMENTO DE MANDATO" : "TERMO DE RESPONSABILIDADE SOBRE VEÍCULO DADO EM PAGAMENTO\nE INSTRUMENTO DE MANDATO", style: 'header', alignment: 'center', margin: [0,0,0,20] },
      
      { text: "VEÍCULO:", bold: true },
      { text: `Placas/UF: ${v.placa || "_____"}   RENAVAM: ${v.renavam || "_____________"}   Chassi: ${v.chassi || "__________________"}` },
      { text: `Marca: ${v.marca || "_____"}   Modelo: ${v.modelo || "_____________"}   Ano/Modelo: ${v.anoFabricacao || ""}/${v.anoModelo || ""}   Cor: ${v.cor || "____"}` },
      { text: `Quilometragem: ${v.km || "_____"}`, margin: [0,0,0,10] },
      
      { text: "PROPRIETÁRIO:", bold: true },
      { text: `Nome: ${p.nome || "___________________________________________"}` },
      { text: `Endereço: ${p.endereco || "______________________"}` },
      { text: `Cidade: ${p.cidade || "___________"} - ${p.estado || "___"}   Bairro: ${p.bairro || "_______"}   CEP: ${p.cep || "_______"}` },
      { text: `Nacionalidade: ${p.nacionalidade || "_________"}   Estado civil: ${p.estadoCivil || "_____"}` },
      { text: `Identidade/RG: ${p.rg || "__________"}   CPF/CNPJ: ${p.cpfCnpj || "_______________"}` },
      { text: `Valor de avaliação: R$ ${v.valorAvaliacao || "___________"}`, margin: [0,0,0,10] },
      
      ...(isAvalista ? [
        { text: "AVALISTA:", bold: true },
        { text: `Nome: ${a.nome || "___________________________________________"}` },
        { text: `Endereço: ${a.endereco || "______________________"}` },
        { text: `Cidade: ${a.cidade || "___________"} - ${a.estado || "___"}   Bairro: ${a.bairro || "_______"}   CEP: ${a.cep || "_______"}` },
        { text: `Nacionalidade: ${a.nacionalidade || "_________"}   Estado civil: ${a.estadoCivil || "_____"}` },
        { text: `Identidade/RG: ${a.rg || "__________"}   CPF/CNPJ: ${a.cpfCnpj || "_______________"}`, margin: [0,0,0,10] },
      ] : []),
      
      { text: `Pelo presente instrumento particular, na melhor forma de direito, o proprietário, acima nominado, assume total e geral responsabilidade pela entrega do veículo supracitado nas mesmas condições verificadas no ato da avaliação por quaisquer ônus, dívidas, ações ou encargos e gravames sobre o referido veículo e que eventualmente venha a diminuir sua avaliação ou obste sua alienação ou transferência. Neste sentido, o proprietário autoriza e outorga, pelo prazo de 12 meses, de forma irrevogável e irretratável à TRINITA VEÍCULOS LTDA, com sede na Rua Edu Chaves, 390 São João – CEP 90240-620 - Porto Alegre / RS, inscrita no CNPJ sob o nº 11.475.046/0001-83, para, caso haja algum tipo de impedimento ou restrição sobre o veículo entregue neste ato como dação em pagamento, a sacar Letra de Câmbio, de acordo com o valor correspondente ao valor da avaliação do veículo praticado no negócio com a concessionária e acrescido de juros legais e atualização monetária (IGPM), mediante prévia notificação e informação de disponibilidade para devolução do veículo, comprovadamente impedido de alienação ou transferência. Outrossim, o Proprietário assume total e geral responsabilidade pela entrega do veículo supracitado nas mesmas condições verificadas no ato da avaliação.`, alignment: 'justify', margin: [0,0,0,10] },
      
      { text: "Fica estabelecido que o valor ofertado pela compra do veículo está condicionado a inocorrência de qualquer avaria ou alteração das condições apresentadas na data da avaliação, resguardando-se a TRINITA no direito de cancelar a proposta nesta circunstância, bem como fica o proprietário ciente que em caso de desfazimento do negócio, arcará com as despesas administrativas decorrentes.", alignment: 'justify', margin: [0,0,0,15] },
      
      {
        columns: isAvalista ? [
          { text: "_____________________________________\nProprietário\nASSINAR GOV.BR", alignment: 'center' },
          { text: "_____________________________________\nAvalista\nASSINAR GOV.BR", alignment: 'center' }
        ] : [
          { text: "_____________________________________\nProprietário\nASSINAR GOV.BR", alignment: 'center' }
        ],
        margin: [0,0,0,20]
      },
      
      { text: "TRINITA VEÍCULOS LTDA\nRua Edu Chaves, 390 São João – CEP 90240-620 Fone: (51) 3025-3080\nPorto Alegre – RS", fontSize: 8, alignment: 'center' }
    ],
    defaultStyle: { fontSize: 9, alignment: 'justify' },
    styles: { header: { fontSize: 10, bold: true } }
  };
}

function generateProcuracaoUsado(d) {
  const p = d.avalista?.nome ? d.avalista : (d.proprietario || {});
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
          ", Ano/modelo: ", { text: `${v.anoFabricacao || "____"}/${v.anoModelo || "____"}`, bold: true },
          ", emplacado na Delegacia de trânsito de _________________, placa: ", { text: v.placa || "______________", bold: true },
          ", RENAVAM: ", { text: v.renavam || "______________", bold: true },
          ". Declara-se expressamente que o veículo acima mencionado foi vendido pelo outorgante ao outorgado pelo valor de R$ ", { text: v.valorAvaliacao || "__________________", bold: true },
          ", Correspondente ao preço ajustado no negócio jurídico celebrado entre as partes, não constituindo limitação para eventual revenda ou alteração do preço. Podendo ainda endossar o certificado de registro de veículo (CRV/ATPV-e), receber o preço da venda, dar recibo de quitação, assinar requerimentos e termos de transferência, assinar termos e solicitar 2ª via de CRV/CRLV, preencher declarações de responsabilidade, assinar carta de não-opção de compra, realizar troca de município de emplacamento do veículo, assinar de acordo no CRV ou ATPV-e, declarar endereço residencial, podendo assinar autorização (GRT) para despachante credenciado, assinar todo e qualquer tipo de termos de responsabilidade referente ao veículo, usar o veículo, manejando o mesmo em qualquer parte do território nacional, ficando civil e criminalmente responsável por qualquer multa e acidente envolvendo o veículo aqui descrito. Podendo ainda o procurador pagar taxas, multas e imposto, podendo requerer a autoridade aduaneira de qualquer país licença ou permissão de turismo. Podendo ainda o procurador retirar o veículo de depósito, incluir ou retirar restrição de suspeita de clone, quitar taxas de guincho e diárias de depósito, pode requerer parcelamento de débitos de multas, ipva e seguro do veículo, liberar restrições financeira ou de transferência, podendo ainda vender peças do veículo, firmar contratos de reserva de domínio, podendo ainda o procurador suspender temporariamente a comunicação de venda para fins de 2ª via do CRV, assinar requerimentos do DETRAN para inclusão ou cancelamentos de quaisquer restrições, solicitar a baixa definitiva do veículo, pode o procurador alterar informações e alterar características do veículo, podendo o procurador fazer boletim de ocorrências de perda de documentos em delegacias."
        ],
        alignment: 'justify',
        margin: [0, 0, 0, 15]
      },
      
      { text: "Procuração passada em causa própria conforme Art. 685 do Código Civil, a sua revogação não terá eficácia, nem se extinguirá pela morte de qualquer das partes, ficando o mandatário dispensado de prestar contas, ratificando todos os atos praticados anteriormente.", alignment: 'justify', margin: [0,0,0,15] },
      
      { text: `${p.cidade || "__________________"}, ${d.data || "____/____/________"}`, margin: [0,0,0,25] },
      
      { text: "________________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
      { text: p.nome || "Outorgante", alignment: 'center', bold: true },
      { text: "Reconhecer firma por autenticidade", alignment: 'center', fontSize: 8 },
      { text: "ASSINAR GOV.BR", alignment: 'center', fontSize: 8, margin: [0, 0, 0, 0] }
    ],
    defaultStyle: { fontSize: 9, alignment: 'justify' },
    styles: { header: { fontSize: 13, bold: true } }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const docType = requestBody.type;
    const data = requestBody.data || {};

    let docDefinition;

    switch (docType) {
      case "procuracao_0km":
        docDefinition = generateProcuracao0KM(data);
        break;
      case "termo_responsabilidade":
      case "termo_responsabilidade_avalista":
        docDefinition = generateTermoResponsabilidade(data, docType);
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
    
    const pdfBase64 = await new Promise((resolve) => {
      pdfDocGenerator.getBase64((b64) => resolve(b64));
    });

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
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
