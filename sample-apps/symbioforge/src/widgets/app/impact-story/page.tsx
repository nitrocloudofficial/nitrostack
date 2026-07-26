'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { Leaf, Car, Coins, Factory, Sprout, Building, Users, Landmark, Target } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ImpactStoryData {
  success: boolean;
  rawMetrics: {
    co2Avoided: number;
    landfillDiverted: number;
    financialValue: number;
  };
  equivalencies: {
    carsOffRoad: number;
    landSavedSqMeters: number;
    microLoansFunded: number;
    jobsCreated: number;
    taxRevenue: number;
  };
}

export default function ImpactStory() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ImpactStoryData>();

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Waiting for Impact Story data...
      </div>
    );
  }

  const { rawMetrics, equivalencies } = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '16px',
      maxWidth: '850px',
      margin: '0 auto',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Leaf size={28} /> SymbioForge Impact Story
        </h2>
        <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#94a3b8' }}>
          Translating industrial metrics into real-world human impact.
        </p>
      </div>

      {/* Main Impact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Environment (CO2) */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          borderTop: '4px solid #10b981',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Car size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(16, 185, 129, 0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '12px' }}>
            <Leaf size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Climate Action</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
            {equivalencies.carsOffRoad.toLocaleString()} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'normal' }}>Cars</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            We prevented <strong>{rawMetrics.co2Avoided.toLocaleString()} tons of CO2</strong>, equivalent to taking {equivalencies.carsOffRoad.toLocaleString()} passenger vehicles off the road for an entire year.
          </p>
        </div>

        {/* Economy (Loans) */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          borderTop: '4px solid #3b82f6',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Coins size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(59, 130, 246, 0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '12px' }}>
            <Building size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Economic Engine</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
            {equivalencies.microLoansFunded.toLocaleString()} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'normal' }}>Loans</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Generated <strong>{formatCurrency(rawMetrics.financialValue)}</strong> in savings and revenue, enough capital to fund {equivalencies.microLoansFunded.toLocaleString()} MSME micro-loans.
          </p>
        </div>

        {/* Land (Waste) */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          borderTop: '4px solid #f59e0b',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Sprout size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(245, 158, 11, 0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '12px' }}>
            <Factory size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Land Preservation</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
            {equivalencies.landSavedSqMeters.toLocaleString()} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'normal' }}>sq.m</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Diverted <strong>{rawMetrics.landfillDiverted.toLocaleString()} tons of waste</strong> from landfills, saving {equivalencies.landSavedSqMeters.toLocaleString()} sq meters of local land from toxic contamination.
          </p>
        </div>
      </div>

      {/* Secondary Metrics: Jobs & Taxes */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', color: '#8b5cf6' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Jobs Created</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
              {equivalencies.jobsCreated.toLocaleString()} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'normal' }}>Local Roles</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>In transport, processing, and quality testing.</div>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', color: '#ec4899' }}>
            <Landmark size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Tax Revenue Generated</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
              {formatCurrency(equivalencies.taxRevenue)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Estimated 15% tax yield on new economic value.</div>
          </div>
        </div>
      </div>

      {/* SDG Alignment Badges */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} /> UN Sustainable Development Goals Alignment
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { id: '9', name: 'Industry, Innovation and Infrastructure', color: '#f36d25' },
            { id: '11', name: 'Sustainable Cities and Communities', color: '#fd9d24' },
            { id: '12', name: 'Responsible Consumption and Production', color: '#bf8b2e' },
            { id: '13', name: 'Climate Action', color: '#3f7e44' }
          ].map(sdg => (
            <div key={sdg.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              border: `1px solid ${sdg.color}40`,
              padding: '6px 12px',
              borderRadius: '20px',
              boxShadow: `0 2px 10px ${sdg.color}10`
            }}>
              <div style={{ 
                backgroundColor: sdg.color, 
                color: '#fff', 
                fontWeight: 'bold', 
                fontSize: '11px', 
                width: '20px', 
                height: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '4px' 
              }}>
                {sdg.id}
              </div>
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500' }}>{sdg.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
