import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function extract() {
  try {
    const dataBuf = fs.readFileSync('PROC_USADO_MODELO.PDF');
    const data = await pdf(dataBuf);
    console.log("=== RAW TEXT ===");
    console.log(data.text);
  } catch (err) {
    console.error(err);
  }
}

extract();
