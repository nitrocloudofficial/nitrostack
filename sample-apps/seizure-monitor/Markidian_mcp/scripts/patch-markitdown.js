import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function findConvertersDir(rootDir) {
  const venvDir = path.join(rootDir, '.venv');
  if (!fs.existsSync(venvDir)) return null;

  // Windows path
  const winPath = path.join(venvDir, 'Lib', 'site-packages', 'markitdown', 'converters');
  if (fs.existsSync(winPath)) return winPath;

  // macOS / Linux path
  const libDir = path.join(venvDir, 'lib');
  if (fs.existsSync(libDir)) {
    const pythonDirs = fs.readdirSync(libDir).filter((d) => d.startsWith('python'));
    for (const pdir of pythonDirs) {
      const macPath = path.join(libDir, pdir, 'site-packages', 'markitdown', 'converters');
      if (fs.existsSync(macPath)) return macPath;
    }
  }

  return null;
}

const convertersDir = findConvertersDir(projectRoot);
if (!convertersDir) {
  console.log('markitdown converters directory not found in .venv (setup may not have completed yet)');
  process.exit(0);
}

const transcribeCode = `import io
import os
import sys
import subprocess
import tempfile
from typing import BinaryIO
from .._exceptions import MissingDependencyException

_dependency_exc_info = None
try:
    import warnings

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        warnings.filterwarnings("ignore", category=SyntaxWarning)
        import speech_recognition as sr
        import imageio_ffmpeg
except ImportError:
    _dependency_exc_info = sys.exc_info()


def transcribe_audio(file_stream: BinaryIO, *, audio_format: str = "wav") -> str:
    if _dependency_exc_info is not None:
        raise MissingDependencyException(
            "Speech transcription requires installing MarkItDown audio dependencies (\`pip install markitdown[audio-transcription]\` or \`pip install speechrecognition imageio-ffmpeg\`)."
        ) from _dependency_exc_info[1].with_traceback(_dependency_exc_info[2])

    if hasattr(file_stream, "seek"):
        try:
            file_stream.seek(0)
        except Exception:
            pass

    audio_bytes = file_stream.read()
    if not audio_bytes:
        return "[Empty audio file]"

    input_ext = f".{audio_format}" if audio_format else ".audio"
    with tempfile.NamedTemporaryFile(suffix=input_ext, delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tempfile.mktemp(suffix=".wav")

    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        proc = subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                tmp_in_path,
                "-f",
                "wav",
                "-ar",
                "16000",
                "-ac",
                "1",
                tmp_out_path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if proc.returncode != 0 or not os.path.exists(tmp_out_path):
            return f"[Audio conversion notice: {proc.stderr.decode('utf-8', errors='ignore')[:200]}]"

        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_out_path) as source:
            audio_data = recognizer.record(source)

        try:
            transcript = recognizer.recognize_google(audio_data).strip()
            return "[No speech detected]" if not transcript else transcript
        except sr.UnknownValueError:
            return "[No speech detected in audio file]"
        except sr.RequestError as e:
            return f"[Speech API request error: {e}]"
        except Exception as e:
            return f"[Speech recognition notice: {e}]"
    finally:
        if os.path.exists(tmp_in_path):
            try:
                os.remove(tmp_in_path)
            except Exception:
                pass
        if os.path.exists(tmp_out_path):
            try:
                os.remove(tmp_out_path)
            except Exception:
                pass
`;

const audioConverterCode = `from typing import Any, BinaryIO

from ._exiftool import exiftool_metadata
from ._transcribe_audio import transcribe_audio
from .._base_converter import DocumentConverter, DocumentConverterResult
from .._stream_info import StreamInfo
from .._exceptions import MissingDependencyException

ACCEPTED_MIME_TYPE_PREFIXES = [
    "audio/x-wav",
    "audio/mpeg",
    "video/mp4",
]

ACCEPTED_FILE_EXTENSIONS = [
    ".wav",
    ".mp3",
    ".m4a",
    ".mp4",
]


class AudioConverter(DocumentConverter):
    """
    Converts audio files to markdown via extraction of metadata (if \`exiftool\` is installed), and speech transcription (if \`speech_recognition\` is installed).
    """

    def accepts(
        self,
        file_stream: BinaryIO,
        stream_info: StreamInfo,
        **kwargs: Any,  # Options to pass to the converter
    ) -> bool:
        mimetype = (stream_info.mimetype or "").lower()
        extension = (stream_info.extension or "").lower()

        if extension in ACCEPTED_FILE_EXTENSIONS:
            return True

        for prefix in ACCEPTED_MIME_TYPE_PREFIXES:
            if mimetype.startswith(prefix):
                return True

        return False

    def convert(
        self,
        file_stream: BinaryIO,
        stream_info: StreamInfo,
        **kwargs: Any,  # Options to pass to the converter
    ) -> DocumentConverterResult:
        md_content = ""

        if hasattr(file_stream, "seek"):
            try:
                file_stream.seek(0)
            except Exception:
                pass

        metadata = exiftool_metadata(
            file_stream, exiftool_path=kwargs.get("exiftool_path")
        )
        if metadata:
            for f in [
                "Title",
                "Artist",
                "Author",
                "Band",
                "Album",
                "Genre",
                "Track",
                "DateTimeOriginal",
                "CreateDate",
                "NumChannels",
                "SampleRate",
                "AvgBytesPerSec",
                "BitsPerSample",
            ]:
                if f in metadata:
                    md_content += f"{f}: {metadata[f]}\\n"

        if stream_info.extension == ".wav" or stream_info.mimetype == "audio/x-wav":
            audio_format = "wav"
        elif stream_info.extension == ".mp3" or stream_info.mimetype == "audio/mpeg":
            audio_format = "mp3"
        elif (
            stream_info.extension in [".mp4", ".m4a"]
            or stream_info.mimetype == "video/mp4"
        ):
            audio_format = "mp4"
        else:
            audio_format = None

        if hasattr(file_stream, "seek"):
            try:
                file_stream.seek(0)
            except Exception:
                pass

        if audio_format:
            try:
                transcript = transcribe_audio(file_stream, audio_format=audio_format)
                if transcript:
                    md_content += "\\n\\n### Audio Transcript:\\n" + transcript
            except Exception as e:
                md_content += f"\\n\\n### Audio Transcript:\\n[Audio transcription notice: {e}]"

        return DocumentConverterResult(markdown=md_content.strip())
`;

fs.writeFileSync(path.join(convertersDir, '_transcribe_audio.py'), transcribeCode, 'utf-8');
fs.writeFileSync(path.join(convertersDir, '_audio_converter.py'), audioConverterCode, 'utf-8');
console.log('Successfully patched markitdown audio converters in:', convertersDir);
