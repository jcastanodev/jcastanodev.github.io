// Visual source of a cat: SVG string or animated GIF. Both expose the same
// interface so the renderer never cares which one it is drawing.
//
//   sprite.w / sprite.h      natural size (0 until ready)
//   sprite.frame(nowMs)      -> CanvasImageSource | null  (null while loading)

export function svgSprite(svg) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return {
    // Our SVGs only declare a viewBox, so natural size is unreliable.
    w: 200,
    h: 220,
    frame: () => (img.complete ? img : null),
  };
}

// Animated GIF. Uses ImageDecoder (Chrome/Edge) to get every frame as a
// bitmap, so canvas drawing is deterministic and exportable later. Without it
// we fall back to an <img> kept in the DOM, which browsers keep animating.
export function gifSprite(url) {
  const sprite = { w: 0, h: 0, frame: () => null };
  const t0 = performance.now();

  const fallback = () => {
    const img = new Image();
    img.src = url;
    img.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none';
    document.body.appendChild(img);
    sprite.frame = () => {
      if (!img.complete || !img.naturalWidth) return null;
      sprite.w = img.naturalWidth;
      sprite.h = img.naturalHeight;
      return img;
    };
  };

  if (typeof ImageDecoder === 'undefined') {
    fallback();
    return sprite;
  }

  (async () => {
    const buf = await (await fetch(url)).arrayBuffer();
    const decoder = new ImageDecoder({ data: buf, type: 'image/gif' });
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack.frameCount;
    const frames = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      const ms = Math.max(20, (image.duration || 100000) / 1000);
      frames.push({ bmp: await createImageBitmap(image), end: (total += ms) });
      image.close();
    }
    decoder.close();
    if (!frames.length) throw new Error('empty gif');
    sprite.w = frames[0].bmp.width;
    sprite.h = frames[0].bmp.height;
    sprite.frame = (now) => {
      const t = (now - t0) % total;
      for (const f of frames) if (t < f.end) return f.bmp;
      return frames[frames.length - 1].bmp;
    };
  })().catch(fallback);

  return sprite;
}

// Fit a w x h source inside the cat box (200 x 220 in cat space), centered
// horizontally and resting on the floor. Pure.
export const CAT_BOX = { w: 200, h: 220 };

export function fitInCatBox(w, h) {
  if (!w || !h) return { x: 0, y: 0, w: CAT_BOX.w, h: CAT_BOX.h };
  const s = Math.min(CAT_BOX.w / w, CAT_BOX.h / h);
  const dw = w * s;
  const dh = h * s;
  return { x: (CAT_BOX.w - dw) / 2, y: CAT_BOX.h - dh, w: dw, h: dh };
}
