import { getCostLevel, type ZoneAnalysis } from "../hooks/useAnalysis";

interface OpportunityCardProps {
  analysis: ZoneAnalysis;
  highlighted?: boolean;
  /** True while this card's marker is the one highlighted on the map. */
  isActive?: boolean;
  onHoverChange?: (zoneId: string | null) => void;
  onSelect?: (zoneId: string) => void;
}

export default function OpportunityCard({
  analysis,
  highlighted,
  isActive,
  onHoverChange,
  onSelect,
}: OpportunityCardProps) {
  const { zone, rank, competitionLevel, trafficScore, populationEstimate } =
    analysis;

  return (
    // Keyboard-reachable, because clicking the card moves the map — that
    // shouldn't be mouse-only.
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => onHoverChange?.(zone.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(zone.id)}
      onBlur={() => onHoverChange?.(null)}
      onClick={() => onSelect?.(zone.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(zone.id);
        }
      }}
      className={`cursor-pointer rounded-2xl p-6 shadow-lg outline-none ring-1 transition duration-150 hover:-translate-y-0.5 hover:shadow-xl ${
        highlighted
          ? "bg-green-600 text-white ring-green-600"
          : "bg-white text-gray-900 ring-gray-100"
      } ${isActive ? "-translate-y-0.5 shadow-xl ring-2 ring-gray-900" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            highlighted
              ? "bg-white/20 text-white"
              : "bg-green-100 text-green-700"
          }`}
        >
          {highlighted ? "Recommended" : `Rank #${rank}`}
        </span>

        <span className="text-2xl font-bold">{zone.opportunityScore}</span>
      </div>

      <h3 className="text-lg font-semibold">{zone.name}</h3>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className={highlighted ? "text-white/70" : "text-gray-500"}>
            Competition
          </dt>
          <dd className="mt-0.5 font-medium">{competitionLevel}</dd>
        </div>

        <div>
          <dt className={highlighted ? "text-white/70" : "text-gray-500"}>
            Footfall
          </dt>
          <dd className="mt-0.5 font-medium">{trafficScore}/100</dd>
        </div>

        <div>
          <dt className={highlighted ? "text-white/70" : "text-gray-500"}>
            Area population
          </dt>
          <dd
            className="mt-0.5 font-medium"
            // Catchment-level, so identical across the zones of one analysis.
            // Spelled out here because a per-zone label would imply this is
            // the population of this zone specifically, which it is not.
            title="Measured population of the wider city catchment, shared across all zones in this analysis"
          >
            {populationEstimate === null
              ? "Unavailable"
              : populationEstimate.toLocaleString()}
          </dd>
        </div>
      </dl>

      <div
        className={`mt-4 flex items-center justify-between border-t pt-3 text-sm ${
          highlighted ? "border-white/20" : "border-gray-100"
        }`}
      >
        <span className={highlighted ? "text-white/70" : "text-gray-500"}>
          Cost pressure
        </span>
        <span className="font-medium">
          {getCostLevel(zone.costPressureIndex)} ({zone.costPressureIndex}/100)
        </span>
      </div>
    </div>
  );
}
