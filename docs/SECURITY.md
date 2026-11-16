# Security — CI/CD Signing & Secrets

## Summary

**No secrets are committed to the repo.** All signing keys, passwords, and
tokens are stored as GitHub Actions Secrets and read at build time inside
the runner. The runner's filesystem is ephemeral and not persisted between
runs.

## GitHub Actions Secrets

The following secrets are required for signed Android releases:

| Secret name | Purpose | Set in |
| --- | --- | --- |
| `ANDROID_KEYSTORE_ZIP_PASSWORD` | Password to extract `key-sign-apk.zip` | GitHub Settings → Secrets |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore file password | GitHub Settings → Secrets |
| `ANDROID_KEY_ALIAS` | Signing key alias | GitHub Settings → Secrets |
| `ANDROID_KEY_PASSWORD` | Per-key password | GitHub Settings → Secrets |

### Storing the keystore archive

The `key-sign-apk.zip` archive itself should be stored as a base64-encoded
GitHub Secret (e.g. `ANDROID_KEYSTORE_ARCHIVE`) and decoded to a file inside
the runner:

```bash
# Inside the CI step
echo "${{ secrets.ANDROID_KEYSTORE_ARCHIVE }}" | base64 -d > key-sign-apk.zip
```

Alternatively, use GitHub's encrypted secrets feature for a binary file.

## Workflow signing step

From `ci-android.yml`:

```yaml
- name: Sign split APKs (per-ABI)
  if: ${{ secrets.ANDROID_KEYSTORE_ZIP_PASSWORD != '' }}
  env:
    KS_ZIP_PWD: ${{ secrets.ANDROID_KEYSTORE_ZIP_PASSWORD }}
    KS_PWD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    KEY_PWD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: |
    mkdir -p .signing && cd .signing
    printf '%s' "$KS_ZIP_PWD" | unzip -P "$KS_ZIP_PWD" ../key-sign-apk.zip
    KS_FILE=$(find . -name '*.jks' -o -name '*.keystore' | head -1)
    [ -n "$KS_FILE" ] || { echo "Keystore not found in archive"; exit 1; }

    for apk in ../app/build/outputs/apk/release/*/*.apk; do
      abi=$(basename "$(dirname "$apk")")
      out=$(dirname "$apk")/musicplayer-${abi}-signed.apk
      "$ANDROID_HOME/build-tools/34.0.0/apksigner" sign \
        --ks "$KS_FILE" \
        --ks-pass "pass:$KS_PWD" \
        --ks-key-alias "$KEY_ALIAS" \
        --key-pass "pass:$KEY_PWD" \
        --out "$out" \
        "$apk"
      "$ANDROID_HOME/build-tools/34.0.0/apksigner" verify --verbose "$out"
    done
    shred -u "$KS_FILE" 2>/dev/null || rm -f "$KS_FILE"
    cd .. && rm -rf .signing
```

## Rules

1. **Never** print secret values in logs.
2. **Never** decode secrets into environment variables that get echoed.
3. **Never** commit the keystore or extracted signing files.
4. **Always** `shred -u` or `rm -f` the keystore after signing.
5. **Always** audit `git log -p` before pushing for accidentally committed secrets.
6. **Always** rotate the keystore if the password is suspected to have leaked.

## What to do if a secret leaks

1. Revoke the leaked credential immediately (GitHub tokens: Settings → Developer settings → Tokens).
2. Rotate the keystore (re-create a new signing key, upload a new `key-sign-apk.zip`).
3. Audit the repo's git history for the leaked value.
4. Force-push to remove the offending commits if found.
5. Notify users that previously signed APKs signed by the compromised key should be considered untrusted.

## GitHub token

The CI workflows use the built-in `GITHUB_TOKEN` (auto-provided by Actions)
with the minimum permission set needed:

```yaml
permissions:
  contents: write  # for creating GitHub Releases
```

No additional GitHub Personal Access Token is required.

If a separate PAT is ever needed (e.g. for cross-repo operations), it must
be stored as a protected GitHub Secret, never hardcoded.
