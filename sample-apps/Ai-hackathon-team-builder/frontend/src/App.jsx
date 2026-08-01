import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import StudentDirectory from './components/StudentDirectory.jsx';
import StudentRegistrationModal from './components/StudentRegistrationModal.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';
import TeamDashboard from './components/TeamDashboard.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([1, 2, 3, 4]);

  // Load registered user profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('titan_registered_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentUserProfile(parsed);
      }
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
  }, []);

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(stId => stId !== id) : [...prev, id]
    );
  };

  const handleStudentAdded = (newStudent) => {
    setCurrentUserProfile(newStudent);
    try {
      localStorage.setItem('titan_registered_user', JSON.stringify(newStudent));
    } catch (e) {
      console.error('Failed to save user profile to storage', e);
    }
    setSelectedStudentIds(prev => Array.from(new Set([...prev, newStudent.id])));
    setIsProfileOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenRegister={() => setIsRegisterOpen(true)} 
        currentUserProfile={currentUserProfile}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Body */}
      <main style={{ flex: 1, padding: '0 24px 40px 24px' }}>
        {activeTab === 'chat' && (
          <ChatInterface onNavigateToDashboard={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'directory' && (
          <StudentDirectory 
            selectedStudentIds={selectedStudentIds} 
            onToggleSelectStudent={handleToggleSelectStudent} 
            currentUserProfile={currentUserProfile}
          />
        )}

        {activeTab === 'dashboard' && (
          <TeamDashboard 
            selectedStudentIds={selectedStudentIds} 
          />
        )}
      </main>

      {/* Student Registration Modal */}
      <StudentRegistrationModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
        onStudentAdded={handleStudentAdded} 
      />

      {/* Registered User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={currentUserProfile}
        isSelectedInTeam={currentUserProfile ? selectedStudentIds.includes(currentUserProfile.id) : false}
        onToggleSelectTeam={handleToggleSelectStudent}
        onNavigateToDirectory={() => setActiveTab('directory')}
      />

    </div>
  );
}
