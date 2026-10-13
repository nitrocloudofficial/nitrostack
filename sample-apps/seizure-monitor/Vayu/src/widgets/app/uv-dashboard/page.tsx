"use client";

import React, { useEffect, useState } from 'react';

export default function UvDashboardPage() {
  const [displayData, setDisplayData] = useState({ uv: 0, lat: "0.00", lon: "0.00", skinType: 0 });
  const [riskData, setRiskData] = useState({ tier: 'Calculating...', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-100' });
  const [adviceData, setAdviceData] = useState({ impact: '', precaution: '' });
  const [locationName, setLocationName] = useState('Locating...');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data?.structuredContent || event.data?.data || event.data;
      if (payload && payload.uv_index !== undefined) {
        setDisplayData({
          uv: Number(payload.uv_index),
          lat: Number(payload.latitude || 0).toFixed(2),
          lon: Number(payload.longitude || 0).toFixed(2),
          skinType: Number(payload.skin_type || payload.skinType || 0)
        });
      }
    };

    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        if (parsed.uv_index !== undefined) {
          setDisplayData({
            uv: Number(parsed.uv_index),
            lat: Number(parsed.latitude || 0).toFixed(2),
            lon: Number(parsed.longitude || 0).toFixed(2),
            skinType: Number(parsed.skin_type || parsed.skinType || 0)
          });
        }
      } catch (e) {}
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (displayData.lat !== "0.00") {
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${displayData.lat}&longitude=${displayData.lon}&localityLanguage=en`)
        .then(res => res.json())
        .then(data => {
          setLocationName(data.city || data.locality || data.principalSubdivision || "Unknown Region");
        })
        .catch(() => setLocationName("Unknown Region"));
    }
  }, [displayData.lat, displayData.lon]);

  // EXPANDED: Detailed clinical descriptions for the Fitzpatrick scale
  const getSkinTypeDescription = (type: number) => {
    switch(type) {
      case 1: return "Type I: Pale white skin. Always burns, never tans.";
      case 2: return "Type II: Fair skin. Burns easily, tans poorly.";
      case 3: return "Type III: Medium skin. Burns moderately, tans gradually.";
      case 4: return "Type IV: Olive skin. Burns minimally, always tans.";
      case 5: return "Type V: Brown skin. Rarely burns, tans darkly.";
      case 6: return "Type VI: Deeply pigmented skin. Never burns.";
      default: return "Standard Baseline Profile applied."; 
    }
  };

  useEffect(() => {
    const uv = displayData.uv;
    
    if (uv <= 2) {
      setRiskData({ tier: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' });
      setAdviceData({ impact: 'Minimal risk of skin damage for most individuals. Safe for general outdoor activities.', precaution: 'Wear sunglasses on bright days. Use sunscreen if outside for extended periods.' });
    } 
    else if (uv <= 5) {
      setRiskData({ tier: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' });
      setAdviceData({ impact: 'Unprotected skin can burn and incur cumulative UV damage over time.', precaution: 'Seek shade near midday. Wear protective clothing, a wide-brimmed hat, and SPF 30+.' });
    } 
    else if (uv <= 7) {
      setRiskData({ tier: 'High', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' });
      setAdviceData({ impact: 'High risk of harm. Skin burns and premature cellular aging can occur quickly.', precaution: 'Reduce sun time between 10 AM and 4 PM. Broad-spectrum SPF is essential and must be reapplied.' });
    } 
    else if (uv <= 10) {
      setRiskData({ tier: 'Very High', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' });
      setAdviceData({ impact: 'Very high risk of rapid burn and deep cellular skin damage. Harm occurs rapidly.', precaution: 'Minimize outdoor exposure. Seek deep shade, wear protective layers, and reapply SPF every 2 hours.' });
    } 
    else {
      setRiskData({ tier: 'Extreme', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' });
      setAdviceData({ impact: 'Extreme risk of severe burns and long-term DNA damage in a matter of minutes.', precaution: 'Avoid all unprotected sun exposure. It is highly recommended to remain indoors during midday hours.' });
    }
  }, [displayData.uv]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900 flex flex-col items-center justify-center">
      <div className="max-w-md w-full border border-gray-200 bg-white rounded-xl shadow-sm p-8 text-center">
        <h1 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-8">Vayu • Guardian</h1>
        
        <div className={`inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border ${riskData.bg} mb-8`}>
          <span className={`text-6xl font-light tracking-tighter ${riskData.color}`}>
            {displayData.uv}
          </span>
          <span className={`text-xs font-semibold tracking-widest uppercase mt-2 ${riskData.color}`}>
            UV Index
          </span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-1 text-gray-900">{riskData.tier} Risk</h2>
          <p className="text-sm font-medium text-gray-600 mb-1">{locationName}</p>
          <p className="text-[10px] font-mono text-gray-400 tracking-wider">
            {displayData.lat}°, {displayData.lon}°
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
          <div className="text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max Exposure</p>
            <p className="text-lg font-medium text-gray-800">
              {displayData.uv === 0 ? "Unlimited" : `${Math.round(320 / (displayData.uv || 1))} min`}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Skin Profile</p>
            <p className="text-xs text-gray-600 mt-1 leading-tight pr-2">
              {getSkinTypeDescription(displayData.skinType)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 mt-6 space-y-4 text-left">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Physiological Impact</p>
            <p className="text-xs text-gray-600 leading-relaxed">{adviceData.impact}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Required Precautions</p>
            <p className="text-xs text-gray-600 leading-relaxed">{adviceData.precaution}</p>
          </div>
        </div>

        {/* NEW: Educational section on the UV Index */}
        <div className="border-t border-gray-100 pt-6 mt-6 text-left bg-gray-50 -mx-8 -mb-8 p-8 rounded-b-xl">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Understanding the Scale</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            The Global Solar UV Index is a standardized measurement of the intensity of sunburn-producing ultraviolet radiation. The scale ranges from 0 (Minimal) to 11+ (Extreme). Higher values indicate a greater potential for cellular damage to the skin and eyes, requiring stronger protective measures in shorter amounts of time.
          </p>
        </div>

      </div>
    </div>
  );
}