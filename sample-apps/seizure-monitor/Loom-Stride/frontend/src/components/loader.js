export function renderLoader(message = 'Processing request…') {
  return `
    <div style="text-align: center; padding: 40px 20px;" class="animate-fade-in" id="loader-view">
      <div class="spinner"></div>
      <p style="color: var(--color-text-muted); font-size: 15px; font-weight: 500; margin-top: 16px;" id="loader-message-text">
        ${message}
      </p>
      
      <div style="
        margin-top: 28px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 16px;
        font-family: monospace;
        font-size: 12px;
        text-align: left;
        color: var(--color-primary);
        max-height: 180px;
        overflow-y: auto;
        line-height: 1.6;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
      " id="loader-console-box">
        <div style="color: var(--color-text-muted); font-style: italic;">Console initialized. Waiting for tasks…</div>
      </div>
    </div>
  `;
}

export function logProgress(text, type = 'info') {
  const box = document.getElementById('loader-console-box');
  if (!box) return;

  // Clear placeholder if it's the first real log
  if (box.innerHTML.includes('Console initialized')) {
    box.innerHTML = '';
  }

  const time = new Date().toLocaleTimeString();
  let color = 'var(--color-primary)';
  if (type === 'success') color = 'var(--color-success)';
  if (type === 'warning') color = 'var(--color-warning)';
  if (type === 'error') color = 'var(--color-danger)';
  if (type === 'muted') color = 'var(--color-text-muted)';

  const line = document.createElement('div');
  line.style.marginBottom = '4px';
  line.innerHTML = `
    <span style="color: var(--color-text-muted); font-size: 10px; margin-right: 6px;">[${time}]</span>
    <span style="color: ${color};">${text}</span>
  `;
  
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}
