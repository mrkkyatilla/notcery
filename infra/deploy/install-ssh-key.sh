#!/usr/bin/env bash
# Print public key and try to install it on the VPS (needs password once, or panel access).
set -euo pipefail

KEY="${HOME}/.ssh/deployforge_wrupup"
PUB="${KEY}.pub"
HOST="${1:-31.57.108.145}"

if [[ ! -f "$PUB" ]]; then
  echo "Missing $PUB — generate with: ssh-keygen -t ed25519 -f $KEY -C deployforge-wrupup"
  exit 1
fi

echo "=== Add this line to the server (root → ~/.ssh/authorized_keys) ==="
cat "$PUB"
echo ""
echo "=== Or run (if root password login is enabled): ==="
echo "ssh-copy-id -i $PUB root@$HOST"
echo ""
echo "=== Then test: ==="
echo "ssh notcery 'echo OK'"

if command -v ssh-copy-id >/dev/null 2>&1; then
  read -r -p "Run ssh-copy-id now? [y/N] " ans
  if [[ "${ans,,}" == "y" ]]; then
    ssh-copy-id -i "$PUB" "root@${HOST}"
    ssh -o BatchMode=yes "notcery" 'echo SSH key OK'
  fi
fi
