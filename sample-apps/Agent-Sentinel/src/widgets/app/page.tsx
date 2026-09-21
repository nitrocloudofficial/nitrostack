'use client';

import EnterpriseOverview from "../components/panels/EnterpriseOverview";
import Header from "../components/layout/Header";
import MetricsGrid from "../components/layout/MetricsGrid";
import AgentPanel from "../components/panels/AgentPanel";
import ConnectorPanel from "../components/panels/ConnectorPanel";
import NotificationPanel from "../components/panels/NotificationPanel";
import ExecutiveSummary from "../components/panels/ExecutiveSummary";
import RiskTrendChart from "../components/panels/RiskTrendChart";
import SecurityPosture from "../components/panels/SecurityPosture";
import AIThreatIntel from "../components/panels/AIThreatIntel";
import ThreatStats from "../components/panels/ThreatStats";
import RecommendationsPanel from "../components/panels/RecommendationsPanel";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <Header />

        <EnterpriseOverview />
        <MetricsGrid />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
            marginTop: 30,
          }}
        >
          <RiskTrendChart />
          <SecurityPosture />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
            marginTop: 30,
          }}
        >
          <AgentPanel />
          <ConnectorPanel />
        </div>

        <NotificationPanel />
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 24,
    marginTop: 30,
  }}
>
  <AIThreatIntel />

  <ThreatStats />

  <RecommendationsPanel />
</div>
        <ExecutiveSummary />

        {/* Remaining sections will be added in Batch 2 */}
      </div>
    </main>
  );
}