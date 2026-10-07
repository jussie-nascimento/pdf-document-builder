import pdfMake from "https://esm.sh/pdfmake@0.2.14/build/pdfmake.js";
import pdfFonts from "https://esm.sh/pdfmake@0.2.14/build/vfs_fonts.js";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const d = { proprietario: { nome: "Teste" }, data: "28/05/2026" };
const p = d.proprietario || {};

const docDefinition = {
    content: [
      {
        text: [
          { text: 'D', color: '#ffb300', bold: true, italics: true, fontSize: 28 },
          { text: 'etran', color: '#000000', bold: true, italics: true, fontSize: 28 },
          { text: 'RS', color: '#000000', bold: true, italics: true, fontSize: 16 }
        ],
        margin: [0, 0, 0, 20]
      },
      { text: "AO CENTRO DE REGISTRO DE VEÍCULOS AUTOMOTORES / RS", fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
      { text: "DECLARAÇÃO DE RESIDÊNCIA", fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 30] },
      
      {
        columns: [
          { text: "Eu ", width: 'auto', margin: [0, 0, 10, 0], bold: true },
          { text: p.nome || "_________________________________________________________", width: '*', margin: [0, 0, 0, 5] }
        ],
        margin: [0, 0, 0, 15]
      },
      
      {
        columns: [
          { text: "RG: ", width: 'auto', bold: true },
          { text: p.rg || "_______________________", width: '*', margin: [5, 0, 15, 0] },
          { text: "CPF: ", width: 'auto', bold: true },
          { text: p.cpfCnpj || "_______________________", width: '*', margin: [5, 0, 0, 0] }
        ],
        margin: [0, 0, 0, 20]
      },
      
      { text: "Declaro, responsabilizando-me civil e criminalmente, que resido do endereço abaixo:(End.completo rua, avenida, estrada. Acesso, etc...)", alignment: 'justify', margin: [0, 0, 0, 20] },
      
      {
        columns: [
          { text: "Endereço: ", width: 'auto', bold: true },
          { text: p.endereco || "_________________________________", width: '*', margin: [5, 0, 10, 0] },
          { text: "Nº ", width: 'auto', bold: true },
          { text: "________", width: 'auto', margin: [5, 0, 10, 0] },
          { text: "Compl.: ", width: 'auto', bold: true },
          { text: "________", width: 'auto', margin: [5, 0, 0, 0] }
        ],
        margin: [0, 0, 0, 15]
      },
      
      {
        columns: [
          { text: "Cidade: ", width: 'auto', bold: true },
          { text: `${p.cidade || "______________"} – ${p.estado || "___"}`, width: '*', margin: [5, 0, 10, 0] },
          { text: "CEP: ", width: 'auto', bold: true },
          { text: p.cep || "_______________", width: '*', margin: [5, 0, 0, 0] }
        ],
        margin: [0, 0, 0, 15]
      },
      
      {
        columns: [
          { text: "Bairro: ", width: 'auto', bold: true },
          { text: p.bairro || "_________________________________", width: '*', margin: [5, 0, 10, 0] },
          { text: "Fone: ", width: 'auto', bold: true },
          { text: p.telefone || "_______________", width: '*', margin: [5, 0, 0, 0] }
        ],
        margin: [0, 0, 0, 40]
      },
      
      { text: d.data ? d.data : "____/____/________", alignment: 'center', margin: [0, 0, 0, 40] },
      
      {
        columns: [
          { text: "ASSINAR GOV.BR", width: '*', alignment: 'center', margin: [0, 40, 0, 0], fontSize: 10, color: '#005b9f', bold: true },
          {
            width: '*',
            stack: [
              { text: "_________________________________________", alignment: 'center', margin: [0, 0, 0, 5] },
              { text: "Assinatura do Proprietário", alignment: 'center', bold: true },
              { text: "(Reconhecimento de Firma por Autenticidade)", alignment: 'center', fontSize: 9 }
            ]
          }
        ]
      },
      
      { text: "TRINITA VEÍCULOS LTDA\nRua Edu Chaves, 390 São João – CEP 90240-620 Fone: (51) 3025-3080\nPorto Alegre – RS", fontSize: 9, alignment: 'center', margin: [0, 60, 0, 0] }
    ],
    defaultStyle: { fontSize: 11 }
  };

const pdfDocGenerator = pdfMake.createPdf(docDefinition);
pdfDocGenerator.getBase64((data) => {
  console.log("SUCCESS! Base64 length:", data.length);
});
