import { Router, Request, Response } from 'express';

export const versionRouter = Router();

// Current application release specification
export const APP_VERSION = '4.2.1';
export const RELEASE_NOTES = 'LAN Multi-PC Counter Sync Hub, Zero-Crash Offline Throttle, Universal User Popup Broadcast & Server Direct Access';
export const BUILD_TIMESTAMP = new Date().toISOString();

versionRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    version: APP_VERSION,
    appName: 'MBI INVENTRA',
    releaseNotes: RELEASE_NOTES,
    buildTimestamp: BUILD_TIMESTAMP,
    minSupportedVersion: '4.0.0',
    critical: false,
    timestamp: new Date().toISOString()
  });
});
