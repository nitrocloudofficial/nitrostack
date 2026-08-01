import React, { useState, useEffect } from 'react';
import { Search, Filter, UserCheck, Sparkles, Check, UserPlus } from 'lucide-react';

export default function StudentDirectory({ selectedStudentIds, onToggleSelectStudent, currentUserProfile }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [selectedExp, setSelectedExp] = useState('All');
  const [showOnlyMyProfile, setShowOnlyMyProfile] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [search, selectedSkill, selectedExp]);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedSkill !== 'All') params.append('skill', selectedSkill);
      if (selectedExp !== 'All') params.append('experience', selectedExp);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const skillFilterPills = ['All', 'React', 'Node.js', 'Python', 'FastAPI', 'Figma', 'Docker', 'PyTorch', 'TypeScript'];

  const displayedStudents = showOnlyMyProfile && currentUserProfile 
    ? students.filter(s => s.id === currentUserProfile.id || s.name.toLowerCase() === currentUserProfile.name.toLowerCase())
    : students;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Search & Filter Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Student Talent Pool</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Browse 25+ verified hackathon candidates & assemble your dream team</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentUserProfile && (
              <button 
                className={`btn ${showOnlyMyProfile ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                onClick={() => setShowOnlyMyProfile(!showOnlyMyProfile)}
              >
                <UserCheck size={15} color="#818cf8" />
                {showOnlyMyProfile ? 'Show All Students' : 'Show My Profile'}
              </button>
            )}

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '42px' }} 
                placeholder="Search name, skill, interest..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select 
              className="input-field" 
              style={{ width: '150px' }}
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
            >
              <option value="All">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Skill Filter Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', pt: '16px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
            <Filter size={14} /> Quick Skill Filters:
          </span>
          {skillFilterPills.map((sk) => (
            <button 
              key={sk}
              className={`btn ${selectedSkill === sk && !showOnlyMyProfile ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.78rem', borderRadius: '16px' }}
              onClick={() => {
                setShowOnlyMyProfile(false);
                setSelectedSkill(sk);
              }}
            >
              {sk}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {displayedStudents.map((st) => {
          const isSelected = selectedStudentIds.includes(st.id);
          const isUserRegisteredCard = currentUserProfile && (currentUserProfile.id === st.id || currentUserProfile.name.toLowerCase() === st.name.toLowerCase());

          return (
            <div 
              key={st.id} 
              className={`glass-panel glass-panel-hover ${isSelected ? 'selected-card' : ''}`}
              style={{ 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                borderColor: isUserRegisteredCard ? '#818cf8' : isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                boxShadow: isUserRegisteredCard 
                  ? '0 0 25px rgba(99, 102, 241, 0.4)' 
                  : isSelected ? '0 0 20px rgba(99, 102, 241, 0.25)' : 'var(--shadow-card)'
              }}
            >
              <div>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{st.name}</h3>
                      {isUserRegisteredCard && (
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem', border: '1px solid #818cf8' }}>
                          <Sparkles size={10} /> MY PROFILE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{st.department} • {st.year}</p>
                  </div>
                  <span className={`badge ${st.experience_level === 'advanced' ? 'badge-purple' : st.experience_level === 'intermediate' ? 'badge-cyan' : 'badge-amber'}`}>
                    {st.experience_level}
                  </span>
                </div>

                {/* Skills Section */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 600 }}>TECHNICAL SKILLS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.isArray(st.skills) && st.skills.map((skill, i) => (
                      <span key={i} className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interests Section */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 600 }}>INTEREST AREAS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.isArray(st.interests) && st.interests.map((interest, i) => (
                      <span key={i} className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Availability: <strong style={{ color: '#fff' }}>{Array.isArray(st.availability) ? st.availability.join(', ') : 'Weekends'}</strong>
                </span>

                <button 
                  className={`btn ${isSelected ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={() => onToggleSelectStudent(st.id)}
                >
                  {isSelected ? (
                    <>
                      <Check size={14} /> Added to Team
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Add to Team
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
