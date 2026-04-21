import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import pdfMake from "https://esm.sh/pdfmake@0.2.14/build/pdfmake";
import pdfFonts from "https://esm.sh/pdfmake@0.2.14/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const docDefinition = {
      content: [
        { text: 'Testing Justified Text!', alignment: 'justify' }
      ]
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    // We wrap getBase64 in a promise to await it cleanly.
    const b64 = await new Promise<string>((resolve) => {
      pdfDocGenerator.getBase64((data: string) => resolve(data));
    });

    const pdfBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
