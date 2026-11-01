# Writes dist/update.json: {version, files: {path: {h: sha1[:12], s: size}}} for the APK hot updater.
import hashlib, json, os, sys, time
root = sys.argv[1]
files = {}
for d, _, fs in os.walk(root):
    for f in fs:
        p = os.path.join(d, f)
        rel = os.path.relpath(p, root).replace(os.sep, "/")
        if rel in ("update.json", ".nojekyll"):
            continue
        b = open(p, "rb").read()
        files[rel] = {"h": hashlib.sha1(b).hexdigest()[:12], "s": len(b)}
digest = hashlib.sha1(json.dumps(files, sort_keys=True).encode()).hexdigest()[:6]
version = time.strftime("%Y%m%d.%H%M", time.gmtime()) + "-" + digest
rev_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "native_rev.txt")
native = int(open(rev_file).read().strip()) if os.path.exists(rev_file) else 0
json.dump({"version": version, "native": native, "files": files}, open(os.path.join(root, "update.json"), "w"), separators=(",", ":"))
print("update.json", version, len(files), "files")
