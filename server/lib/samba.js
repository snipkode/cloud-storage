const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('./logger');

const execAsync = promisify(exec);

class SambaIntegration {
  constructor(config = {}) {
    this.config = {
      sambaConfigPath: config.sambaConfigPath || '/etc/samba/smb.conf',
      uploadsDir: config.uploadsDir || '/app/uploads',
      testUploadsDir: config.testUploadsDir || '/app/test-uploads',
      shareName: config.shareName || 'cloud-storage',
      comment: config.comment || 'Cloud Storage Samba Share',
      validUsers: config.validUsers || [],
      ...config
    };
    
    this.sambaServiceName = this.detectSambaServiceName();
  }

  /**
   * Detect Samba service name (smbd or samba)
   */
  detectSambaServiceName() {
    // Try to detect which service name is used
    return process.env.SAMBA_SERVICE_NAME || 'smbd';
  }

  /**
   * Check if Samba is installed
   */
  async isSambaInstalled() {
    try {
      await execAsync('which smbd');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Samba service is running
   */
  async isSambaRunning() {
    try {
      await execAsync(`systemctl is-active ${this.sambaServiceName}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start Samba service
   */
  async startSamba() {
    try {
      await execAsync(`systemctl start ${this.sambaServiceName}`);
      logger.info('Samba service started');
      return true;
    } catch (error) {
      logger.error('Failed to start Samba:', error.message);
      return false;
    }
  }

  /**
   * Stop Samba service
   */
  async stopSamba() {
    try {
      await execAsync(`systemctl stop ${this.sambaServiceName}`);
      logger.info('Samba service stopped');
      return true;
    } catch (error) {
      logger.error('Failed to stop Samba:', error.message);
      return false;
    }
  }

  /**
   * Restart Samba service
   */
  async restartSamba() {
    try {
      await execAsync(`systemctl restart ${this.sambaServiceName}`);
      logger.info('Samba service restarted');
      return true;
    } catch (error) {
      logger.error('Failed to restart Samba:', error.message);
      return false;
    }
  }

  /**
   * Reload Samba configuration
   */
  async reloadSambaConfig() {
    try {
      await execAsync(`systemctl reload ${this.sambaServiceName}`);
      logger.info('Samba configuration reloaded');
      return true;
    } catch (error) {
      logger.error('Failed to reload Samba config:', error.message);
      return false;
    }
  }

  /**
   * Test Samba configuration
   */
  async testConfig() {
    try {
      const { stdout } = await execAsync('testparm -s');
      return { valid: true, output: stdout };
    } catch (error) {
      return { valid: false, output: error.message };
    }
  }

  /**
   * Generate Samba configuration for cloud storage
   */
  generateConfig(options = {}) {
    const {
      shareName = this.config.shareName,
      uploadsDir = this.config.uploadsDir,
      testUploadsDir = this.config.testUploadsDir,
      comment = this.config.comment,
      validUsers = this.config.validUsers,
      writable = true,
      browsable = true,
      createMask = '0775',
      directoryMask = '0775',
      ...extra
    } = options;

    let config = `
# =========================================
# Cloud Storage Samba Configuration
# Generated: ${new Date().toISOString()}
# =========================================

[global]
   workgroup = WORKGROUP
   server string = Cloud Storage Samba Server
   security = user
   map to guest = Bad User
   dns proxy = no
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file
   load printers = no
   cups options = raw
   
   # Performance tuning
   socket options = TCP_NODELAY IPTOS_LOWDELAY
   read raw = yes
   write raw = yes
   use sendfile = yes
   aio read size = 16384
   aio write size = 16384

# Cloud Storage Share
[${shareName}]
   comment = ${comment}
   path = ${uploadsDir}
   valid users = ${validUsers.length > 0 ? validUsers.join(', ') : '@users'}
   public = no
   writable = ${writable ? 'yes' : 'no'}
   browsable = ${browsable ? 'yes' : 'no'}
   create mask = ${createMask}
   directory mask = ${directoryMask}
   force create mode = 0664
   force directory mode = 0775
   inherit permissions = yes
   vfs objects = acl_xattr
   map acl inherit = Yes
   store dos attributes = yes
   
   # Access control
   read list = 
   write list = ${validUsers.length > 0 ? validUsers.join(', ') : '@users'}
   
   # Audit logging
   full audit = yes
   full audit:success = open connect rename unlink mkdir rmdir write
   full audit:failure = all
`;

    // Add test environment share if needed
    if (options.includeTestShare && fs.existsSync(testUploadsDir)) {
      config += `

# Cloud Storage Test Share
[${shareName}-test]
   comment = ${comment} (Test Environment)
   path = ${testUploadsDir}
   valid users = ${validUsers.length > 0 ? validUsers.join(', ') : '@users'}
   public = no
   writable = ${writable ? 'yes' : 'no'}
   browsable = ${browsable ? 'yes' : 'no'}
   create mask = ${createMask}
   directory mask = ${directoryMask}
   force create mode = 0664
   force directory mode = 0775
   inherit permissions = yes
`;
    }

    return config;
  }

  /**
   * Write Samba configuration to file
   */
  async writeConfig(configContent) {
    try {
      // Backup existing config
      const backupPath = `${this.config.sambaConfigPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.config.sambaConfigPath)) {
        fs.copyFileSync(this.config.sambaConfigPath, backupPath);
        logger.info(`Samba config backed up to: ${backupPath}`);
      }

      // Write new config
      fs.writeFileSync(this.config.sambaConfigPath, configContent);
      logger.info('Samba configuration written successfully');
      
      return { success: true, backupPath };
    } catch (error) {
      logger.error('Failed to write Samba config:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add Samba user
   */
  async addUser(username, password) {
    try {
      // Check if system user exists, create if not
      try {
        await execAsync(`id ${username}`);
      } catch (error) {
        // User doesn't exist, create system user
        await execAsync(`useradd -r -s /usr/sbin/nologin ${username}`);
        logger.info(`System user created: ${username}`);
      }

      // Set Samba password
      const { stdout, stderr } = await execAsync(
        `echo -e "${password}\\n${password}" | smbpasswd -a -s ${username}`
      );
      
      logger.info(`Samba user added: ${username}`);
      return { success: true, message: 'User added successfully' };
    } catch (error) {
      logger.error('Failed to add Samba user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove Samba user
   */
  async removeUser(username) {
    try {
      await execAsync(`smbpasswd -x ${username}`);
      logger.info(`Samba user removed: ${username}`);
      return { success: true, message: 'User removed successfully' };
    } catch (error) {
      logger.error('Failed to remove Samba user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List Samba users
   */
  async listUsers() {
    try {
      const { stdout } = await execAsync('pdbedit -L');
      const users = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(':');
          return {
            username: parts[0],
            fullName: parts[1] || '',
            uid: parts[2] || ''
          };
        });
      
      return { success: true, users };
    } catch (error) {
      logger.error('Failed to list Samba users:', error.message);
      return { success: false, error: error.message, users: [] };
    }
  }

  /**
   * Enable/disable Samba user
   */
  async toggleUser(username, enable) {
    try {
      if (enable) {
        await execAsync(`smbpasswd -e ${username}`);
        logger.info(`Samba user enabled: ${username}`);
      } else {
        await execAsync(`smbpasswd -d ${username}`);
        logger.info(`Samba user disabled: ${username}`);
      }
      return { success: true };
    } catch (error) {
      logger.error('Failed to toggle Samba user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Samba status
   */
  async getStatus() {
    try {
      const isInstalled = await this.isSambaInstalled();
      const isRunning = await this.isSambaRunning();
      const configTest = await this.testConfig();
      const users = await this.listUsers();

      return {
        installed: isInstalled,
        running: isRunning,
        serviceName: this.sambaServiceName,
        configValid: configTest.valid,
        users: users.users || [],
        shares: await this.getShares()
      };
    } catch (error) {
      logger.error('Failed to get Samba status:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get Samba shares
   */
  async getShares() {
    try {
      const { stdout } = await execAsync('testparm -s --section-name');
      const shares = stdout.split('[')
        .slice(1)
        .map(section => {
          const lines = section.split('\n');
          const shareName = lines[0].replace(']', '').trim();
          return { name: shareName };
        });
      
      return shares;
    } catch (error) {
      return [];
    }
  }

  /**
   * Sync app users to Samba users
   */
  async syncUsers(appUsers) {
    const results = {
      added: [],
      updated: [],
      removed: [],
      errors: []
    };

    try {
      // Get current Samba users
      const sambaUsers = await this.listUsers();
      const sambaUsernames = sambaUsers.users.map(u => u.username);
      const appUsernames = appUsers.map(u => u.username);

      // Add new users
      for (const user of appUsers) {
        if (!sambaUsernames.includes(user.username)) {
          const result = await this.addUser(user.username, user.sambaPassword);
          if (result.success) {
            results.added.push(user.username);
          } else {
            results.errors.push({ username: user.username, error: result.error });
          }
        }
      }

      // Remove users that no longer exist in app
      for (const sambaUser of sambaUsers.users) {
        if (!appUsernames.includes(sambaUser.username)) {
          const result = await this.removeUser(sambaUser.username);
          if (result.success) {
            results.removed.push(sambaUser.username);
          } else {
            results.errors.push({ username: sambaUser.username, error: result.error });
          }
        }
      }

      logger.info('User sync completed', results);
      return results;
    } catch (error) {
      logger.error('Failed to sync users:', error.message);
      results.errors.push({ error: error.message });
      return results;
    }
  }

  /**
   * Setup Samba completely
   */
  async setup(options = {}) {
    const results = {
      steps: [],
      success: true
    };

    try {
      // Step 1: Check if Samba is installed
      const isInstalled = await this.isSambaInstalled();
      if (!isInstalled) {
        results.steps.push({ step: 'check', status: 'failed', message: 'Samba not installed' });
        results.success = false;
        return results;
      }
      results.steps.push({ step: 'check', status: 'success', message: 'Samba installed' });

      // Step 2: Generate configuration
      const config = this.generateConfig(options);
      results.steps.push({ step: 'generate', status: 'success', message: 'Config generated' });

      // Step 3: Write configuration
      const writeResult = await this.writeConfig(config);
      if (writeResult.success) {
        results.steps.push({ step: 'write', status: 'success', backup: writeResult.backupPath });
      } else {
        results.steps.push({ step: 'write', status: 'failed', error: writeResult.error });
        results.success = false;
        return results;
      }

      // Step 4: Test configuration
      const testResult = await this.testConfig();
      if (testResult.valid) {
        results.steps.push({ step: 'test', status: 'success', message: 'Config valid' });
      } else {
        results.steps.push({ step: 'test', status: 'failed', error: testResult.output });
        results.success = false;
        return results;
      }

      // Step 5: Restart Samba
      const restartResult = await this.restartSamba();
      if (restartResult) {
        results.steps.push({ step: 'restart', status: 'success' });
      } else {
        results.steps.push({ step: 'restart', status: 'warning', message: 'Restart failed, manual restart may be needed' });
      }

      return results;
    } catch (error) {
      logger.error('Samba setup failed:', error.message);
      results.steps.push({ step: 'setup', status: 'failed', error: error.message });
      results.success = false;
      return results;
    }
  }
}

module.exports = SambaIntegration;
