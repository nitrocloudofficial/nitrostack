import React, { useState } from 'react';
import { Cloud, Brain, Shield } from 'lucide-react';
import QueryTab from './components/QueryTab';
import VisionTab from './components/VisionTab';
import AgentTab from './components/AgentTab';
import DeployTab from './components/DeployTab';

function App() {
    const [activeTab, setActiveTab] = useState('query');

    return (
        <div className="app">
            <header className="header">
                <h1>Azure Agentic Cloud</h1>
                <p>AI-powered autonomous cloud management platform</p>
            </header>

            <div className="tabs">
                <button
                    className={`tab-button ${activeTab === 'query' ? 'active' : ''}`}
                    onClick={() => setActiveTab('query')}
                >
                    <span>Ask Questions</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'vision' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vision')}
                >
                    <span>Vision Deploy</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'deploy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('deploy')}
                >
                    <span>Deploy Code</span>
                </button>
                <button
                    className={`tab-button ${activeTab === 'agents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('agents')}
                >
                    <span>Agents</span>
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'query' && <QueryTab />}
                {activeTab === 'vision' && <VisionTab />}
                {activeTab === 'deploy' && <DeployTab />}
                {activeTab === 'agents' && <AgentTab />}
            </div>
        </div>
    );
}

export default App;
