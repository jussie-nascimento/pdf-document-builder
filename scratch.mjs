import fs from 'fs';
import { extractText } from 'unpdf';

async function extractFiles() {
  const files = ['PROC_0KM_MODELO.pdf', 'COAF_MODELO.pdf', 'TERMO_RESP_AVAL_MODELO.pdf'];
  
  for (const f of files) {
    try {
      const dataBuf = fs.readFileSync(f);
      const pdfData = await extractText(new Uint8Array(dataBuf));
      console.log(`\n=== RAW TEXT FOR ${f} ===\n`);
      console.log(pdfData.text);
    } catch (err) {
      console.error(`Error reading ${f}:`, err);
    }
  }
}

extractFiles();
