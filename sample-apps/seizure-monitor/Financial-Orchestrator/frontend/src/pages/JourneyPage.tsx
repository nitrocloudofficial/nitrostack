import React from 'react';
import { JourneyTimeline } from '../components/journey-timeline';

export const JourneyPage: React.FC = () => {
  const mockSessions = [
    { id: '1', date: new Date(Date.now() - 86400000 * 2).toISOString(), channel: 'MOBILE_APP', intent: 'Checked account balance', status: 'SUCCESS' as const, duration: '45s' },
    { id: '2', date: new Date(Date.now() - 3600000 * 5).toISOString(), channel: 'WEB_PORTAL', intent: 'Attempted to increase credit limit', status: 'ERROR' as const, duration: '2m 15s' },
    { id: '3', date: new Date().toISOString(), channel: 'IVR_CALL', intent: 'Speak to agent regarding limit increase', status: 'ESCALATED' as const, duration: 'Ongoing' }
  ];

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Omni-Channel Journey</h1>
          <p className="page-subtitle">Cross-Platform Interaction Stitching</p>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <JourneyTimeline userId="user-001" sessions={mockSessions} />
      </div>
    </div>
  );
};
