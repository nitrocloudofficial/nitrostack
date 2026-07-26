#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# setup_demo_screen.sh — tmux split-screen setup
# ═══════════════════════════════════════════════════════════════════

SESSION_NAME="aegis-demo"

# Check if session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "Tmux session $SESSION_NAME already exists. Attaching..."
    tmux attach -t $SESSION_NAME
    exit 0
fi

# Create new session
tmux new-session -d -s $SESSION_NAME

# Left pane: Stream logs
tmux send-keys -t $SESSION_NAME "python3 scripts/stream_logs.py --follow" C-m

# Split pane horizontally (left/right)
tmux split-window -h -t $SESSION_NAME

# Right pane: Start the Next.js dashboard
tmux send-keys -t $SESSION_NAME "cd src/widgets/app/aegis-dashboard && npm run dev" C-m

# Adjust pane sizes (optional: make right pane slightly larger for UI)
tmux resize-pane -R -t $SESSION_NAME 10

echo "Split-screen environment created."
echo "Run 'tmux attach -t aegis-demo' to view."
