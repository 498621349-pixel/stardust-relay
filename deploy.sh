#!/bin/bash
TOKEN="${VERCEL_TOKEN}"
PROJECT="prj_H9zRWbOAbrBYnorEkZBvinxSevQV"
VERCEL_API="https://api.vercel.com"

# Collect all source files
FILES_JSON="["
FIRST=1
while IFS= read -r line; do
  FILE_PATH=$(echo "$line" | cut -d: -f1)
  CONTENT=$(base64 -i "$FILE_PATH" | tr -d '\n')
  if [ -n "$CONTENT" ]; then
    [ -n "$FILES_JSON" ] && [ "$FILES_JSON" != "[" ] && FILES_JSON="$FILES_JSON,"
    FILES_JSON="$FILES_JSON{\"file\":\"$FILE_PATH\",\"data\":\"$CONTENT\",\"encoding\":\"base64\"}"
  fi
done < <(find . -type f ! -path './node_modules/*' ! -path './.git/*' ! -path './dist/*' ! -path './.cache/*' ! -path './.vercel/*' ! -name 'deploy.sh' ! -name 'deploy.py' -printf '%p\n' 2>/dev/null)
FILES_JSON="$FILES_JSON]"

echo "=== Creating deployment (with source files) ==="
PAYLOAD=$(cat <<PAYEOF
{"name":"stardust-relay","project":"$PROJECT","target":"production","buildCommand":"npm run build","rootDirectory":".","files":[]}
PAYEOF
)

# Use Python to build the JSON payload with files
python3 <<PYEOF
import subprocess, json, sys, os, base64, glob

token = os.environ.get("VERCEL_TOKEN", "")
project = "$PROJECT"

# Find all source files
files = []
for root, dirs, filenames in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', '.cache', '.vercel')]
    for f in filenames:
        if f in ('deploy.sh', 'deploy.py'):
            continue
        fp = os.path.join(root, f).lstrip('./')
        try:
            with open(fp, 'rb') as fh:
                content = fh.read()
            encoded = base64.b64encode(content).decode()
            files.append({"file": fp, "data": encoded, "encoding": "base64"})
        except Exception as e:
            print(f"Skip {fp}: {e}", file=sys.stderr)

payload = {
    "name": "stardust-relay",
    "project": project,
    "target": "production",
    "buildCommand": "npm run build",
    "rootDirectory": ".",
    "files": files,
}

import urllib.request
req = urllib.request.Request(
    "https://api.vercel.com/v13/deployments",
    data=json.dumps(payload).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        print("ID:", result.get("id"))
        print("URL:", result.get("url"))
        print("DEP_ID:", result.get("id"))
except Exception as e:
    print("ERROR:", e, file=sys.stderr)
    import traceback; traceback.print_exc()
PYEOF
