#!/bin/bash

echo 'Preparing Unix preinstall and virtual environment...'
PYTHON_BIN="python3"
if ! command -v python3 &> /dev/null; then
    if command -v python &> /dev/null; then
        PYTHON_BIN="python"
    else
        echo 'Error: Neither python3 nor python was found on system PATH.'
        exit 1
    fi
fi

echo "Using Python binary: $PYTHON_BIN"
$PYTHON_BIN -m venv .venv
.venv/bin/pip install markitdown pypdf pdfminer.six pdfplumber SpeechRecognition imageio-ffmpeg youtube-transcript-api
node scripts/patch-markitdown.js
echo 'Finished installing Python dependencies successfully.'
