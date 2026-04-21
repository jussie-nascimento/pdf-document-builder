const text = "VALOR DO FRETE VALOR DO SEGURO DESCONTO OUTRAS DESPESAS VALOR TOTAL DA NF\n0,00 0,00 0,00 0.00 107,091.00\nVALOR DE ALGO 0,00";

const regex = /VALOR\s+TOTAL\s+DA\s+NF(?:(?!\bVALOR\b)[\s\S]){0,100}?(?:R\$)?\s*([\d]{1,3}(?:[\.\,]\d{3})+[\.\,]\d{2}|[\d]{4,}[\.\,]\d{2})/i;

console.log("Matched 1:", text.match(regex)?.[1]);

const text3 = "VALOR TOTAL DA NF\n107,091.00";
console.log("Matched 3:", text3.match(regex)?.[1]);
