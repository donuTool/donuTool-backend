// 요청 body에서 저장을 허용하는 필드만 검증해서 꺼낸다
export function pickUserSettings(body) {
  const settings = {};

  if (Array.isArray(body.buttonsSetting)) {
    settings.buttonsSetting = body.buttonsSetting;
  }
  if (typeof body.isDarkMode === "boolean") {
    settings.isDarkMode = body.isDarkMode;
  }
  if (
    typeof body.addressOfNewTab === "string" &&
    /^https?:\/\//.test(body.addressOfNewTab)
  ) {
    settings.addressOfNewTab = body.addressOfNewTab;
  }
  if (
    body.buttonClickCounts &&
    typeof body.buttonClickCounts === "object" &&
    !Array.isArray(body.buttonClickCounts) &&
    Object.values(body.buttonClickCounts).every(
      (count) => Number.isInteger(count) && count >= 0,
    )
  ) {
    settings.buttonClickCounts = body.buttonClickCounts;
  }

  return settings;
}
