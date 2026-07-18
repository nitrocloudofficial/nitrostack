import React, { useState } from 'react';
import TopNav from './components/TopNav';

// Pages
import AgentConsole  from './components/AgentConsole';
import Dashboard     from './pages/Dashboard';
import Attendance    from './pages/Attendance';
import Timetable     from './pages/Timetable';
import Complaints    from './pages/Complaints';
import Hostel        from './pages/Hostel';
import Library       from './pages/Library';
import Finance       from './pages/Finance';
import Placements    from './pages/Placements';
import Events        from './pages/Events';
import Profile       from './pages/Profile';
import About         from './pages/About';

export default function App() {
  const [currentPage,   setCurrentPage]   = useState('agent');
  const [activeStudent, setActiveStudent] = useState('S1001');

  const renderPage = () => {
    switch (currentPage) {
      case 'agent':      return <AgentConsole activeStudent={activeStudent} />;
      case 'dashboard':  return <Dashboard    activeStudent={activeStudent} setCurrentPage={setCurrentPage} />;
      case 'attendance': return <Attendance   activeStudent={activeStudent} />;
      case 'timetable':  return <Timetable    activeStudent={activeStudent} />;
      case 'complaints': return <Complaints   activeStudent={activeStudent} />;
      case 'hostel':     return <Hostel       activeStudent={activeStudent} />;
      case 'library':    return <Library      activeStudent={activeStudent} />;
      case 'finance':    return <Finance      activeStudent={activeStudent} />;
      case 'placements': return <Placements   activeStudent={activeStudent} />;
      case 'events':     return <Events       activeStudent={activeStudent} />;
      case 'profile':    return <Profile      activeStudent={activeStudent} />;
      case 'about':      return <About />;
      default:           return <AgentConsole activeStudent={activeStudent} />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#f8fafc',
    }}>
      {/* Top navigation bar */}
      <TopNav
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        activeStudent={activeStudent}
        setActiveStudent={setActiveStudent}
      />

      {/* Page content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#f8fafc',
      }}>
        {renderPage()}
      </main>
    </div>
  );
}
