import { Router } from 'express';
import { getPurchases, getPurchaseById, createPurchaseOrder } from '../controllers/purchaseController';

export const purchaseRouter = Router();

purchaseRouter.get('/', getPurchases);
purchaseRouter.get('/:id', getPurchaseById);
purchaseRouter.post('/', createPurchaseOrder);
purchaseRouter.post('/inward', createPurchaseOrder);
