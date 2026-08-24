const api = await fetch(
  "https://api.americonfort.com/api/booking-completion/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/contract-preview?format=pdf",
);
const body = await api.text();
console.log("API contract-preview?format=pdf:", api.status, body.slice(0, 100));

const html = await fetch("https://www.americonfort.com/").then((r) => r.text());
const assets = [...html.matchAll(/\/assets\/([^"']+\.js)/g)].map((m) => m[1]);
const main = await fetch(`https://www.americonfort.com/assets/${assets[0]}`).then((r) => r.text());
const lazy = [...main.matchAll(/CompleteBooking-([A-Za-z0-9_-]+)\.js/g)].map((m) => m[0]);
console.log("CompleteBooking chunk:", lazy[0] || "none");
if (lazy[0]) {
  const js = await fetch(`https://www.americonfort.com/assets/${lazy[0]}`).then((r) => r.text());
  console.log("client createObjectURL:", js.includes("createObjectURL"));
  console.log("client contract-preview:", js.includes("contract-preview"));
  console.log("client format pdf:", /format\s*:\s*["']pdf["']/.test(js) || js.includes("format=pdf"));
}
