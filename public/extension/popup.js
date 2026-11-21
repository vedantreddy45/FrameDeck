const chkEffects = document.getElementById('chk-effects');
const chkZoom = document.getElementById('chk-zoom');
const chkHighlight = document.getElementById('chk-highlight');
const inputStudioUrl = document.getElementById('input-studio-url');
const statusEl = document.getElementById('status');

chrome.storage.local.get(
  ['effectsEnabled', 'doubleTapZoom', 'sentenceHighlight', 'studioUrl'],
  (data) => {
    chkEffects.checked = data.effectsEnabled !== false;
    chkZoom.checked = data.doubleTapZoom !== false;
    chkHighlight.checked = data.sentenceHighlight !== false;
    inputStudioUrl.value = data.studioUrl || 'http://localhost:3000';
  }
);

function saveToggle(key, value) {
  chrome.storage.local.set({ [key]: value });
}

chkEffects.addEventListener('change', () => saveToggle('effectsEnabled', chkEffects.checked));
chkZoom.addEventListener('change', () => saveToggle('doubleTapZoom', chkZoom.checked));
chkHighlight.addEventListener('change', () => saveToggle('sentenceHighlight', chkHighlight.checked));
inputStudioUrl.addEventListener('change', () =>
  saveToggle('studioUrl', inputStudioUrl.value.trim() || 'http://localhost:3000')
);

document.getElementById('btn-capture-tab').addEventListener('click', () => {
  statusEl.textContent = 'Capturing tab...';
  chrome.runtime.sendMessage({ type: 'CAPTURE_TAB_CLIPBOARD' }, (res) => {
    if (res?.ok) {
      statusEl.style.color = '#34d399';
      statusEl.textContent = 'Screenshot copied to clipboard.';
    } else {
      statusEl.style.color = '#fb7185';
      statusEl.textContent = res?.error || 'Could not capture this tab.';
    }
  });
});

document.getElementById('btn-open-studio').addEventListener('click', () => {
  chrome.runtime.sendMessage({
    type: 'OPEN_STUDIO',
    url: inputStudioUrl.value.trim() || undefined,
  });
});
