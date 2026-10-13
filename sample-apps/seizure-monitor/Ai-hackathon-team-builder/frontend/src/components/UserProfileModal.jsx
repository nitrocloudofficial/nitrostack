import React from 'react';
import { X, Sparkles, UserCheck, Shield, CheckCircle, Code, Heart, Calendar, Award, UserPlus, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function UserProfileModal({ isOpen, onClose, profile, isSelectedInTeam, onToggleSelectTeam, onNavigateToDirectory }) {
  if (!isOpen || !profile) return null;

  const handleConfetti = () => {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '32px',
        position: 'relative',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        boxShadow: '0 0 40px rgba(99, 102, 241, 0.25)'
      }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={22} />
        </button>

        {/* Top Banner & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
          }}>
            <UserCheck size={28} color="#fff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }} className="gradient-text">
                {profile.name}
              </h3>
              <span className="badge badge-emerald">
                <CheckCircle size={12} /> VERIFIED CANDIDATE
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Candidate ID: <strong style={{ color: '#fff' }}>STU-00{profile.id}</strong> • Registered User Profile
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          
          {/* Dept & Exp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>DEPARTMENT & YEAR</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{profile.department} ({profile.year || '3rd Year'})</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>EXPERIENCE LEVEL</span>
              <span className={`badge ${profile.experience_level === 'advanced' ? 'badge-purple' : profile.experience_level === 'intermediate' ? 'badge-cyan' : 'badge-amber'}`} style={{ fontSize: '0.82rem' }}>
                <Award size={12} /> {profile.experience_level}
              </span>
            </div>
          </div>

          {/* Technical Skills */}
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Code size={14} color="var(--accent-primary)" /> TECHNICAL SKILLS
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Array.isArray(profile.skills) && profile.skills.map((skill, idx) => (
                <span key={idx} className="badge badge-indigo" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Heart size={14} color="var(--accent-purple)" /> DOMAIN INTERESTS
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Array.isArray(profile.interests) && profile.interests.map((interest, idx) => (
                <span key={idx} className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Availability Schedule:
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
              {Array.isArray(profile.availability) ? profile.availability.join(', ') : 'Weekends'}
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {onNavigateToDirectory && (
            <button className="btn btn-secondary" onClick={() => { onClose(); onNavigateToDirectory(); }}>
              View in Roster
            </button>
          )}

          {onToggleSelectTeam && (
            <button 
              className={`btn ${isSelectedInTeam ? 'btn-cyan' : 'btn-primary'}`} 
              onClick={() => {
                onToggleSelectTeam(profile.id);
                handleConfetti();
              }}
            >
              {isSelectedInTeam ? (
                <>
                  <Check size={16} /> Added to Active Team
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Add My Profile to Team
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
