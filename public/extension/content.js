(() => {
  let state = {
    effectsEnabled: true,
    doubleTapZoom: true,
    sentenceHighlight: true,
    zoomScale: 1.85,
    highlightColor: 'rgba(250, 204, 21, 0.38)',
  };

  let isZoomed = false;
  let isPressing = false;
  let anchorCaret = null;
  let highlightLayer = null;

  function syncState() {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get(
      ['effectsEnabled', 'doubleTapZoom', 'sentenceHighlight', 'zoomScale', 'highlightColor'],
      (saved) => {
        state = { ...state, ...saved };
        if (!state.effectsEnabled || !state.doubleTapZoom) {
          resetZoom();
        }
      }
    );
  }

  syncState();
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener(() => syncState());
  }

  function resetZoom() {
    isZoomed = false;
    document.documentElement.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    document.documentElement.style.transform = 'scale(1)';
  }

  function ensureHighlightLayer() {
    if (highlightLayer && document.body.contains(highlightLayer)) return highlightLayer;
    highlightLayer = document.createElement('div');
    highlightLayer.setAttribute('data-framedeck-highlight-layer', 'true');
    Object.assign(highlightLayer.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483646',
    });
    document.body.appendChild(highlightLayer);
    return highlightLayer;
  }

  function clearSentenceHighlight() {
    if (highlightLayer) {
      highlightLayer.innerHTML = '';
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && isPressing) {
      sel.removeAllRanges();
    }
  }

  function getCaretRangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (!pos) return null;
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }

  function renderRects(rects) {
    const layer = ensureHighlightLayer();
    layer.innerHTML = '';
    for (const rect of rects) {
      if (rect.width < 2 || rect.height < 2) continue;
      const box = document.createElement('div');
      Object.assign(box.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: state.highlightColor,
        borderRadius: '3px',
        mixBlendMode: 'multiply',
        transition: 'opacity 120ms ease',
      });
      layer.appendChild(box);
    }
  }

  // Double-tap / double-click smooth zoom in & out
  document.addEventListener(
    'dblclick',
    (e) => {
      if (!state.effectsEnabled || !state.doubleTapZoom) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      isZoomed = !isZoomed;
      const pctX = Math.max(0, Math.min(100, (e.clientX / window.innerWidth) * 100));
      const pctY = Math.max(0, Math.min(100, (e.clientY / window.innerHeight) * 100));

      document.documentElement.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
      if (isZoomed) {
        document.documentElement.style.transformOrigin = `${pctX}% ${pctY}%`;
        document.documentElement.style.transform = `scale(${state.zoomScale})`;
      } else {
        document.documentElement.style.transform = 'scale(1)';
      }
    },
    true
  );

  // PDF-style sentence highlighting while mouse key is pressed; clears on mouseup
  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0 || !state.effectsEnabled || !state.sentenceHighlight) return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target?.tagName)) return;
      isPressing = true;
      anchorCaret = getCaretRangeFromPoint(e.clientX, e.clientY);
    },
    true
  );

  document.addEventListener(
    'mousemove',
    (e) => {
      if (!isPressing || !state.effectsEnabled || !state.sentenceHighlight) return;
      const currentCaret = getCaretRangeFromPoint(e.clientX, e.clientY);
      if (!anchorCaret || !currentCaret) return;

      try {
        const range = document.createRange();
        const cmp = anchorCaret.compareBoundaryPoints(Range.START_TO_START, currentCaret);
        if (cmp <= 0) {
          range.setStart(anchorCaret.startContainer, anchorCaret.startOffset);
          range.setEnd(currentCaret.startContainer, currentCaret.startOffset);
        } else {
          range.setStart(currentCaret.startContainer, currentCaret.startOffset);
          range.setEnd(anchorCaret.startContainer, anchorCaret.startOffset);
        }
        const rects = Array.from(range.getClientRects());
        renderRects(rects);
      } catch {
        // Ignore cross-shadow boundary selection errors
      }
    },
    true
  );

  const handleRelease = () => {
    if (!isPressing) return;
    clearSentenceHighlight();
    isPressing = false;
    anchorCaret = null;
  };

  window.addEventListener('mouseup', handleRelease, true);
  window.addEventListener('blur', handleRelease, true);
})();
