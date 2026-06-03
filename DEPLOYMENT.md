# Deployment Guide for Plesk with PM2

This guide explains how to deploy the CheckEmail application on a Plesk server using PM2 for process management and Nginx as a reverse proxy.

## Initial Setup and PM2 Start Commands

First, clone your repository and install dependencies.

### Backend

```bash
cd /var/www/vhosts/checkemail.ikf.in/httpdocs/backend
npm install
npm run build
PORT=3002 pm2 start dist/index.js --name checkemail-api
```

### Frontend

```bash
cd /var/www/vhosts/checkemail.ikf.in/httpdocs/frontend
npm install
npm run build
pm2 start ./node_modules/next/dist/bin/next --name checkemail-web --cwd /var/www/vhosts/checkemail.ikf.in/httpdocs/frontend -- start -p 3000
```

### Save PM2 State

After starting both services, save the PM2 process list so they automatically restart on system boot:

```bash
pm2 save
pm2 status
```

---

## Subsequent Deployments / Updates

When you pull new code changes via Git, run the following to update your services:

### Backend

```bash
cd /var/www/vhosts/checkemail.ikf.in/httpdocs/backend
npm install
npm run build
pm2 restart checkemail-api --update-env
```

### Frontend

```bash
cd /var/www/vhosts/checkemail.ikf.in/httpdocs/frontend
npm install
npm run build
pm2 restart checkemail-web
```

---

## Plesk Nginx Directives Documentation

To properly route traffic to your Next.js frontend and Node.js backend on Plesk, add the following directives in your domain's **Apache & nginx Settings** -> **Additional nginx directives**:

```nginx
location ^~ /_next/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ~ ^/(.*)$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
