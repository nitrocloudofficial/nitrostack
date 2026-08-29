// ── Business-Critical Metrics ─────────────────────────────────────
export const clusterMetrics = {
  factories: 18,
  symbioses: 57,
  activeSymbioses: 23,
  blueprintReady: 12,
  evaluated: 14,
  newMatches: 8,
  productsInvented: 3,
  blueprints: 5,
  circularScore: 11,

  co2Avoided: 184.05,
  waterSaved: 1460000,
  energySaved: 291,
  landfillDiverted: 145.5,

  totalAnnualSavings: 2200000,
  revenueFromProducts: 840000,
  avgRoi: 340,
  avgPaybackMonths: 6.2,
  costReduction: 18,

  complianceFiled: 12,
  compliancePending: 4,
  complianceOverdue: 2,
  complianceRate: 67,

  wasteProcessedTons: 2840,
  wasteUtilizationRate: 73,
};

// ── Agent Swarm ───────────────────────────────────────────────────
export const agents = [
  { name: "Clerk", role: "Registers factories & generates SPCB compliance PDFs", color: "#3b82f6", status: "idle" as const },
  { name: "Scout", role: "Profiles new/updated factories", color: "#10b981", status: "idle" as const },
  { name: "Profiler", role: "Classifies & infers waste streams using industry maps", color: "#8b5cf6", status: "idle" as const },
  { name: "Matchmaker", role: "Finds symbiotic pairs + multi-hop chains (A→B→C)", color: "#ec4899", status: "active" as const },
  { name: "Inventor", role: "Generates novel product concepts from waste", color: "#f59e0b", status: "idle" as const },
  { name: "Auditor", role: "Promotes top opportunities to Blueprint Ready", color: "#06b6d4", status: "active" as const },
  { name: "Architect", role: "Plans step-by-step manufacturing blueprints", color: "#f97316", status: "idle" as const },
  { name: "Sentinel", role: "Self-healing, volume monitoring, compliance tracking", color: "#ef4444", status: "active" as const },
];

// ── Factory Cluster (expanded with business data) ─────────────────
export const factories = [
  { id: "fact_1", name: "Lakshmi Textiles Pvt Ltd", industry: "Textile Manufacturing", wastes: ["Cotton lint", "Polyester scraps", "Dye effluent"], matches: 8, co2: 23.63, savings: 285000, compliance: "filed" as const, utilization: 82 },
  { id: "fact_2", name: "Coimbatore Steel Works", industry: "Steel & Foundry", wastes: ["Slag", "Mill scale", "Furnace dust"], matches: 6, co2: 31.2, savings: 410000, compliance: "filed" as const, utilization: 91 },
  { id: "fact_3", name: "Southern Paper Mills", industry: "Paper & Pulp", wastes: ["Paper sludge", "Bark waste", "Black liquor"], matches: 5, co2: 18.7, savings: 195000, compliance: "pending" as const, utilization: 68 },
  { id: "fact_4", name: "Sakthi Auto Components", industry: "Automotive Parts", wastes: ["Metal shavings", "Coolant waste", "Paint sludge"], matches: 7, co2: 15.4, savings: 220000, compliance: "filed" as const, utilization: 75 },
  { id: "fact_5", name: "Pricol Instruments", industry: "Electronics", wastes: ["PCB waste", "Solder dross", "Plastic trims"], matches: 4, co2: 8.9, savings: 145000, compliance: "overdue" as const, utilization: 54 },
  { id: "fact_6", name: "Roots Industries", industry: "Rubber & Polymers", wastes: ["Rubber crumb", "Vulcanization waste"], matches: 5, co2: 12.1, savings: 165000, compliance: "filed" as const, utilization: 79 },
  { id: "fact_7", name: "KG Denim Ltd", industry: "Textile Manufacturing", wastes: ["Denim scraps", "Indigo sludge", "Starch waste"], matches: 6, co2: 14.8, savings: 180000, compliance: "pending" as const, utilization: 71 },
  { id: "fact_8", name: "Shri Vishnu Chemicals", industry: "Chemical Processing", wastes: ["Acid waste", "Catalyst residue"], matches: 3, co2: 9.5, savings: 120000, compliance: "filed" as const, utilization: 62 },
  { id: "fact_9", name: "Sri Balaji Forgings", industry: "Metal Forging", wastes: ["Scale", "Forge flash", "Quench oil"], matches: 4, co2: 11.3, savings: 155000, compliance: "filed" as const, utilization: 77 },
  { id: "fact_10", name: "Texmo Pumps", industry: "Pump Manufacturing", wastes: ["Cast iron scrap", "Machining chips", "Emulsion waste"], matches: 3, co2: 7.8, savings: 110000, compliance: "overdue" as const, utilization: 58 },
];

