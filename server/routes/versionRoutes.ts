import { Router, Request, Response } from 'express';

export const versionRouter = Router();

// Current application release specification
export const APP_VERSION = '4.2.0';
export const RELEASE_NOTES = 'New POS Billing Speed, Seamless Zero-Logout PWA Hot Updates & Soft Slate UI Enhancements';
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
