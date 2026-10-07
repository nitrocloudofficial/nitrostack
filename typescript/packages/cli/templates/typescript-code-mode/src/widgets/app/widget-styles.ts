export const widgetBaseStyles = `
  :root {
    --primary: #3B82F6;
    --primary-glow: rgba(59, 130, 246, 0.25);
    --success: #10B981;
    --success-glow: rgba(16, 185, 129, 0.2);
    --warning: #F59E0B;
    --warning-glow: rgba(245, 158, 11, 0.2);
    --danger: #EF4444;
    --danger-glow: rgba(239, 68, 68, 0.2);
    --purple: #8B5CF6;
    --purple-glow: rgba(139, 92, 246, 0.2);

    /* Dark Theme (Default for ChatGPT Dark Mode & Terminal) */
    --bg-page: #0B0F19;
    --bg-card: rgba(17, 24, 39, 0.95);
    --bg-card-subtle: rgba(31, 41, 55, 0.65);
    --bg-elevated: #1F2937;
    --border: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(59, 130, 246, 0.4);
    
    --text-primary: #F9FAFB;
    --text-secondary: #9CA3AF;
    --text-muted: #6B7280;
    --track-bg: rgba(55, 65, 81, 0.6);
    --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
  }

  @media (prefers-color-scheme: light) {
    :root:not(.dark) {
      --bg-page: #F3F4F6;
      --bg-card: #FFFFFF;
      --bg-card-subtle: #F9FAFB;
      --bg-elevated: #F3F4F6;
      --border: #E5E7EB;
      --border-hover: #3B82F6;
      --text-primary: #111827;
      --text-secondary: #4B5563;
      --text-muted: #9CA3AF;
      --track-bg: #E5E7EB;
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
  }

  .light {
    --bg-page: #F3F4F6;
    --bg-card: #FFFFFF;
    --bg-card-subtle: #F9FAFB;
    --bg-elevated: #F3F4F6;
    --border: #E5E7EB;
    --border-hover: #3B82F6;
    --text-primary: #111827;
    --text-secondary: #4B5563;
    --text-muted: #9CA3AF;
    --track-bg: #E5E7EB;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-page);
    color: var(--text-primary);
    -webkit-font-smoothing: antialiased;
    padding: 12px;
  }

  .widget-container {
    max-width: 680px;
    margin: 0 auto;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--shadow);
    backdrop-filter: blur(16px);
    transition: all 0.2s ease;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--bg-elevated);
    font-size: 16px;
  }

  .header-title h2 {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .header-title p {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 2px 0 0 0;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge-success {
    background: rgba(16, 185, 129, 0.15);
    color: var(--success);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .badge-info {
    background: rgba(59, 130, 246, 0.15);
    color: var(--primary);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .badge-purple {
    background: rgba(139, 92, 246, 0.15);
    color: var(--purple);
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s infinite;
  }

  .pulse-dot.success {
    background: var(--success);
    box-shadow: 0 0 8px var(--success);
  }

  .pulse-dot.info {
    background: var(--primary);
    box-shadow: 0 0 8px var(--primary);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.15); }
  }

  .grid-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .kpi-card {
    background: var(--bg-card-subtle);
    padding: 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .kpi-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-hover);
    box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.25);
  }

  .kpi-label {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .kpi-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .kpi-sub {
    font-size: 0.72rem;
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
  }

  .progress-section {
    margin-top: 16px;
    padding: 16px;
    background: var(--bg-card-subtle);
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .bar-row:last-child {
    margin-bottom: 0;
  }

  .bar-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
    min-width: 90px;
    font-weight: 500;
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: var(--track-bg);
    border-radius: 9999px;
    margin: 0 12px;
    overflow: hidden;
    position: relative;
  }

  .bar-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, var(--primary), #60A5FA);
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bar-value {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 50px;
    text-align: right;
  }

  .action-footer {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.73rem;
    color: var(--text-muted);
  }

  .action-footer span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  @media (max-width: 480px) {
    .grid-cards {
      grid-template-columns: repeat(2, 1fr);
    }
    .widget-container {
      padding: 14px;
    }
  }
`;
