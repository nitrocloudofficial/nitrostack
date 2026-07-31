#!/usr/bin/env python3
import time
import json
import os
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass


# Color constants
class C:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    BG_RED = '\033[41m'

SEVERITY_STYLES = {
    'info': {'icon': 'ℹ', 'color': C.CYAN, 'bg': ''},
    'warn': {'icon': '⚠', 'color': C.YELLOW, 'bg': ''},
    'error': {'icon': '✖', 'color': C.RED, 'bg': ''},
    'critical': {'icon': '🚨', 'color': C.WHITE, 'bg': C.BG_RED},
}

def get_method_color(method):
    if 'telecom' in method: return C.BLUE
    if 'deepfake' in method: return C.MAGENTA
    if 'mule' in method: return C.YELLOW
    if 'adjudicate' in method: return C.CYAN
    if 'guard' in method: return C.RED
    if 'mha' in method: return C.GREEN
    if 'pipeline' in method: return C.GREEN
    if 'flag' in method: return C.YELLOW
    if 'cleared' in method: return C.GREEN
    return C.WHITE

def render_log_entry(line):
    line = line.strip()
    if not line: return
    try:
        entry = json.loads(line)
        if entry.get('jsonrpc') != '2.0':
            print(f"{C.DIM}{line}{C.RESET}")
            return
            
        params = entry.get('params', {})
        level = params.get('_level', 'info')
        style = SEVERITY_STYLES.get(level, SEVERITY_STYLES['info'])
        method = entry.get('method', 'unknown')
        method_color = get_method_color(method)
        ts = params.get('_timestamp', '')
        
        severity_tag = f"{style['bg']}{style['color']}{C.BOLD} {style['icon']} {level.upper()} {C.RESET}" if style['bg'] else f"{style['color']}{style['icon']} {level.upper().ljust(8)}{C.RESET}"
        method_tag = f"{method_color}{C.BOLD}{method}{C.RESET}"
        id_tag = f"{C.DIM}{entry.get('id', '')}{C.RESET}"
        time_tag = f"{C.DIM}{ts[11:23]}{C.RESET}" if ts else ""
        
        print(f"{time_tag} {severity_tag} {method_tag} {id_tag}")
        
        # Print params
        clean_params = {k: v for k, v in params.items() if not k.startswith('_')}
        if clean_params:
            param_str = json.dumps(clean_params, indent=2)
            for p_line in param_str.split('\n'):
                print(f"  {C.DIM}│{C.RESET} {p_line}")
        print(f"  {C.DIM}└{'─'*60}{C.RESET}")
        
    except json.JSONDecodeError:
        print(f"{C.DIM}{line}{C.RESET}")

def main():
    log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs', 'stream.log')
    
    print(f"\n{C.BOLD}{C.CYAN}╔══════════════════════════════════════════════════════════════╗{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}║   🛡️  AEGIS PROTOCOL — JSON-RPC STREAM VIEWER              ║{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}║   Log: logs/stream.log                                      ║{C.RESET}")
    print(f"{C.BOLD}{C.CYAN}╚══════════════════════════════════════════════════════════════╝{C.RESET}\n")

    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    if not os.path.exists(log_path):
        open(log_path, 'w').close()

    if '--follow' not in sys.argv:
        # Replay only
        with open(log_path, 'r') as f:
            for line in f:
                render_log_entry(line)
        return

    # Follow mode
    print(f"{C.CYAN}Watching for new log entries... (Ctrl+C to stop){C.RESET}\n")
    with open(log_path, 'r') as f:
        f.seek(0, 2) # Go to end
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            render_log_entry(line)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{C.DIM}Stream viewer stopped.{C.RESET}")
        sys.exit(0)
