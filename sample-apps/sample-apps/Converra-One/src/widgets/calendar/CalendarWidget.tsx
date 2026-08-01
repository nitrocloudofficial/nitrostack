'use client';

import React, { useState } from 'react';
import { MOCK_EVENTS } from '../mockData';
import { CalendarEvent } from '../../shared/interfaces/CalendarEvent.interface';


function formatTimeString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export interface CalendarWidgetProps {
  events?: CalendarEvent[];
  onJoinMeeting?: (meetingUrl: string) => void;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  events = MOCK_EVENTS,
  onJoinMeeting
}) => {
  const [selectedPreviewMeeting, setSelectedPreviewMeeting] = useState<CalendarEvent | null>(null);

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Today&apos;s Schedule & Commitments
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Synchronized by Calendar Agent from Google Calendar & extracted email invites
            </p>
          </div>
        </div>

        <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          {events.length} Upcoming Events
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map((evt) => {
          const startTimeStr = formatTimeString(evt.startTime);
          const endTimeStr = formatTimeString(evt.endTime);

          return (
            <div
              key={evt.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderLeft: '4px solid #a855f7',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center', minWidth: '64px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc' }}>
                    {startTimeStr}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {endTimeStr}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                    {evt.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {evt.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                      📍 {evt.location || 'Online'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      🤖 Calendar Agent
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPreviewMeeting(evt)}
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
                  flexShrink: 0
                }}
              >
                👁️ Preview Meeting
              </button>
            </div>
          );
        })}
      </div>

      {/* Meeting Preview Modal */}
      {selectedPreviewMeeting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '24px'
          }}
        >
          <div
            style={{
              background: 'rgba(19, 25, 39, 0.95)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📅</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                    {selectedPreviewMeeting.title}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 600 }}>
                    Meeting Preview & Agenda
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPreviewMeeting(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                <strong>⏰ Time:</strong> {formatTimeString(selectedPreviewMeeting.startTime)} - {formatTimeString(selectedPreviewMeeting.endTime)}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                <strong>👤 Organizer:</strong> {selectedPreviewMeeting.organizer?.name || 'Unknown'} ({selectedPreviewMeeting.organizer?.email || 'N/A'})
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                <strong>📍 Location:</strong> {selectedPreviewMeeting.location || 'Google Meet'}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                <strong>📝 Description:</strong> {selectedPreviewMeeting.description || 'No description provided.'}
              </div>
              {selectedPreviewMeeting.attendees && selectedPreviewMeeting.attendees.length > 0 && (
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  <strong>👥 Attendees:</strong> {selectedPreviewMeeting.attendees.map(a => a.name).join(', ')}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedPreviewMeeting(null)}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Close Meeting Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
