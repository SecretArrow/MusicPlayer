#!/bin/bash
# Automate theme/view screenshots via agent-browser.
set -u
DIR="${2:-/tmp/render/views}"
mkdir -p "$DIR"

ref_for() {  # $1 = grep pattern (extended regex), $2 = "first"|"last"
  local pick="${2:-first}"
  if [ "$pick" = "last" ]; then
    agent-browser snapshot 2>/dev/null | grep -E "$1" | grep -oE 'ref=e[0-9]+' | tail -1 | sed 's/ref=//'
  else
    agent-browser snapshot 2>/dev/null | grep -E "$1" | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=//'
  fi
}

click_ref() { agent-browser click "@$1" >/dev/null 2>&1; }

switch_theme() {  # $1 = 1-based radio index
  local btn radio close
  btn=$(ref_for 'button "Themes and appearance"' last)
  [ -z "$btn" ] && { echo "no theme btn"; return 1; }
  click_ref "$btn"; sleep 0.6
  radio=$(agent-browser snapshot 2>/dev/null | grep -E 'radio "' | grep -oE 'ref=e[0-9]+' | sed -n "$1p" | sed 's/ref=//')
  [ -z "$radio" ] && { echo "no radio $1"; return 1; }
  click_ref "$radio"; sleep 0.6
  close=$(ref_for '"Close"')
  [ -n "$close" ] && click_ref "$close"
  sleep 0.8
}

close_sheet() {  # focus layout: return to stage if browse sheet is open
  local r
  r=$(ref_for '"Back to stage"')
  [ -n "$r" ] && click_ref "$r" && sleep 0.5
}

nav_library() {  # $1 = accessible name of the library nav control
  local r
  r=$(ref_for "button \"$1\"")
  [ -n "$r" ] && click_ref "$r" && sleep 0.8
}

shot() { agent-browser screenshot "$DIR/$1.png" >/dev/null 2>&1 && echo "shot $1"; }

PAIRS="midnight:1 aurora:2 sunset:3 rosewood:4 violet:5 ocean:6 forest:7 mono:8 coffee:9 daylight:10"
NAV_BY_THEME="midnight=Your Library aurora=Library sunset=Shelves rosewood=Library violet=library ocean='Your Library' forest=Library mono='Your Library' coffee=Library daylight='Your Library'"

for pair in $PAIRS; do
  name="${pair%%:*}"; idx="${pair##*:}"
  target="$DIR/lib-$name.png"
  [ -n "${ONLY:-}" ] && [ "$ONLY" != "$name" ] && continue
  if [ -n "${FORCE:-}" ] || [ ! -f "$target" ]; then
    close_sheet
    switch_theme "$idx" || { echo "switch failed $name"; exit 1; }
    nav_library "$(echo "$NAV_BY_THEME" | tr ' ' '\n' | grep "^$name=" | cut -d= -f2 | tr -d "'")"
    shot "lib-$name"
  fi
done
echo DONE
