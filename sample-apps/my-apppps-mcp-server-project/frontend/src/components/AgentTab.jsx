import React, { useState } from 'react';
import axios from 'axios';
import { Cpu, DollarSign, Shield } from 'lucide-react';

function AgentTab() {
    const [resourceGroup, setResourceGroup] = useState('agentic-rg');
    const [loading, setLoading] = useState(null);
    const [results, setResults] = useState({});
    const [error, setError] = useState(null);

    const callAgent = async (agentType, endpoint) => {
        setLoading(agentType);
        setError(null);

        try {
            const response = await axios.post(`/api/${endpoint}`, {
                resource_group: resourceGroup
            });
            setResults(prev => ({ ...prev, [agentType]: response.data }));
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(null);
        }
    };

    const agents = [
        {
            id: 'optimize',
            name: 'Resource Optimization',
            icon: Cpu,
            description: 'Analyze VM utilization and identify idle resources',
            color: '#3b82f6',
            endpoint: 'optimize/resources'
        },
        {
            id: 'cost',
            name: 'Cost Analysis',
            icon: DollarSign,
            description: 'Review resource costs and get savings recommendations',
            color: '#10b981',
            endpoint: 'analyze/costs'
        },
        {
            id: 'security',
            name: 'Security Check',
            icon: Shield,
            description: 'Scan security posture and compliance issues',
            color: '#ef4444',
            endpoint: 'check/security'
        }
    ];

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', color: '#a855f7' }}>
                Direct Agent Actions
            </h2>
            <p style={{ color: '#a0a0b0', marginBottom: '2rem' }}>
                Manually trigger specific agents to analyze your Azure resources.
            </p>

            <div className="input-group">
                <label>Resource Group</label>
                <input
                    type="text"
                    value={resourceGroup}
                    onChange={(e) => setResourceGroup(e.target.value)}
                    placeholder="Enter resource group name"
                />
            </div>

            <div className="agent-grid">
                {agents.map((agent) => {
                    const Icon = agent.icon;
                    const isLoading = loading === agent.id;
                    const result = results[agent.id];

                    return (
                        <div
                            key={agent.id}
                            className="agent-card"
                            onClick={() => !isLoading && callAgent(agent.id, agent.endpoint)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                                <Icon size={32} color={agent.color} />
                                <h3 style={{ marginLeft: '0.75rem', marginBottom: 0, color: agent.color }}>
                                    {agent.name}
                                </h3>
                            </div>
                            <p>{agent.description}</p>

                            <button
                                className="button-primary"
                                disabled={isLoading}
                                style={{ width: '100%', background: agent.color }}
                            >
                                {isLoading ? 'Running...' : 'Run Agent'}
                            </button>

                            {result && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#0a0a0f', borderRadius: '8px' }}>
                                    <strong style={{ color: '#22d3ee' }}>Status:</strong> {result.status}
                                    <details style={{ marginTop: '0.5rem' }}>
                                        <summary style={{ cursor: 'pointer', color: '#a855f7' }}>
                                            View Results
                                        </summary>
                                        <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                            {JSON.stringify(result.results, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {error && (
                <div className="error" style={{ marginTop: '2rem' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}
        </div>
    );
}

export default AgentTab;
