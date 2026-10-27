@AGENTS.md

# ig-goal-sheet-2026-10-v2

instyle.group の下期（2026.10〜2027.3）用ゴールシートの **調整・アップデート検証版（v2 並走版）**。本番の `ig-goal-sheet-2026-10` には影響させずに UI / 制度 / コピーの改修を試す。期の表記は本番と同じ。v2 の内容を本番に反映するか、次期半期の雛形として昇格させるかは別途判断。

## デプロイ設定（Claude Code 用）

ConoHa VPS 上で本番運用する。本番反映は **「本番にあげて」** の指示で起動する（ワークスペース CLAUDE.md の「ConoHa 本番デプロイ」節を参照）。

| キー | 値 |
|---|---|
| CATEGORY | `app` |
| APP_NAME | `ig-goal-sheet-2026-10-v2` |
| PORT | `3012` |
| 公開URL | `https://app.instyle.group/ig-goal-sheet-2026-10-v2/` |
| HEALTHCHECK_PATH | `/ig-goal-sheet-2026-10-v2/`（ルート判定。`/api/health` は未実装） |
| USE_DB | `false` |
| PM2名 | `app-ig-goal-sheet-2026-10-v2` |
| サーバ側パス | `/var/www/app/ig-goal-sheet-2026-10-v2/` |
| アプリ固有 env | `/var/www/_shared/apps/app-ig-goal-sheet-2026-10-v2.env` |
| プレビュー (Vercel) | 使用しない（ConoHa 本番で並走するため） |

## ローカル開発

```bash
pnpm install
pnpm dev
# http://localhost:3000/ig-goal-sheet-2026-10-v2/ でアクセス（basePath 込み）
```

## 本番デプロイ

「本番にあげて」と Claude Code に指示すると、`gh workflow run deploy-prod.yml --ref main` で GitHub Actions が走り、ConoHa VPS にデプロイされる。

手動で起動する場合:
```bash
gh workflow run deploy-prod.yml --ref main
gh run watch
```

## 日次バックアップ（初回のみ手動セットアップ）

`.share-store/` の JSON（短縮 URL の実体）を日次で `/var/backups/ig-goal-sheet-v2/YYYY-MM-DD.tar.gz` に固めて 30 日保持する cron を、**初回のみ 1 回**サーバに仕込む。本番 2026-10 の cron とは **別名** で登録する（`ig-goal-sheet-v2-backup`）。

```bash
ssh conoha-root
sudo install -m 0755 /var/www/app/ig-goal-sheet-2026-10-v2/current/deploy/backup/ig-goal-sheet-backup.sh \
  /etc/cron.daily/ig-goal-sheet-v2-backup
sudo mkdir -p /var/backups/ig-goal-sheet-v2
sudo run-parts --test /etc/cron.daily   # ig-goal-sheet-v2-backup が並ぶこと
sudo /etc/cron.daily/ig-goal-sheet-v2-backup   # 手動で 1 回走らせて .tar.gz が出るか確認
ls -lh /var/backups/ig-goal-sheet-v2/
```

`.share-store/` の実パスは `/var/www/_shared/apps/app-ig-goal-sheet-2026-10-v2.env` の `SHARE_STORE_DIR` から自動読み取り。v2 では既定として `/var/www/_shared/apps/app-ig-goal-sheet-2026-10-v2-shares` を指定する想定（本番 2026-10 の `app-instyle-goal-sheet-2026-10-shares` と衝突しない）。backup script 側は env の値を見るので再 install 不要。保持日数だけ変えたければ script 冒頭の `KEEP_DAYS` を編集。

## ロールバック

GitHub Actions 側のヘルスチェック失敗時は自動で前 release に戻る。手動で戻す場合:

```bash
ssh deploy@160.251.201.115
cd /var/www/app/ig-goal-sheet-2026-10-v2/releases
ls -lt   # 直前の release ディレクトリを確認
ln -sfn <previous-sha> ../current.new && mv -T ../current.new ../current
pm2 reload app-ig-goal-sheet-2026-10-v2 --update-env
```

## デプロイ前提（初回のみ必要）

- ConoHa VPS 初期セットアップ（`~/Workspace/docs/conoha-setup.md`）
- DNS: `app.instyle.group` → `160.251.201.115`
- GitHub 組織 Secrets: `CONOHA_HOST` / `CONOHA_PORT` / `CONOHA_USER` / `CONOHA_SSH_KEY`
- リポジトリ Variables: `CATEGORY=app` / `APP_NAME=ig-goal-sheet-2026-10-v2` / `HEALTHCHECK_PATH=/ig-goal-sheet-2026-10-v2/` / `USE_DB=false`
- ConoHa 側:
  - `/var/www/app/ig-goal-sheet-2026-10-v2/{releases,shared}` 作成（オーナー deploy）
  - `/var/www/_shared/apps/app-ig-goal-sheet-2026-10-v2.env` 配置（必要なら）
  - `/etc/nginx/conf.d/proxy-apps/app/ig-goal-sheet-2026-10-v2.conf` に以下を作成（exact + `^~` prefix の 2 段で trailing-slash ループ回避）:
    ```nginx
    location = /ig-goal-sheet-2026-10-v2 {
      include snippets/proxy-next.conf;
      proxy_pass http://127.0.0.1:3012;
    }
    location ^~ /ig-goal-sheet-2026-10-v2/ {
      include snippets/proxy-next.conf;
      proxy_pass http://127.0.0.1:3012;
    }
    ```
  - `nginx -t && systemctl reload nginx`
- ConoHa ポート台帳（`~/Workspace/docs/conoha-port-registry.md`）に下記 active 行を追加:
  ```
  | active | app | ig-goal-sheet-2026-10-v2 | 3012 | app-ig-goal-sheet-2026-10-v2 | sasaki-ta-instyle/ig-goal-sheet-2026-10-v2 | https://app.instyle.group/ig-goal-sheet-2026-10-v2/ | /ig-goal-sheet-2026-10-v2/ | false | 2026-10-27 | 下期版の調整・アップデート検証用並走版。本番の ig-goal-sheet-2026-10 と並走 |
  ```
