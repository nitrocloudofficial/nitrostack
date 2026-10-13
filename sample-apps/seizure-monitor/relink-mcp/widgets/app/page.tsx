'use client';

import { useState } from 'react';
import BOMVisualizer from '../bom-visualizer/page';
import ProcurementPlanWidget from '../procurement-plan/page';

// Mock Tool Outputs for Local Interactive Preview
const MOCK_BOM_DATA = {
  product: 'Aluminium Automotive Engine Blocks',
  total_items: 3,
  next_step: 'Review and edit quantities, then run intelligent sourcing.',
  bom: [
    {
      material_type: 'aluminum_scrap',
      estimated_quantity_kg: 2500,
      grade_preference: 'A',
      notes: 'Clean die-cast alloy scrap suitable for direct remelting into engine block casings.',
      alternatives: ['virgin_ingot_a7', 'aluminum_turning_scrap'],
      market_benchmark: {
        price_per_kg: 145,
        range: { min: 138, max: 152 },
        virgin_price_per_kg: 215,
      },
    },
    {
      material_type: 'steel_offcut',
      estimated_quantity_kg: 1200,
      grade_preference: 'B',
      notes: 'High-tensile steel offcuts for cylinder sleeves and reinforcement caps.',
      alternatives: ['mild_steel_scrap', 'iron_borings'],
      market_benchmark: {
        price_per_kg: 48,
        range: { min: 42, max: 54 },
        virgin_price_per_kg: 78,
      },
    },
    {
      material_type: 'copper_wire_scrap',
      estimated_quantity_kg: 350,
      grade_preference: 'A',
      notes: 'Uncoated heavy copper wire scrap for electrical grounding busbars.',
      alternatives: ['brass_scrap'],
      market_benchmark: {
        price_per_kg: 680,
        range: { min: 650, max: 710 },
        virgin_price_per_kg: 840,
      },
    },
  ],
};

const MOCK_PLAN_DATA = {
  search_metadata: {
    radius_used_km: 50,
    total_suppliers_found: 8,
    total_available_quantity_kg: 12500,
    search_steps: [
      { radius_km: 10, suppliers_found: 1, quantity_found_kg: 800 },
      { radius_km: 25, suppliers_found: 4, quantity_found_kg: 4500 },
      { radius_km: 50, suppliers_found: 8, quantity_found_kg: 12500 },
    ],
  },
  recommended_zones: [
    {
      name: 'Chakan MIDC (Industrial Hub)',
      distance_km: 22,
      seller_count: 5,
      total_available_kg: 8500,
      avg_price_per_kg: 142,
      avg_grade: 'A',
      avg_trust_score: 91,
      zone_score: 94,
    },
    {
      name: 'Pimpri-Chinchwad Cluster',
      distance_km: 14,
      seller_count: 3,
      total_available_kg: 4000,
      avg_price_per_kg: 148,
      avg_grade: 'B+',
      avg_trust_score: 86,
      zone_score: 82,
    },
  ],
  supplier_combinations: [
    {
      requirement: { material_type: 'aluminum_scrap', quantity_kg: 2500 },
      coverage_percent: 100,
      total_cost: 360000,
      total_transport_cost: 8500,
      unfulfilled_kg: 0,
      allocations: [
        {
          factory_name: 'Chakan Auto Alloys Pvt Ltd',
          allocated_kg: 1500,
          price_per_kg: 142,
          cost: 213000,
          transport_cost_estimate: 4500,
          distance_km: 22,
          grade: 'A',
          trust_score: 94,
        },
        {
          factory_name: 'Sahyadri Precision Castings',
          allocated_kg: 1000,
          price_per_kg: 147,
          cost: 147000,
          transport_cost_estimate: 4000,
          distance_km: 18,
          grade: 'A',
          trust_score: 88,
        },
      ],
    },
  ],
  ranked_suppliers: [
    {
      listing_id: 'l1',
      factory_name: 'Chakan Auto Alloys Pvt Ltd',
      material_type: 'aluminum_scrap',
      available_quantity_kg: 1500,
      price_per_kg: 142,
      grade: 'A',
      distance_km: 22,
      trust_score: 94,
      is_negotiable: true,
      procurement_score: 92,
    },
    {
      listing_id: 'l2',
      factory_name: 'Sahyadri Precision Castings',
      material_type: 'aluminum_scrap',
      available_quantity_kg: 1000,
      price_per_kg: 147,
      grade: 'A',
      distance_km: 18,
      trust_score: 88,
      is_negotiable: false,
      procurement_score: 85,
    },
    {
      listing_id: 'l3',
      factory_name: 'Apex Metals & Energy',
      material_type: 'aluminum_scrap',
      available_quantity_kg: 3000,
      price_per_kg: 155,
      grade: 'B',
      distance_km: 45,
      trust_score: 82,
      is_negotiable: true,
      procurement_score: 74,
    },
  ],
  ai_reasoning:
    'Chakan MIDC is strongly recommended as the primary sourcing zone due to high seller density (5 verified suppliers), competitive average price (₹142/kg vs ₹148/kg in Pimpri), and high trust score (91/100). Demand of 2,500kg is optimally split between Chakan Auto Alloys (1,500kg at ₹142/kg) and Sahyadri Precision (1,000kg at ₹147/kg) to achieve 100% coverage with minimal transport cost.',
};

// Polyfill SDK window object for preview mode
if (typeof window !== 'undefined') {
  (window as any).__NITROSTACK_WIDGET_DATA__ = MOCK_BOM_DATA;
}

export default function PreviewPage() {
  const [activeTab, setActiveTab] = useState<'bom' | 'plan'>('bom');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#60a5fa', fontWeight: 700, marginBottom: 8 }}>
          CircuLink B2B Procurement Platform
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
          Buyer Sourcing Agent — UI Widgets Live Preview
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>
          Interactive visualization components created for NitroStack MCP integration
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('bom')}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            background: activeTab === 'bom' ? '#2563eb' : '#1e293b',
            color: '#fff',
          }}
        >
          1. BOM Visualizer Widget
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            background: activeTab === 'plan' ? '#2563eb' : '#1e293b',
            color: '#fff',
          }}
        >
          2. Procurement Plan Widget
        </button>
      </div>

      {/* Preview Container */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {activeTab === 'bom' ? (
          <div style={{ width: '100%' }}>
            <BOMVisualizerWrapper data={MOCK_BOM_DATA} />
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <PlanWidgetWrapper data={MOCK_PLAN_DATA} />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple SDK Injector wrappers for preview mode
function BOMVisualizerWrapper({ data }: { data: any }) {
  if (typeof window !== 'undefined') {
    (window as any).__NITROSTACK_WIDGET_DATA__ = data;
  }
  return <BOMVisualizer />;
}

function PlanWidgetWrapper({ data }: { data: any }) {
  if (typeof window !== 'undefined') {
    (window as any).__NITROSTACK_WIDGET_DATA__ = data;
  }
  return <ProcurementPlanWidget />;
}
