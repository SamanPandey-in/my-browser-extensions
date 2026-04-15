document.getElementById("extract").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "extractColors" }, (response) => {
    const container = document.getElementById("colors");
    container.innerHTML = "";

    response.colors.forEach(color => {
      const div = document.createElement("div");
      div.className = "color";
      div.style.background = color;
      div.title = color;

      div.addEventListener("click", () => {
        navigator.clipboard.writeText(color);
      });

      container.appendChild(div);
    });
  });
});