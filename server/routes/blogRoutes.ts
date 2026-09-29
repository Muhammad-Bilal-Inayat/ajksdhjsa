import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getMariaDbPool } from '../db/mariaClient';

export const blogRouter = express.Router();

export interface ServerBlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  targetKeywords: string[];
  isSargodhaLocal: boolean;
  author: string;
  authorRole: string;
  readTimeMinutes: number;
  publishDate: string;
  coverImage: string;
  views: number;
  likes: number;
  featured?: boolean;
  isPublished?: boolean;
}

const BLOGS_FILE = path.resolve(process.cwd(), '.blogs_store.json');

export const SEED_BLOGS: ServerBlogPost[] = [
  {
    id: 'blog-inventra-expiry-conquest',
    slug: 'how-mbi-inventra-4-conquered-pharmacy-expiry-loss-pakistan',
    title: 'How MBI INVENTRA 4 Conquered Pharmacy Expiry Loss in Pakistan',
    summary: 'A definitive case study on how 5,200+ medical stores in Pakistan reduced expired drug write-offs to under 0.2% using intelligent automated 30/60/90-day FEFO radar technology.',
    category: 'FEFO & Expiry',
    isSargodhaLocal: false,
    targetKeywords: ['Pharmacy Expiry Loss Pakistan', 'Medical Store FEFO', 'MBI INVENTRA Case Study', 'Drug Expiration POS'],
    author: 'Engr. M. Bilal',
    authorRole: 'Founder & Principal Architect, MBI INVENTRA',
    readTimeMinutes: 5,
    publishDate: '2026-09-20',
    coverImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
    views: 3480,
    likes: 412,
    featured: true,
    isPublished: true,
    content: `
# How MBI INVENTRA 4 Conquered Pharmacy Expiry Loss in Pakistan

In Pakistan’s pharmaceutical retail sector, medicine expiry has traditionally been one of the biggest silent cash drains. Retail stores routinely lose between **3.8% and 6.2% of their total annual inventory value** to unsellable, expired tablets, syrups, and injections that sit unnoticed in high shelves and backroom godowns.

When we built **MBI INVENTRA 4**, our core mission was to eliminate this loss completely through automated algorithmic stock rotation.

---

## The Expiry Crisis in Pakistani Medical Stores

Before MBI INVENTRA, pharmacies relied on handwritten notebooks or basic point-of-sale systems that only tracked item names and stock quantities without batch intelligence. This created three fatal bottlenecks:

1. **Human Bias at Checkout:** Cashiers naturally grab whatever box is positioned nearest to the billing counter, ignoring older batches sitting behind.
2. **Distributor Return Deadlines Missed:** Most pharmaceutical distributors in Lahore, Karachi, and Sargodha only accept near-expiry returns **60 to 90 days prior to expiration**. Missing this return window turns valid inventory into a 100% loss.
3. **No Batch-Specific Price Tracking:** Price revisions from DRAP and manufacturers often occur between batches. Selling without batch linking caused severe margin discrepancies.

---

## The 3-Pillar Solution in MBI INVENTRA 4

### 1. Mandatory FEFO (First-Expiry, First-Out) POS Selection
During high-speed cashier checkout, MBI INVENTRA automatically displays and prioritizes the batch with the closest expiration date. If a cashier attempts to bypass it for a newer batch, the system triggers an instant confirmation check.

### 2. Multi-Tier Expiry Radar (30 / 60 / 90 / 180 Days)
The dashboard continuously scans all batches and organizes them into color-coded radar categories:
- **Red Alert (< 30 Days):** Critical action required. Immediate clearance or patient dispensation.
- **Amber Warning (30–60 Days):** Fast-track sale or initiate distributor return debit note.
- **Yellow Warning (60–90 Days):** Standard supplier return window open. 100% refund claimable.

### 3. Automated 1-Click Distributor Return Debit Notes
With a single click, store owners generate a structured Supplier Return Voucher with exact invoice numbers, batch IDs, and purchase rates, allowing distributor sales reps to issue instant replacement credit.

---

## Real-World Impact & Verified Metrics

Across our network of over 5,200 active pharmacy terminals:
- **99.8% reduction in dumped inventory waste.**
- **Average annual cash recovery of Rs. 240,000 to Rs. 850,000 per store.**
- **Zero regulatory DRAP violation notices for dispensing expired items.**
    `
  },
  {
    id: 'blog-fefo-vs-fifo-guide',
    slug: 'fefo-vs-fifo-pharmacy-inventory-guide',
    title: 'FEFO vs FIFO: The Ultimate Medical Store Inventory Guide',
    summary: 'Why traditional FIFO (First-In, First-Out) fails in medicine retail and how switching to FEFO (First-Expiry, First-Out) saves Pakistani pharmacies hundreds of thousands in annual profits.',
    category: 'Inventory & Batch',
    isSargodhaLocal: false,
    targetKeywords: ['FEFO vs FIFO Pharmacy', 'Medicine Inventory Management', 'Batch Expiry System', 'Pharmacy Accounting Pakistan'],
    author: 'Dr. Usman Ali, RPh',
    authorRole: 'Healthcare Systems Director',
    readTimeMinutes: 7,
    publishDate: '2026-09-22',
    coverImage: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
    views: 2940,
    likes: 350,
    featured: true,
    isPublished: true,
    content: `
# FEFO vs FIFO: The Ultimate Medical Store Inventory Guide

In general retail (such as grocery or clothing stores), **FIFO (First-In, First-Out)** is the standard accounting and inventory method. However, in retail and wholesale pharmacy operations, relying on FIFO is dangerous and financially wasteful.

Here is why **FEFO (First-Expiry, First-Out)** is the only acceptable inventory standard for pharmaceuticals.

---

## The Critical Difference Between FIFO and FEFO

| Attribute | FIFO (First-In, First-Out) | FEFO (First-Expiry, First-Out) |
| :--- | :--- | :--- |
| **Selection Rule** | Sells the stock that arrived first in the store. | Sells the stock expiring earliest, regardless of arrival date. |
| **Applicability** | Non-perishables, general retail goods. | Pharmaceuticals, vaccines, diagnostics, surgicals. |
| **Supplier Inward Flaws** | Fails when a distributor delivers an older batch later. | Automatically handles distributor older batch arrivals. |
| **Financial Impact** | Results in 3-5% expired stock losses. | Reduces expired stock write-offs to near zero. |

---

## Why FIFO Fails in Pharmacy Supply Chains

Consider this common scenario in Pakistani medicine procurement:
1. On **January 1st**, your pharmacy purchases 50 packs of *Augmentin 625mg* (Batch A, Expiry: **December 2027**).
2. On **February 15th**, your distributor runs a flash discount and delivers 50 more packs of *Augmentin 625mg* (Batch B, Expiry: **August 2026**).
3. Under **FIFO**, your software will dispense Batch A first because it arrived in January. Batch B will sit on the shelf until August 2026 and expire!
4. Under **FEFO**, MBI INVENTRA recognizes that Batch B expires 16 months before Batch A and immediately routes Batch B to the counter first!

---

## How to Implement FEFO with Zero Staff Resistance

1. **Barcode-First Scanning:** When receiving purchase invoices, scan or record the batch number and expiry printed on the box.
2. **Dynamic Shelf Bin Assignment:** Use shelf bin tags (e.g. Shelf A-3, Top Rack) so staff know exactly where near-expiry items are kept.
3. **Automated Warning System:** MBI INVENTRA highlights near-expiry items with warning icons on the billing screen so the cashier is always aware.
    `
  },
  {
    id: 'blog-why-5200-pharmacies-trust-mbi',
    slug: 'why-5200-pharmacies-trust-mbi-inventra-4',
    title: 'Why 5,200+ Pharmacies Across Pakistan Trust MBI INVENTRA 4',
    summary: 'From sub-second keyboard billing to 100% offline standalone operation and encrypted MariaDB architecture, explore why MBI INVENTRA 4 is Pakistan’s leading pharmacy management platform.',
    category: 'Business Tips',
    isSargodhaLocal: false,
    targetKeywords: ['Best Medical Store Software Pakistan', 'Top Pharmacy POS', 'MBI INVENTRA Review', 'Pharmacy ERP Software'],
    author: 'Tariq Mahmood',
    authorRole: 'Retail Operations Specialist',
    readTimeMinutes: 4,
    publishDate: '2026-09-25',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    views: 4190,
    likes: 520,
    featured: true,
    isPublished: true,
    content: `
# Why 5,200+ Pharmacies Across Pakistan Trust MBI INVENTRA 4

Operating a pharmacy in Pakistan requires software that understands the local landscape: power outages, internet drops, fast-moving customer queues, and complex supplier credit terms.

Here is why over 5,200 medical retailers, hospital chemists, and wholesale distributors have chosen **MBI INVENTRA 4**.

---

## 1. 100% Offline Standalone Operation
Internet disruptions in commercial plazas never stop your business. MBI INVENTRA caches all medicines, batches, and customer balances locally in your computer’s IndexedDB engine. You can bill, print thermal receipts, and record purchases offline with zero latency. When internet reconnects, data syncs silently in the background.

## 2. 0.2-Second Lightning Fast POS Billing
During peak evening hours, waiting 3 seconds for a bill to calculate causes long customer queues. MBI INVENTRA is engineered with instant keyboard shortcuts (F1, F2, Tab, Enter), instant barcode recognition, and rapid loose-tablet strip calculations.

## 3. Integrated WhatsApp Khata & Invoicing
Send digitized receipts and ledger balance reminders directly to your customers’ WhatsApp with 1 click, complete with your pharmacy name, phone number, and branch address.

## 4. Single Master MariaDB (mbi72dn) Backend
All branch data is securely structured in MariaDB with automated 12:00 AM midnight backups and encrypted disaster recovery snapshots.

---

## Start Your 10-Day Free Trial Today
Experience the speed and security of MBI INVENTRA 4 with full feature access and zero upfront payment required.
    `
  }
];

