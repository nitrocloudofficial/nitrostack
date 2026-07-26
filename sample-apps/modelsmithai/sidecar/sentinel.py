"""
sentinel.py - The Sentinel agent's capability: model supply-chain security.

Three capabilities:
  1. scan_pickle(path)         - forensically inspect a .pt/.ckpt without loading
                                 it. Walks EVERY zip entry by content (not
                                 extension - that's the CVE-2025-1889 bypass),
                                 disassembles each pickle with pickletools, and
                                 flags dangerous opcodes against a torch-only
                                 allowlist. Returns a verdict + evidence.
  2. convert_safetensors(path) - re-save the weights as SafeTensors, which has
                                 NO code-execution path. Detection is an arms
                                 race; conversion is a guarantee.
  3. make_malicious_fixture()  - build a deliberately-malicious .pt as a SCAN
                                 TARGET for the demo. It is NEVER loaded/executed
                                 by this tool - only created and then scanned.

Run standalone:
    python sentinel.py scan C:/hack/storage/confuse/model.pt
    python sentinel.py make-evil C:/hack/storage/evil.pt
    python sentinel.py convert C:/hack/storage/confuse/model.pt
"""

from __future__ import annotations

import io
import os
import sys
import json
import zipfile
import pickletools

# ---------------------------------------------------------------------------
# Opcode policy
# GLOBAL / STACK_GLOBAL import a name; REDUCE / INST / OBJ / NEWOBJ construct via
# a callable; BUILD sets state. These are how pickle achieves code execution.
# We allow a small torch-only set of globals; anything else is suspicious.
# ---------------------------------------------------------------------------
DANGEROUS_OPCODES = {"REDUCE", "GLOBAL", "STACK_GLOBAL", "INST", "OBJ", "NEWOBJ", "BUILD"}

ALLOWED_GLOBALS = {
    # modules/callables legitimately seen in torch checkpoints
    "torch", "collections", "collections.OrderedDict",
    "torch._utils", "torch._utils._rebuild_tensor_v2",
    "torch._utils._rebuild_parameter",
    "torch.storage", "torch.FloatStorage", "torch.LongStorage",
    "torch.nn", "torch.Tensor", "numpy", "numpy.core.multiarray",
    "numpy.core.multiarray._reconstruct", "numpy.ndarray", "numpy.dtype",
    "_codecs",  # sometimes used for encoding, low risk in this context
}

# globals that are almost always malicious in a model file
KNOWN_BAD = {
    "os", "posix", "nt", "subprocess", "sys", "builtins", "__builtin__",
    "eval", "exec", "compile", "open", "socket", "shutil", "importlib",
    "pty", "commands", "runpy", "operator.methodcaller", "webbrowser",
}


def _iter_pickle_streams(path: str):
    """Yield (member_name, raw_bytes) for every pickle stream in the file.

    A .pt is usually a zip. We inspect by content: any member whose bytes start
    with the pickle protocol-2 magic (b'\\x80') is treated as a pickle stream,
    REGARDLESS of its file extension. That is the CVE-2025-1889 class of bypass:
    hiding a pickle under a non-.pkl name.
    """
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as zf:
            for name in zf.namelist():
                try:
                    data = zf.read(name)
                except Exception:
                    continue
                if data[:1] == b"\x80":  # pickle proto>=2 magic
                    yield name, data
    else:
        with open(path, "rb") as f:
            data = f.read()
        if data[:1] == b"\x80":
            yield os.path.basename(path), data


