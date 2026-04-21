const url = "https://mdwsbmwrppswsirhtxmi.supabase.co/functions/v1/generate-pdf";

const payload = {
  documentType: "procuracao_0km",
  proprietario: { nome: "Teste" },
  veiculoNovo: { marca: "Teste", modelo: "Teste" }
};

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
}).then(res => {
  console.log("Status:", res.status);
  return res.text();
}).then(text => {
  console.log("Body:", text);
}).catch(err => {
  console.error("Error:", err);
});
