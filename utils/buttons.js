// 확장프로그램(src/shared/defaultButtons.ts)에 정의된 버튼 id와 아이콘 이름
export const BUTTON_IMAGES = {
  goBack: "arrow-left",
  goForward: "arrow-right",
  newTab: "new",
  moveToNextTab: "arrow-right-to-line",
  moveToPrevTab: "arrow-left-to-line",
  reload: "rotate",
  close: "close",
  translate: "languages",
  downloadImages: "image-down",
  bookmark: "star",
  bookmark2: "bookmark",
  copyTabAddress: "clipboard-copy",
  print: "printer",
  capture: "camera",
};

export const BUTTON_IDS = Object.keys(BUTTON_IMAGES);
export const BUTTON_STATUSES = ["IN_TOOLBAR", "IN_LIST"];

export const isButtonId = (id) =>
  typeof id === "string" && Object.hasOwn(BUTTON_IMAGES, id);
