import { camera } from '../lib/camera.js';

export class CaptureView {
  constructor(coinId, onNext, onBack) {
    this.coinId = coinId;
    this.onNext = onNext;
    this.onBack = onBack;
    this.mode = 'camera'; // 'camera' or 'upload'
    this.hasCamera = false;
  }

  async initCamera(container) {
    const video = container.querySelector('#camera-stream');
    if (!video) return;

    this.hasCamera = await camera.startCamera(video);
    if (!this.hasCamera) {
      this.toggleMode(container, 'upload');
    }
  }

  toggleMode(container, newMode) {
    this.mode = newMode;
    camera.stopCamera();
    this.renderContent(container);
    if (this.mode === 'camera') {
      this.initCamera(container);
    }
  }

  renderContent(container) {
    const isCamera = this.mode === 'camera';

    container.innerHTML = `
      <div class="wizard-box animate-fade-in-up">
        <div class="step-indicator">
          <div class="step-node completed">1</div>
          <div class="step-node active">2</div>
          <div class="step-node">3</div>
        </div>

        <div class="glass-card">
          <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Capture Foot</h2>
          <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
            Place your bare foot flat on a light floor, and place your selected coin beside it. Maintain your camera at a 90° angle directly above your foot.
          </p>

          ${isCamera ? `
            <div class="camera-box">
              <video id="camera-stream" class="camera-preview" autoplay playsinline></video>
              <div class="camera-overlay">
                <div class="overlay-guide"></div>
                <div class="overlay-coin-guide"></div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; margin-bottom: 24px;">
              <button class="btn btn-primary pulse-glow-active" id="btn-capture" style="width: 100%;">
                📸 Capture Photo
              </button>
              <button class="btn btn-secondary" id="btn-toggle-upload" style="width: 100%; font-size: 13px; padding: 10px;">
                Use File Upload Instead
              </button>
            </div>
          ` : `
            <div class="upload-area" id="upload-zone">
              <div class="upload-icon">📁</div>
              <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Click or Drag & Drop File</h3>
              <p style="color: var(--color-text-muted); font-size: 12px; margin-bottom: 4px;">Supports JPG, PNG formats (Max 20MB)</p>
              <p style="color: var(--color-text-muted); font-size: 11px; font-style: italic;">Images are automatically compressed & optimized for processing</p>
              <input type="file" id="file-input" accept="image/*" style="display: none;" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; margin-bottom: 24px;">
              <button class="btn btn-secondary" id="btn-toggle-camera" style="width: 100%; font-size: 13px; padding: 10px;">
                Switch to Live Camera
              </button>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; margin-top: 32px; border-top: 1px solid var(--color-border); padding-top: 20px;">
            <button class="btn btn-secondary" id="btn-capture-back">Back</button>
          </div>
        </div>
      </div>
    `;

    // Hook listeners
    document.getElementById('btn-capture-back').addEventListener('click', () => {
      camera.stopCamera();
      this.onBack();
    });

    if (isCamera) {
      document.getElementById('btn-capture').addEventListener('click', async () => {
        const video = container.querySelector('#camera-stream');
        const photo = await camera.capturePhoto(video);
        if (photo) {
          camera.stopCamera();
          this.onNext(photo);
        }
      });

      document.getElementById('btn-toggle-upload').addEventListener('click', () => {
        this.toggleMode(container, 'upload');
      });
    } else {
      const zone = document.getElementById('upload-zone');
      const input = document.getElementById('file-input');

      zone.addEventListener('click', () => input.click());

      // Drag and drop
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--color-primary)';
      });

      zone.addEventListener('dragleave', () => {
        zone.style.borderColor = 'var(--color-border)';
      });

      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.style.borderColor = 'var(--color-border)';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          const photo = await camera.processUploadedFile(files[0]);
          this.onNext(photo);
        }
      });

      input.addEventListener('change', async () => {
        if (input.files.length > 0) {
          const photo = await camera.processUploadedFile(input.files[0]);
          this.onNext(photo);
        }
      });

      document.getElementById('btn-toggle-camera').addEventListener('click', () => {
        this.toggleMode(container, 'camera');
      });
    }
  }

  render(container) {
    this.renderContent(container);
    if (this.mode === 'camera') {
      this.initCamera(container);
    }
  }
}
