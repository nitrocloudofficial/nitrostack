import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Download } from 'lucide-react';

function VisionTab() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bicepCode, setBicepCode] = useState(null);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (file) => {
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setError(null);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setError('Please select a valid image file');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleGenerate = async () => {
        if (!image) {
            setError('Please select an image first');
            return;
        }

        setLoading(true);
        setError(null);
        setBicepCode(null);

        const formData = new FormData();
        formData.append('file', image);

        try {
            const response = await axios.post('/api/vision/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setBicepCode(response.data.bicep_code);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!bicepCode) return;

        const blob = new Blob([bicepCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'main.bicep';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', color: '#a855f7' }}>
                Vision-Based Infrastructure Deployment
            </h2>
            <p style={{ color: '#a0a0b0', marginBottom: '2rem' }}>
                Upload an architecture diagram and let AI generate deployment code automatically.
            </p>

            <div
                className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input').click()}
            >
                <Upload size={48} style={{ color: '#a855f7', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    Drop your architecture diagram here
                </p>
                <p style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>
                    or click to browse (PNG, JPG, JPEG)
                </p>
                <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    style={{ display: 'none' }}
                />
            </div>

            {imagePreview && (
                <div className="image-preview">
                    <h3 style={{ color: '#22d3ee', marginBottom: '1rem' }}>Preview</h3>
                    <img src={imagePreview} alt="Architecture diagram preview" />
                </div>
            )}

            {image && (
                <button
                    className="button-primary"
                    onClick={handleGenerate}
                    disabled={loading}
                    style={{ marginTop: '1.5rem' }}
                >
                    {loading ? 'Analyzing Image...' : '🚀 Generate Deployment Code'}
                </button>
            )}

            {loading && <div className="loading">Analyzing architecture and generating Bicep code</div>}

            {error && (
                <div className="error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {bicepCode && (
                <div className="result-card">
                    <h3>📄 Generated Bicep Code</h3>
                    <div className="code-block">
                        <pre>{bicepCode}</pre>
                    </div>
                    <button className="download-button" onClick={handleDownload}>
                        <Download size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
                        Download main.bicep
                    </button>
                </div>
            )}
        </div>
    );
}

export default VisionTab;
