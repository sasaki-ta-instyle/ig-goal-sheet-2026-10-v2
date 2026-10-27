#!/bin/bash
# ig-goal-sheet-2026-10 の共有ストア（短縮 URL 発行済の JSON 群）の日次バックアップ。
# /etc/cron.daily/ に配置して root 実行を想定。30 日保持で rotate。
#
# 同日再実行時に既存の正常世代を tar の失敗で壊さないよう、
# tmp ファイルに書いた上で成功したら atomic mv で置き換える。
#
# SRC は app の SHARE_STORE_DIR env を優先し、無ければ shared/.share-store にフォールバック。
# これにより、アプリが実際に書き込んでいる場所を必ず backup できる。

set -euo pipefail

APP_ENV_FILE="/var/www/_shared/apps/app-ig-goal-sheet-2026-10.env"
FALLBACK_SRC="/var/www/app/ig-goal-sheet-2026-10/shared/.share-store"
DEST="/var/backups/ig-goal-sheet"
KEEP_DAYS=30

# app env から SHARE_STORE_DIR を拾う（未設定なら fallback）
SRC=""
if [ -r "$APP_ENV_FILE" ]; then
  SRC="$(grep -E '^SHARE_STORE_DIR=' "$APP_ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
if [ -z "$SRC" ]; then
  SRC="$FALLBACK_SRC"
fi

mkdir -p "$DEST"

# 共有ディレクトリが未作成なら何もしない（初回発行前など）
if [ ! -d "$SRC" ]; then
  exit 0
fi

STAMP="$(date +%F)"
OUT="$DEST/${STAMP}.tar.gz"
TMP="$DEST/.${STAMP}.tar.gz.tmp.$$"

# 一時ファイルに書く → 途中で失敗しても既存世代は無傷
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

tar czf "$TMP" -C "$SRC" .

# 成功したら atomic に置き換え
mv -f "$TMP" "$OUT"
trap - EXIT

# 古いバックアップを削除
find "$DEST" -maxdepth 1 -name '*.tar.gz' -mtime "+${KEEP_DAYS}" -delete
