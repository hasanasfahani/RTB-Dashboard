/**
 * PRD §11.1 — build this first.
 *
 * Not dismissible, on every route. This protects the presentation more than it costs
 * in screen space, and it is the cheapest mitigation in PRD §16.
 */
export function DemoBanner() {
  return (
    <div className="border-s-4 border-cyan bg-navy px-4 py-2 text-surface">
      <p className="text-micro leading-relaxed">
        <strong className="font-bold">Illustrative data.</strong> All figures in this demonstration
        are synthetic and generated for the purpose of showing dashboard structure and capability.
        They do not represent RTB&apos;s actual financial position.
      </p>
    </div>
  );
}
