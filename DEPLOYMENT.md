# Docker Deployment Guide

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- Firebase project with Service Account

## Quick Start

### 1. Clone and Configure

```bash
cd cloud-storage

# Copy environment template
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env
```

### 2. Setup Firebase Service Account

Download your service account key from Firebase Console:
1. Go to Firebase Console
2. Project Settings > Service Accounts
3. Generate New Private Key
4. Save as `serviceAccountKey.json` in project root

```bash
# Or set environment variables in .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Build and Run

#### Option A: Simple deployment (app only)

```bash
docker-compose up -d --build
```

#### Option B: With Nginx reverse proxy

```bash
docker-compose --profile with-nginx up -d --build
```

### 4. Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f app

# Test health endpoint
curl http://localhost:3000/api/health
```

## Access Points

| Service | Port | URL |
|---------|------|-----|
| App (direct) | 3000 | http://localhost:3000 |
| Nginx (HTTP) | 80 | http://localhost |
| Nginx (HTTPS) | 443 | https://your-domain.com |

## Management Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes uploads!)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build --force-recreate

# View logs
docker-compose logs -f app
docker-compose logs -f nginx

# Restart specific service
docker-compose restart app

# Scale (if needed)
docker-compose up -d --scale app=3
```

## Persistent Storage

Uploaded files are stored in a Docker volume:

```bash
# Volume name: cloud-storage-uploads
# Location: /var/lib/docker/volumes/cloud-storage-uploads/_data

# Backup uploads
docker run --rm \
  -v cloud-storage-uploads:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads-backup.tar.gz /source

# Restore uploads
docker run --rm \
  -v cloud-storage-uploads:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/uploads-backup.tar.gz -C /target
```

## SSL/HTTPS Setup (Optional)

### 1. Generate SSL Certificate

```bash
# Using Let's Encrypt
docker run -it --rm \
  -v ./ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d your-domain.com --email your@email.com
```

### 2. Configure Nginx

Edit `docker-compose.yml` and uncomment the HTTPS server block in `nginx.conf`.

### 3. Restart with SSL

```bash
docker-compose --profile with-nginx up -d
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Required |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Required |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Node environment | production |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 52428800 (50MB) |

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Test configuration
docker-compose config
```

### Firebase authentication errors

```bash
# Verify service account key
cat serviceAccountKey.json | jq .

# Check environment variables
docker-compose exec app env | grep FIREBASE
```

### Uploads not persisting

```bash
# Check volume exists
docker volume ls | grep cloud-storage-uploads

# Inspect volume
docker volume inspect cloud-storage-uploads
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Or change port in docker-compose.yml
ports:
  - "8080:3000"  # Use port 8080 instead
```

## Production Checklist

- [ ] Firebase service account configured
- [ ] Environment variables set (not using defaults)
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Health checks passing
- [ ] Resource limits set (CPU/memory)

## Resource Limits (Optional)

Edit `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## Monitoring

```bash
# Container stats
docker stats cloud-storage

# Disk usage
docker system df

# Prune unused resources
docker system prune -a
```

## Security Best Practices

1. **Never commit `.env` or `serviceAccountKey.json`**
2. **Use strong firewall rules**
3. **Enable HTTPS in production**
4. **Regular security updates**: `docker-compose pull && docker-compose up -d`
5. **Limit upload size** with `MAX_FILE_SIZE`
6. **Use Docker secrets** for sensitive data in production

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Health check: `http://localhost:3000/api/health`
- Docker docs: https://docs.docker.com/