// ── Opportunity Pipeline (ranked by annual value) ─────────────────
export const opportunities = [
  {
    id: "opp_1",
    title: "Steel slag → Cement aggregate",
    source: "Coimbatore Steel Works",
    target: "ACC Cement Depot",
    type: "match" as const,
    annualValue: 480000,
    co2Saved: 28.4,
    score: 94,
    status: "Active" as const,
    volumeTons: 320,
  },
  {
    id: "opp_2",
    title: "EcoWeave™ Composite Board",
    source: "Lakshmi Textiles + KG Denim",
    target: "Construction market",
    type: "product" as const,
    annualValue: 320000,
    co2Saved: 18.6,
    score: 88,
    status: "Blueprint Ready" as const,
    volumeTons: 180,
  },
  {
    id: "opp_3",
    title: "Cotton lint → Acoustic insulation",
    source: "Lakshmi Textiles Pvt Ltd",
    target: "Roots Industries",
    type: "match" as const,
    annualValue: 275000,
    co2Saved: 15.2,
    score: 91,
    status: "Active" as const,
    volumeTons: 145,
  },
  {
    id: "opp_4",
    title: "Bioite™ Ceramic Tiles",
    source: "Southern Paper + Shri Vishnu",
    target: "Home construction",
    type: "product" as const,
    annualValue: 280000,
    co2Saved: 12.8,
    score: 82,
    status: "Blueprint Ready" as const,
    volumeTons: 95,
  },
  {
    id: "opp_5",
    title: "Metal shavings → Ferrous feedstock",
    source: "Sakthi Auto Components",
    target: "Sri Balaji Forgings",
    type: "match" as const,
    annualValue: 220000,
    co2Saved: 11.5,
    score: 87,
    status: "Evaluated" as const,
    volumeTons: 210,
  },
  {
    id: "opp_6",
    title: "Rubber crumb → Playground surfacing",
    source: "Roots Industries",
    target: "Municipal bodies",
    type: "match" as const,
    annualValue: 195000,
    co2Saved: 8.9,
    score: 79,
    status: "Evaluated" as const,
    volumeTons: 130,
  },
  {
    id: "opp_7",
    title: "Forgeite™ Brake Compounds",
    source: "Sri Balaji + Roots Industries",
    target: "Automotive aftermarket",
    type: "product" as const,
    annualValue: 240000,
    co2Saved: 14.1,
    score: 76,
    status: "New" as const,
    volumeTons: 85,
  },
  {
    id: "opp_8",
    title: "Paper sludge → Brick filler",
    source: "Southern Paper Mills",
    target: "Local brick kilns",
    type: "match" as const,
    annualValue: 145000,
    co2Saved: 6.7,
    score: 85,
    status: "Active" as const,
    volumeTons: 200,
  },
];

