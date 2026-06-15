import { IIAC_LOOP_SVG } from "@/data/iiacLoopSvg";

// The hand-tuned IIAC Loop SVG (extracted from the original slide deck) embedded
// as-is — it already uses the same palette and fonts as the app.
export function IiacLoopDiagram() {
  return (
    <div
      className="w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: IIAC_LOOP_SVG }}
    />
  );
}
