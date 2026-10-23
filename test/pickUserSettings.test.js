import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickUserSettings,
  sanitizeButtonsSetting,
  sanitizeClickCounts,
} from "../utils/pickUserSettings.js";

const goBack = { id: "goBack", image: "arrow-left", status: "IN_TOOLBAR", top: 15, left: 93.3 };
const reload = { id: "reload", image: "rotate", status: "IN_LIST" };

test("허용된 설정 필드만 꺼낸다", () => {
  const settings = pickUserSettings({
    googleId: "someone-else",
    buttonsSetting: [goBack, reload],
    isDarkMode: true,
    addressOfNewTab: "https://example.com",
    buttonClickCounts: { goBack: 3 },
    createdAt: "2000-01-01",
  });

  assert.deepEqual(settings, {
    buttonsSetting: [goBack, reload],
    isDarkMode: true,
    addressOfNewTab: "https://example.com",
  });
});

test("타입이 잘못된 값은 무시한다", () => {
  const settings = pickUserSettings({
    buttonsSetting: "not-array",
    isDarkMode: "true",
    addressOfNewTab: "javascript:alert(1)",
  });

  assert.deepEqual(settings, {});
  assert.deepEqual(pickUserSettings(undefined), {});
});

test("버튼 설정은 알려진 버튼만 허용하고 불필요한 필드는 버린다", () => {
  assert.deepEqual(sanitizeButtonsSetting([{ ...reload, extra: "x" }]), [reload]);

  assert.equal(sanitizeButtonsSetting([{ id: "unknown", image: "x", status: "IN_LIST" }]), null);
  assert.equal(sanitizeButtonsSetting([{ ...reload, image: "../../evil" }]), null);
  assert.equal(sanitizeButtonsSetting([{ ...reload, status: "HIDDEN" }]), null);
  assert.equal(sanitizeButtonsSetting([reload, reload]), null);
  assert.equal(sanitizeButtonsSetting([{ id: "__proto__", image: "x", status: "IN_LIST" }]), null);
});

test("클릭 횟수는 알려진 버튼 id와 범위 안의 정수만 허용한다", () => {
  assert.deepEqual(sanitizeClickCounts({ goBack: 3, newTab: 0 }), { goBack: 3, newTab: 0 });

  assert.equal(sanitizeClickCounts([1, 2]), null);
  assert.equal(sanitizeClickCounts({ goBack: 1.5 }), null);
  assert.equal(sanitizeClickCounts({ goBack: -1 }), null);
  assert.equal(sanitizeClickCounts({ "$set": 1 }), null);
  assert.equal(sanitizeClickCounts({ "a.b": 1 }), null);
  assert.equal(sanitizeClickCounts({ goBack: 0 }, { min: 1 }), null);
  assert.equal(sanitizeClickCounts({ goBack: 5000 }, { max: 1000 }), null);
});
