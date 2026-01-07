# MyAgentive Release Guide

This document outlines the complete release process for MyAgentive.

## Prerequisites

- Access to the MyAgentive repository
- GitHub CLI (`gh`) installed and authenticated
- Bun runtime installed

## Installation Method

MyAgentive uses a single installation method:

```bash
curl -fsSL https://myagentive.ai/install | bash
```

The install script automatically fetches the latest version from the GitHub API.

## Release Checklist

### 1. Update Version

Edit `package.json` and update the version number:

```json
{
  "version": "X.Y.Z"
}
```

### 2. Commit Changes

Commit all changes with a descriptive message:

```bash
git add -A
git commit -m "vX.Y.Z: Brief description of changes

- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 3. Build Release Packages

Run the build script to create release archives:

```bash
bash scripts/build-release.sh
```

This creates:
- `release/MyAgentive-vX.Y.Z-macos.tar.gz`
- `release/MyAgentive-vX.Y.Z-linux-x64.tar.gz`

### 4. Create Git Tag

```bash
git tag -a vX.Y.Z -m "vX.Y.Z: Brief description"
```

### 5. Push to Remote

```bash
git push origin main
git push origin vX.Y.Z
```

### 6. Create GitHub Release

Upload the release assets to GitHub:

```bash
gh release create vX.Y.Z \
  release/MyAgentive-vX.Y.Z-macos.tar.gz \
  release/MyAgentive-vX.Y.Z-linux-x64.tar.gz \
  --title "vX.Y.Z" \
  --notes "### Changes
- Change 1
- Change 2

By Agentive (https://MyAgentive.ai)"
```

### 7. Verify Installation

Test the install script:

```bash
curl -fsSL https://myagentive.ai/install | bash
```

## Quick Reference

| Step | Command |
|------|---------|
| Build | `bash scripts/build-release.sh` |
| Tag | `git tag -a vX.Y.Z -m "message"` |
| Push | `git push origin main && git push origin vX.Y.Z` |
| Release | `gh release create vX.Y.Z release/*.tar.gz --title "vX.Y.Z" --notes "..."` |
| Verify | `curl -fsSL https://myagentive.ai/install \| bash` |
