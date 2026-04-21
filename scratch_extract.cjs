const fs = require('fs');
const pdf = require('pdf-parse');

pdf(fs.readFileSync('PROC_USADO_MODELO.PDF')).then(data => {
  console.log("=== RAW PDF TEXT ===");
  console.log(data.text);
}).catch(e => console.error(e));
