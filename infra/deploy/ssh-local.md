# SSH — local setup

## Config entry (`~/.ssh/config`)

```
Host notcery notcery-prod note.wrupup.com 31.57.108.145
    HostName 31.57.108.145
    User root
    IdentityFile ~/.ssh/deployforge_wrupup
    IdentitiesOnly yes
    ServerAliveInterval 15
    ServerAliveCountMax 6
    TCPKeepAlive yes
```

Connect with:

```bash
ssh notcery
```

## Public key (add on VPS panel or in `authorized_keys`)

File: `~/.ssh/deployforge_wrupup.pub`

If the server only accepts password once:

```bash
ssh-copy-id -i ~/.ssh/deployforge_wrupup.pub notcery
```

## Verify

```bash
ssh -G notcery | grep -E '^(hostname|user|identityfile) '
ssh notcery 'hostname && whoami'
```
