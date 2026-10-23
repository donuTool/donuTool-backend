import { BUTTON_IDS, BUTTON_IMAGES, BUTTON_STATUSES, isButtonId } from "./buttons.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

// 버튼 설정 배열을 검증하고, 저장할 필드만 남긴 사본을 돌려준다. 잘못되면 null
export function sanitizeButtonsSetting(buttons) {
  if (!Array.isArray(buttons) || buttons.length > BUTTON_IDS.length) {
    return null;
  }

  const seen = new Set();
  const sanitized = [];

  for (const button of buttons) {
    if (!isPlainObject(button) || !isButtonId(button.id)) return null;
    if (seen.has(button.id)) return null;
    if (button.image !== BUTTON_IMAGES[button.id]) return null;
    if (!BUTTON_STATUSES.includes(button.status)) return null;
    seen.add(button.id);

    const item = { id: button.id, image: button.image, status: button.status };
    if (isFiniteNumber(button.top)) item.top = button.top;
    if (isFiniteNumber(button.left)) item.left = button.left;
    sanitized.push(item);
  }

  return sanitized;
}

// { 버튼id: 횟수 } 객체를 검증한다. 잘못되면 null
export function sanitizeClickCounts(counts, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!isPlainObject(counts)) return null;

  const entries = Object.entries(counts);
  const isValid = entries.every(
    ([id, count]) =>
      isButtonId(id) && Number.isInteger(count) && count >= min && count <= max,
  );

  return isValid ? Object.fromEntries(entries) : null;
}

// 요청 body에서 사용자가 수정할 수 있는 설정 필드만 검증해서 꺼낸다.
// (클릭 횟수는 덮어쓰기로 데이터가 사라지지 않도록 /api/user/me/clicks 로만 늘린다)
export function pickUserSettings(body) {
  const settings = {};
  if (!isPlainObject(body)) return settings;

  const buttonsSetting = sanitizeButtonsSetting(body.buttonsSetting);
  if (buttonsSetting) {
    settings.buttonsSetting = buttonsSetting;
  }
  if (typeof body.isDarkMode === "boolean") {
    settings.isDarkMode = body.isDarkMode;
  }
  if (
    typeof body.addressOfNewTab === "string" &&
    body.addressOfNewTab.length <= 2048 &&
    /^https?:\/\//.test(body.addressOfNewTab)
  ) {
    settings.addressOfNewTab = body.addressOfNewTab;
  }

  return settings;
}
