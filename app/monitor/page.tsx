import { getRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/http";
import { reasonLabel } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export default async function MonitorPage() {
  const role = await getRole();
  if (role !== "monitor") redirect("/");
  const { locale, t } = await getT();

  const [dogs, lesions, photos, inferences, pathology, reports, sessions] = await Promise.all([
    prisma.dog.count(),
    prisma.lesion.count(),
    prisma.photo.findMany(),
    prisma.inferenceRun.findMany(),
    prisma.pathologyRecord.findMany(),
    prisma.incidentReport.count(),
    prisma.photoSession.findMany(),
  ]);

  const qcPass = photos.filter((photo) => photo.qcStatus === "pass").length;
  const rejectCounts: Record<string, number> = {};
  for (const run of inferences) {
    if (run.status !== "cannot_assess") continue;
    for (const reason of parseJsonArray(run.rejectReasons)) {
      const label = reasonLabel(locale, reason);
      rejectCounts[label] = (rejectCounts[label] ?? 0) + 1;
    }
  }
  const deviceCounts: Record<string, number> = {};
  for (const session of sessions) {
    deviceCounts[session.device] = (deviceCounts[session.device] ?? 0) + 1;
  }

  const cards = [
    { label: t("monitor.dogs"), value: dogs },
    { label: t("monitor.lesions"), value: lesions },
    { label: t("monitor.qcRate"), value: photos.length ? `${Math.round((qcPass / photos.length) * 1000) / 10}` : "—" },
    { label: t("monitor.inferred"), value: inferences.length },
    { label: t("monitor.linked"), value: `${pathology.length}/${lesions}` },
    { label: t("monitor.reports"), value: reports },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">{t("monitor.title")}</h2>
        <p className="text-sm text-muted">{t("monitor.intro")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold">{t("monitor.rejects")}</h3>
          <BarList items={rejectCounts} empty={t("monitor.noReject")} />
        </div>
        <div className="card">
          <h3 className="font-semibold">{t("monitor.devices")}</h3>
          <BarList items={deviceCounts} empty={t("monitor.noSession")} />
        </div>
      </section>
      <section className="card text-sm text-muted">
        <p>
          {t("monitor.triage", {
            review: inferences.filter((item) => item.status === "needs_vet_review").length,
            reject: inferences.filter((item) => item.status === "cannot_assess").length,
          })}
        </p>
        <p className="mt-2">
          {t("monitor.labels", {
            yes: pathology.filter((p) => p.malignancyLabel === "yes").length,
            no: pathology.filter((p) => p.malignancyLabel === "no").length,
            uncertain: pathology.filter((p) => p.malignancyLabel === "uncertain").length,
            excluded: pathology.filter((p) => p.malignancyLabel === "excluded").length,
          })}
        </p>
      </section>
    </div>
  );
}

function BarList({ items, empty }: { items: Record<string, number>; empty: string }) {
  const rows = Object.entries(items);
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map(([, n]) => n));
  return (
    <ul className="mt-3 space-y-2">
      {rows.map(([label, count]) => (
        <li key={label}>
          <div className="flex justify-between text-sm">
            <span>{label}</span>
            <span>{count}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-sand">
            <div className="h-2 rounded bg-terra" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
