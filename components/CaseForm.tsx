"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/constants";
import { detectDeviceLabel } from "@/lib/device";
import { RECOMMENDED_LIGHTING } from "@/lib/photo-protocol";
import {
  BREED_IDS,
  COAT_COLOR_IDS,
  COAT_LENGTH_IDS,
  LIGHTING_IDS,
  SITE_IDS,
  t,
  type Locale,
} from "@/lib/i18n";

export function CaseForm({
  role,
  locale,
  detectedDevice = "",
}: {
  role: Role;
  locale: Locale;
  detectedDevice?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [breed, setBreed] = useState("");
  const [mixed, setMixed] = useState(false);
  const [device, setDevice] = useState(detectedDevice);
  const isOwner = role === "user";

  useEffect(() => {
    let cancelled = false;
    detectDeviceLabel(detectedDevice).then((result) => {
      if (cancelled) return;
      setDevice((current) => {
        if (current) return current;
        return result.label && result.label !== "unspecified" ? result.label : "";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [detectedDevice]);

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
        breed,
        breedOther: String(form.get("breedOther") ?? ""),
        mixedBreed: mixed,
        ulceration: form.get("ulceration") === "on",
        pruritus: form.get("pruritus") === "on",
        priorMctHistory: form.get("priorMctHistory") === "on",
        ageYears: numberOrNull(form.get("ageYears")),
        weightKg: numberOrNull(form.get("weightKg")),
        sizeLengthMm: numberOrNull(form.get("sizeLengthMm")),
        sizeWidthMm: numberOrNull(form.get("sizeWidthMm")),
        sizeHeightMm: numberOrNull(form.get("sizeHeightMm")),
        neutered: form.get("neutered") === "" ? null : form.get("neutered") === "yes",
        device,
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
        <label className="block text-sm">
          {t(locale, "caseForm.breed")}
          <select
            name="breed"
            required
            value={breed}
            onChange={(event) => {
              const next = event.target.value;
              setBreed(next);
              if (next === "mixed") setMixed(true);
            }}
            className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5"
          >
            <option value="" disabled>
              {t(locale, "caseForm.breedPh")}
            </option>
            {BREED_IDS.map((id) => (
              <option key={id} value={id}>
                {t(locale, `breed.${id}`)}
              </option>
            ))}
          </select>
        </label>
        {breed === "other" ? (
          <Field name="breedOther" label={t(locale, "caseForm.breedOther")} required placeholder={t(locale, "caseForm.breedOther")} />
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mixedBreed" checked={mixed} onChange={(event) => setMixed(event.target.checked)} />{" "}
          {t(locale, "caseForm.mixed")}
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
        <label className="block text-sm">
          {t(locale, "caseForm.device")}
          <input
            name="device"
            required
            value={device}
            onChange={(event) => setDevice(event.target.value)}
            placeholder="iPhone 15"
            className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5"
          />
          <span className="mt-1 block text-xs text-muted">{t(locale, "caseForm.deviceHint")}</span>
        </label>
        <Select
          name="lighting"
          label={t(locale, "caseForm.lighting")}
          defaultValue={RECOMMENDED_LIGHTING}
          options={LIGHTING_IDS.map((id) => ({ value: id, label: t(locale, `lighting.${id}`) }))}
        />
        <p className="text-xs text-muted">{t(locale, "caseForm.lightingHint")}</p>
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
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select
        name={name}
        className="mt-1 w-full rounded-full border border-sand bg-[#fffef8] px-4 py-2.5"
        defaultValue={defaultValue ?? options[0]?.value}
      >
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
