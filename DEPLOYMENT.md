# Deployment (Proxmox VM + Nginx Reverse Proxy)

## Security model

- Expose only `80` and `443` publicly.
- Keep Node backend on `127.0.0.1:5000` (internal only).
- Do not expose Vite dev server `5173` in production.
- Terminate TLS in Nginx.

## 1) Build frontend

From repo root:

```bash
npm run build --prefix client
```

Deploy output:

- Copy `client/dist` to `/var/www/smart-mirror/client/dist`

## 2) Backend environment

Create backend env file:

```bash
cp deploy/production.env.example /var/www/smart-mirror/server/.env
```

Set real domain in `.env`:

```env
PORT=5000
CLIENT_URL=https://YOUR_DOMAIN
```

You can set multiple origins:

```env
CLIENT_URL=https://YOUR_DOMAIN,https://admin.YOUR_DOMAIN
```

## 3) Backend service (systemd)

Install unit:

```bash
sudo cp deploy/systemd/smart-mirror-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smart-mirror-backend
sudo systemctl status smart-mirror-backend
```

## 4) Nginx reverse proxy

Install config:

```bash
sudo cp deploy.nginx.smart-mirror.conf /etc/nginx/sites-available/smart-mirror
sudo ln -s /etc/nginx/sites-available/smart-mirror /etc/nginx/sites-enabled/smart-mirror
sudo nginx -t
sudo systemctl reload nginx
```

Edit these values in config first:

- `server_name`
- `ssl_certificate`
- `ssl_certificate_key`

## 5) TLS certificate (Let's Encrypt)

Example with certbot:

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 6) Firewall / Proxmox network

Open only:

- `80/tcp`
- `443/tcp`

Close public access to:

- `5000/tcp`
- `5173/tcp`

Backend still works because Nginx proxies to `127.0.0.1:5000` internally.

## 7) Verify

```bash
curl -I https://YOUR_DOMAIN
curl https://YOUR_DOMAIN/api/health
```

Expected health response:

```json
{"status":"ok"}
```
