// State & Elements
const urlInput = document.getElementById('url-input');
const clearBtn = document.getElementById('clear-btn');
const fgColor = document.getElementById('fg-color');
const bgColor = document.getElementById('bg-color');
const fgColorHex = document.getElementById('fg-color-hex');
const bgColorHex = document.getElementById('bg-color-hex');
const errorLevel = document.getElementById('error-level');
const qrSizeSelect = document.getElementById('qr-size');
const qrcodeContainer = document.getElementById('qrcode');
const qrcodeWrapper = document.getElementById('qrcode-wrapper');
const urlCaption = document.getElementById('url-caption');
const downloadPngBtn = document.getElementById('download-png-btn');
const copyImgBtn = document.getElementById('copy-img-btn');
const toast = document.getElementById('toast');
const presetTags = document.querySelectorAll('.preset-tag');
const paletteChips = document.querySelectorAll('.palette-chip');

let qrCodeInstance = null;
let toastTimeout = null;

// Error level mapping for QRCode.js
function getCorrectLevel(levelStr) {
  if (typeof QRCode === 'undefined') return 2;
  switch (levelStr) {
    case 'L': return QRCode.CorrectLevel.L;
    case 'M': return QRCode.CorrectLevel.M;
    case 'Q': return QRCode.CorrectLevel.Q;
    case 'H': return QRCode.CorrectLevel.H;
    default: return QRCode.CorrectLevel.M;
  }
}

// Generate / Render QR Code
function renderQRCode() {
  const text = (urlInput.value || '').trim();
  
  if (!text) {
    qrcodeContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:210px;width:210px;color:#94a3b8;font-size:0.875rem;text-align:center;gap:8px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        URL을 입력해주세요
      </div>
    `;
    urlCaption.textContent = '입력 대기 중...';
    downloadPngBtn.disabled = true;
    copyImgBtn.disabled = true;
    downloadPngBtn.style.opacity = '0.5';
    copyImgBtn.style.opacity = '0.5';
    return;
  }

  downloadPngBtn.disabled = false;
  copyImgBtn.disabled = false;
  downloadPngBtn.style.opacity = '1';
  copyImgBtn.style.opacity = '1';

  urlCaption.textContent = text;
  urlCaption.title = text;

  // Clear previous element
  qrcodeContainer.innerHTML = '';
  qrcodeWrapper.style.backgroundColor = bgColor.value;

  const currentSize = parseInt(qrSizeSelect.value, 10) || 512;
  // Visual display dimension (keep responsive and crisp)
  const displaySize = 210;

  try {
    qrCodeInstance = new QRCode(qrcodeContainer, {
      text: text,
      width: displaySize,
      height: displaySize,
      colorDark: fgColor.value,
      colorLight: bgColor.value,
      correctLevel: getCorrectLevel(errorLevel.value)
    });
  } catch (err) {
    console.error('QR code generation failed:', err);
    qrcodeContainer.innerHTML = `<span style="color:#ef4444;font-size:0.85rem;">생성 실패: 내용이 너무 길거나 올바르지 않습니다.</span>`;
  }
}

// Generate high-resolution canvas for downloading
function createExportCanvas(exportSize) {
  const text = (urlInput.value || '').trim();
  if (!text) return null;

  const tempDiv = document.createElement('div');
  tempDiv.style.display = 'none';
  document.body.appendChild(tempDiv);

  new QRCode(tempDiv, {
    text: text,
    width: exportSize,
    height: exportSize,
    colorDark: fgColor.value,
    colorLight: bgColor.value,
    correctLevel: getCorrectLevel(errorLevel.value)
  });

  const canvas = tempDiv.querySelector('canvas');
  let finalCanvas = canvas;

  if (!canvas) {
    const img = tempDiv.querySelector('img');
    if (img) {
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = exportSize;
      finalCanvas.height = exportSize;
      const ctx = finalCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, exportSize, exportSize);
    }
  }

  // Add subtle padding/margin around QR code for neat output
  const padding = Math.round(exportSize * 0.06);
  const totalSize = exportSize + padding * 2;
  const paddedCanvas = document.createElement('canvas');
  paddedCanvas.width = totalSize;
  paddedCanvas.height = totalSize;
  const pCtx = paddedCanvas.getContext('2d');

  pCtx.fillStyle = bgColor.value;
  pCtx.fillRect(0, 0, totalSize, totalSize);
  if (finalCanvas) {
    pCtx.drawImage(finalCanvas, padding, padding, exportSize, exportSize);
  }

  document.body.removeChild(tempDiv);
  return paddedCanvas;
}

// Download action
function downloadPNG() {
  const exportSize = parseInt(qrSizeSelect.value, 10) || 512;
  const canvas = createExportCanvas(exportSize);
  if (!canvas) return;

  const safeName = (urlInput.value || 'qrcode')
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 20) || 'qrcode';

  const link = document.createElement('a');
  link.download = `QR_${safeName}_${exportSize}px.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('💾 PNG 파일이 다운로드되었습니다!');
}

// Copy to Clipboard
async function copyToClipboard() {
  const canvas = createExportCanvas(512);
  if (!canvas) return;

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast('복사에 실패했습니다.');
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('📋 이미지가 클립보드에 복사되었습니다!');
      } catch (e) {
        // Fallback for environments with strict clipboard restrictions
        fallbackCopyDataUrl(canvas.toDataURL('image/png'));
      }
    }, 'image/png');
  } catch (err) {
    console.warn(err);
    showToast('복사를 지원하지 않는 브라우저 환경입니다.');
  }
}

function fallbackCopyDataUrl(dataUrl) {
  showToast('이미지 데이터를 생성했습니다. 우클릭 후 복사해주세요!');
}

// Toast helper
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// Event Listeners
urlInput.addEventListener('input', renderQRCode);

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  urlInput.focus();
  renderQRCode();
});

fgColor.addEventListener('input', (e) => {
  fgColorHex.textContent = e.target.value.toUpperCase();
  renderQRCode();
});

bgColor.addEventListener('input', (e) => {
  bgColorHex.textContent = e.target.value.toUpperCase();
  renderQRCode();
});

errorLevel.addEventListener('change', renderQRCode);
qrSizeSelect.addEventListener('change', renderQRCode);

downloadPngBtn.addEventListener('click', downloadPNG);
copyImgBtn.addEventListener('click', copyToClipboard);

// Preset clicks
presetTags.forEach(tag => {
  tag.addEventListener('click', () => {
    urlInput.value = tag.getAttribute('data-val');
    renderQRCode();
  });
});

// Color Palette quick picker
paletteChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const fg = chip.getAttribute('data-fg');
    const bg = chip.getAttribute('data-bg');
    fgColor.value = fg;
    bgColor.value = bg;
    fgColorHex.textContent = fg.toUpperCase();
    bgColorHex.textContent = bg.toUpperCase();
    renderQRCode();
  });
});

// Initial run
window.addEventListener('DOMContentLoaded', () => {
  renderQRCode();
});
