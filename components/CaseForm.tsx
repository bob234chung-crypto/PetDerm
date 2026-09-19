"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/constants";
import {
  COAT_COLOR_IDS,
  COAT_LENGTH_IDS,
  LIGHTING_IDS,
  SITE_IDS,
  t,
  type Locale,
} from "@/lib/i18n";

export function CaseForm({ role, locale }: { role: Role; locale: Locale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isOwner = role === "user";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        mixedBreed: form.get("mixedBreed") === "on",
        ulceration: form.get("ulceration") === "on",
        pruritus: form.get("pruritus") === "on",
        priorMctHistory: form.get("priorMctHistory") === "on",
        ageYears: numberOrNull(form.get("ageYears")),
        weightKg: numberOrNull(form.get("weightKg")),
        sizeLengthMm: numberOrNull(form.get("sizeLengthMm")),
        sizeWidthMm: numberOrNull(form.get("sizeWidthMm")),
        sizeHeightMm: numberOrNull(form.get("sizeHeightMm")),
        neutered: form.get("neutered") === "" ? null : form.get("neutered") === "yes",
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? t(locale, "caseForm.createFail"));
      return;
    }
    router.push(`/case/${data.lesionId}/capture`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">{t(locale, "caseForm.privacy")}</p>
      <fieldset className="card space-y-3">
        <legend className="font-extrabold">{t(locale, "caseForm.dog")}</legend>
        <Field name="ageYears" label={t(locale, "caseForm.age")} type="number" step="0.1" />
        <Field name="breed" label={t(locale, "caseForm.breed")} required placeholder={t(locale, "caseForm.breedPh")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mixedBreed" /> {t(locale, "caseForm.mixed")}
        </label>
        <label className="block text-sm">
          {t(locale, "caseForm.sex")}
          <select name="sex" className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5" defaultValue="unknown">
            <option value="male">{t(locale, "caseForm.male")}</option>
            <option value="female">{t(locale, "caseForm.female")}</option>
            <option value="unknown">{t(locale, "caseForm.unknown")}</option>
          </select>
        </label>
        <label className="block text-sm">
          {t(locale, "caseForm.neuter")}
          <select name="neutered" className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5" defaultValue="">
            <option value="">{t(locale, "caseForm.unknown")}</option>
            <option value="yes">{t(locale, "caseForm.neutered")}</option>
            <option value="no">{t(locale, "caseForm.intact")}</option>
          </select>
        </label>
        <Field name="weightKg" label={t(locale, "caseForm.weight")} type="number" />
        <Select
          name="coatColor"
          label={t(locale, "caseForm.coatColor")}
          options={COAT_COLOR_IDS.map((id) => ({ value: id, label: t(locale, `coat.${id}`) }))}
        />
        <Select
          name="coatLength"
          label={t(locale, "caseForm.coatLength")}
          options={COAT_LENGTH_IDS.map((id) => ({ value: id, label: t(locale, `coatLen.${id}`) }))}
        />
      </fieldset>
      <fieldset className="card space-y-3">
        <legend className="font-extrabold">{t(locale, "caseForm.lesion")}</legend>
        <Select
          name="site"
          label={t(locale, "caseForm.site")}
          options={SITE_IDS.map((id) => ({ value: id, label: t(locale, `site.${id}`) }))}
        />
        <label className="block text-sm">
          {t(locale, "caseForm.laterality")}
          <select name="laterality" className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5" defaultValue="unknown">
            <option value="left">{t(locale, "caseForm.left")}</option>
            <option value="right">{t(locale, "caseForm.right")}</option>
            <option value="midline">{t(locale, "caseForm.midline")}</option>
            <option value="unknown">{t(locale, "caseForm.unknown")}</option>
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Field name="sizeLengthMm" label={t(locale, "caseForm.length")} type="number" />
          <Field name="sizeWidthMm" label={t(locale, "caseForm.width")} type="number" />
          <Field name="sizeHeightMm" label={t(locale, "caseForm.height")} type="number" />
        </div>
        <Field name="durationText" label={t(locale, "caseForm.duration")} placeholder={t(locale, "caseForm.durationPh")} />
        <Field name="changeText" label={t(locale, "caseForm.change")} placeholder={t(locale, "caseForm.changePh")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ulceration" /> {t(locale, "caseForm.ulceration")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pruritus" /> {t(locale, "caseForm.pruritus")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="priorMctHistory" /> {t(locale, "caseForm.priorMct")}
        </label>
      </fieldset>
      <fieldset className="card space-y-3">
        <legend className="font-extrabold">{t(locale, "caseForm.session")}</legend>
        <Field
          name="clinic"
          label={isOwner ? t(locale, "caseForm.place") : t(locale, "caseForm.clinicCode")}
          required
          defaultValue={isOwner ? t(locale, "caseForm.home") : "clinic-demo"}
        />
        <Field
          name="photographer"
          label={isOwner ? t(locale, "caseForm.photographer") : t(locale, "caseForm.photographerCode")}
          required
          defaultValue={isOwner ? t(locale, "caseForm.owner") : "staff-01"}
        />
        <Field name="device" label={t(locale, "caseForm.device")} required placeholder="iPhone 15" />
        <Select
          name="lighting"
          label={t(locale, "caseForm.lighting")}
          options={LIGHTING_IDS.map((id) => ({ value: id, label: t(locale, `lighting.${id}`) }))}
        />
      </fieldset>
      {error ? <p className="text-sm font-bold text-terra">{error}</p> : null}
      <button disabled={pending} className="btn-primary">
        {pending ? t(locale, "caseForm.creating") : t(locale, "caseForm.submit")}
      </button>
    </form>
  );
}

function Field(props: {
  name: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {props.label}
      <input
        name={props.name}
        type={props.type ?? "text"}
        step={props.step}
        required={props.required}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      {label}
      <select name={name} className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5" defaultValue={options[0]?.value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function numberOrNull(value: FormDataEntryValue | null) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
