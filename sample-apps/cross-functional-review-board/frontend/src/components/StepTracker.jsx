const STEPS = [
  { id: 1, label: 'Proposal', desc: 'Select or write proposal' },
  { id: 2, label: 'Live Analysis', desc: 'Agents review in parallel' },
  { id: 3, label: 'Department Verdicts', desc: 'Individual agent findings' },
  { id: 4, label: 'Cross-Agent Debate', desc: 'Structured debate & friction' },
  { id: 5, label: 'Executive Verdict', desc: 'Moderator synthesis' }
];

export default function StepTracker({ currentStep, maxUnlockedStep, onSelectStep }) {
  return (
    <nav className="step-tracker" aria-label="Review Stage Tracker">
      <div className="step-tracker-inner">
        {STEPS.map(step => {
          const isActive = currentStep === step.id;
          const isCompleted = step.id < currentStep || (maxUnlockedStep >= step.id && !isActive);
          const isUnlocked = step.id <= maxUnlockedStep;

          return (
            <button
              key={step.id}
              className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'disabled' : ''}`}
              onClick={() => isUnlocked && onSelectStep(step.id)}
              disabled={!isUnlocked}
            >
              <div className="step-circle">
                {isCompleted && !isActive ? (
                  <span className="check-icon">✓</span>
                ) : (
                  <span className="step-num">{step.id}</span>
                )}
              </div>
              <div className="step-text">
                <span className="step-label">{step.label}</span>
                <span className="step-desc">{step.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
