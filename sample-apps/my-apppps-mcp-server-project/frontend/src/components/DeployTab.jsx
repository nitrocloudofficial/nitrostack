import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Rocket, CheckCircle, XCircle, Loader } from 'lucide-react';

function DeployTab() {
    const [file, setFile] = useState(null);
    const [deploying, setDeploying] = useState(false);
    const [deploymentId, setDeploymentId] = useState(null);
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (selectedFile) => {
        if (selectedFile && selectedFile.name.endsWith('.zip')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please select a valid .zip file containing your project');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFileSelect(droppedFile);
    };

    const handleDeploy = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setDeploying(true);
        setError(null);
        setLogs([]);
        setStatus('uploading');

        try {
            // Step 1: Upload file
            const formData = new FormData();
            formData.append('file', file);

            setLogs(prev => [...prev, '📦 Uploading project files...']);

            const uploadResponse = await axios.post('/api/deploy/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setLogs(prev => [...prev, '✅ Upload complete']);
            setStatus('building');

            // Step 2: Start deployment
            setLogs(prev => [...prev, '🔨 Building Docker image...']);

            const deployResponse = await axios.post('/api/deploy/start', {
                upload_id: uploadResponse.data.upload_id,
                app_name: file.name.replace('.zip', '').toLowerCase()
            });

            setDeploymentId(deployResponse.data.deployment_id);
            setLogs(prev => [...prev, '🚀 Deploying to Azure Container Instances...']);

            // Step 3: Poll for status
            pollDeploymentStatus(deployResponse.data.deployment_id);

        } catch (err) {
            setError(err.response?.data?.detail || err.message);
            setStatus('failed');
            setLogs(prev => [...prev, `❌ Deployment failed: ${err.message}`]);
        } finally {
            setDeploying(false);
        }
    };

    const pollDeploymentStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`/api/deploy/status/${id}`);

                if (response.data.status === 'succeeded') {
                    setStatus('succeeded');
                    setLogs(prev => [...prev, `✅ Deployment successful!`]);
                    setLogs(prev => [...prev, `🌐 Your app is live at: ${response.data.url}`]);
                    clearInterval(interval);
                } else if (response.data.status === 'failed') {
                    setStatus('failed');
                    setLogs(prev => [...prev, `❌ Deployment failed`]);
                    clearInterval(interval);
                } else {
                    // Still in progress
                    if (response.data.message) {
                        setLogs(prev => [...prev, response.data.message]);
                    }
                }
            } catch (err) {
                console.error('Status check error:', err);
                clearInterval(interval);
            }
        }, 3000); // Poll every 3 seconds
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1.5rem' }}>
                Deploy to Azure
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.7' }}>
                Upload your project as a zip file and deploy it to Azure Container Instances.
                Your app will be automatically containerized and deployed.
            </p>

            {!deploymentId && (
                <>
                    <div
                        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onClick={() => document.getElementById('deploy-file-input').click()}
                    >
                        <Upload size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                            Drop your project here
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            or click to browse (.zip files only)
                        </p>
                        <input
                            id="deploy-file-input"
                            type="file"
                            accept=".zip"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {file && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <p style={{ fontWeight: 500 }}>Selected: {file.name}</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    )}

                    {file && (
                        <button
                            className="button-primary"
                            onClick={handleDeploy}
                            disabled={deploying}
                            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Rocket size={18} />
                            {deploying ? 'Deploying...' : 'Deploy to Azure'}
                        </button>
                    )}
                </>
            )}

            {error && (
                <div className="error">{error}</div>
            )}

            {logs.length > 0 && (
                <div className="result-card" style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {status === 'succeeded' && <CheckCircle size={20} color="var(--success)" />}
                        {status === 'failed' && <XCircle size={20} color="var(--error)" />}
                        {status && status !== 'succeeded' && status !== 'failed' && <Loader size={20} className="spin" />}
                        Deployment Logs
                    </h3>
                    <div style={{
                        background: 'var(--bg-primary)',
                        padding: '1rem',
                        borderRadius: '8px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        {logs.map((log, index) => (
                            <div key={index} style={{ padding: '0.25rem 0', color: 'var(--text-secondary)' }}>
                                {log}
                            </div>
                        ))}
                    </div>

                    {status === 'succeeded' && (
                        <button
                            className="button-primary"
                            onClick={() => {
                                setFile(null);
                                setDeploymentId(null);
                                setStatus(null);
                                setLogs([]);
                            }}
                            style={{ marginTop: '1rem' }}
                        >
                            Deploy Another App
                        </button>
                    )}
                </div>
            )}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </div>
    );
}

export default DeployTab;
