# 🗄️ Samba (SMB/CIFS) Integration Guide

Integrasi Samba memungkinkan Anda mengakses file cloud storage melalui network share (SMB/CIFS) dari Windows, macOS, atau Linux.

## 📋 Prerequisites

1. **Docker & Docker Compose** - Untuk menjalankan Samba container
2. **Network Access** - Server harus accessible dari network
3. **Ports Available**: 139, 445 (TCP), 137, 138 (UDP)

---

## 🚀 Quick Start

### 1. Start dengan Samba Support

```bash
# Menggunakan Docker Compose dengan Samba
docker-compose -f docker-compose.yml -f docker-compose.samba.yml up -d
```

### 2. Setup Samba Users

```bash
# Masuk ke Samba container
docker exec -it cloud-storage-samba bash

# Add user (ulangi untuk setiap user)
smbpasswd -a admin
# Enter password: password123

# Enable user
smbpasswd -e admin
```

### 3. Connect dari Client

**Windows:**
```
\\192.168.1.100\cloud-storage
```

**macOS:**
```
smb://192.168.1.100/cloud-storage
```

**Linux:**
```bash
mount -t cifs //192.168.1.100/cloud-storage /mnt/storage -o username=admin
```

---

## 📡 API Endpoints

### Get Samba Status

```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/api/samba/status
```

**Response:**
```json
{
  "samba": {
    "installed": true,
    "running": true,
    "serviceName": "smbd",
    "users": [
      {"username": "admin", "fullName": "", "uid": "1000"}
    ],
    "shares": [
      {"name": "cloud-storage"},
      {"name": "cloud-storage-test"}
    ]
  }
}
```

### Deploy Samba Configuration

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"includeTestShare": true}' \
  http://localhost:3000/api/samba/config/deploy
```

### Add Samba User via API

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "securepass123"}' \
  http://localhost:3000/api/samba/users
```

### Sync App Users to Samba

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {"username": "admin", "sambaPassword": "pass123"},
      {"username": "user1", "sambaPassword": "pass456"}
    ]
  }' \
  http://localhost:3000/api/samba/users/sync
```

### Get Connection Help

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/samba/help
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SAMBA_ENABLED` | `false` | Enable Samba integration |
| `SAMBA_UPLOADS_DIR` | `/app/uploads` | Production files path |
| `SAMBA_TEST_UPLOADS_DIR` | `/app/test-uploads` | Test files path |
| `SAMBA_SHARE_NAME` | `cloud-storage` | Samba share name |
| `SAMBA_SERVER_IP` | - | Server IP address for clients |
| `SAMBA_CONFIG_PATH` | `/etc/samba/smb.conf` | Samba config file path |

### Custom Samba Configuration

Create `samba-config/smb.conf`:

```ini
[global]
   workgroup = MYWORKGROUP
   server string = My Cloud Storage
   security = user
   
[cloud-storage]
   path = /shares/uploads
   valid users = admin user1 user2
   writable = yes
   create mask = 0775
```

---

## 🔐 Security Considerations

### 1. Network Security

- **Firewall Rules**: Only allow trusted IPs
- **VLAN Isolation**: Separate storage network
- **VPN**: Access via VPN for remote clients

```bash
# Example: UFW firewall rules
ufw allow from 192.168.1.0/24 to any port 139,445 proto tcp
ufw allow from 192.168.1.0/24 to any port 137,138 proto udp
```

### 2. User Management

- Use strong passwords
- Disable unused accounts
- Regular password rotation
- Monitor access logs

```bash
# Disable user
smbpasswd -d username

# Delete user
smbpasswd -x username
```

### 3. Share Permissions

- Limit write access to necessary users
- Use read-only shares for distribution
- Enable audit logging

---

## 📊 Monitoring

### View Samba Logs

```bash
# Real-time logs
docker logs -f cloud-storage-samba

# Access logs
docker exec cloud-storage-samba tail -f /var/log/samba/log.*

# Connection logs
docker exec cloud-storage-samba grep "Connected" /var/log/samba/log.*
```

### Check Active Connections

```bash
docker exec cloud-storage-samba smbstatus
```

