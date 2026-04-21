const text = `PdfUploader.tsx:78 RECEBEMOS DE BYD AUTO DO BRASIL LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL AO LADO NF-e DATA DE RECEBIMENTO IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR No. 000036005 Série 005 Identificação do emitente BYD AUTO DO BRASIL LTDA AVENIDA HENRY FORD 2000 Pólo Industrial de Camaçari CAMACARI / BA 42816-260 Tel.: 1935142550 / Fax: DANFE Documento Auxiliar de Nota Fiscal Eletrônica 0 - Entrada 1 - Saída N. 000036005 SÉRIE 005 _______________________________ __________________ CHAVE DE ACESSO P/ CONSULTA DE AUTENTICIDADE 29260350351104000119550050000360051144442474 _______________________________ __________________ Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizada NATUREZA DA OPERAÇÃO Vnd prod.est.opr.c/pr.suj.reg.sub.trib.cnd.sub.tri PROTOCOLO DE AUTORIZAÇÃO 129260588174502 INSCRIÇÃO ESTADUAL 214286151 INSC. EST. SUBST. TRIB. CNPJ 50.351.104/0001-19 DESTINATÁRIO/REMETENTE NOME/RAZÃO SOCIAL DTREVIS SOLUCOES EM INFORMATICA LTDA CNPJ 48.951.935/0001-80 DATA DA EMISSÃO 2026.03.23 ENDEREÇO R INACIO FELISBERTO MAGNUS 111 BAIRRO/DISTRITO CENTENARIO CEP 95560-000 DATA DE SAÍDA/ENTRADA 2026.03.23 MUNICÍPIO Torres TELEFONE/FAX 51984024502 UF RS INSCRIÇÃO ESTADUAL HORA DE SAÍDA 08:51:57 FATURA NÚMERO VENCIMENTO VALOR NÚMERO VENCIMENTO VALOR NÚMERO VENCIMENTO VALOR 1 CÓD. PROD. DESCRIÇÃO DO PRODUTO/SERVICO NCM/SH CST CFOP UN QTDE. VL. UNIT. VL. TOTAL BC. ICMS VL. ICMS VL. IPI Al. ICMS Al. IPI 18798991-00 DOLPHIN MINI GL AZUL INT AZ ES; N° de Série:020317; Chassi do Véiculo:92VCE4CC4VK020317; N° do Motor:7R5086571; Distância entre eixos:2500MM; Ano Fabricação:2026; Código Cor:02; Potência:75CV; Cilindros:0; Peso Líquido:1KG; Peso Bruto:2KG; Tipo de combustível:07; Capacidade máxima de tração:1.575; Ano modelo:2027; Tipo Pintura:0; Tipo de Veículo:06; Espécie de Veículo:1; Condição do VIN:N; Condição de Veículo:1; Código marca modelo:101824; Código de cor do DETRAN:02; 8703.80.00 610 6401/AA UN 1 106,938.62 106,938.62 86,957.92 10,434.95 152.38 12.00 % 0.15 % CÁLCULO DO IMPOSTO BASE CALCULO ICMS 86,957.89 VALOR DO ICMS 10,434.95 BASE CÁLCULO ICMS ST 20,133.11 VALOR DO ICMS ST 2,415.97 VALOR TOTAL PRODUTOS 106,938.62 VALOR DO FRETE 0.00 VALOR DO SEGURO 0.00 DESCONTO 0.00 OUTRAS DESPESAS 0.00 VALOR DO IPI 152.38 VALOR TOTAL DA NF 107,091.00 TRANSPORTADOR/VOLUMES TRANSPORTADOS RAZÃO SOCIAL TRANSPORTES GABARDO LTDA FRETE POR CONTA 0 - EMITENTE C#DIGO ANTT PLACA UF CNPJ 92.644.483/0024-71 ENDERECO R DOS PIGMENTOS 285 MUNICIPIO Camacari UF BA INSCRIÇÃO ESTADUAL QUANTIDADE 00001 ESPECIE UN MARCA NUMERAÇÃO UN PESO BRUTO 2 KG PESO LÍQUIDO 1 KG DADOS DOS PRODUTOS/ SERVIÇO 0 CALCULO DO ISSQN INSC. MUNICIPAL 50340001 VALOR SERVIÇOS BASE CÁLCULO ISS 0.00 VALOR DO ISS 0.00 DADOS ADICIONAIS INFORMAÇÕES COMPLEMENTARES PRECO PUBLICO SUGERIDO DE VENDA: BRL 118990.00 DESTINADO A MODALIDADE VENDA DIRETA ENDERECO DE ENTREGA DA CONCESSIONARIA: Patio IESA Cachoeirinha CNPJ: 11475046000345 Av. Cruzeir o, 840, Pavlh 2D,Cruzeiro,Cachoeirinha-Rio Grande do Sul,94930615 Dealer de entrega: TRINITA VEICULOS LTDA, LTDA, CNPJ: 11475046000345, IE: 1770255173 , UF: RS Redução de IPI conforme ROTA/MOVER ICMS-ST cf. CV ICMS 142/18 Valor aproximado dos tributos: 23296.34 Vlr PIS 1774.66 ,Vlr COFINS 8518.38 No Ordem:0002140580 Delivery Number:0800125605 Pedido:92VCE4CC4VK020317 DMS Order:92VCE4CC4VK020317 Valor FCP-ST - BRL: 0.00 RESERVADO AO FISCO`;

function firstMatch(text, arr) {
  for (const regex of arr) {
    const match = text.match(regex);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}

const fields = {};

const chassi = firstMatch(text, [
  /CHASSI[\s:#]*([A-HJ-NPR-Z0-9]{17})/i,
  /\b([A-HJ-NPR-Z0-9]{17})\b/,
]);
if (chassi) fields["veiculoNovo.chassi"] = chassi.toUpperCase();

const modelo = firstMatch(text, [
  /\b((?:DOLPHIN|SONG|YUAN|KING|SEAL|HAN|TAN|BYD)[\sA-Z0-9\-\.\/]{0,30}?)(?=\s+(?:PRETA|PRETO|BRANCA|BRANCO|PRATA|AZUL|VERMELHA|VERMELHO|CINZA|VERDE|AMARELA|AMARELO|MARROM|BEGE|DOURADA|DOURADO|COR\b))/i,
]);
if (modelo) fields["veiculoNovo.modelo"] = modelo.replace(/\s+/g, " ").trim();

const fab = firstMatch(text, [/ANO[\s\/]*FAB(?:RICA[ÇC][ÃA]O)?[\s:]*?(20\d{2})/i]);
const mod = firstMatch(text, [/ANO[\s\/]*MOD(?:ELO)?[\s:]*?(20\d{2})/i]);
if (fab) fields["veiculoNovo.anoFabricacao"] = fab;
if (mod) fields["veiculoNovo.anoModelo"] = mod;

const valor = firstMatch(text, [
  /VALOR\s+TOTAL\s+DA\s+NF(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i,
]);
if (valor) fields["veiculoNovo.valorVenda"] = valor;

const numero = firstMatch(text, [
  /N[ºo°]\.?\s*(\d{3}\.?\d{3}\.?\d{3})/i,
  /N[ºo°]\s*[:\-]?\s*(\d{6,9})\b/,
  /NF[\-\s]*e?\s*N[ºo°]?[:\s]*(\d{4,9})/i,
]);
if (numero) fields["veiculoNovo.numeroNotaFiscal"] = numero;

console.log(JSON.stringify(fields, null, 2));
