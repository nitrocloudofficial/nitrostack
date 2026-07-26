export function showToast(message, type = 'success', duration = 4000) {
  const container = document.body;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️';
  
  toast.innerHTML = `
    <span>${icon}</span>
    <span style="font-size: 14px; font-weight: 500; flex: 1;">${message}</span>
    <button class="toast-close-btn" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: currentColor;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      margin-left: 8px;
    ">✕</button>
  `;
  
  container.appendChild(toast);
  
  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.animation = 'slideInRight 0.3s ease-in reverse forwards';
      toast.addEventListener('animationend', () => {
        if (document.body.contains(toast)) toast.remove();
      });
    }
  }, duration);
}
