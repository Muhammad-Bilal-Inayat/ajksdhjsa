import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const cmsRouter = express.Router();

export interface ServerTestimonial {
  id: string;
  name: string;
  role: string;
  pharmacyName: string;
  city: string;
  rating: number;
  content: string;
  avatarUrl?: string;
  verified?: boolean;
  createdAt?: string;
}

const TESTIMONIALS_FILE = path.resolve(process.cwd(), '.testimonials_store.json');

export const SEED_TESTIMONIALS: ServerTestimonial[] = [
  {
    id: 'test-1',
    name: 'Dr. Tariq Mahmood',
    role: 'B.Pharm, RPh • Chief Pharmacist',
    pharmacyName: 'Al-Shifa Medicos & Heart Care',
    city: 'Lahore (DHA Phase 5)',
    rating: 5,
    content: 'MBI INVENTRA cut our peak rush queue times by 70%. The 0.2s F2 quick search and thermal printing make billing effortless. The 30/60/90-day FEFO expiry radar saved our pharmacy over Rs. 180,000 in returnable stock in our very first quarter!',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'test-2',
    name: 'Hafiz Usman Ali Qureshi',
    role: 'Managing Partner',
    pharmacyName: 'Shaheen Chemist & Surgical',
    city: 'Islamabad (Blue Area)',
    rating: 5,
    content: 'Running a high-traffic 24/7 store in Islamabad requires bulletproof stability. MBI INVENTRA\'s 100% offline-first architecture works smoothly through power disruptions and internet downtime without dropping a single sale.',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'test-3',
    name: 'Syed Kashif Raza',
    role: 'Director Pharmacy Operations',
    pharmacyName: 'Servaid Health Solutions',
    city: 'Karachi (Clifton Block 2)',
    rating: 5,
    content: 'The multi-branch cloud sync and automated WhatsApp PDF invoice dispatch have completely digitized our customer khata management. Cash flow and recovery rates jumped by 45% within two months.',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'test-4',
    name: 'Malik Zeeshan Awan',
    role: 'Chief Executive',
    pharmacyName: 'City Care Chemist & Cosmetics',
    city: 'Rawalpindi (Saddar Cantt)',
    rating: 5,
    content: 'The narcotics schedule drug monitoring, doctor referral commissions, and double-entry profit & loss reports fulfill every drug regulatory requirement. Best pharmacy ERP in Pakistan by far!',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'test-5',
    name: 'Mian Asadullah',
    role: 'General Secretary / Owner',
    pharmacyName: 'Sargodha Retail Chemist & Medicos',
    city: 'Sargodha (University Road)',
    rating: 5,
    content: 'The pre-loaded 10,000+ generic and brand medicine master database saved us weeks of manual data entry. Staff training took less than 15 minutes. Outstanding customer support!',
    verified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'test-6',
    name: 'Chaudhry Bilal Ahmed',
    role: 'Managing Director',
    pharmacyName: 'Green Plus Pharmacy Chain',
    city: 'Faisalabad (Satyana Road)',
    rating: 5,
    content: 'Our 3 counters in Faisalabad run simultaneously with real-time shift reconciliation and anti-leakage cashier audits. The shortage registry auto-generates wholesale purchase orders seamlessly.',
    verified: true,
    createdAt: new Date().toISOString()
  }
];

function loadTestimonialsFromDisk(): ServerTestimonial[] {
  try {
    if (!fs.existsSync(TESTIMONIALS_FILE)) {
      fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(SEED_TESTIMONIALS, null, 2), 'utf-8');
      return SEED_TESTIMONIALS;
    }
    const raw = fs.readFileSync(TESTIMONIALS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_TESTIMONIALS;
  } catch (err) {
    console.error('[CMS Server] Failed to read testimonials file, using seed:', err);
    return SEED_TESTIMONIALS;
  }
}

function saveTestimonialsToDisk(items: ServerTestimonial[]): boolean {
  try {
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[CMS Server] Failed to write testimonials file:', err);
    return false;
  }
}

const CMS_CONFIG_FILE = path.resolve(process.cwd(), '.site_cms_store.json');

function loadCmsConfigFromDisk(): any {
  try {
    if (!fs.existsSync(CMS_CONFIG_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(CMS_CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[CMS Server] Failed to read CMS config file:', err);
    return null;
  }
}

function saveCmsConfigToDisk(config: any): boolean {
  try {
    fs.writeFileSync(CMS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[CMS Server] Failed to write CMS config file:', err);
    return false;
  }
}

// GET /api/site-cms/config - Retrieve live CMS configuration
cmsRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = loadCmsConfigFromDisk();
    res.json({
      success: true,
      config: config || null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to load CMS config' });
  }
});

// POST /api/site-cms/config - Publish & save live CMS configuration
cmsRouter.post('/config', (req: Request, res: Response) => {
  try {
    const { config } = req.body;
    const toSave = config || req.body;
    if (!toSave) {
      return res.status(400).json({ success: false, message: 'Configuration payload required' });
    }
    saveCmsConfigToDisk(toSave);
    res.json({
      success: true,
      message: 'Website CMS configuration published successfully!',
      config: toSave
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to save CMS config' });
  }
});

// GET /api/site-cms/testimonials
cmsRouter.get('/testimonials', (req: Request, res: Response) => {
  try {
    const list = loadTestimonialsFromDisk();
    res.json({
      success: true,
      count: list.length,
      testimonials: list
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to load testimonials' });
  }
});

// POST /api/site-cms/testimonials - Add single or save full array
cmsRouter.post('/testimonials', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    let list = loadTestimonialsFromDisk();

    if (Array.isArray(payload)) {
      // Replace entire list
      list = payload;
      saveTestimonialsToDisk(list);
      return res.json({ success: true, message: 'Testimonials list updated successfully', count: list.length, testimonials: list });
    }

    if (!payload.name || !payload.content) {
      return res.status(400).json({ success: false, message: 'Name and content are required' });
    }

    const newTestimonial: ServerTestimonial = {
      id: payload.id || `test-${Date.now()}`,
      name: payload.name.trim(),
      role: payload.role || 'Pharmacy Owner',
      pharmacyName: payload.pharmacyName || 'Medical Store',
      city: payload.city || 'Pakistan',
      rating: Number(payload.rating) || 5,
      content: payload.content.trim(),
      avatarUrl: payload.avatarUrl || '',
      verified: payload.verified !== false,
      createdAt: new Date().toISOString()
    };

    list = [newTestimonial, ...list];
    saveTestimonialsToDisk(list);

    res.status(201).json({
      success: true,
      message: 'Testimonial added successfully',
      testimonial: newTestimonial,
      testimonials: list
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to add testimonial' });
  }
});

// PUT /api/site-cms/testimonials/:id - Edit existing testimonial
cmsRouter.put('/testimonials/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let list = loadTestimonialsFromDisk();
    const index = list.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    list[index] = {
      ...list[index],
      ...req.body,
      id
    };

    saveTestimonialsToDisk(list);
    res.json({ success: true, message: 'Testimonial updated successfully', testimonial: list[index], testimonials: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update testimonial' });
  }
});

// DELETE /api/site-cms/testimonials/:id - Remove testimonial
cmsRouter.delete('/testimonials/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let list = loadTestimonialsFromDisk();
    const originalCount = list.length;
    list = list.filter(t => t.id !== id);

    if (list.length === originalCount) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    saveTestimonialsToDisk(list);
    res.json({ success: true, message: 'Testimonial deleted successfully', count: list.length, testimonials: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to delete testimonial' });
  }
});
