import { ClothingItem, Outfit } from "@/lib/types";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createOutfitPreviewDataUrl(outfit: Outfit, items: ClothingItem[]) {
  const width = 240;
  const height = 320;
  const sortedLayers = outfit.layers.slice().sort((a, b) => a.zIndex - b.zIndex);

  const content = sortedLayers
    .map((layer) => {
      const item = items.find((entry) => entry.id === layer.itemId);

      if (!item) {
        return "";
      }

      const size = 96 * layer.scale;
      const x = Number(layer.x.toFixed(1));
      const y = Number(layer.y.toFixed(1));
      const rotation = Number(layer.rotation.toFixed(1));
      const centerX = Number((x + size / 2).toFixed(1));
      const centerY = Number((y + size / 2).toFixed(1));

      if (item.imageUrl) {
        return `<image href="${escapeXml(item.imageUrl)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" transform="rotate(${rotation} ${centerX} ${centerY})" />`;
      }

      return `<g transform="rotate(${rotation} ${centerX} ${centerY})"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="24" fill="${escapeXml(item.color)}" /><text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="Arial, sans-serif" fill="#18222d">${escapeXml(item.name)}</text></g>`;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#fff9f4" />
          <stop offset="100%" stop-color="#f3ecdf" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="32" fill="url(#bg)" />
      <ellipse cx="120" cy="42" rx="78" ry="22" fill="rgba(255,141,108,0.18)" />
      ${content}
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
