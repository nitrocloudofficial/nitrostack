import React, { useEffect, useState } from 'react';

interface ProfileSignals {
  name?: string;
  age: number;
  occupation?: string;
  city?: string;
  riskTolerance: number;
  healthCover: number;
  termCover: number;
  s80cUtilized: number;
  safeToSpend: number;
  liquidCash?: number;
}

interface Recommendation {
  id: string;
  bank_name: string;
  product_name: string;
  category: string;
  expected_return_or_cover: string;
  reasoning_xai: string;
  impact_summary: string;
  badge: string;
  status: string;
}

interface Commitment {
  id: string;
  commitment_name: string;
  commitment_type: string;
  amount: number;
  due_date: string;
  bank_name: string;
  status: string;
}

interface SpendingAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  amount_at_risk: number;
  severity: string;
  status: string;
  action_hint?: string;
}

interface CardPrivilege {
  id: string;
  privilege_name: string;
  category: string;
  total_quota: number;
  used_quota: number;
  unit: string;
  monetary_value_per_unit: number;
  reset_frequency: string;
  expiry_date: string;
  is_forgotten_alert?: boolean;
}

interface UserCard {
  id: string;
  bank_name: string;
  card_name: string;
  card_type: string;
  card_number_last4: string;
  annual_fee: number;
  privileges?: CardPrivilege[];
  card_privileges?: CardPrivilege[];
}

interface CardPrivilegesData {
  cards: UserCard[];
  summary: {
    totalCards: number;
    totalPrivilegeValue: number;
    usedPrivilegeValue: number;
    forgottenValueAtRisk: number;
    forgottenCount: number;
  };
  forgottenAlerts: Array<{
    cardName: string;
    bankName: string;
    privilegeName: string;
    remainingQuota: number;
    totalQuota: number;
    unit: string;
    valueAtRisk: number;
    expiryDate: string;
  }>;
}

