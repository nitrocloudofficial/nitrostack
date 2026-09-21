import { useState } from 'react';
import { SAMPLE_PROPOSALS } from '../sampleProposals.js';

const CUSTOM_OPTION_ID = 'custom_proposal';

export default function ProposalForm({ onRun, disabled }) {
  const [selectedId, setSelectedId] = useState(SAMPLE_PROPOSALS[0].id);
  const [title, setTitle] = useState(SAMPLE_PROPOSALS[0].title);
  const [description, setDescription] = useState(SAMPLE_PROPOSALS[0].description);
  const [useCached, setUseCached] = useState(false);

  const handleSelectPreset = p => {
    setSelectedId(p.id);
    setTitle(p.title);
    setDescription(p.description);
  };

  const handleSelectCustom = () => {
    setSelectedId(CUSTOM_OPTION_ID);
    setTitle('');
    setDescription('');
    setUseCached(false); // Automatically uncheck cached replay for custom text
  };

  const handleTitleChange = newTitle => {
    setTitle(newTitle);
    setSelectedId(CUSTOM_OPTION_ID);
    setUseCached(false); // Automatically uncheck cached replay when typing
  };

  const handleDescriptionChange = newDesc => {
    setDescription(newDesc);
    setSelectedId(CUSTOM_OPTION_ID);
    setUseCached(false); // Automatically uncheck cached replay when typing
  };

  return (
    <section className="stage-card proposal-stage spacious-stage">
      <div className="stage-header">
        <span className="stage-badge">Stage 1 of 5</span>
        <h2>Submit a Proposal for Cross-Functional Review</h2>
        <p className="stage-caption">
          Select a pre-configured enterprise scenario or write your own custom proposal.
          Four specialized AI agents will independently cross-evaluate it against real company policies.
        </p>
      </div>

      <div className="preset-grid">
        {SAMPLE_PROPOSALS.map(p => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`preset-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelectPreset(p)}
              disabled={disabled}
            >
              {p.recommended && <span className="recommended-pill">★ Recommended</span>}
              <div className="preset-card-title">{p.title}</div>
              <div className="preset-card-meta">Proposal ID: {p.id.toUpperCase()}</div>
            </button>
          );
        })}

        <button
          type="button"
          className={`preset-card custom-preset-card ${selectedId === CUSTOM_OPTION_ID ? 'selected' : ''}`}
          onClick={handleSelectCustom}
          disabled={disabled}
        >
          <div className="preset-card-title">✍️ Write Custom Proposal</div>
          <div className="preset-card-meta">Draft from scratch</div>
        </button>
      </div>

      {useCached && selectedId === CUSTOM_OPTION_ID && (
        <div className="cached-warning-banner">
          ⚠️ <strong>Notice:</strong> "Use cached run" is currently enabled. This plays back a static saved run for Proposal 1.
          Uncheck "Use cached run" below to run live AI policy analysis on your custom proposal text.
        </div>
      )}

      <div className="form-fields spacious-fields">
        <div className="input-group">
          <label className="field-label" htmlFor="proposal-title">Proposal Title</label>
          <input
            type="text"
            id="proposal-title"
            placeholder="e.g. AI Employee Surveillance & Automated Termination Platform"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="input-group">
          <label className="field-label" htmlFor="proposal-text">Full Proposal Text &amp; Specifications</label>
          <textarea
            id="proposal-text"
            rows={10}
            placeholder="Specify summary, scope, technical approach, budget, and data handling..."
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-footer spacious-footer">
        <label className="cached-toggle">
          <input
            type="checkbox"
            checked={useCached}
            onChange={e => setUseCached(e.target.checked)}
            disabled={disabled}
          />
          <span>Use cached run <em>(offline demo safety net for Proposal 1)</em></span>
        </label>

        <button
          type="button"
          className="run-button primary-btn"
          disabled={disabled || !title.trim() || !description.trim()}
          onClick={() => onRun({ proposalTitle: title, proposalDescription: description, useCached })}
        >
          {disabled ? (
            <span className="btn-spinner">Initializing Board Review...</span>
          ) : (
            <span>Initiate Board Review 🚀</span>
          )}
        </button>
      </div>
    </section>
  );
}
