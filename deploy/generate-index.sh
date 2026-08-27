#!/usr/bin/env bash
#
# Build the download page from whatever is actually on disk.
#
#   bash generate-index.sh
#
# Runs after each upload, so the page always matches the files being served
# and never lists a version that pruning has removed. The page itself is
# static HTML: no server-side code, nothing to keep running.

set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/updates}"
OUT="${OUT:-$WEB_ROOT/index.html}"

# Version out of a filename: PishFaktor-Setup-1.2.3.exe -> 1.2.3
version_of() {
  local base
  base=$(basename "$1")
  [[ "$base" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]] && printf '%s' "${BASH_REMATCH[1]}"
}

human_size() {
  local b="${1:-0}"
  awk -v b="$b" 'BEGIN {
    if (b >= 1073741824) printf "%.1f GB", b/1073741824;
    else if (b >= 1048576) printf "%.0f MB", b/1048576;
    else if (b >= 1024)    printf "%.0f KB", b/1024;
    else printf "%d B", b;
  }'
}

file_for() {  # platform, version -> path or empty
  local dir ext
  case "$1" in
    win) dir="$WEB_ROOT/win"; ext=exe ;;
    mac) dir="$WEB_ROOT/mac"; ext=dmg ;;
  esac
  find "$dir" -maxdepth 1 -type f -name "*.$ext" 2>/dev/null |
    while IFS= read -r f; do
      [ "$(version_of "$f")" = "$2" ] && { printf '%s' "$f"; break; }
    done
}

# Every version present for either platform, newest first.
all_versions=$(
  {
    find "$WEB_ROOT/win" -maxdepth 1 -type f -name '*.exe' 2>/dev/null
    find "$WEB_ROOT/mac" -maxdepth 1 -type f -name '*.dmg' 2>/dev/null
  } | while IFS= read -r f; do
        v=$(version_of "$f"); [ -n "$v" ] && printf '%s\n' "$v"
      done | sort -Vru
)

latest=$(printf '%s\n' "$all_versions" | head -1)

# ---------------------------------------------------------------- rows

rows=""
first=1
while IFS= read -r v; do
  [ -n "$v" ] || continue

  win=$(file_for win "$v")
  mac=$(file_for mac "$v")

  build_btn() {  # path, platform-label, href-dir
    if [ -z "$1" ]; then
      printf '<span class="dl none">در دسترس نیست</span>'
      return
    fi
    local size bytes
    # GNU stat uses -c%s, BSD/macOS stat uses -f%z.
    bytes=$(stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo 0)
    size=$(human_size "$bytes")
    printf '<a class="dl" href="/updates/%s/%s" download><span class="dl-t">%s</span><span class="dl-s">%s</span></a>' \
      "$3" "$(basename "$1")" "$2" "$size"
  }

  # Older releases are kept so a bad version can be rolled back, but they are
  # dimmed so nobody downloads one by mistake.
  badge=""
  cls="rel"
  if [ "$first" = 1 ]; then
    badge='<span class="badge">آخرین نسخه</span>'
    first=0
  else
    badge='<span class="badge old">نسخه قبلی</span>'
    cls="rel prev"
    # Heading printed once, above the first older release.
    if [ "$first" = 0 ]; then
      rows+='      <p class="sec-title">نسخه‌های قبلی</p>'$'\n'
      first=2
    fi
  fi

  # Prefer the newest mtime of the two files as the release date.
  rdate=""
  for f in "$win" "$mac"; do
    [ -n "$f" ] || continue
    d=$(date -u -d "@$(stat -c%Y "$f" 2>/dev/null)" '+%Y-%m-%d' 2>/dev/null ||
        date -u -r "$(stat -f%m "$f" 2>/dev/null)" '+%Y-%m-%d' 2>/dev/null || echo '')
    [ -n "$d" ] && { rdate="$d"; break; }
  done

  rows+=$(cat <<ROW
      <section class="$cls">
        <header class="rel-h">
          <div class="rel-v">
            <h2>نسخه $v</h2>
            $badge
          </div>
          <time>$rdate</time>
        </header>
        <div class="rel-d">
          $(build_btn "$win" "ویندوز" win)
          $(build_btn "$mac" "مک" mac)
        </div>
      </section>
ROW
)
done <<< "$all_versions"

# ---------------------------------------------------------------- page