function loadBlogs(): ServerBlogPost[] {
  try {
    if (fs.existsSync(BLOGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BLOGS_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.error('Error reading blogs store:', err);
  }
  // Initialize with seed blogs
  saveBlogs(SEED_BLOGS);
  return SEED_BLOGS;
}

function saveBlogs(blogs: ServerBlogPost[]) {
  try {
    fs.writeFileSync(BLOGS_FILE, JSON.stringify(blogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving blogs store:', err);
  }
}

/**
 * GET /api/blogs
 * Returns list of blog posts
 */
blogRouter.get('/', (req: Request, res: Response) => {
  try {
    const blogs = loadBlogs();
    const category = req.query.category as string;
    const featured = req.query.featured;

    let filtered = blogs;
    if (category && category !== 'All') {
      filtered = filtered.filter(b => b.category.toLowerCase() === category.toLowerCase());
    }
    if (featured === 'true') {
      filtered = filtered.filter(b => b.featured === true);
    }

    res.json({ success: true, count: filtered.length, posts: filtered });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch blogs' });
  }
});

/**
 * GET /api/blogs/:slug
 * Returns single blog post by slug or id and increments views
 */
blogRouter.get('/:slug', (req: Request, res: Response): void => {
  try {
    const { slug } = req.params;
    const blogs = loadBlogs();
    const post = blogs.find(b => b.slug === slug || b.id === slug);

    if (!post) {
      res.status(404).json({ success: false, error: 'Blog post not found' });
      return;
    }

    // Increment views
    post.views = (post.views || 0) + 1;
    saveBlogs(blogs);

    res.json({ success: true, post });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch blog post' });
  }
});

/**
 * POST /api/blogs
 * Creates a new blog post
 */
blogRouter.post('/', (req: Request, res: Response): void => {
  try {
    const { title, summary, content, category, author, authorRole, coverImage, targetKeywords, isSargodhaLocal, featured } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, error: 'Title and content are required.' });
      return;
    }

    const blogs = loadBlogs();
    const slug = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `blog-${Date.now()}`);

    const newPost: ServerBlogPost = {
      id: `blog_${Date.now()}`,
      slug,
      title: title.trim(),
      summary: summary?.trim() || title.substring(0, 140),
      content: content.trim(),
      category: category || 'General Pharmacy',
      targetKeywords: Array.isArray(targetKeywords) ? targetKeywords : ['Pharmacy', 'POS'],
      isSargodhaLocal: Boolean(isSargodhaLocal),
      author: author?.trim() || 'MBI Editorial Team',
      authorRole: authorRole?.trim() || 'Healthcare Technology Analyst',
      readTimeMinutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
      publishDate: new Date().toISOString().split('T')[0],
      coverImage: coverImage?.trim() || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
      views: 0,
      likes: 0,
      featured: Boolean(featured),
      isPublished: true
    };

    blogs.unshift(newPost);
    saveBlogs(blogs);

    res.json({ success: true, post: newPost, message: 'Article published successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to create blog' });
  }
});

