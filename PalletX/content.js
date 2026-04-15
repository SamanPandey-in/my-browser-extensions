function extractColors() {
  const elements = document.querySelectorAll("*");
  const colors = new Set();

  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    ["color", "backgroundColor", "borderColor"].forEach(prop => {
      const val = style[prop];
      if (val && val !== "rgba(0, 0, 0, 0)") {
        colors.add(val);
      }
    });
  });

  return Array.from(colors);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractColors") {
    const colors = extractColors();
    sendResponse({ colors });
  }
});