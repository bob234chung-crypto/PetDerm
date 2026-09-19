import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const base = "http://localhost:3000";

type CookieJar = Map<string, string>;

function cookieHeader(jar: CookieJar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(jar: CookieJar, headers: Headers) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const item of raw) {
    const [pair] = item.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

async function req(jar: CookieJar, url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(url, { ...init, headers });
  storeCookies(jar, response.headers);
  return response;
}

async function setRole(jar: CookieJar, role: string) {
  const response = await req(jar, `${base}/api/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error(`role ${role} failed`);
}

async function main() {
  const capture = new Map<string, string>();
  const reviewer = new Map<string, string>();
  const monitor = new Map<string, string>();
  const issues: string[] = [];

  await setRole(capture, "user");
  await setRole(reviewer, "reviewer");
  await setRole(monitor, "monitor");

  const home = await (await req(capture, base)).text();
  if (!home.includes("研究與同意") && !home.includes("簽署並繼續")) {
    issues.push("home missing consent copy");
  }

  const noConsentUpload = await req(capture, `${base}/api/cases/x/photos`, { method: "POST", body: new FormData() });
  if (noConsentUpload.status !== 403) issues.push(`upload without consent status ${noConsentUpload.status}`);

  const consentRes = await req(capture, `${base}/api/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signerName: "測試飼主", secondaryUse: false }),
  });
  if (!consentRes.ok) issues.push("consent failed");

  const caseRes = await req(capture, `${base}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      breed: "米克斯",
      mixedBreed: true,
      sex: "female",
      coatColor: "淺色",
      coatLength: "短毛",
      site: "軀幹",
      laterality: "left",
      clinic: "家中",
      photographer: "飼主",
      device: "iPhone 15",
      lighting: "室內日光燈",
    }),
  });
  const caseJson = await caseRes.json();
  if (!caseRes.ok) throw new Error(`create case: ${JSON.stringify(caseJson)}`);
  const lesionId = caseJson.lesionId as string;

  const form = new FormData();
  for (const view of ["overview", "frontal", "oblique_1", "oblique_2"]) {
    const bytes = await readFile(path.join(process.cwd(), "public", "demo", `${view}.jpg`));
    form.append(view, new Blob([bytes], { type: "image/jpeg" }), `${view}.jpg`);
  }
  const photoRes = await req(capture, `${base}/api/cases/${lesionId}/photos`, { method: "POST", body: form });
  const photoJson = await photoRes.json();
  if (!photoJson.qcPassed) issues.push(`QC did not pass: ${JSON.stringify(photoJson)}`);

  const inferRes = await req(capture, `${base}/api/cases/${lesionId}/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visibleRoi: true,
      physicalMatch: true,
      rois: [
        { view: "overview", x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
        { view: "frontal", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        { view: "oblique_1", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        { view: "oblique_2", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      ],
    }),
  });
  const inferJson = await inferRes.json();
  if (inferJson.status !== "needs_vet_review") issues.push(`unexpected triage ${inferJson.status}`);
  if (JSON.stringify(inferJson).includes("%") && /[0-9]+%/.test(JSON.stringify(inferJson))) {
    issues.push("inference payload looks like a percentage");
  }

  const resultPage = await (await req(capture, `${base}/case/${lesionId}/result`)).text();
  if (resultPage.includes("低風險")) issues.push("result page contains 低風險");
  if (!resultPage.includes("並非診斷")) issues.push("result page missing disclaimer");
  if (!resultPage.includes("建議優先由獸醫評估")) issues.push("result page missing triage headline");
  if (resultPage.includes("malignancyLabel") || resultPage.includes("軟組織肉瘤")) {
    issues.push("result HTML leaked pathology");
  }

  const clinicCase = await (await req(capture, `${base}/api/cases/${lesionId}`)).json();
  if ("pathology" in clinicCase) issues.push("user case API leaked pathology");

  const prisma = new PrismaClient();
  const seed = await prisma.lesion.findFirst({ where: { publicId: "LSN-A10001" } });
  if (seed) {
    const clinicSeed = await req(capture, `${base}/api/cases/${seed.id}`);
    if (clinicSeed.status !== 403) issues.push("user could read another consent's case");
  }
  await prisma.$disconnect();

  const pathologyForbidden = await req(capture, `${base}/api/pathology`);
  if (pathologyForbidden.status !== 403) issues.push(`user can read pathology ${pathologyForbidden.status}`);

  const pathologyOk = await req(reviewer, `${base}/api/pathology`);
  if (!pathologyOk.ok) issues.push("reviewer cannot read pathology");

  const monitorForbidden = await req(capture, `${base}/api/monitor`);
  if (monitorForbidden.status !== 403) issues.push("user can read monitor");

  const monitorOk = await (await req(monitor, `${base}/api/monitor`)).json();
  if (typeof monitorOk.lesions !== "number") issues.push("monitor payload missing counts");

  const rejectForm = new FormData();
  const rejectCase = await (
    await req(capture, `${base}/api/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        breed: "米克斯",
        sex: "male",
        coatColor: "深色",
        coatLength: "短毛",
        site: "頭部",
        laterality: "midline",
        clinic: "clinic-demo",
        photographer: "staff-01",
        device: "Pixel",
        lighting: "室內日光燈",
      }),
    })
  ).json();
  for (const view of ["overview", "frontal", "oblique_1", "oblique_2"]) {
    const bytes = await readFile(path.join(process.cwd(), "public", "demo", `reject-${view}.jpg`));
    rejectForm.append(view, new Blob([bytes], { type: "image/jpeg" }), `reject-${view}.jpg`);
  }
  const rejectQc = await (await req(capture, `${base}/api/cases/${rejectCase.lesionId}/photos`, { method: "POST", body: rejectForm })).json();
  if (rejectQc.qcPassed) issues.push("reject demo unexpectedly passed QC");

  const reviewPage = await (await req(reviewer, `${base}/review/pathology`)).text();
  if (!reviewPage.includes("病理連結")) issues.push("review page missing title");

  const monitorPage = await (await req(monitor, `${base}/monitor`)).text();
  if (!monitorPage.includes("研究監察")) issues.push("monitor page missing title");

  const localeEn = await req(capture, `${base}/api/locale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en" }),
  });
  if (!localeEn.ok) issues.push("locale switch to en failed");
  const enHome = await (await req(capture, base)).text();
  if (!enHome.includes("Sign and continue") && !enHome.includes("Keep caring for your pet")) {
    issues.push("english locale missing expected copy");
  }
  const localeDe = await req(capture, `${base}/api/locale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "de" }),
  });
  if (!localeDe.ok) issues.push("locale switch to de failed");
  const deHome = await (await req(capture, base)).text();
  if (!deHome.includes("Unterschreiben") && !deHome.includes("Weiter für Ihr Tier")) {
    issues.push("german locale missing expected copy");
  }

  if (issues.length) {
    console.error("FAIL");
    for (const issue of issues) console.error("-", issue);
    process.exit(1);
  }
  console.log("PASS user flow, reject QC, pathology isolation, monitor aggregation");
  console.log("created lesion", lesionId, "status", inferJson.status);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
