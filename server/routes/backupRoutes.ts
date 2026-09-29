import express from 'express';
import fs from 'fs';
import path from 'path';

export const backupRouter = express.Router();

const BACKUP_DIR = path.join(process.cwd(), '.server_backups_vault');

// Ensure backup vault directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (e) {
    console.error('[Backup Vault] Failed to create backup dir:', e);
  }
}

// 1. GET /api/master/backups - List all stored tenant backups
backupRouter.get('/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter(f => f.endsWith('.json') || f.endsWith('.enc') || f.endsWith('.mbibackup'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        let metadata: any = {};
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content);
          metadata = {
            tenantId: parsed.tenantId || 'tenant_default',
            createdAt: parsed.createdAt || stats.mtime.toISOString(),
            appSignature: parsed.appSignature || 'MBI_INVENTRA_OFFICIAL_SYSTEM_BACKUP',
            checksum: parsed.checksum || '',
            mbiEncrypted: parsed.mbiEncrypted === true
          };
        } catch {}

        return {
          filename: file,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: stats.mtime.toISOString(),
          ...metadata
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, count: backups.length, backups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 2. POST /api/master/backup/push - Save backup snapshot to vault
backupRouter.post('/backup/push', (req, res) => {
  try {
    const { clientName, installationId, recordCounts, backupPayload } = req.body;
    if (!backupPayload) {
      return res.status(400).json({ success: false, message: 'Missing backup payload' });
    }

    const safeTenant = (installationId || 'tenant_main').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `vault-${safeTenant}-${timestamp}.mbibackup`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');

    res.json({
      success: true,
      filename,
      message: `Encrypted backup archive stored in Master Vault (${filename})`,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 3. GET /api/master/backup/download/:filename - Stream backup file
backupRouter.get('/backup/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. DELETE /api/master/backup/:filename - Delete snapshot from vault
backupRouter.delete('/backup/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: `Backup file ${safeFilename} deleted from vault` });
    }
    res.status(404).json({ success: false, message: 'File not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default backupRouter;
