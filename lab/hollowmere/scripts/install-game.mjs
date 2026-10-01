// Builds Hollowmere and installs a frozen runtime (no npm needed) to ~/Games/Hollowmere:
// dist/, serve.mjs, play.sh and Hollowmere.app (osacompile'd wrapper around play.sh).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(os.homedir(), 'Games', 'Hollowmere');

console.log('▸ building…');
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });

fs.rmSync(path.join(dest, 'dist'), { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(root, 'dist'), path.join(dest, 'dist'), { recursive: true });
fs.copyFileSync(path.join(root, 'scripts', 'serve.mjs'), path.join(dest, 'serve.mjs'));

const play = `#!/bin/bash
# Hollowmere — frozen runtime launcher (no npm, no checkout needed).
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"
PORT=5917
URL="http://127.0.0.1:$PORT"
if ! lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  nohup node serve.mjs dist >/tmp/hollowmere-serve.log 2>&1 &
  for _ in $(seq 1 30); do curl -fs "$URL/__alive" >/dev/null 2>&1 && break; sleep 0.1; done
fi
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL" --user-data-dir="$HOME/.hollowmere-chrome" \\
    --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required
else
  open "$URL"
fi
`;
fs.writeFileSync(path.join(dest, 'play.sh'), play, { mode: 0o755 });

const app = path.join(dest, 'Hollowmere.app');
fs.rmSync(app, { recursive: true, force: true });
const script = path.join(dest, '.launcher.applescript');
fs.writeFileSync(script, `do shell script quoted form of "${path.join(dest, 'play.sh')}" & " >/dev/null 2>&1 &"\n`);
execFileSync('osacompile', ['-o', app, script], { stdio: 'inherit' });
fs.rmSync(script, { force: true });

console.log(`
✔ Installed to ${dest}

Shortcut (Shortcuts.app) — one action, either:
  • "Open App" → choose ${app}
  • "Run Shell Script" → ${path.join(dest, 'play.sh')}
`);
