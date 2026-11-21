const DEFAULT_STATE = {
  effectsEnabled: true,
  doubleTapZoom: true,
  sentenceHighlight: true,
  zoomScale: 1.85,
  highlightColor: 'rgba(250, 204, 21, 0.38)',
  studioUrl: 'http://localhost:3000',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULT_STATE), (existing) => {
    chrome.storage.local.set({ ...DEFAULT_STATE, ...existing });
  });
});

async function captureAndCopyActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return { ok: false, error: 'No active tab found.' };

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
    quality: 100,
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (pngDataUrl) => {
      const res = await fetch(pngDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    },
    args: [dataUrl],
  });

  return { ok: true, dataUrl };
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'take-screenshot') {
    try {
      await captureAndCopyActiveTab();
    } catch {
      // Tab may disallow scripting (e.g. chrome://)
    }
  } else if (command === 'toggle-effects') {
    chrome.storage.local.get(['effectsEnabled'], (data) => {
      chrome.storage.local.set({ effectsEnabled: !data.effectsEnabled });
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CAPTURE_TAB_CLIPBOARD') {
    captureAndCopyActiveTab()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err?.message || 'Capture failed' }));
    return true;
  }
  if (message?.type === 'OPEN_STUDIO') {
    chrome.storage.local.get(['studioUrl'], (data) => {
      const targetUrl = message.url || data.studioUrl || DEFAULT_STATE.studioUrl;
      chrome.tabs.create({ url: targetUrl });
      sendResponse({ ok: true });
    });
    return true;
  }
  return false;
});
