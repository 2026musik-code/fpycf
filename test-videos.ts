import fs from "fs";
async function test() {
  const response = await fetch("https://www.cutad.web.id/api/public/reelshort?action=rank", {
    headers: { "x-api-key": "cutad_98e7ba3c88fdfe5526740ed69f59fc71267f4a69" }
  });
  const data = await response.json();
  console.log(data);
}
test();
