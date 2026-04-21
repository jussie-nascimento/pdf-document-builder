const text1 = "VALOR TOTAL DA NF\n107,091.00";
const text2 = "BASE DE CÁLCULO  VALOR TOTAL DA NF  FRETE\n0.00  107,091.00  10.00";

const regex1 = /VALOR\s+TOTAL\s+DA\s+NF[\s:]*R?\$?\s*([\d\.\,]+)/i;

console.log("text1:", text1.match(regex1)?.[1]);
console.log("text2:", text2.match(regex1)?.[1]);