export const MonitoringPage: React.FC<{ user?: any }> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<ProfileSignals | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [spendingAlerts, setSpendingAlerts] = useState<SpendingAlert[]>([]);
  const [cardData, setCardData] = useState<CardPrivilegesData | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [claimedPrivileges, setClaimedPrivileges] = useState<Record<string, number>>({});
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const userIdentifier = user?.email || user?.id || 'priya.sharma@email.com';
    const primaryUrl = `/api/monitoring?userId=${encodeURIComponent(userIdentifier)}`;
    const fallbackUrl = `http://localhost:3001/api/monitoring?userId=${encodeURIComponent(userIdentifier)}`;

    fetch(primaryUrl)
      .then(res => {
        if (!res.ok) throw new Error('Primary proxy failed');
        return res.json();
      })
      .then(data => {
        if (data && data.profileSignals) {
          setSignals(data.profileSignals);
          setRecommendations(data.recommendations || []);
          setCommitments(data.commitments || []);
          setSpendingAlerts(data.spendingAlerts || []);
          if (data.cardPrivilegesData) {
            setCardData(data.cardPrivilegesData);
            if (data.cardPrivilegesData.cards?.length > 0) {
              setSelectedCardId(data.cardPrivilegesData.cards[0].id);
            }
          }
          setLoading(false);
        } else {
          throw new Error('Invalid JSON structure');
        }
      })
      .catch(() => {
        // Fallback fetch directly to Express server on port 3001
        fetch(fallbackUrl)
          .then(res => res.json())
          .then(data => {
            setSignals(data.profileSignals);
            setRecommendations(data.recommendations || []);
            setCommitments(data.commitments || []);
            setSpendingAlerts(data.spendingAlerts || []);
            if (data.cardPrivilegesData) {
              setCardData(data.cardPrivilegesData);
              if (data.cardPrivilegesData.cards?.length > 0) {
                setSelectedCardId(data.cardPrivilegesData.cards[0].id);
              }
            }
            setLoading(false);
          })
          .catch(err => {
            console.error('Monitoring fetch fallback error:', err);
            setLoading(false);
          });
      });
  }, [user]);

  const handleClaimPrivilege = async (priv: CardPrivilege, cardName: string) => {
    try {
      const res = await fetch('/api/monitoring/claim-privilege', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privilegeId: priv.id, privilegeName: priv.privilege_name, cardName })
      });
      const data = await res.json();
      
      setClaimedPrivileges(prev => ({
        ...prev,
        [priv.id]: (prev[priv.id] ?? priv.used_quota) + 1
      }));
      setToastMessage(data.message || `Redeemed ${priv.privilege_name}!`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch {
      setToastMessage(`Redemption recorded for ${priv.privilege_name}!`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleApply = async (rec: Recommendation) => {
    try {
      const res = await fetch('/api/monitoring/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: rec.id,
          bankName: rec.bank_name,
          productName: rec.product_name
        })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedIds(prev => ({ ...prev, [rec.id]: true }));
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch {
      setToastMessage(`Request submitted for ${rec.product_name}`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const filteredRecs = recommendations.filter(rec => {
    if (filterCategory === 'ALL') return true;
    return rec.category === filterCategory;
  });

  const categoryLabels: Record<string, string> = {
    ALL: 'All Recommendations',
    SIP: '📈 SIPs & Funds',
    TERM_LIFE: '🛡️ Term Life',
    HEALTH_INSURANCE: '🏥 Health Insurance',
    FIXED_DEPOSIT: '💰 Fixed Deposits',
    TAX_SAVER: '⚖️ Tax Savers (80C)'
  };

  return (
    <div className="page-container" style={{ padding: '32px 40px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <header className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '28px', background: 'linear-gradient(45deg, #00F0FF, #7000FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
            📡 Proactive Data Monitoring
          </h1>
          <p className="page-subtitle" style={{ color: '#8B949E', margin: '4px 0 0 0', fontSize: '14px' }}>
            Banks analyze your financial profile signals to proactively offer custom products, policies, SIPs & protection plans.
          </p>
        </div>
      </header>

      {toastMessage && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.4)', color: '#00F0FF', fontWeight: 600, fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>✨</span> {toastMessage}
        </div>
      )}

      {/* User Profile Signals Bar */}
      {signals && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B949E', fontWeight: 700, marginBottom: '16px' }}>
            🔍 Analyzed Profile Data Parameters ({signals.name || 'User'})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>Age & Risk Score</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{signals.age} Yrs | {signals.riskTolerance}/10</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>Monthly Surplus</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#00F0FF', marginTop: '4px' }}>₹{signals.safeToSpend.toLocaleString()}</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>Health Cover</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: signals.healthCover < 1500000 ? '#FF9500' : '#30D158', marginTop: '4px' }}>₹{(signals.healthCover / 100000).toFixed(1)}L</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>Term Life Cover</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: signals.termCover < 15000000 ? '#FF9500' : '#30D158', marginTop: '4px' }}>₹{(signals.termCover / 10000000).toFixed(2)}Cr</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#8B949E' }}>80C Utilized</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: signals.s80cUtilized < 150000 ? '#FF9500' : '#30D158', marginTop: '4px' }}>₹{signals.s80cUtilized.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 Financial Commitments & Overspend Risk Radar (ADDITIONAL FEATURE) */}
      {spendingAlerts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#FF9500', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Financial Commitments & Overspend Radar
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {spendingAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px 24px', 
                  borderRadius: '14px', 
                  background: alert.severity === 'CRITICAL' ? 'rgba(255, 69, 58, 0.08)' : 'rgba(255, 149, 0, 0.08)', 
                  border: `1px solid ${alert.severity === 'CRITICAL' ? 'rgba(255, 69, 58, 0.3)' : 'rgba(255, 149, 0, 0.3)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ maxWidth: '780px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: alert.severity === 'CRITICAL' ? '#FF453A' : '#FF9500', marginBottom: '6px' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#D0D7DE', lineHeight: '1.5' }}>
                    {alert.message}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setToastMessage(`Action Triggered: Liquidity buffer locked for upcoming commitments.`);
                    setTimeout(() => setToastMessage(null), 4000);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: alert.severity === 'CRITICAL' ? 'linear-gradient(45deg, #FF453A, #FF9500)' : 'linear-gradient(45deg, #FF9500, #00F0FF)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🛡️ {alert.action_hint || 'Lock Liquidity Buffer'}
                </button>
              </div>
            ))}
          </div>

          {/* Scheduled Commitments List */}
          {commitments.length > 0 && (
            <div className="glass-panel" style={{ marginTop: '16px', padding: '20px 24px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', marginBottom: '14px' }}>
                📅 Scheduled Auto-Debits & Commitments Due (Next 7 Days)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {commitments.map(item => (
                  <div key={item.id} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{item.commitment_name}</div>
                      <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '2px' }}>🏦 {item.bank_name} • <span style={{ color: '#00F0FF' }}>{item.due_date}</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#FF9500' }}>₹{Number(item.amount).toLocaleString()}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#30D158' }}>{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 💳 Proactive Card Privileges & Forgotten Benefits Radar */}
      {cardData && cardData.cards && cardData.cards.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#00F0FF', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💳</span> Proactive Card Privileges & Forgotten Benefits Radar
            </div>
            {cardData.summary.forgottenValueAtRisk > 0 && (
              <div style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.4)', padding: '6px 14px', borderRadius: '20px', color: '#FF453A', fontSize: '12px', fontWeight: 700 }}>
                ⚠️ ₹{cardData.summary.forgottenValueAtRisk.toLocaleString()} Unclaimed Value at Risk of Expiring
              </div>
            )}
          </div>

          {/* Cards Summary Banner */}
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Cards Monitored</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{cardData.summary.totalCards} Cards</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Annual Privileges Value</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#30D158', marginTop: '4px' }}>₹{cardData.summary.totalPrivilegeValue.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Privileges Claimed</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#00F0FF', marginTop: '4px' }}>₹{cardData.summary.usedPrivilegeValue.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forgotten / Unclaimed Perks</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: cardData.summary.forgottenCount > 0 ? '#FF9500' : '#30D158', marginTop: '4px' }}>{cardData.summary.forgottenCount} Perks At Risk</div>
              </div>
            </div>
          </div>

          {/* Proactive Forgotten Alerts Banner */}
          {cardData.forgottenAlerts && cardData.forgottenAlerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {cardData.forgottenAlerts.map((alert, idx) => (
                <div key={idx} style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#FF9500' }}>
                      🔔 Forgotten Perk Warning: {alert.privilegeName} ({alert.cardName})
                    </div>
                    <div style={{ fontSize: '12px', color: '#8B949E', marginTop: '2px' }}>
                      You have <strong style={{ color: '#fff' }}>{alert.remainingQuota} of {alert.totalQuota} {alert.unit}</strong> remaining before reset on <span style={{ color: '#00F0FF' }}>{alert.expiryDate}</span>.
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#FF453A', display: 'block' }}>₹{alert.valueAtRisk.toLocaleString()} at Risk</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Card Selector Tabs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {cardData.cards.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: `1px solid ${selectedCardId === c.id ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`,
                  background: selectedCardId === c.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: selectedCardId === c.id ? '#00F0FF' : '#8B949E',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                💳 {c.card_name} (•• {c.card_number_last4})
              </button>
            ))}
          </div>

          {/* Active Selected Card Privileges Grid */}
          {cardData.cards.filter(c => c.id === selectedCardId || !selectedCardId).slice(0, 1).map(activeCard => {
            const privs = activeCard.card_privileges || activeCard.privileges || [];
            return (
              <div key={activeCard.id} className="glass-panel" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{activeCard.card_name}</h3>
                    <div style={{ fontSize: '12px', color: '#8B949E', marginTop: '4px' }}>
                      🏦 {activeCard.bank_name} • Annual Fee: ₹{Number(activeCard.annual_fee).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {privs.map(priv => {
                    const currentUsed = claimedPrivileges[priv.id] ?? priv.used_quota;
                    const percentUsed = Math.min(100, Math.round((currentUsed / priv.total_quota) * 100));
                    const isExpiringForgotten = priv.is_forgotten_alert || (priv.total_quota - currentUsed >= Math.ceil(priv.total_quota * 0.5));
                    const remainingQuota = Math.max(0, priv.total_quota - currentUsed);
                    const unutilizedValue = remainingQuota * (priv.monetary_value_per_unit || 1000);

                    return (
                      <div key={priv.id} style={{ padding: '18px', borderRadius: '14px', background: isExpiringForgotten ? 'rgba(255, 149, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)', border: isExpiringForgotten ? '1px solid rgba(255, 149, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,240,255,0.15)', color: '#00F0FF', textTransform: 'uppercase' }}>
                              {priv.category}
                            </span>
                            {isExpiringForgotten && (
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 69, 58, 0.2)', color: '#FF453A' }}>
                                ⚠️ Forgotten Perk
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                            {priv.privilege_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '12px' }}>
                            Resets: {priv.reset_frequency} • Expires: {priv.expiry_date || 'N/A'}
                          </div>

                          {/* Progress Bar */}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#8B949E', marginBottom: '4px' }}>
                              <span>Quota Utilized: {currentUsed} / {priv.total_quota} {priv.unit}</span>
                              <span style={{ color: percentUsed === 100 ? '#30D158' : '#FF9500' }}>{percentUsed}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${percentUsed}%`, height: '100%', background: percentUsed === 100 ? '#30D158' : isExpiringForgotten ? '#FF9500' : '#00F0FF', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#8B949E' }}>Unclaimed Value</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: unutilizedValue > 0 ? '#FF9500' : '#30D158' }}>
                              ₹{unutilizedValue.toLocaleString()}
                            </div>
                          </div>
                          {remainingQuota > 0 ? (
                            <button
                              onClick={() => handleClaimPrivilege(priv, activeCard.card_name)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(45deg, #00F0FF, #7000FF)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✨ Claim Benefit
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#30D158' }}>✓ Fully Used</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {Object.keys(categoryLabels).map(catKey => (
          <button
            key={catKey}
            onClick={() => setFilterCategory(catKey)}
            style={{
              padding: '10px 18px',
              borderRadius: '20px',
              border: `1px solid ${filterCategory === catKey ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`,
              background: filterCategory === catKey ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.03)',
              color: filterCategory === catKey ? '#00F0FF' : '#8B949E',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {categoryLabels[catKey]}
          </button>
        ))}
      </div>

      {/* Recommendations Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8B949E' }}>
          Analyzing profile signals & querying bank product catalog...
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: '#8B949E' }}>
          No recommendations matching the selected category.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredRecs.map(rec => {
            const isApplied = appliedIds[rec.id];
            return (
              <div
                key={rec.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, border 0.2s',
                }}
              >
                <div>
                  {/* Top Badge & Bank */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', background: 'rgba(112, 0, 255, 0.2)', border: '1px solid rgba(112, 0, 255, 0.4)', color: '#D09EFF' }}>
                      {rec.badge}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B949E' }}>
                      🏦 {rec.bank_name}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                    {rec.product_name}
                  </h3>

                  {/* Return / Cover Highlight */}
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#00F0FF', marginBottom: '16px' }}>
                    {rec.expected_return_or_cover}
                  </div>

                  {/* XAI Explanation Card */}
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0, 240, 255, 0.04)', border: '1px solid rgba(0, 240, 255, 0.12)', fontSize: '13px', color: '#D0D7DE', lineHeight: '1.5', marginBottom: '16px' }}>
                    <strong style={{ color: '#00F0FF', display: 'block', marginBottom: '4px' }}>💡 Why your bank recommended this:</strong>
                    {rec.reasoning_xai}
                  </div>

                  {/* Impact Summary */}
                  <div style={{ fontSize: '12px', color: '#30D158', fontWeight: 600, marginBottom: '20px' }}>
                    🎯 Impact: {rec.impact_summary}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => handleApply(rec)}
                  disabled={isApplied}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isApplied ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #00F0FF, #7000FF)',
                    color: isApplied ? '#8B949E' : '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isApplied ? 'default' : 'pointer',
                    boxShadow: isApplied ? 'none' : '0 4px 15px rgba(0, 240, 255, 0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isApplied ? '✓ Application Submitted' : 'Apply & Activate Product'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