def scan_pickle(path: str) -> dict:
    if not os.path.exists(path):
        return {"error": f"file not found: {path}"}

    findings = []
    streams_scanned = 0

    for member, data in _iter_pickle_streams(path):
        streams_scanned += 1
        pending_global = None
        try:
            for opcode, arg, _pos in pickletools.genops(io.BytesIO(data)):
                name = opcode.name

                # Track imported globals to classify them
                if name in ("GLOBAL", "STACK_GLOBAL", "INST", "OBJ"):
                    g = str(arg).replace(" ", ".") if arg else "?"
                    root = g.split(".")[0]
                    if root in KNOWN_BAD or g in KNOWN_BAD:
                        findings.append({
                            "member": member, "opcode": name, "global": g,
                            "severity": "critical",
                            "why": f"imports '{g}' - not a tensor/model type; "
                                   f"can execute code on torch.load()",
                        })
                    elif g in ALLOWED_GLOBALS or root in ALLOWED_GLOBALS:
                        pass  # expected torch/numpy machinery
                    else:
                        findings.append({
                            "member": member, "opcode": name, "global": g,
                            "severity": "warning",
                            "why": f"imports '{g}' - not on the torch allowlist; "
                                   f"review before trusting",
                        })
                        pending_global = g

                elif name == "REDUCE":
                    # REDUCE calls the last global with args -> execution point
                    if pending_global and pending_global not in ALLOWED_GLOBALS:
                        findings.append({
                            "member": member, "opcode": "REDUCE",
                            "global": pending_global, "severity": "critical",
                            "why": f"REDUCE invokes '{pending_global}' - active "
                                   f"call during unpickling",
                        })
                    pending_global = None
        except Exception as e:  # malformed pickle is itself suspicious
            findings.append({
                "member": member, "opcode": "PARSE_ERROR", "global": None,
                "severity": "warning", "why": f"could not fully parse: {e}",
            })

    crit = [f for f in findings if f["severity"] == "critical"]
    warn = [f for f in findings if f["severity"] == "warning"]

    if crit:
        verdict = "DANGEROUS"
    elif warn:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"

    return {
        "path": path.replace("\\", "/"),
        "verdict": verdict,
        "streams_scanned": streams_scanned,
        "critical": crit,
        "warnings": warn,
        "summary": f"{verdict}: {len(crit)} critical, {len(warn)} warnings "
                   f"across {streams_scanned} pickle stream(s)",
    }


def convert_safetensors(path: str, out_path: str | None = None) -> dict:
    """Load weights with weights_only=True (safe) and re-save as SafeTensors.

    weights_only=True refuses to execute arbitrary globals, so even a malicious
    file cannot run code during this load. The output has no pickle at all.
    """
    import torch
    from safetensors.torch import save_file

    if out_path is None:
        out_path = os.path.splitext(path)[0] + ".safetensors"

    try:
        obj = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as e:
        return {"error": f"safe load failed (weights_only=True): {e}. "
                         f"File may be malicious or non-standard; not converted."}

    # Flatten to a tensor dict SafeTensors can store
    tensors = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if hasattr(v, "detach"):  # a tensor
                tensors[k] = v.detach().cpu().contiguous()
            elif isinstance(v, dict):  # e.g. a state_dict nested under a key
                for kk, vv in v.items():
                    if hasattr(vv, "detach"):
                        tensors[f"{k}.{kk}"] = vv.detach().cpu().contiguous()
    elif hasattr(obj, "detach"):
        tensors["tensor"] = obj.detach().cpu().contiguous()

    if not tensors:
        return {"error": "no tensors found to convert"}

    save_file(tensors, out_path)
    return {
        "input": path.replace("\\", "/"),
        "output": out_path.replace("\\", "/"),
        "tensors_written": len(tensors),
        "note": "SafeTensors format has no code-execution path - safe to load.",
    }


def make_malicious_fixture(out_path: str) -> dict:
    """Create a DELIBERATELY malicious .pt as a SCAN TARGET for the demo.

    The payload here is harmless (prints a marker) but uses the exact __reduce__
    mechanism a real attacker uses for RCE. This file is NEVER loaded by the
    Sentinel - it exists only to be scanned, proving the scanner catches it.
    """
    import pickle

    class Evil:
        def __reduce__(self):
            import os as _os
            # A real attacker would put a reverse shell / curl|bash here.
            # We use a benign, obvious marker command instead.
            return (_os.system, ("echo MALICIOUS_PAYLOAD_WOULD_RUN_HERE",))

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    # Wrap it in a zip like a real .pt so the scanner's zip-walk is exercised.
    payload = pickle.dumps(Evil(), protocol=2)
    with zipfile.ZipFile(out_path, "w") as zf:
        # note the innocuous, non-.pkl name - the CVE-2025-1889 style hiding
        zf.writestr("archive/data.bin", payload)
    return {
        "created": out_path.replace("\\", "/"),
        "note": "malicious scan-target created; it is NOT executed by this tool.",
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage:")
        print("  python sentinel.py scan     <path.pt>")
        print("  python sentinel.py convert  <path.pt> [out.safetensors]")
        print("  python sentinel.py make-evil <out.pt>")
        raise SystemExit(1)

    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "scan":
        print(json.dumps(scan_pickle(arg), indent=2))
    elif cmd == "convert":
        out = sys.argv[3] if len(sys.argv) > 3 else None
        print(json.dumps(convert_safetensors(arg, out), indent=2))
    elif cmd == "make-evil":
        print(json.dumps(make_malicious_fixture(arg), indent=2))
    else:
        print(f"unknown command: {cmd}")
        raise SystemExit(1)
