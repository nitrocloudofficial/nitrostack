import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ChatQueryView } from './components/ChatQueryView';
import { DecisionGraphView } from './components/DecisionGraphView';

export function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'graph'>('chat');
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);

  const handleQueryComplete = (response: any) => {
    if (response.highlight_decision_ids && response.highlight_decision_ids.length > 0) {
      setHighlightedNodeIds(response.highlight_decision_ids);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} serverStatus={true} />

      <main style={{ paddingBottom: '40px' }}>
        {activeTab === 'chat' ? (
          <ChatQueryView onQueryComplete={handleQueryComplete} />
        ) : (
          <DecisionGraphView highlightedNodeIds={highlightedNodeIds} />
        )}
      </main>
    </div>
  );
}

export default App;
