import { extractText } from "https://esm.sh/unpdf@0.12.2";

async function main() {
  const file = await Deno.readFile("PROC_USADO_MODELO.PDF");
  const text = await extractText(file);
  console.log(text.text);
}

main();
