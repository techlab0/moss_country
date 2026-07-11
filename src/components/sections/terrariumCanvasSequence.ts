const SOURCE_WIDTH = 1672;
const SOURCE_HEIGHT = 940;
const MAX_DECODED_FRAMES = 16;
const WARM_FRAME_RADIUS = 10;

type CanvasSequenceOptions = {
  canvas: HTMLCanvasElement;
  frameCount: number;
  frameUrl: (index: number) => string;
};

type CanvasSequenceRenderer = {
  destroy: () => void;
  render: (frame: number, direction?: number) => void;
};

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function createCanvasSequenceRenderer({
  canvas,
  frameCount,
  frameUrl,
}: CanvasSequenceOptions): CanvasSequenceRenderer {
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return { destroy: () => undefined, render: () => undefined };

  const abortController = new AbortController();
  const blobUrls = new Map<number, string>();
  const blobPromises = new Map<number, Promise<string>>();
  const decodedFrames = new Map<number, HTMLImageElement>();
  const decodePromises = new Map<number, Promise<HTMLImageElement>>();
  let disposed = false;
  let latestRequest = 0;
  let targetFrame = 0;
  let lastWarmCenter = -1;
  let lastWarmDirection = 1;

  const ensureBlobUrl = (index: number) => {
    const cached = blobUrls.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = blobPromises.get(index);
    if (pending) return pending;

    const promise = fetch(frameUrl(index), {
      cache: 'force-cache',
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load terrarium frame ${index}`);
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        blobUrls.set(index, url);
        return url;
      })
      .finally(() => blobPromises.delete(index));

    blobPromises.set(index, promise);
    return promise;
  };

  const loadFrame = (index: number) => {
    const cached = decodedFrames.get(index);
    if (cached) return Promise.resolve(cached);
    const pending = decodePromises.get(index);
    if (pending) return pending;

    const promise = ensureBlobUrl(index)
      .then((url) => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to decode terrarium frame ${index}`));
        image.src = url;
      }))
      .then((image) => {
        if (!disposed) decodedFrames.set(index, image);
        return image;
      })
      .finally(() => decodePromises.delete(index));

    decodePromises.set(index, promise);
    return promise;
  };

  const trimDecodedFrames = (center: number) => {
    if (decodedFrames.size <= MAX_DECODED_FRAMES) return;
    const retained = [...decodedFrames.keys()]
      .sort((left, right) => Math.abs(left - center) - Math.abs(right - center))
      .slice(0, MAX_DECODED_FRAMES);
    const retainedSet = new Set(retained);
    decodedFrames.forEach((image, index) => {
      if (retainedSet.has(index)) return;
      image.src = '';
      decodedFrames.delete(index);
    });
  };

  const drawCover = (image: HTMLImageElement, alpha: number) => {
    const scale = Math.max(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight,
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.globalAlpha = alpha;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  };

  const draw = async (frame: number) => {
    const request = ++latestRequest;
    const lowerIndex = Math.floor(frame);
    const upperIndex = Math.min(frameCount - 1, lowerIndex + 1);
    const blend = frame - lowerIndex;

    try {
      const lowerFrame = await loadFrame(lowerIndex);
      if (disposed || request !== latestRequest) return;
      context.globalAlpha = 1;
      context.fillStyle = '#000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawCover(lowerFrame, 1);
      canvas.dataset.currentFrame = frame.toFixed(2);

      if (upperIndex !== lowerIndex && blend > 0.001) {
        const upperFrame = await loadFrame(upperIndex);
        if (disposed || request !== latestRequest) return;
        drawCover(upperFrame, blend);
        canvas.dataset.currentFrame = frame.toFixed(2);
      }
      context.globalAlpha = 1;
      trimDecodedFrames(frame);
    } catch {
      // Keep the last successfully rendered frame while the next one is loading.
    }
  };

  const warmFrames = (center: number, direction: number) => {
    const roundedCenter = Math.round(center);
    const normalizedDirection = direction >= 0 ? 1 : -1;
    if (roundedCenter === lastWarmCenter && normalizedDirection === lastWarmDirection) return;
    lastWarmCenter = roundedCenter;
    lastWarmDirection = normalizedDirection;
    const offsets = Array.from({ length: WARM_FRAME_RADIUS + 3 }, (_, offset) => (
      normalizedDirection > 0 ? offset - 2 : 2 - offset
    ));
    offsets.forEach((offset) => {
      const index = clamp(roundedCenter + offset, 0, frameCount - 1);
      void loadFrame(index).then(() => trimDecodedFrames(center)).catch(() => undefined);
    });
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const renderScale = Math.min(
      pixelRatio,
      SOURCE_WIDTH / bounds.width,
      SOURCE_HEIGHT / bounds.height,
    );
    const width = Math.max(1, Math.round(bounds.width * renderScale));
    const height = Math.max(1, Math.round(bounds.height * renderScale));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    void draw(targetFrame);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  warmFrames(0, 1);
  void draw(0);

  const prefetchTimer = window.setTimeout(() => {
    let nextIndex = 0;
    const worker = async () => {
      while (!disposed && nextIndex < frameCount) {
        const index = nextIndex;
        nextIndex += 1;
        try {
          await ensureBlobUrl(index);
        } catch {
          return;
        }
      }
    };
    void Promise.all(Array.from({ length: 4 }, worker));
  }, 900);

  return {
    render(frame, direction = 1) {
      targetFrame = clamp(frame, 0, frameCount - 1);
      warmFrames(targetFrame, direction);
      void draw(targetFrame);
    },
    destroy() {
      disposed = true;
      latestRequest += 1;
      abortController.abort();
      resizeObserver.disconnect();
      window.clearTimeout(prefetchTimer);
      decodedFrames.forEach((image) => { image.src = ''; });
      decodedFrames.clear();
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.clear();
    },
  };
}
