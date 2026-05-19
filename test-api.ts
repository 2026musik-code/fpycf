import fs from "fs";
async function test() {
  const response = await fetch("https://www.cutad.web.id/api/public/reelshort?action=stream&id=versi-dub-penipuan-jalanan-legenda-bela-diri::699d1eefa3a7262cff05534b::adj8qcpiob", {
    headers: { "x-api-key": "cutad_98e7ba3c88fdfe5526740ed69f59fc71267f4a69" }
  });
  const data = await response.text();
  console.log(data.substring(0, 500));
}
test();
