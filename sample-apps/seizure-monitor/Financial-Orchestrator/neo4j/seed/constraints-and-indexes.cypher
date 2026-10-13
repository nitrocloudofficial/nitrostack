// ============================================
// Neo4j Constraints and Indexes
// ============================================
// Run these Cypher statements against your Neo4j instance to set up
// the knowledge graph schema.

// --- Uniqueness Constraints ---
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT bank_account_id IF NOT EXISTS FOR (b:BankAccount) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT mf_holding_id IF NOT EXISTS FOR (m:MutualFundHolding) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT stock_holding_id IF NOT EXISTS FOR (s:StockHolding) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT life_event_id IF NOT EXISTS FOR (e:LifeEvent) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT goal_id IF NOT EXISTS FOR (g:Goal) REQUIRE g.id IS UNIQUE;
CREATE CONSTRAINT insurance_id IF NOT EXISTS FOR (i:InsurancePolicy) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT channel_event_id IF NOT EXISTS FOR (c:ChannelEvent) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT action_payload_id IF NOT EXISTS FOR (a:ActionPayload) REQUIRE a.id IS UNIQUE;

// --- Indexes for Fast Lookups ---
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX user_phone IF NOT EXISTS FOR (u:User) ON (u.phone);
CREATE INDEX mf_scheme_code IF NOT EXISTS FOR (m:MutualFundHolding) ON (m.schemeCode);
CREATE INDEX stock_symbol IF NOT EXISTS FOR (s:StockHolding) ON (s.symbol);
CREATE INDEX life_event_type IF NOT EXISTS FOR (e:LifeEvent) ON (e.type);
CREATE INDEX channel_event_channel IF NOT EXISTS FOR (c:ChannelEvent) ON (c.channel);
CREATE INDEX action_status IF NOT EXISTS FOR (a:ActionPayload) ON (a.status);

// --- Relationship Types Reference ---
// (:User)-[:HAS_ACCOUNT]->(:BankAccount)
// (:User)-[:HOLDS_MF]->(:MutualFundHolding)
// (:User)-[:HOLDS_STOCK]->(:StockHolding)
// (:User)-[:HAS_TAX_PROFILE]->(:TaxProfile)
// (:User)-[:HAS_INSURANCE]->(:InsurancePolicy)
// (:User)-[:HAS_GOAL]->(:Goal)
// (:User)-[:EXPERIENCED]->(:LifeEvent)
// (:User)-[:INTERACTED_VIA]->(:ChannelEvent)
// (:User)-[:HAS_DRAFT]->(:ActionPayload)
// (:User)-[:FAMILY_MEMBER]->(:FamilyMember)
