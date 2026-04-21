const text = "VALOR DO FRETE VALOR DO SEGURO DESCONTO OUTRAS DESPESAS VALOR TOTAL DA NF\n0,00 0,00 0,00 0.00 107,091.00";
const regex = /VALOR\s+TOTAL\s+DA\s+NF[^\d]{0,50}?([\d\.\,]+)/i;
console.log(text.match(regex)?.[1]);
