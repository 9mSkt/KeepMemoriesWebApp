import { getPreset } from "./presets";
import { processPixels } from "./process";

export type FilmJob = {
  id: number;
  buffer: ArrayBuffer;
  width: number;
  height: number;
  presetId: string;
  strength: number;
  seed: number;
};

self.onmessage = (e: MessageEvent<FilmJob>) => {
  const { id, buffer, width, height, presetId, strength, seed } = e.data;
  const data = new Uint8ClampedArray(buffer);
  processPixels(data, width, height, getPreset(presetId), strength, { seed });
  (self as unknown as Worker).postMessage({ id, buffer }, [buffer]);
};
