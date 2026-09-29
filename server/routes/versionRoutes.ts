import { Router, Request, Response } from 'express';

export const versionRouter = Router();

// Current application release specification
export const APP_VERSION = '4.3.3';
export const RELEASE_NOTES = 'Strict Master PIN Security Lockdown (Ami7788!@ & 03082003) and 100% Multi-Tenant Isolation (v4.3.3)';
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
