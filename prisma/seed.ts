import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { putObject } from "../lib/storage";
import { CONSENT_VERSION, MODEL_VERSION } from "../lib/constants";

const prisma = new PrismaClient();
const ORIGINAL = path.join(process.cwd(), "uploads", "original");
const RESEARCH = path.join(process.cwd(), "uploads", "research");

async function makeJpeg(label: string, color: { r: number; g: number; b: number }) {
  const svg = `<svg width="900" height="700" xmlns="http://www.w3.org/2000/svg">
    <rect width="900" height="700" fill="rgb(${color.r},${color.g},${color.b})"/>
    <rect x="80" y="80" width="160" height="40" fill="#ffffff"/>
    <text x="90" y="108" font-size="22" fill="#111">尺 10mm</text>
    <rect x="80" y="140" width="80" height="80" fill="#cc3333"/>
    <rect x="160" y="140" width="80" height="80" fill="#eeeeee"/>
    <circle cx="520" cy="360" r="90" fill="#7a3b2e"/>
    <text x="200" y="640" font-size="28" fill="#111">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

function hash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function store(sessionId: string, view: string, buffer: Buffer, filename: string) {
  const originalName = `uploads/original/${sessionId}-${view}.jpg`;
  const researchName = `uploads/research/${sessionId}-${view}.jpg`;
  const originalPath = await putObject(originalName, buffer, "image/jpeg");
  const researchPath = await putObject(researchName, buffer, "image/jpeg");
  return {
    originalPath,
    researchPath,
    sha256: hash(buffer),
    mimeType: "image/jpeg",
    byteSize: buffer.length,
    originalFilename: filename,
  };
}

async function main() {
  await mkdir(ORIGINAL, { recursive: true });
  await mkdir(RESEARCH, { recursive: true });
  await prisma.incidentReport.deleteMany();
  await prisma.inferenceRun.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.photoSession.deleteMany();
  await prisma.pathologyRecord.deleteMany();
  await prisma.lesion.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.consent.deleteMany();

  const consent = await prisma.consent.create({
    data: { version: CONSENT_VERSION, signerName: "示範飼主", secondaryUse: false },
  });

  const cases = [
    {
      dogPublicId: "DOG-A1B2C3",
      lesionPublicId: "LSN-A10001",
      breed: "黃金獵犬",
      site: "軀幹",
      laterality: "left" as const,
      color: { r: 210, g: 180, b: 140 },
      reject: false,
      triage: "needs_vet_review" as const,
      pathology: {
        malignancyLabel: "yes" as const,
        tumorType: "軟組織肉瘤",
        sampleType: "手術切除",
        certainty: "certain",
        reportSummary: "病理確認惡性腫瘤。此標籤只供覆核，不得進入相片推論。",
      },
    },
    {
      dogPublicId: "DOG-B2C3D4",
      lesionPublicId: "LSN-B20002",
      breed: "米克斯",
      site: "後肢",
      laterality: "right" as const,
      color: { r: 186, g: 170, b: 155 },
      reject: false,
      triage: "needs_vet_review" as const,
      pathology: {
        malignancyLabel: "no" as const,
        tumorType: "脂肪瘤",
        sampleType: "切除活檢",
        certainty: "certain",
        reportSummary: "足夠組織證實良性腫瘤。",
      },
    },
    {
      dogPublicId: "DOG-C3D4E5",
      lesionPublicId: "LSN-C30003",
      breed: "拉布拉多",
      site: "頭部",
      laterality: "midline" as const,
      color: { r: 120, g: 110, b: 100 },
      reject: true,
      triage: "cannot_assess" as const,
      pathology: {
        malignancyLabel: "uncertain" as const,
        tumorType: "樣本不足",
        sampleType: "FNA",
        certainty: "uncertain",
        reportSummary: "細胞量不足，標為 uncertain，不可當作陰性。",
      },
    },
  ];

  const views = ["overview", "frontal", "oblique_1", "oblique_2"] as const;

  for (const item of cases) {
    const dog = await prisma.dog.create({
      data: {
        publicId: item.dogPublicId,
        consentId: consent.id,
        ageYears: 7,
        breed: item.breed,
        mixedBreed: item.breed.includes("米克斯"),
        sex: "female",
        neutered: true,
        weightKg: 22,
        coatColor: "淺色",
        coatLength: "中毛",
      },
    });
    const lesion = await prisma.lesion.create({
      data: {
        publicId: item.lesionPublicId,
        dogId: dog.id,
        site: item.site,
        laterality: item.laterality,
        sizeLengthMm: 18,
        sizeWidthMm: 14,
        durationText: "約一個月",
        changeText: "輕微變大",
        ulceration: false,
        pruritus: false,
        priorMctHistory: false,
      },
    });
    const session = await prisma.photoSession.create({
      data: {
        lesionId: lesion.id,
        clinic: "clinic-demo",
        photographer: "staff-seed",
        device: item.reject ? "Android Pixel" : "iPhone 15",
        lighting: "室內日光燈",
      },
    });

    for (const view of views) {
      const filename = item.reject ? `reject-${view}.jpg` : `${view}.jpg`;
      const buffer = await makeJpeg(`${item.lesionPublicId} ${view}`, item.color);
      const stored = await store(session.id, view, buffer, filename);
      const qcReasons = item.reject ? ["qc.reject_demo"] : [];
      await prisma.photo.create({
        data: {
          sessionId: session.id,
          view,
          ...stored,
          qcStatus: item.reject ? "fail" : "pass",
          qcReasons: JSON.stringify(qcReasons),
        },
      });
    }

    const photos = await prisma.photo.findMany({ where: { sessionId: session.id } });
    const inputHash = hash(Buffer.from(photos.map((photo) => photo.sha256).join("|")));
    await prisma.inferenceRun.create({
      data: {
        sessionId: session.id,
        modelVersion: MODEL_VERSION,
        status: item.triage,
        rejectReasons: JSON.stringify(item.reject ? ["qc.reject_demo"] : []),
        qcPassed: !item.reject,
        roiJson: JSON.stringify(views.map((view) => ({ view, x: 0.35, y: 0.3, width: 0.3, height: 0.3 }))),
        inputHash,
        physicalMatch: !item.reject,
        visibleRoi: !item.reject,
      },
    });
    await prisma.pathologyRecord.create({
      data: {
        lesionId: lesion.id,
        sampledAt: new Date("2026-08-01"),
        sampleType: item.pathology.sampleType,
        labName: "demo-lab",
        reportSummary: item.pathology.reportSummary,
        tumorType: item.pathology.tumorType,
        malignancyLabel: item.pathology.malignancyLabel,
        certainty: item.pathology.certainty,
        reviewerName: "reviewer-seed",
      },
    });
  }

  await prisma.incidentReport.create({
    data: {
      category: "tech_failure",
      detail: "示範：拍攝時閃燈反光，已重拍。",
      reporterRole: "clinic",
    },
  });

  const demoDir = path.join(process.cwd(), "public", "demo");
  await mkdir(demoDir, { recursive: true });
  for (const view of views) {
    const buffer = await makeJpeg(`demo ${view}`, { r: 200, g: 168, b: 132 });
    await writeFile(path.join(demoDir, `${view}.jpg`), buffer);
    const reject = await makeJpeg(`reject ${view}`, { r: 90, g: 90, b: 90 });
    await writeFile(path.join(demoDir, `reject-${view}.jpg`), reject);
  }

  console.log("Seed complete. Demo consent id:", consent.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