// ── Product Concepts (AI-Invented) ────────────────────────────────
export const products = [
  {
    id: "prod_1",
    name: "EcoWeave™ Composite Board",
    description: "Structural board from denim + cotton fibre with resin binder. Replaces plywood in non-structural construction.",
    wasteInputs: ["Denim scraps (KG Denim)", "Cotton lint (Lakshmi Textiles)"],
    costPerUnit: 180,
    marketPrice: 340,
    margin: 47,
    feasibility: 88,
    revenuePerYear: 320000,
    targetMarket: "Green construction, interior fitout",
    capex: 480000,
    paybackMonths: 5.8,
    status: "Blueprint Ready" as const,
  },
  {
    id: "prod_2",
    name: "BioTile™ Ceramic Tiles",
    description: "Wall tiles using paper sludge filler + chemical binder. 30% lighter than clay tiles.",
    wasteInputs: ["Paper sludge (Southern Paper)", "Catalyst residue (Shri Vishnu)"],
    costPerUnit: 95,
    marketPrice: 190,
    margin: 50,
    feasibility: 82,
    revenuePerYear: 280000,
    targetMarket: "Affordable housing, govt projects",
    capex: 620000,
    paybackMonths: 7.2,
    status: "Blueprint Ready" as const,
  },
  {
    id: "prod_3",
    name: "ForgeIte™ Brake Pads",
    description: "Non-asbestos brake compounds from forge scale + rubber crumb. Meets IS 11852 standards.",
    wasteInputs: ["Forge flash (Sri Balaji)", "Rubber crumb (Roots Industries)"],
    costPerUnit: 65,
    marketPrice: 145,
    margin: 55,
    feasibility: 76,
    revenuePerYear: 240000,
    targetMarket: "Automotive aftermarket, OEM tier-2",
    capex: 540000,
    paybackMonths: 6.8,
    status: "New" as const,
  },
];

// ── Waste Category Breakdown ──────────────────────────────────────
export const wasteCategories = [
  { category: "Metallic", tons: 680, utilized: 89, color: "#3b82f6", factories: 5 },
  { category: "Textile", tons: 520, utilized: 78, color: "#ec4899", factories: 3 },
  { category: "Chemical", tons: 410, utilized: 62, color: "#f59e0b", factories: 4 },
  { category: "Cellulosic", tons: 380, utilized: 71, color: "#22c55e", factories: 2 },
  { category: "Polymeric", tons: 290, utilized: 79, color: "#8b5cf6", factories: 3 },
  { category: "Organic", tons: 560, utilized: 65, color: "#06b6d4", factories: 6 },
];

// ── 12-Month Simulation Projection ───────────────────────────────
export const simulationData = [
  { month: "Aug", co2: 184, savings: 22, factories: 18, symbioses: 57 },
  { month: "Sep", co2: 198, savings: 24.1, factories: 19, symbioses: 63 },
  { month: "Oct", co2: 215, savings: 26.5, factories: 20, symbioses: 71 },
  { month: "Nov", co2: 234, savings: 29.2, factories: 21, symbioses: 78 },
  { month: "Dec", co2: 251, savings: 31.8, factories: 22, symbioses: 84 },
  { month: "Jan", co2: 272, savings: 34.6, factories: 23, symbioses: 92 },
  { month: "Feb", co2: 295, savings: 37.8, factories: 24, symbioses: 99 },
  { month: "Mar", co2: 318, savings: 41.2, factories: 25, symbioses: 108 },
  { month: "Apr", co2: 344, savings: 44.9, factories: 26, symbioses: 116 },
  { month: "May", co2: 371, savings: 48.8, factories: 27, symbioses: 125 },
  { month: "Jun", co2: 398, savings: 53.1, factories: 28, symbioses: 134 },
  { month: "Jul", co2: 428, savings: 57.6, factories: 30, symbioses: 144 },
];

// ── Recent Activity Log ───────────────────────────────────────────
export const recentActivity = [
  { time: "10:42 PM", agent: "Sentinel", msg: "Health check passed — all 23 active symbioses operational", type: "success" as const },
  { time: "10:38 PM", agent: "Matchmaker", msg: "New match found: Texmo Pumps → Sri Balaji (cast iron scrap)", type: "success" as const },
  { time: "10:35 PM", agent: "Auditor", msg: "Promoted EcoWeave™ to Blueprint Ready (score: 88)", type: "success" as const },
  { time: "10:31 PM", agent: "Sentinel", msg: "Compliance alert: Pricol Instruments overdue by 12 days", type: "warning" as const },
  { time: "10:28 PM", agent: "Architect", msg: "Blueprint generated for steel slag → cement aggregate pathway", type: "info" as const },
  { time: "10:24 PM", agent: "Inventor", msg: "ForgeIte™ Brake Pads concept generated (feasibility: 76%)", type: "info" as const },
  { time: "10:20 PM", agent: "Profiler", msg: "Waste classification complete for Texmo Pumps (3 streams)", type: "info" as const },
  { time: "10:15 PM", agent: "Sentinel", msg: "Compliance alert: Texmo Pumps overdue by 5 days", type: "warning" as const },
  { time: "10:12 PM", agent: "Clerk", msg: "Factory registered: Texmo Pumps (Pump Manufacturing)", type: "info" as const },
  { time: "10:10 PM", agent: "Sentinel", msg: "Ecosystem health: 100% — no disruptions detected", type: "success" as const },
];

