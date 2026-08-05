// A tiny, neutral blur placeholder shared by remote customer-facing images.
//
// Using one generic soft gradient (instead of a per-image blurDataURL pipeline)
// still gives `<Image placeholder="blur">` its blur-up fade and reserves layout
// space, so hero/cards feel smoother while the real asset streams in. It is a
// ~20x12 SVG gradient (slate-200 -> slate-300) embedded as base64, so it works
// in both server and client components and is compatible with the Cloudflare
// image loader (blurDataURL is inlined, never routed through the loader).
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIxMiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZTVlN2ViIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjEyIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+";
