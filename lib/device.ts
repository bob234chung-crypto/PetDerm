export type DeviceSource = "hints" | "ua" | "fallback";

type UAData = {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    model?: string;
    platform?: string;
    platformVersion?: string;
  }>;
};

export function labelFromClientHints(
  model?: string | null,
  platform?: string | null,
  platformVersion?: string | null,
) {
  const cleanModel = unwrapHint(model);
  const cleanPlatform = unwrapHint(platform);
  const cleanVersion = unwrapHint(platformVersion)?.replace(/"/g, "");
  if (cleanModel) {
    if (/ios|iphone/i.test(cleanPlatform) && !/iphone/i.test(cleanModel)) {
      return `iPhone ${cleanModel}`;
    }
    return cleanModel;
  }
  if (cleanPlatform) {
    const version = shortenPlatformVersion(cleanVersion);
    return version ? `${cleanPlatform} ${version}` : cleanPlatform;
  }
  return null;
}

export function labelFromUserAgent(ua: string) {
  if (!ua) return "";

  if (/iPhone/.test(ua)) {
    const ver = ua.match(/iPhone OS ([\d_]+)/);
    return ver ? `iPhone · iOS ${ver[1].replace(/_/g, ".")}` : "iPhone";
  }
  if (/iPad/.test(ua)) {
    const ver = ua.match(/OS ([\d_]+)/);
    return ver ? `iPad · iPadOS ${ver[1].replace(/_/g, ".")}` : "iPad";
  }

  const android = ua.match(/Android [\d.]+; ([^;)]+?)(?:\s+Build\/|; wv|\) )/);
  if (android) {
    const token = android[1].replace(/\/[\w.-]+$/, "").trim();
    if (token && token !== "K" && !/^wv$/i.test(token) && token.toLowerCase() !== "mobile") {
      return token;
    }
  }
  const androidVer = ua.match(/Android ([\d.]+)/);
  if (androidVer) return `Android ${androidVer[1]}`;

  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "";
}

export function deviceFromRequestHeaders(headers: Headers) {
  const fromHints = labelFromClientHints(
    headers.get("sec-ch-ua-model"),
    headers.get("sec-ch-ua-platform"),
    headers.get("sec-ch-ua-platform-version"),
  );
  if (fromHints) return fromHints;
  return labelFromUserAgent(headers.get("user-agent") ?? "");
}

export async function detectDeviceLabel(seed = ""): Promise<{ label: string; source: DeviceSource }> {
  if (typeof navigator === "undefined") {
    return { label: seed || "unspecified", source: "fallback" };
  }

  const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hints = await uaData.getHighEntropyValues(["model", "platform", "platformVersion"]);
      const fromHints = labelFromClientHints(hints.model, hints.platform ?? uaData.platform, hints.platformVersion);
      if (fromHints) return { label: richerLabel(seed, fromHints), source: "hints" };
    } catch {
      /* Client hints can be denied. */
    }
  }

  const fromUa = labelFromUserAgent(navigator.userAgent);
  if (fromUa) return { label: richerLabel(seed, fromUa), source: "ua" };
  if (seed) return { label: seed, source: "ua" };
  return { label: "unspecified", source: "fallback" };
}

function unwrapHint(value?: string | null) {
  if (!value) return "";
  return value.replace(/^"+|"+$/g, "").trim();
}

function shortenPlatformVersion(value?: string) {
  if (!value) return "";
  const parts = value.split(".");
  if (parts.length >= 2 && parts[0] !== "0") return `${parts[0]}.${parts[1]}`;
  return value;
}

function richerLabel(current: string, next: string) {
  if (!current || current === "unspecified") return next;
  if (!next || next === "unspecified") return current;
  const generic = /^(iPhone · iOS|iPad · iPadOS|Android \d|Windows PC|Mac|Linux)/;
  if (generic.test(current) && !generic.test(next)) return next;
  if (next.length > current.length && next.toLowerCase().includes(current.split(" · ")[0].toLowerCase())) {
    return next;
  }
  return current;
}
