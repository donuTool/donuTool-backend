import { test } from "node:test";
import assert from "node:assert/strict";
import { pickUserSettings } from "../utils/pickUserSettings.js";

test("허용된 필드만 꺼낸다", () => {
  const settings = pickUserSettings({
    googleId: "someone-else",
    buttonsSetting: [{ id: "goBack" }],
    isDarkMode: true,
    addressOfNewTab: "https://example.com",
    buttonClickCounts: { goBack: 3 },
    createdAt: "2000-01-01",
  });

  assert.deepEqual(settings, {
    buttonsSetting: [{ id: "goBack" }],
    isDarkMode: true,
    addressOfNewTab: "https://example.com",
    buttonClickCounts: { goBack: 3 },
  });
});

test("타입이 잘못된 값은 무시한다", () => {
  const settings = pickUserSettings({
    buttonsSetting: "not-array",
    isDarkMode: "true",
    addressOfNewTab: "javascript:alert(1)",
    buttonClickCounts: { goBack: -1 },
  });

  assert.deepEqual(settings, {});
});

test("buttonClickCounts는 객체만 허용한다", () => {
  assert.deepEqual(pickUserSettings({ buttonClickCounts: [1, 2] }), {});
  assert.deepEqual(pickUserSettings({ buttonClickCounts: { a: 1.5 } }), {});
});
