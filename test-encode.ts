import fs from "fs";
async function test() {
  const id = "versi-dub-penipuan-jalanan-legenda-bela-diri::699d1eefa3a7262cff05534b::adj8qcpiob";
  const url = `https://www.cutad.web.id/api/public/reelshort?action=stream&id=${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    headers: { "x-api-key": "cutad_98e7ba3c88fdfe5526740ed69f59fc71267f4a69" }
  });
  const data = await response.text();
  console.log(data);
}
test();
