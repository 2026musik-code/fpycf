import express from "express";
import fetch from "node-fetch"; // node 22 has built-in fetch, just a test

async function test() {
  const url = `http://localhost:3000/api/proxy?action=stream&id=${encodeURIComponent("versi-dub-penipuan-jalanan-legenda-bela-diri::699d1eefa3a7262cff05534b::adj8qcpiob")}`;
  console.log("Fetching", url);
  try {
    const response = await fetch(url, {
      headers: { "x-api-key": "cutad_98e7ba3c88fdfe5526740ed69f59fc71267f4a69" }
    });
    const text = await response.text();
    console.log(response.status, text.substring(0, 500));
  } catch(e) {
    console.error("error", e);
  }
}
test();
