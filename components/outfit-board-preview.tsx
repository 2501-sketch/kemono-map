import { ClothingItem, Outfit } from "@/lib/types";

type OutfitBoardPreviewProps = {
  bare?: boolean;
  className?: string;
  items: ClothingItem[];
  outfit: Outfit;
};

const BOARD_WIDTH = 420;
const BOARD_HEIGHT = 560;

export function OutfitBoardPreview({
  bare = false,
  className = "",
  items,
  outfit
}: OutfitBoardPreviewProps) {
  const orderedLayers = outfit.layers.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={`relative overflow-hidden ${bare ? "" : "rounded-[20px] border border-black/10 bg-white"} ${className}`}
    >
      {orderedLayers.map((layer) => {
        const item = items.find((entry) => entry.id === layer.itemId);

        if (!item) {
          return null;
        }

        const size = 96 * layer.scale;

        return (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${(layer.x / BOARD_WIDTH) * 100}%`,
              top: `${(layer.y / BOARD_HEIGHT) * 100}%`,
              width: `${(size / BOARD_WIDTH) * 100}%`,
              height: `${(size / BOARD_HEIGHT) * 100}%`,
              transform: `rotate(${layer.rotation}deg)`,
              transformOrigin: "center",
              zIndex: layer.zIndex
            }}
          >
            {item.imageUrl ? (
              <img
                alt={item.name}
                className="h-full w-full object-contain"
                draggable={false}
                src={item.imageUrl}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-[18px] px-2 text-center text-[10px] font-bold text-ink"
                style={{ backgroundColor: item.color }}
              >
                {item.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
