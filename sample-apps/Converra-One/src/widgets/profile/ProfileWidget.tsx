import React, { useState, useEffect } from 'react';

export interface UserSessionData {
  userName: string;
  workspaceName: string;
  userRole: string;
  userEmail: string;
  avatarUrl: string;
  department: string;
  timezone: string;
  themePreference: string;
}

export interface ProfileWidgetProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  statusText?: string;
  onOpenSettings?: () => void;
  onUpdateSession?: (session: UserSessionData) => void;
}

export const ProfileWidget: React.FC<ProfileWidgetProps> = ({
  userName: propName = 'Alex Mercer',
  userRole: propRole = 'Principal Systems Architect',
  userEmail: propEmail = 'alex.mercer@converra.io',
  statusText = 'Focus Mode • In CS340 Blueprint Sync',
  onOpenSettings,
  onUpdateSession
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [session, setSession] = useState<UserSessionData>({
    userName: propName,
    workspaceName: 'Converra AI Workspace',
    userRole: propRole,
    userEmail: propEmail,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    department: 'Core Infrastructure',
    timezone: 'America/Los_Angeles (PST)',
    themePreference: 'Dark Glassmorphism'
  });

  const [formData, setFormData] = useState<UserSessionData>(session);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('converra_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);
        setFormData(parsed);
      } catch (e) {
        // Fallback to default
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName.trim()) {
      setValidationError('User Name cannot be empty.');
      return;
    }
    if (!formData.workspaceName.trim()) {
      setValidationError('Workspace Name cannot be empty.');
      return;
    }

    setValidationError(null);
    setSession(formData);
    localStorage.setItem('converra_user_session', JSON.stringify(formData));

    if (onUpdateSession) {
      onUpdateSession(formData);
    }

    setToastSuccess('✅ Account session updated successfully!');
    setTimeout(() => setToastSuccess(null), 3000);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(session);
    setValidationError(null);
    setIsEditing(false);
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '18px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}
    >
      {toastSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            marginBottom: '14px',
            fontWeight: 500
          }}
        >
          {toastSuccess}
        </div>
      )}

      {!isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={session.avatarUrl}
              alt={session.userName}
              style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #38bdf8', objectFit: 'cover' }}
            />
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                {session.userName}
              </h3>
              <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
                {session.userRole} • {session.department}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                {session.userEmail}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '6px' }}>
                ● {statusText}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div>🏢 <strong>Workspace:</strong> {session.workspaceName}</div>
            <div>🌍 <strong>Timezone:</strong> {session.timezone}</div>
            <div>🎨 <strong>Theme:</strong> {session.themePreference}</div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✏️ Edit Account
            </button>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ⚙️ Preferences
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f8fafc', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
            Edit Account Session
          </h4>

          {validationError && (
            <div style={{ fontSize: '12px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '6px 10px', borderRadius: '6px' }}>
              ⚠️ {validationError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>User Name</label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Workspace Name</label>
              <input
                type="text"
                value={formData.workspaceName}
                onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Role</label>
              <input
                type="text"
                value={formData.userRole}
                onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Avatar Image URL</label>
            <input
              type="text"
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Theme Preference</label>
              <select
                value={formData.themePreference}
                onChange={(e) => setFormData({ ...formData, themePreference: e.target.value })}
                style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
              >
                <option value="Dark Glassmorphism">Dark Glassmorphism</option>
                <option value="Light Mode">Light Mode</option>
                <option value="System Default">System Default</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Save Session
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

