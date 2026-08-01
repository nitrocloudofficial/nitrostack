import React, { useState } from 'react';
import { X, Sparkles, User, Code, Heart, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StudentRegistrationModal({ isOpen, onClose, onStudentAdded }) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState('3rd Year');
  const [skills, setSkills] = useState('React, Node.js, TypeScript');
  const [interests, setInterests] = useState('AI Agents, Web Apps');
  const [experience, setExperience] = useState('intermediate');
  const [availability, setAvailability] = useState(['weekends']);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      const interestsArray = interests.split(',').map(i => i.trim()).filter(Boolean);

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          department,
          year,
          skills: skillsArray,
          interests: interestsArray,
          experience_level: experience,
          experience,
          availability
        })
      });

      const data = await res.json();
      if (data.student) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
        onStudentAdded(data.student);
        onClose();
      }
    } catch (err) {
      console.error('Failed to register student:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '28px', position: 'relative' }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Register New Student Profile</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Add candidate to the hackathon roster</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Full Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Department</label>
              <select className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="Computer Science">Computer Science</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Digital Design">Digital Design</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Experience Level</label>
              <select className="input-field" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Technical Skills (comma separated)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. React, Python, FastAPI, Docker"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Interests & Domains (comma separated)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Healthcare, Generative AI, EdTech"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Profile'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