// ── Key Symbiotic Chains (Multi-hop) ──────────────────────────────
export const topChains = [
  {
    id: "chain_1",
    route: ["Lakshmi Textiles", "Roots Industries", "Sakthi Auto"],
    hops: 2,
    co2Saved: 22.4,
    savings: 310000,
    waste: "Cotton lint → Rubber filler → Auto gaskets",
  },
  {
    id: "chain_2",
    route: ["Coimbatore Steel", "Sri Balaji Forgings", "Sakthi Auto"],
    hops: 2,
    co2Saved: 18.9,
    savings: 265000,
    waste: "Slag → Forge feedstock → Component blanks",
  },
  {
    id: "chain_3",
    route: ["KG Denim", "Lakshmi Textiles", "Southern Paper"],
    hops: 2,
    co2Saved: 14.2,
    savings: 195000,
    waste: "Denim scraps → Fibre blend → Paper pulp filler",
  },
];

// ── Event Chain (landing page) ────────────────────────────────────
export const eventChain = [
  { event: "FACTORY_REGISTERED", description: "New factory joins the cluster", agent: "Clerk" },
  { event: "FACTORY_PROFILED", description: "Waste streams classified", agent: "Profiler" },
  { event: "MATCHES_DISCOVERED", description: "Symbiotic pairs found", agent: "Matchmaker" },
  { event: "PRODUCTS_INVENTED", description: "Novel products created", agent: "Inventor" },
  { event: "IMPACT_AUDITED", description: "Top opportunities promoted", agent: "Auditor" },
  { event: "PATHWAYS_DESIGNED", description: "Blueprints planned", agent: "Architect" },
  { event: "ECOSYSTEM_STABLE", description: "System healthy", agent: "Sentinel" },
];

// ── MCP Tools (landing page) ─────────────────────────────────────
export const tools = [
  { name: "get-cluster-state", desc: "Live state: factories, matches, products, logs", widget: "Agent Swarm Monitor" },
  { name: "get-ecosystem-map", desc: "Factory network with symbiotic edges", widget: "Ecosystem Map" },
  { name: "get-carbon-metrics", desc: "CO₂, water, energy saved + financial value", widget: "Carbon Dashboard" },
  { name: "get-opportunity-feed", desc: "Ranked matches and products", widget: "Opportunity Feed" },
  { name: "get-product-concepts", desc: "AI-invented products from waste", widget: "Product Cards" },
  { name: "get-waste-profiles", desc: "Classified waste streams per factory", widget: "Waste Profiles" },
  { name: "register-factory", desc: "Add factory → triggers full agent chain", widget: "Compliance Dashboard" },
  { name: "get-compliance-report", desc: "Generate SPCB Form V PDF", widget: "Compliance Dashboard" },
  { name: "run-simulation", desc: "SymbioSim: 12-month time machine", widget: "Timeline" },
  { name: "get-impact-story", desc: "Human-readable impact equivalencies", widget: "Impact Story" },
  { name: "get-district-overview", desc: "SPCB officer governance view", widget: "District Dashboard" },
  { name: "trigger-disruption", desc: "Test Sentinel self-healing", widget: "Swarm Monitor" },
];

// ── Impact Equivalencies (landing page) ───────────────────────────
export const impactEquivalencies = [
  { metric: "Cars off road", value: 40, unit: "vehicles/year", icon: "Car", color: "#10b981" },
  { metric: "Land saved", value: 582, unit: "sq meters", icon: "TreePine", color: "#22c55e" },
  { metric: "MSME loans funded", value: 11, unit: "micro-loans", icon: "Banknote", color: "#3b82f6" },
  { metric: "Jobs created", value: 3, unit: "local roles", icon: "Users", color: "#8b5cf6" },
  { metric: "Tax revenue", value: 330000, unit: "INR/year", icon: "Landmark", color: "#f59e0b" },
];
