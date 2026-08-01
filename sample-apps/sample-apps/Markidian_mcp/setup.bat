echo 'prepare Windows preinstall'
echo 'Installing Python dependencies for OCR and Audio...'
python -m venv .venv
.venv\Scripts\pip install markitdown pypdf pdfminer.six pdfplumber SpeechRecognition imageio-ffmpeg youtube-transcript-api
node scripts\patch-markitdown.js
echo 'Finished installing Python dependencies'
