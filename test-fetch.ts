import fs from 'fs';
async function run() {
  try {
    await fetch('http://localhost:3000/api/videos', { headers: { "x-api-key": "test\n" } });
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}
run();
