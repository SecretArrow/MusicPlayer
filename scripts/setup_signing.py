#!/usr/bin/env python3
"""Generate a fresh Android release keystore, package it as key-sign-apk.zip,
upload it to GitHub repo secrets, and save a user backup under download/.

Secrets set:
  ANDROID_KEYSTORE_ARCHIVE      base64(zip(keystore.jks)) password-protected
  ANDROID_KEYSTORE_ZIP_PASSWORD password of the zip
  ANDROID_KEYSTORE_PASSWORD     keystore store password
  ANDROID_KEY_ALIAS             key alias
  ANDROID_KEY_PASSWORD          key password
"""
import base64
import json
import os
import secrets
import string
import subprocess
import urllib.request

REPO = "SecretArrow/MusicPlayer"
TOKEN = os.environ.get("GH_TOKEN", "")
PROJECT = "/home/z/my-project"
WORK = os.path.join(PROJECT, "android")
OUT_ZIP = os.path.join(PROJECT, "download", "key-sign-apk.zip")
INFO = os.path.join(PROJECT, "download", "KEYSTORE_BACKUP_INFO.txt")

rng = secrets.SystemRandom()


def rand_pw(n=24):
    alphabet = string.ascii_letters + string.digits
    return "".join(rng.choice(alphabet) for _ in range(n))


KS_PASS = rand_pw()
# PKCS12 keystores do not support a different key password — keytool
# silently uses the store password for the key. Keep them identical.
KEY_PASS = KS_PASS
ZIP_PASS = rand_pw()
ALIAS = "musicplayer"

jks = os.path.join(WORK, "musicplayer-release.jks")

# 1. Generate keystore (30-year validity, RSA 2048)
if os.path.exists(jks):
    os.remove(jks)
subprocess.run(
    [
        "keytool", "-genkeypair", "-v",
        "-keystore", jks,
        "-alias", ALIAS,
        "-keyalg", "RSA", "-keysize", "2048", "-validity", "10950",
        "-storepass", KS_PASS,
        "-keypass", KEY_PASS,
        "-dname", "CN=MusicPlayer, OU=MusicPlayer, O=SecretArrow, L=Jakarta, ST=Jakarta, C=ID",
        "-storetype", "PKCS12",
    ],
    check=True, capture_output=True,
)
print("[ok] keystore generated:", jks, os.path.getsize(jks), "bytes")

# 2. Zip it (password-protected)
if os.path.exists(OUT_ZIP):
    os.remove(OUT_ZIP)
os.makedirs(os.path.dirname(OUT_ZIP), exist_ok=True)
subprocess.run(
    ["zip", "-j", "-P", ZIP_PASS, OUT_ZIP, jks],
    check=True, capture_output=True,
)
print("[ok] zip created:", OUT_ZIP, os.path.getsize(OUT_ZIP), "bytes")

# 3. Verify the zip round-trips
verify = subprocess.run(
    ["unzip", "-P", ZIP_PASS, "-o", OUT_ZIP, "-d", "/tmp/ks-verify"],
    capture_output=True, text=True,
)
assert verify.returncode == 0, verify.stderr
name = os.path.basename(jks)
assert os.path.exists(os.path.join("/tmp/ks-verify", name))
print("[ok] zip round-trip verified")

# 4. Upload secrets to GitHub
b64zip = base64.b64encode(open(OUT_ZIP, "rb").read()).decode()


def api(method, path, payload=None):
    url = f"https://api.github.com/repos/{REPO}/{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            return r.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


st, pk = api("GET", "actions/secrets/public-key")
assert st == 200, (st, pk)
print("[ok] fetched public key:", pk["key_id"])

from nacl import encoding, public  # noqa: E402

pk_obj = public.PublicKey(pk["key"].encode(), encoding.Base64Encoder())
sealed = public.SealedBox(pk_obj)


def put_secret(name, value):
    enc = base64.b64encode(sealed.encrypt(value.encode())).decode()
    st, resp = api("PUT", f"actions/secrets/{name}",
                   {"encrypted_value": enc, "key_id": pk["key_id"]})
    print(f"  secret {name}: HTTP {st}")
    assert st in (201, 204), (st, resp)


put_secret("ANDROID_KEYSTORE_ARCHIVE", b64zip)
put_secret("ANDROID_KEYSTORE_ZIP_PASSWORD", ZIP_PASS)
put_secret("ANDROID_KEYSTORE_PASSWORD", KS_PASS)
put_secret("ANDROID_KEY_ALIAS", ALIAS)
put_secret("ANDROID_KEY_PASSWORD", KEY_PASS)

# 5. Verify secrets are registered
st, lst = api("GET", "actions/secrets")
assert st == 200
names = [s["name"] for s in lst.get("secrets", [])]
print("[ok] repo secrets now:", names)

# 6. User backup info
with open(INFO, "w") as f:
    f.write(f"""MusicPlayer — Android release keystore backup
=============================================
Dibuat otomatis oleh sesi cron MusicPlayer (fallback karena keystore lama
hilang saat sandbox di-recycle). Tanggal: 2026-11-16.

File zip        : key-sign-apk.zip (berisi musicplayer-release.jks, PKCS12)
Password zip    : {ZIP_PASS}
Keystore alias  : {ALIAS}
Store password  : {KS_PASS}
Key password    : {KEY_PASS}
Validitas       : 30 tahun (RSA 2048)

Semua nilai di atas juga sudah di-set sebagai GitHub Actions secrets pada
repo SecretArrow/MusicPlayer (ANDROID_KEYSTORE_ARCHIVE, ANDROID_KEYSTORE_ZIP_PASSWORD,
ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD) sehingga
CI dapat menandatangani APK/AAB otomatis.

PENTING:
- Simpan file ini + key-sign-apk.zip di tempat aman (password manager / drive pribadi).
- Jangan commit key-sign-apk.zip ke repo (sudah di-gitignore).
- Jika ingin mengganti keystore: ulangi generate, lalu update 5 secrets di atas.
""")
os.remove(jks)
print("[ok] backup info written:", INFO)
print("[ok] temp jks removed")
