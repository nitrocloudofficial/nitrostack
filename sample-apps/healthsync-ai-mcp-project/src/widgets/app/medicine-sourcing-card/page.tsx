'use client';

import React, { useState, useEffect } from 'react';

export default function MedicineSourcingCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // 1. Check window globals
    const windowData = (window as any)?.openai?.toolOutput || (window as any)?.__INITIAL_DATA__;
    if (windowData) {
      setData(windowData);
      return;
    }

    // 2. Listen for postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        const payload = event.data.payload || event.data.data || event.data;
        if (payload && (payload.drugName || payload.brandName || payload.medicineName)) {
          setData(payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 3. Fallback: load default medication data if event doesn't trigger
    const timeout = setTimeout(() => {
      setData((prev: any) => prev || {
        drugName: 'Atorvastatin 20mg',
        brandName: 'Lipitor',
        hospitalStock: 0,
        hospitalPrice: 1200,
        apolloPrice: 1050,
        nearbyStorePrice: 980,
        genericOption: {
          name: 'Atorvastatin Calcium (Generic)',
          price: 450,
          savings: '62% cheaper',
          doctorApproved: true
        },
        deliveryEstimate: '35 minutes'
      });
    }, 300);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  if (!data) {
    return <div style={{ padding: '16px', color: '#94a3b8', fontFamily: 'sans-serif' }}>Searching pharmacies...</div>;
  }

  const isOutOfStock = data.hospitalStock === 0 || data.availability === 'out_of_stock';

  return (
    <div style={{ padding: '16px', background: '#1e293b', color: '#f8fafc', borderRadius: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '16px' }}>💊 Pharmacy Sourcing & Price Comparison</h3>
      </div>
      <p style={{ margin: '8px 0', fontSize: '13px' }}>
        Prescribed Drug: <strong>{data.drugName || data.brandName || data.medicineName}</strong>
      </p>

      {isOutOfStock ? (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
          ⚠️ Hospital Pharmacy Status: <strong>OUT OF STOCK</strong>. Sourced options below.
        </div>
      ) : (
        <div style={{ background: '#14532d', color: '#86efac', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
          ✅ Hospital Pharmacy Status: IN STOCK ({data.hospitalStock} available)
        </div>
      )}

      <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94a3b8' }}>Available Sourcing & Pricing Tiers:</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>Hospital Price:</span>
          <span><del>₹{data.hospitalPrice || 1200}</del></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>Apollo Pharmacy:</span>
          <span>₹{data.apolloPrice || 1050}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#4ade80', fontWeight: 'bold' }}>
          <span>Doctor-Approved Generic ({data.genericOption?.name || 'Generic Alternative'}):</span>
          <span>₹{data.genericOption?.price || 450} ({data.genericOption?.savings || 'Discounted'})</span>
        </div>
      </div>

      <button 
        onClick={() => alert('Order Placed Successfully via HealthSync AI!')}
        style={{ width: '100%', background: '#22c55e', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
      >
        Order Generic Option (₹{data.genericOption?.price || 450}) & Deliver
      </button>
    </div>
  );
}