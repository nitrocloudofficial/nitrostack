import React, { useState } from 'react';
import axios from 'axios';

function QueryTab() {
    const [query, setQuery] = useState('');
    const [resourceGroup, setResourceGroup] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('/api/query', {
                query,
                resource_group: resourceGroup || undefined
            });
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', color: '#a855f7' }}>
                Ask a Question About Your Cloud Resources
            </h2>
            <p style={{ color: '#a0a0b0', marginBottom: '2rem' }}>
                Use natural language to query your Azure infrastructure. The AI orchestrator
                will route your request to the appropriate agent.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Your Question</label>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., Show me all idle VMs in my subscription"
                        required
                    />
                </div>

                <div className="input-group">
                    <label>Resource Group (Optional)</label>
                    <input
                        type="text"
                        value={resourceGroup}
                        onChange={(e) => setResourceGroup(e.target.value)}
                        placeholder="e.g., agentic-rg"
                    />
                </div>

                <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? 'Processing...' : 'Send Query'}
                </button>
            </form>

            {loading && <div className="loading">Analyzing your query</div>}

            {error && (
                <div className="error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div className="result-card">
                    <h3>🤖 Response</h3>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#22d3ee' }}>Agents Used:</strong>{' '}
                        {result.agents_used?.join(', ') || 'N/A'}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ color: '#22d3ee' }}>Answer:</strong>
                        <p style={{ marginTop: '0.5rem', lineHeight: '1.8' }}>{result.response}</p>
                    </div>
                    {result.data && (
                        <details style={{ marginTop: '1rem' }}>
                            <summary style={{ cursor: 'pointer', color: '#a855f7', fontWeight: '600' }}>
                                View Raw Data
                            </summary>
                            <pre style={{ marginTop: '1rem' }}>
                                {JSON.stringify(result.data, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}

export default QueryTab;
