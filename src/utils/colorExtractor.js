function hslFromString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 72%, 45%)`;
}

export function extractDominantColor(imageUrl, fallbackKey = '') {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(hslFromString(fallbackKey));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;

    const finish = (color) => {
      if (!settled) {
        settled = true;
        resolve(color);
      }
    };

    const timer = setTimeout(() => finish(hslFromString(fallbackKey || imageUrl)), 2500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > 30 && lum < 230) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        if (count === 0) {
          finish(hslFromString(fallbackKey || imageUrl));
          return;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        finish(`rgb(${r}, ${g}, ${b})`);
      } catch {
        finish(hslFromString(fallbackKey || imageUrl));
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      finish(hslFromString(fallbackKey || imageUrl));
    };

    img.src = imageUrl;
  });
}
