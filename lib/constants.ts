export const ROLES = ["user", "clinic", "reviewer", "monitor"] as const;
export type Role = (typeof ROLES)[number];
export const CAPTURE_ROLES = ["user", "clinic"] as const;

export function isCaptureRole(role: Role) {
  return (CAPTURE_ROLES as readonly string[]).includes(role);
}

export const ROLE_COOKIE = "petderm-role";
export const CONSENT_VERSION = "photo-research-v0.1";
export const MODEL_VERSION = "photo-triage-v1";

export const RESEARCH_DISCLAIMER =
  "研究用途：此工具只提供是否需要獸醫進一步評估的輔助分流訊號，並非診斷，不能排除 MCT 或癌症。";

export const MCT_NOT_INCLUDED = "MCT 專屬評估尚未納入此原型。";

export const PHOTO_VIEWS = [
  {
    id: "overview" as const,
    title: "定位照",
    hint: "保留完整解剖位置，讓人看得出腫塊在身體哪一處。",
  },
  {
    id: "frontal" as const,
    title: "正面近照",
    hint: "鏡頭盡量垂直於皮膚表面，對焦病灶。",
  },
  {
    id: "oblique_1" as const,
    title: "斜角近照 1",
    hint: "換一個斜角，避免強反光，尺／色卡仍要看得見。",
  },
  {
    id: "oblique_2" as const,
    title: "斜角近照 2",
    hint: "再換另一斜角。四張都要同一病灶、同一拍攝時點。",
  },
];

export const COAT_COLORS = ["淺色", "深色", "花斑", "不確定"];
export const COAT_LENGTHS = ["短毛", "中毛", "長毛", "不確定"];
export const SITES = [
  "頭部",
  "頸部",
  "軀幹",
  "前肢",
  "後肢",
  "腹部",
  "會陰／尾部",
  "其他",
];
export const LIGHTING_OPTIONS = ["室內日光燈", "室內自然光", "室外陰天", "室外直射", "閃燈"];
export const SAMPLE_TYPES = ["FNA", "穿刺活檢", "切除活檢", "手術切除", "其他"];