/**
 * PUT /api/blogs/:id
 * Updates an existing blog post
 */
blogRouter.put('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const blogs = loadBlogs();
    const idx = blogs.findIndex(b => b.id === id || b.slug === id);

    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Blog post not found' });
      return;
    }

    const existing = blogs[idx];
    const updated: ServerBlogPost = {
      ...existing,
      ...req.body,
      id: existing.id, // Immutable ID
      readTimeMinutes: req.body.content ? Math.max(1, Math.ceil(req.body.content.split(/\s+/).length / 200)) : existing.readTimeMinutes
    };

    blogs[idx] = updated;
    saveBlogs(blogs);

    res.json({ success: true, post: updated, message: 'Article updated successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update blog' });
  }
});

/**
 * DELETE /api/blogs/:id
 * Deletes a blog post
 */
blogRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    let blogs = loadBlogs();
    const initialLength = blogs.length;
    blogs = blogs.filter(b => b.id !== id && b.slug !== id);

    if (blogs.length === initialLength) {
      res.status(404).json({ success: false, error: 'Blog post not found' });
      return;
    }

    saveBlogs(blogs);
    res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete blog' });
  }
});

/**
 * POST /api/blogs/reset
 * Resets to seed blogs
 */
blogRouter.post('/reset', (req: Request, res: Response) => {
  saveBlogs(SEED_BLOGS);
  res.json({ success: true, posts: SEED_BLOGS, message: 'Reset to standard seed blogs.' });
});
