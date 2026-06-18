// THROWAWAY — radar dogfood self-test for ST-0013. Intentionally VIOLATES
// ADR-0001-C2 (mobile-first / responsive): a fixed 1100px-wide, 4-column,
// desktop-only layout with no responsive breakpoints — it overflows a phone
// viewport. Delete this file after the demo.
export function SelfTestPanel() {
  return (
    <div style={{ width: 1100 }} className="grid grid-cols-4 gap-6">
      <div>Metric A</div>
      <div>Metric B</div>
      <div>Metric C</div>
      <div>Metric D</div>
    </div>
  );
}
