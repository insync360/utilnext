# Deploying UtilNext on AWS

Single-server layout (one EC2 instance, Docker Compose, Traefik with Let's Encrypt,
MariaDB and Redis in containers, data on the instance's EBS volume). This is the
upstream `frappe_docker` single-server pattern plus the UtilNext theme.

Branches:

| Branch | Purpose |
|---|---|
| `development` | day-to-day work, merged from feature branches |
| `release` | what runs in production; every push triggers `.github/workflows/deploy-release.yml` |
| `main` | tracks upstream `frappe/frappe_docker` |

## 1. AWS resources (once)

1. **EC2 instance**: Ubuntu Server 24.04 LTS, `t3.large` minimum (2 vCPU / 8 GB); `m7i.large`
   or `t3.xlarge` for more than a handful of users. ERPNext needs at least 4 GB RAM; 8 GB avoids
   swapping during migrations.
2. **Storage**: 40 GB gp3 root volume or more. Database and files live in Docker volumes under
   `/var/lib/docker/volumes`.
3. **Security group**: inbound TCP 22 (your IP only), 80 and 443 (anywhere). Nothing else.
4. **Elastic IP**: allocate and associate it with the instance so the address survives restarts.
5. **DNS**: an `A` record for the site name (e.g. `erp.utilnext.com`) pointing at the Elastic IP.
   Let's Encrypt validates over HTTP, so DNS must resolve before the first deploy.
6. **Key pair** for SSH. Keep the private key; the GitHub Actions workflow needs it too.

## 2. First deploy

SSH in and run the bootstrap (installs Docker, clones the `release` branch to `/opt/utilnext`):

```bash
curl -fsSL https://raw.githubusercontent.com/insync360/utilnext/release/deploy/scripts/server-setup.sh | sudo bash
```

It stops after creating `/opt/utilnext/deploy/.env`. Edit that file:

```bash
sudo nano /opt/utilnext/deploy/.env
```

Set `SITE_NAME` and `SITES_RULE` to your domain, strong `DB_PASSWORD` and `ADMIN_PASSWORD`,
and `LETSENCRYPT_EMAIL`. Then run the deploy:

```bash
cd /opt/utilnext && bash deploy/scripts/deploy.sh
```

First run pulls the images (about 2 GB), creates the site with ERPNext installed, applies the
theme and branding, and obtains the TLS certificate. Allow 5 to 10 minutes. Then open
`https://<SITE_NAME>` and log in as `Administrator` with `ADMIN_PASSWORD`.

## 3. Continuous deployment from the `release` branch

In the GitHub repo add these Actions secrets: `DEPLOY_HOST` (Elastic IP or DNS name),
`DEPLOY_USER` (`ubuntu`), `DEPLOY_SSH_KEY` (the private key, PEM text). After that every push
to `release` runs `deploy/scripts/deploy.sh` on the server: pulls images if the version changed,
restarts containers, runs `bench migrate`, and re-applies the theme. Merge `development`
into `release` to ship.

## 4. Operations

```bash
cd /opt/utilnext
C="docker compose --env-file deploy/.env -f compose.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml -f overrides/compose.https.yaml -f deploy/compose.utilnext.yaml"
$C ps                                  # status
$C logs -f backend                     # app logs
$C exec backend bench --site $SITE backup --with-files   # backup into sites/<site>/private/backups
$C down                                # stop (keeps data)
```

Backups: enable the upstream cron override (`overrides/compose.backup-cron.yaml`) or take EBS
snapshots on a schedule with AWS Backup. Copy `sites/<site>/private/backups` to S3 for
off-instance retention.

Upgrading ERPNext: change `ERPNEXT_VERSION` in `deploy/.env` and in `pwd.yml` for local parity,
test locally, push to `release`.

## 5. What is not covered

- Horizontal scaling (multiple app servers) needs shared MariaDB/Redis and a shared sites
  volume; see upstream docs under `docs/03-production/`.
- Outbound email needs an SMTP account configured in Email Account inside ERPNext.
- The theme's Website Settings values are stored in the database, so they survive container
  restarts and are re-applied on every deploy anyway.
