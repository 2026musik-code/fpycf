import fs from "fs";
async function testProvider(p: string) {
  try {
    const response = await fetch(`https://www.cutad.web.id/api/public/${p}?action=rank`, {
      headers: { "x-api-key": "cutad_98e7ba3c88fdfe5526740ed69f59fc71267f4a69" } // Re-using last key from earlier logs or default
    });
    if(!response.ok) {
       console.log(p, "failed", response.status);
       return;
    }
    const data = await response.json();
    console.log(p, "success", !!data.data);
  } catch(e) {
    console.log(p, "error");
  }
}
async function testAll() {
  const providers = ["reelshort", "dramabox", "shortmax", "goodshort", "topshort", "moboreels", "dreamehort", "flex-tv", "kalos-tv"];
  for(const p of providers) {
     await testProvider(p);
  }
}
testAll();