cat > "$OUT" <<HTML
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>دانلود پیش‌فاکتور</title>
<style>
  :root {
    --bg: #f5f5f7;
    --panel: rgba(255,255,255,.72);
    --stroke: rgba(0,0,0,.09);
    --text: #1d1d1f;
    --muted: #6e6e73;
    --accent: #0071e3;
    --accent-2: #0077ed;
    --shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #000;
      --panel: rgba(28,28,30,.72);
      --stroke: rgba(255,255,255,.11);
      --text: #f5f5f7;
      --muted: #98989d;
      --accent: #0a84ff;
      --accent-2: #409cff;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 28px rgba(0,0,0,.5);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 400 17px/1.5 -apple-system, BlinkMacSystemFont, 'SF Pro Text',
          'Segoe UI', Vazirmatn, Tahoma, sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  /* A soft wash behind the content, the way macOS surfaces sit on a desktop */
  body::before {
    content: '';
    position: fixed; inset: 0;
    background:
      radial-gradient(60rem 30rem at 70% -10%, rgba(0,113,227,.10), transparent 60%),
      radial-gradient(45rem 28rem at 10% 5%, rgba(88,86,214,.08), transparent 60%);
    pointer-events: none;
  }
  .wrap { position: relative; max-width: 720px; margin: 0 auto; padding: 72px 24px 96px; }

  .hero { text-align: center; margin-bottom: 44px; }
  .icon {
    width: 104px; height: 104px; margin: 0 auto 22px;
    border-radius: 24px;
    background: linear-gradient(180deg, #fdfdfd, #e9eaed);
    border: 1px solid var(--stroke);
    box-shadow: var(--shadow);
    display: grid; place-items: center;
  }
  @media (prefers-color-scheme: dark) {
    .icon { background: linear-gradient(180deg, #2b2b2e, #1c1c1e); }
  }
  h1 { font-size: 40px; line-height: 1.1; letter-spacing: -.02em; margin: 0 0 10px; font-weight: 600; }
  .sub { color: var(--muted); font-size: 19px; margin: 0; }

  .rel {
    background: var(--panel);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    border: 1px solid var(--stroke);
    border-radius: 18px;
    box-shadow: var(--shadow);
    padding: 22px 24px;
    margin-bottom: 16px;
  }
  .rel-h {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 18px; flex-wrap: wrap;
  }
  .rel-v { display: flex; align-items: center; gap: 10px; }
  .rel-h h2 { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -.01em; }
  .rel-h time { color: var(--muted); font-size: 14px; font-variant-numeric: tabular-nums; }
  .badge {
    font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
    background: var(--accent); color: #fff; letter-spacing: .01em;
  }
  /* Older versions stay available for rollback, but recede visually so the
     current release is the obvious choice. */
  .badge.old { background: rgba(127,127,127,.22); color: var(--muted); }
  .rel.prev { background: transparent; box-shadow: none; }
  .rel.prev .rel-h h2 { font-size: 19px; font-weight: 500; }
  .rel.prev .dl { background: transparent; color: var(--accent); border: 1px solid var(--stroke); }
  .rel.prev .dl:hover { background: rgba(127,127,127,.10); }
  .rel.prev .dl-s { opacity: .7; }

  .sec-title {
    font-size: 13px; font-weight: 600; color: var(--muted);
    letter-spacing: .02em; margin: 30px 4px 12px;
  }

  .rel-d { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 520px) { .rel-d { grid-template-columns: 1fr; } }

  .dl {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: 14px 16px; border-radius: 12px;
    background: var(--accent); color: #fff; text-decoration: none;
    font-weight: 500; text-align: center;
    transition: background .15s ease, transform .12s ease;
  }
  .dl:hover { background: var(--accent-2); }
  .dl:active { transform: scale(.98); }
  .dl-t { font-size: 16px; }
  .dl-s { font-size: 13px; opacity: .82; font-variant-numeric: tabular-nums; }
  .dl.none {
    background: transparent; color: var(--muted);
    border: 1px dashed var(--stroke); font-weight: 400;
    justify-content: center;
  }

  .note {
    margin-top: 34px; padding: 18px 20px;
    border-radius: 14px; border: 1px solid var(--stroke);
    background: var(--panel); color: var(--muted); font-size: 14px; line-height: 1.7;
  }
  .note b { color: var(--text); font-weight: 600; }
  .note code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; background: rgba(127,127,127,.14);
    padding: 1px 6px; border-radius: 5px;
    direction: ltr; display: inline-block;
  }
  footer { margin-top: 30px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="icon">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          <path d="M16 9h20a3 3 0 0 1 3 3v30l-4.5-3-4.5 3-4.5-3-4.5 3-4.5-3-4.5 3V12a3 3 0 0 1 3-3z"
                stroke="#0071e3" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M20 19h16M20 26h16M20 33h9" stroke="#0071e3" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h1>سامانه پیش‌فاکتور</h1>
      <p class="sub">نسخه $latest — دانلود برای مک و ویندوز</p>
    </div>

$rows

    <div class="note">
      <b>نصب در ویندوز:</b> پیام «Windows protected your PC» طبیعی است —
      روی <b>More info</b> و سپس <b>Run anyway</b> بزنید.<br>
      <b>نصب در مک:</b> اگر باز نشد، روی برنامه راست‌کلیک کنید و <b>Open</b> را بزنید،
      یا در ترمینال: <code>xattr -cr /Applications/PishFaktor.app</code><br>
      هیچ‌کدام از دو نسخه امضای دیجیتال ندارند، برای همین این هشدارها نمایش داده می‌شوند.<br><br>
      <b>به‌روزرسانی:</b> نسخه ویندوز خودش به‌روز می‌شود و نیازی به دانلود دوباره ندارد.
      نسخه مک هنگام انتشار نسخه جدید اطلاع می‌دهد.
    </div>

    <footer>اطلاعات شما هنگام به‌روزرسانی پاک نمی‌شود.</footer>
  </div>
</body>
</html>
HTML

echo "==> wrote $OUT"
printf '    versions: %s\n' "$(printf '%s' "$all_versions" | tr '\n' ' ')"
