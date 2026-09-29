import { Router } from 'express';
import { getAuditLogs, createAuditLog, rejectAuditMutation } from '../controllers/auditController';

export const auditRouter = Router();

// Retrieve immutable audit logs with multi-filter query params
auditRouter.get('/', getAuditLogs);

// Append-only audit record creation
auditRouter.post('/', createAuditLog);

// Strict immutability protection: Block all delete, put, patch, clear requests
auditRouter.delete('/', rejectAuditMutation);
auditRouter.delete('/:id', rejectAuditMutation);
auditRouter.put('/', rejectAuditMutation);
auditRouter.put('/:id', rejectAuditMutation);
auditRouter.patch('/', rejectAuditMutation);
auditRouter.patch('/:id', rejectAuditMutation);
