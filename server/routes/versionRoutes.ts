import { Router, Request, Response } from 'express';

export const versionRouter = Router();

// Current application release specification
export const APP_VERSION = '4.4.1';
export const RELEASE_NOTES = 'High-Speed 0.2s POS Engine, Enhanced Security, Offline Sync Optimization & Performance Upgrades (v4.4.1)';
export const BUILD_TIMESTAMP = new Date().toISOString();

versionRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    version: APP_VERSION,
    appName: 'MBI INVENTRA',
    releaseNotes: RELEASE_NOTES,
    buildTimestamp: BUILD_TIMESTAMP,
    minSupportedVersion: '4.4.0',
    critical: true,
    timestamp: new Date().toISOString()
  });
});
