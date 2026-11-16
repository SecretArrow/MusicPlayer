#!/bin/bash
# Switch theme then click a nav button by accessible name, then screenshot.
set -u
IDX="$1"; NAME="$2"; NAVPAT="$3"; OUT="$4"
source /home/z/my-project/scripts/lib.sh 2>/dev/null || true

ref_for() {
  local pick="${2:-first}"
  if [ "$pick" = "last" ]; then
    agent-browser snapshot 2>/dev/null | grep -E "$1" | grep -oE 'ref=e[0-9]+' | tail -1 | sed 's/ref=//'
  else
    agent-browser snapshot 2>/dev/null | grep -E "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//'
  fi
}
click_ref() { agent-browser click "@$1" >/dev/null 2>&1; }

btn=$(ref_for 'button "Themes and appearance"' last)
[ -z "$btn" ] && { echo "no theme btn"; exit 1; }
click_ref "$btn"; sleep 0.7
radio=$(agent-browser snapshot 2>/dev/null | grep -E 'radio "' | grep -oE 'ref=e[0-9]+' | sed -n "${IDX}p" | sed 's/ref=//')
[ -z "$radio" ] && { echo "no radio"; exit 1; }
click_ref "$radio"; sleep 0.7
close=$(ref_for '"Close"')
[ -n "$close" ] && click_ref "$close"; sleep 1.2

nav=$(ref_for "button \"[^\"]*$NAVPAT[^\"]*\"")
[ -z "$nav" ] && { echo "no nav $NAVPAT"; exit 1; }
click_ref "$nav"; sleep 1.2
agent-browser screenshot "$OUT" >/dev/null 2>&1 && echo "shot $OUT"