**Output:**
```
Samba version 4.15.13-Ubuntu

PID     Username     Group        Machine                                   Protocol Version  Encryption           Signing
----------------------------------------------------------------------------------------------------------------------------------------
123     admin        users        192.168.1.50 (ipv4:192.168.1.50:52342)     SMB3_11         -                    -

Service      pid      Machine       Connected at
-------------------------------------------------------
uploads      123      192.168.1.50  Mon Mar 30 14:32:15 2026
```

---

## 🛠️ Troubleshooting

### Cannot Connect to Share

1. **Check Samba is running:**
   ```bash
   docker ps | grep samba
   ```

2. **Verify ports:**
   ```bash
   netstat -tlnp | grep :445
   ```

3. **Test configuration:**
   ```bash
   docker exec cloud-storage-samba testparm -s
   ```

### Permission Denied

1. **Check user exists:**
   ```bash
   docker exec cloud-storage-samba pdbedit -L
   ```

2. **Reset password:**
   ```bash
   docker exec -it cloud-storage-samba smbpasswd -a username
   ```

3. **Check volume permissions:**
   ```bash
   docker exec cloud-storage-samba ls -la /shares
   ```

### Slow Transfer Speeds

1. **Enable SMB3:**
   ```ini
   [global]
   min protocol = SMB2
   max protocol = SMB3
   ```

2. **Tune socket options:**
   ```ini
   socket options = TCP_NODELAY IPTOS_LOWDELAY SO_RCVBUF=131072 SO_SNDBUF=131072
   ```

---

## 📱 Client Connection Guide

### Windows

1. Open File Explorer
2. Enter in address bar: `\\SERVER_IP\cloud-storage`
3. Enter credentials when prompted
4. Right-click → Map network drive (for permanent access)

### macOS

1. Open Finder
2. Go → Connect to Server (Cmd+K)
3. Enter: `smb://SERVER_IP/cloud-storage`
4. Click Connect
5. Enter credentials

### Linux (GUI)

1. Open File Manager
2. Go → Connect to Server
3. Enter: `smb://SERVER_IP/cloud-storage`
4. Select "Registered User"
5. Enter credentials

### Linux (Command Line)

```bash
# Create mount point
sudo mkdir -p /mnt/cloud-storage

# Mount share
sudo mount -t cifs //SERVER_IP/cloud-storage /mnt/cloud-storage \
  -o username=admin,password=yourpass,uid=1000,gid=1000

# Add to /etc/fstab for auto-mount
//SERVER_IP/cloud-storage /mnt/cloud-storage cifs \
  credentials=/etc/samba/credentials,uid=1000,gid=1000 0 0
```

---

## 🔄 Sync Strategy

### Automatic User Sync

Create a script to sync app users with Samba:

```javascript
// sync-samba-users.js
const users = await db.collection('users').get();
const sambaUsers = users.docs.map(doc => ({
  username: doc.data().email,
  sambaPassword: generateSecurePassword()
}));

// Call API to sync
await fetch('/api/samba/users/sync', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` },
  body: JSON.stringify({ users: sambaUsers })
});
```

---

## 📈 Performance Tuning

### Samba Optimization

```ini
[global]
   use sendfile = yes
   write cache size = 2621440
   getwd cache = yes
   lpq cache time = 30
   max mux = 50
   max xattr = 2097152
```

### Network Optimization

- Use Gigabit Ethernet or faster
- Enable Jumbo Frames (MTU 9000)
- Use dedicated storage network
- Consider link aggregation (LACP)

---

## 🎯 Best Practices

1. ✅ **Regular Backups** - Backup Samba config and data
2. ✅ **Monitor Disk Space** - Set up alerts
3. ✅ **Log Rotation** - Prevent log file growth
4. ✅ **Security Updates** - Keep Samba updated
5. ✅ **Access Review** - Periodic user access audit
6. ✅ **Test Restores** - Regular disaster recovery tests

---

## 📚 Additional Resources

- [Samba Official Documentation](https://www.samba.org/samba/docs/)
- [Samba HOWTO Collection](https://www.samba.org/samba/docs/using_samba/chapter01.html)
- [SMB Protocol Specification](https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2/)

---

**Last Updated:** March 30, 2026  
**Version:** 1.0.0
