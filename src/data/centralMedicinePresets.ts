import { CentralMedicine } from '../types';

interface MedicineSeed {
  brand: string;
  company: string;
  generic: string;
  category: string;
  forms: string[];
}

const POPULAR_PHARMA_SEEDS: MedicineSeed[] = [
  // --- GSK (GlaxoSmithKline) ---
  { brand: 'Panadol', company: 'GSK', generic: 'Paracetamol', category: 'Analgesics & Antipyretics', forms: ['500mg Tablet', 'Extra 500/65mg Tablet', 'CF Day & Night Tablet', 'Elixir 120mg/5ml Syrup', 'Drops 100mg/ml', 'ActiFast 500mg Tablet', 'Extend 665mg Tablet'] },
  { brand: 'Augmentin', company: 'GSK', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension', '457mg/5ml DS Suspension', '600mg ES Suspension', '1.2g IV Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Amoxil', company: 'GSK', generic: 'Amoxicillin', forms: ['250mg Capsule', '500mg Capsule', '125mg/5ml Suspension', '250mg/5ml DS Suspension', '500mg Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Velosef', company: 'GSK', generic: 'Cephradine', forms: ['250mg Capsule', '500mg Capsule', '1g Capsule', '125mg/5ml Suspension', '250mg/5ml Suspension', '500mg Injection', '1g Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Zyrtec', company: 'GSK', generic: 'Cetirizine Hydrochloride', forms: ['10mg Tablet', '5mg/5ml Syrup', '10mg/ml Drops'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Ventolin', company: 'GSK', generic: 'Salbutamol', forms: ['2mg Tablet', '4mg Tablet', '2mg/5ml Syrup', 'Inhaler 100mcg', 'Rotacaps 200mcg', 'Nebulizer Solution 5mg/ml', 'Evohaler 100mcg', 'IV Infusion 5mg/5ml'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Seretide', company: 'GSK', generic: 'Salmeterol + Fluticasone Propionate', forms: ['50/100mcg Diskus', '50/250mcg Diskus', '50/500mcg Diskus', '50/25mcg Evohaler', '125/25mcg Evohaler', '250/25mcg Evohaler'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Dermovate', company: 'GSK', generic: 'Clobetasol Propionate', forms: ['0.05% Cream 20g', '0.05% Ointment 20g', '0.05% Scalp Application 30ml', '0.05% Lotion 30ml'], category: 'Dermatologicals' },
  { brand: 'Betnovate', company: 'GSK', generic: 'Betamethasone Valerate', forms: ['0.1% Cream 20g', '0.1% Ointment 20g', '0.1% Scalp Lotion 30ml'], category: 'Dermatologicals' },
  { brand: 'Betnovate-N', company: 'GSK', generic: 'Betamethasone + Neomycin', forms: ['Cream 20g', 'Ointment 20g', 'Lotion 20ml'], category: 'Dermatologicals' },
  { brand: 'Polyfax', company: 'GSK', generic: 'Polymyxin B + Bacitracin', forms: ['Skin Ointment 20g', 'Eye Ointment 6g', 'Plus Ointment 20g'], category: 'Ophthalmic & Dermatological' },
  { brand: 'Solpadeine', company: 'GSK', generic: 'Paracetamol + Codeine + Caffeine', forms: ['Soluble Tablet', 'Capsules', 'Plus Tablet'], category: 'Analgesics & Pain Relief' },
  { brand: 'Voltaren', company: 'GSK / Novartis', generic: 'Diclofenac Sodium', forms: ['25mg Tablet', '50mg Tablet', '100mg SR Tablet', '75mg/3ml Injection', '1% Emulgel 20g', '1% Emulgel 50g', '12.5mg Suppository', '25mg Suppository', '50mg Suppository', '100mg Suppository'], category: 'Analgesics & NSAIDs' },
  { brand: 'Zentel', company: 'GSK', generic: 'Albendazole', forms: ['200mg Tablet', '400mg Tablet', '200mg/5ml Suspension 10ml', '400mg/10ml Suspension'], category: 'Anti-Parasitic & Anthelmintic' },
  { brand: 'Bactroban', company: 'GSK', generic: 'Mupirocin', forms: ['2% Ointment 15g', '2% Cream 15g', '2% Nasal Ointment 3g'], category: 'Dermatologicals' },
  { brand: 'Duphalac', company: 'Abbott', generic: 'Lactulose', forms: ['Syrup 120ml', 'Syrup 240ml', 'Syrup 450ml', 'Sachet 15ml'], category: 'Gastrointestinal & Laxatives' },
  { brand: 'Fefol', company: 'GSK', generic: 'Ferrous Sulfate + Folic Acid', forms: ['Vit Capsule', 'Spansule Capsule', 'Z Sachet'], category: 'Vitamins & Hematological' },
  { brand: 'Calpol', company: 'GSK', generic: 'Paracetamol', forms: ['120mg/5ml Infant Suspension 60ml', '250mg/5ml 6 Plus Suspension 60ml'], category: 'Pediatric & Antipyretic' },

  // --- ABBOTT LABORATORIES ---
  { brand: 'Brufen', company: 'Abbott', generic: 'Ibuprofen', forms: ['200mg Tablet', '400mg Tablet', '600mg Tablet', '800mg Retard Tablet', '100mg/5ml Syrup 60ml', '100mg/5ml Syrup 120ml', 'DS 200mg/5ml Syrup 60ml', 'Gel 30g'], category: 'Analgesics & NSAIDs' },
  { brand: 'Klacid', company: 'Abbott', generic: 'Clarithromycin', forms: ['250mg Tablet', '500mg Tablet', '500mg XL Tablet', '125mg/5ml Suspension 60ml', '250mg/5ml Suspension 60ml', '500mg IV Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Arinac', company: 'Abbott', generic: 'Ibuprofen + Pseudoephedrine', forms: ['Tablet', 'Forte Tablet', 'Syrup 60ml', 'Syrup 120ml'], category: 'Cold & Cough & Respiratory' },
  { brand: 'Surbex Z', company: 'Abbott', generic: 'Zinc + Vitamin B-Complex + Vitamin C', forms: ['Tablet 30s', 'Tablet 60s', 'Effervescent Tablet', 'Syrup 120ml'], category: 'Vitamins & Minerals' },
  { brand: 'Surbex T', company: 'Abbott', generic: 'High Potency Vitamin B-Complex + C', forms: ['Tablet 30s', 'Tablet 60s'], category: 'Vitamins & Minerals' },
  { brand: 'Epival', company: 'Abbott', generic: 'Divalproex Sodium', forms: ['250mg Tablet', '500mg Tablet', '500mg ER Tablet', '125mg Sprinkles', '250mg/5ml Syrup 120ml'], category: 'Neurology & CNS' },
  { brand: 'Ganaton', company: 'Abbott', generic: 'Itopride Hydrochloride', forms: ['50mg Tablet', '150mg SR Tablet'], category: 'Gastrointestinal & Motility' },
  { brand: 'Duspatalin', company: 'Abbott', generic: 'Mebeverine Hydrochloride', forms: ['135mg Tablet', '200mg Retard Capsule'], category: 'Gastrointestinal & Antispasmodic' },
  { brand: 'Erythrocin', company: 'Abbott', generic: 'Erythromycin', forms: ['250mg Tablet', '500mg Tablet', '200mg/5ml Suspension', '400mg/5ml Suspension', '500mg IV'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Pedialyte', company: 'Abbott', generic: 'Electrolytes Oral Rehydration Solution', forms: ['Bubble Gum 500ml', 'Apple 500ml', 'Fruit Punch 500ml', 'Sachet'], category: 'Pediatric & Rehydration' },
  { brand: 'Creon', company: 'Abbott', generic: 'Pancreatin Enzymes', forms: ['10,000 IU Capsule', '25,000 IU Capsule', '40,000 IU Capsule'], category: 'Gastrointestinal & Digestive' },
  { brand: 'Isoptin', company: 'Abbott', generic: 'Verapamil Hydrochloride', forms: ['40mg Tablet', '80mg Tablet', '240mg SR Tablet', '5mg/2ml Injection'], category: 'Cardiovascular & Antiarrhythmic' },
  { brand: 'Influvac', company: 'Abbott', generic: 'Influenza Vaccine (Surface Antigen, Inactivated)', forms: ['Tetra 0.5ml Pre-filled Syringe'], category: 'Vaccines & Biologicals' },

  // --- GETZ PHARMA ---
  { brand: 'Risek', company: 'Getz Pharma', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection', 'Insta 20mg Sachet', 'Insta 40mg Sachet'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Getryl', company: 'Getz Pharma', generic: 'Glimepiride', forms: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Montiget', company: 'Getz Pharma', generic: 'Montelukast Sodium', forms: ['4mg Chewable Tablet', '5mg Chewable Tablet', '10mg Tablet', '4mg Sachet Granules'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Meromer', company: 'Getz Pharma', generic: 'Meropenem', forms: ['500mg IV Injection', '1g IV Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Eziday', company: 'Getz Pharma', generic: 'Losartan Potassium', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Eziday Plus', company: 'Getz Pharma', generic: 'Losartan + Hydrochlorothiazide', forms: ['50/12.5mg Tablet', '100/25mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Rovista', company: 'Getz Pharma', generic: 'Rosuvastatin Calcium', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Clariget', company: 'Getz Pharma', generic: 'Clarithromycin', forms: ['250mg Tablet', '500mg Tablet', '500mg XL Tablet', '125mg/5ml Suspension', '250mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Xbact', company: 'Getz Pharma', generic: 'Cefoperazone + Sulbactam', forms: ['1g IV/IM Injection', '2g IV/IM Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Fexet', company: 'Getz Pharma', generic: 'Fexofenadine Hydrochloride', forms: ['60mg Tablet', '120mg Tablet', '180mg Tablet', '30mg/5ml Suspension 60ml'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Nexum', company: 'Getz Pharma', generic: 'Esomeprazole Magnesium', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection', 'Insta 20mg Sachet', 'Insta 40mg Sachet'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Telget', company: 'Getz Pharma', generic: 'Telmisartan', forms: ['20mg Tablet', '40mg Tablet', '80mg Tablet', 'Plus 40/12.5mg Tablet', 'Plus 80/12.5mg Tablet', 'AM 40/5mg Tablet', 'AM 80/5mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Vildaget', company: 'Getz Pharma', generic: 'Vildagliptin', forms: ['50mg Tablet', 'Met 50/500mg Tablet', 'Met 50/850mg Tablet', 'Met 50/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Sitaget', company: 'Getz Pharma', generic: 'Sitagliptin', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet', 'Met 50/500mg Tablet', 'Met 50/850mg Tablet', 'Met 50/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Linaget', company: 'Getz Pharma', generic: 'Linagliptin', forms: ['5mg Tablet', 'Met 2.5/500mg Tablet', 'Met 2.5/850mg Tablet', 'Met 2.5/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Cefiget', company: 'Getz Pharma', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension 30ml', '100mg/5ml Suspension 60ml', '200mg/5ml DS Suspension 30ml'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Levoget', company: 'Getz Pharma', generic: 'Levofloxacin', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '500mg/100ml Infusion'], category: 'Antibiotics & Anti-Infectives' },

  // --- PFIZER ---
  { brand: 'Lipitor', company: 'Pfizer', generic: 'Atorvastatin Calcium', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet', '80mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Norvasc', company: 'Pfizer', generic: 'Amlodipine Besylate', forms: ['2.5mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Viagra', company: 'Pfizer', generic: 'Sildenafil Citrate', forms: ['50mg Tablet', '100mg Tablet'], category: 'Urology & Men Health' },
  { brand: 'Zithromax', company: 'Pfizer', generic: 'Azithromycin', forms: ['250mg Capsule', '500mg Tablet', '200mg/5ml Suspension 15ml', '200mg/5ml Suspension 22.5ml', '500mg IV'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Celebrex', company: 'Pfizer', generic: 'Celecoxib', forms: ['100mg Capsule', '200mg Capsule', '400mg Capsule'], category: 'Analgesics & NSAIDs' },
  { brand: 'Diflucan', company: 'Pfizer', generic: 'Fluconazole', forms: ['50mg Capsule', '150mg Capsule', '200mg Capsule', '50mg/5ml Suspension', '2mg/ml IV Infusion'], category: 'Antifungal' },
  { brand: 'Lyrica', company: 'Pfizer', generic: 'Pregabalin', forms: ['25mg Capsule', '50mg Capsule', '75mg Capsule', '150mg Capsule', '300mg Capsule', '20mg/ml Syrup'], category: 'Neurology & Neuropathic Pain' },
  { brand: 'Xanax', company: 'Pfizer', generic: 'Alprazolam', forms: ['0.25mg Tablet', '0.5mg Tablet', '1mg Tablet', '2mg Tablet', '0.5mg XR Tablet', '1mg XR Tablet', '2mg XR Tablet'], category: 'Neurology & Anxiolytic' },
  { brand: 'Ponstan', company: 'Pfizer', generic: 'Mefenamic Acid', forms: ['250mg Capsule', '500mg Tablet', 'Forte 500mg Tablet', '50mg/5ml Suspension 60ml'], category: 'Analgesics & NSAIDs' },
  { brand: 'Dalacin C', company: 'Pfizer', generic: 'Clindamycin Hydrochloride', forms: ['150mg Capsule', '300mg Capsule', '300mg/2ml Injection', '600mg/4ml Injection', '1% Topical Solution', '2% Vaginal Cream'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Solu-Medrol', company: 'Pfizer', generic: 'Methylprednisolone Sodium Succinate', forms: ['40mg Injection', '125mg Injection', '500mg Injection', '1000mg Injection'], category: 'Corticosteroids & Critical Care' },
  { brand: 'Feldene', company: 'Pfizer', generic: 'Piroxicam', forms: ['10mg Capsule', '20mg Capsule', '20mg Dispersible Tablet', '20mg/ml Injection', '0.5% Gel 25g'], category: 'Analgesics & NSAIDs' },
  { brand: 'Vibramycin', company: 'Pfizer', generic: 'Doxycycline Hyclate', forms: ['100mg Capsule'], category: 'Antibiotics & Anti-Infectives' },

  // --- SANOFI ---
  { brand: 'Flagyl', company: 'Sanofi', generic: 'Metronidazole', forms: ['200mg Tablet', '400mg Tablet', '200mg/5ml Suspension 60ml', '200mg/5ml Suspension 120ml', '500mg/100ml IV Infusion', '500mg Suppository'], category: 'Antibiotics & Antiprotozoal' },
  { brand: 'Avil', company: 'Sanofi', generic: 'Pheniramine Maleate', forms: ['25mg Tablet', '50mg Tablet', '15mg/5ml Syrup 60ml', '22.75mg/2ml Injection', '45.5mg/2ml Injection'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Plavix', company: 'Sanofi', generic: 'Clopidogrel Bisulfate', forms: ['75mg Tablet', '300mg Tablet'], category: 'Cardiovascular & Antiplatelet' },
  { brand: 'Clexane', company: 'Sanofi', generic: 'Enoxaparin Sodium', forms: ['20mg/0.2ml Pre-filled Syringe', '40mg/0.4ml Pre-filled Syringe', '60mg/0.6ml Pre-filled Syringe', '80mg/0.8ml Pre-filled Syringe'], category: 'Cardiovascular & Anticoagulant' },
  { brand: 'Lantus', company: 'Sanofi', generic: 'Insulin Glargine', forms: ['100 IU/ml 10ml Vial', 'SoloStar 100 IU/ml 3ml Pen'], category: 'Antidiabetic & Insulin' },
  { brand: 'Apidra', company: 'Sanofi', generic: 'Insulin Glulisine', forms: ['100 IU/ml 10ml Vial', 'SoloStar 100 IU/ml 3ml Pen'], category: 'Antidiabetic & Insulin' },
  { brand: 'Telfast', company: 'Sanofi', generic: 'Fexofenadine Hydrochloride', forms: ['60mg Tablet', '120mg Tablet', '180mg Tablet', '30mg/5ml Suspension', 'Plus Tablet'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Lasix', company: 'Sanofi', generic: 'Furosemide', forms: ['20mg Tablet', '40mg Tablet', '20mg/2ml Injection', '250mg/25ml Infusion'], category: 'Cardiovascular & Diuretics' },
  { brand: 'No-Spa', company: 'Sanofi', generic: 'Drotaverine Hydrochloride', forms: ['40mg Tablet', '80mg Forte Tablet', '40mg/2ml Injection'], category: 'Gastrointestinal & Antispasmodic' },
  { brand: 'Daonil', company: 'Sanofi', generic: 'Glibenclamide', forms: ['5mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Amaryl', company: 'Sanofi', generic: 'Glimepiride', forms: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet', 'Plus 2/500mg Tablet', 'Plus 4/500mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Co-Aprovel', company: 'Sanofi', generic: 'Irbesartan + Hydrochlorothiazide', forms: ['150/12.5mg Tablet', '300/12.5mg Tablet', '300/25mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Depakine', company: 'Sanofi', generic: 'Sodium Valproate', forms: ['200mg Tablet', '500mg Tablet', 'Chrono 500mg Tablet', 'Syrup 120ml'], category: 'Neurology & Antiepileptic' },

  // --- NOVARTIS ---
  { brand: 'Galvus', company: 'Novartis', generic: 'Vildagliptin', forms: ['50mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Galvus Met', company: 'Novartis', generic: 'Vildagliptin + Metformin Hydrochloride', forms: ['50/500mg Tablet', '50/850mg Tablet', '50/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Exforge', company: 'Novartis', generic: 'Amlodipine + Valsartan', forms: ['5/80mg Tablet', '5/160mg Tablet', '10/160mg Tablet', 'HCT 5/160/12.5mg Tablet', 'HCT 10/160/12.5mg Tablet', 'HCT 10/160/25mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Diovan', company: 'Novartis', generic: 'Valsartan', forms: ['40mg Tablet', '80mg Tablet', '160mg Tablet', '320mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Co-Diovan', company: 'Novartis', generic: 'Valsartan + Hydrochlorothiazide', forms: ['80/12.5mg Tablet', '160/12.5mg Tablet', '160/25mg Tablet', '320/12.5mg Tablet', '320/25mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Cataflam', company: 'Novartis', generic: 'Diclofenac Potassium', forms: ['25mg Tablet', '50mg Tablet', '1.8mg/ml Drops', 'Sachet 50mg'], category: 'Analgesics & NSAIDs' },
  { brand: 'Tegretol', company: 'Novartis', generic: 'Carbamazepine', forms: ['100mg Tablet', '200mg Tablet', '200mg CR Tablet', '400mg CR Tablet', '100mg/5ml Syrup 100ml'], category: 'Neurology & Antiepileptic' },
  { brand: 'Ritalin', company: 'Novartis', generic: 'Methylphenidate Hydrochloride', forms: ['10mg Tablet', '20mg LA Capsule', '30mg LA Capsule', '40mg LA Capsule'], category: 'Neurology & CNS Stimulant' },
  { brand: 'Lamisil', company: 'Novartis', generic: 'Terbinafine Hydrochloride', forms: ['125mg Tablet', '250mg Tablet', '1% Cream 15g', '1% Spray 30ml', '1% DermGel 15g'], category: 'Antifungal' },

  // --- SAMI PHARMACEUTICALS ---
  { brand: 'Samicef', company: 'Sami', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml DS Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Samiflox', company: 'Sami', generic: 'Ciprofloxacin Hydrochloride', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '200mg/100ml Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Samizole', company: 'Sami', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Samipride', company: 'Sami', generic: 'Glimepiride', forms: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Samicor', company: 'Sami', generic: 'Atorvastatin', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Samidipine', company: 'Sami', generic: 'Amlodipine', forms: ['5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Samigesic', company: 'Sami', generic: 'Paracetamol + Tramadol', forms: ['Tablet', 'Injection'], category: 'Analgesics & Pain Relief' },
  { brand: 'Samiclav', company: 'Sami', generic: 'Amoxicillin + Clavulanate Potassium', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Samizith', company: 'Sami', generic: 'Azithromycin', forms: ['250mg Capsule', '500mg Tablet', '200mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Samitrex', company: 'Sami', generic: 'Ceftriaxone Sodium', forms: ['250mg IV/IM Injection', '500mg IV/IM Injection', '1g IV/IM Injection', '2g IV Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Samiten', company: 'Sami', generic: 'Montelukast Sodium', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },

  // --- HILTON PHARMA ---
  { brand: 'Hilcox', company: 'Hilton Pharma', generic: 'Celecoxib', forms: ['100mg Capsule', '200mg Capsule'], category: 'Analgesics & NSAIDs' },
  { brand: 'Hiltor', company: 'Hilton Pharma', generic: 'Atorvastatin', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Hilcef', company: 'Hilton Pharma', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Hilclav', company: 'Hilton Pharma', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Hilgesic', company: 'Hilton Pharma', generic: 'Paracetamol + Caffeine', forms: ['Tablet', 'Extra Tablet'], category: 'Analgesics & Pain Relief' },
  { brand: 'Hiltac', company: 'Hilton Pharma', generic: 'Ranitidine Hydrochloride', forms: ['150mg Tablet', '300mg Tablet', '50mg/2ml Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Hilflox', company: 'Hilton Pharma', generic: 'Moxifloxacin', forms: ['400mg Tablet', '400mg/250ml Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Hilzole', company: 'Hilton Pharma', generic: 'Esomeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Hilpride', company: 'Hilton Pharma', generic: 'Glimepiride', forms: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Hilmet', company: 'Hilton Pharma', generic: 'Metformin Hydrochloride', forms: ['500mg Tablet', '850mg Tablet', '1000mg Tablet', '500mg XR Tablet', '1000mg XR Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Hilcard', company: 'Hilton Pharma', generic: 'Carvedilol', forms: ['3.125mg Tablet', '6.25mg Tablet', '12.5mg Tablet', '25mg Tablet'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Hilmont', company: 'Hilton Pharma', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', '4mg Granules Sachet'], category: 'Respiratory & Anti-Asthma' },

  // --- THE SEARLE COMPANY ---
  { brand: 'Gravinate', company: 'Searle', generic: 'Dimenhydrinate + Vitamin B6', forms: ['50mg Tablet', 'Syrup 60ml', 'Syrup 120ml', '50mg/ml Injection'], category: 'Antiemetic & Motion Sickness' },
  { brand: 'Peditral', company: 'Searle', generic: 'Oral Electrolyte Maintenance Solution', forms: ['Banana 500ml', 'Orange 500ml', 'Apple 500ml', 'Bubblegum 500ml'], category: 'Pediatric & Rehydration' },
  { brand: 'Hydryllin', company: 'Searle', generic: 'Aminophylline + Diphenhydramine + Ammonium Chloride', forms: ['Syrup 60ml', 'Syrup 120ml', 'DM Syrup 60ml', 'DM Syrup 120ml'], category: 'Cough & Respiratory' },
  { brand: 'Spiromide', company: 'Searle', generic: 'Spironolactone + Furosemide', forms: ['Tablet 20/50mg', 'Tablet 40/50mg'], category: 'Cardiovascular & Diuretics' },
  { brand: 'Aldactone', company: 'Searle', generic: 'Spironolactone', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet'], category: 'Cardiovascular & Diuretics' },
  { brand: 'Extor', company: 'Searle', generic: 'Amlodipine + Valsartan', forms: ['5/80mg Tablet', '5/160mg Tablet', '10/160mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Nuberol Forte', company: 'Searle', generic: 'Paracetamol + Orphenadrine Citrate', forms: ['Tablet 15s', 'Tablet 30s', 'Tablet 100s'], category: 'Muscle Relaxants & Analgesics' },
  { brand: 'Rivotril', company: 'Searle / Roche', generic: 'Clonazepam', forms: ['0.5mg Tablet', '2mg Tablet', '2.5mg/ml Drops 10ml', '1mg/ml Injection'], category: 'Neurology & Anticonvulsant' },
  { brand: 'Kolantyl', company: 'Searle', generic: 'Aluminium Hydroxide + Magnesium Oxide + Dicyclomine', forms: ['Chewable Tablet', 'Gel Suspension 120ml', 'Gel Suspension 240ml'], category: 'Gastrointestinal & Antacids' },
  { brand: 'Buscopan', company: 'Searle / Sanofi', generic: 'Hyoscine Butylbromide', forms: ['10mg Tablet', '20mg/ml Injection', 'Plus Tablet (Hyoscine + Paracetamol)'], category: 'Gastrointestinal & Antispasmodic' },
  { brand: 'Tramal', company: 'Searle', generic: 'Tramadol Hydrochloride', forms: ['50mg Capsule', '100mg SR Tablet', '50mg/ml Injection', '100mg/2ml Injection', '100mg/ml Drops'], category: 'Analgesics & Pain Relief' },
  { brand: 'Maxflow', company: 'Searle', generic: 'Tamsulosin Hydrochloride', forms: ['0.4mg Modified Release Capsule', 'D Capsule (Tamsulosin + Dutasteride)'], category: 'Urology & BPH' },

  // --- FEROZSONS LABORATORIES ---
  { brand: 'Saizen', company: 'Ferozsons', generic: 'Somatropin (Recombinant Human Growth Hormone)', forms: ['5.83mg (18 IU) Injection', '8mg (24 IU) Click.Easy', '12mg (36 IU) Cartridge'], category: 'Endocrinology & Hormones' },
  { brand: 'Pegasys', company: 'Ferozsons / Roche', generic: 'Peginterferon Alfa-2a', forms: ['135mcg Pre-filled Syringe', '180mcg Pre-filled Syringe'], category: 'Hepatology & Antiviral' },
  { brand: 'Hepsera', company: 'Ferozsons / Gilead', generic: 'Adefovir Dipivoxil', forms: ['10mg Tablet'], category: 'Hepatology & Antiviral' },
  { brand: 'Sofosbuvir', company: 'Ferozsons', generic: 'Sofosbuvir', forms: ['400mg Tablet', 'Plus Velpatasvir 400/100mg Tablet', 'Plus Ledipasvir 400/90mg Tablet'], category: 'Hepatology & Antiviral' },
  { brand: 'Cefspan', company: 'Ferozsons', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension 30ml', '100mg/5ml Suspension 60ml', '200mg/5ml DS Suspension 30ml'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Ferozclav', company: 'Ferozsons', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Ferozox', company: 'Ferozsons', generic: 'Moxifloxacin', forms: ['400mg Tablet', '400mg Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Ferozcard', company: 'Ferozsons', generic: 'Carvedilol', forms: ['6.25mg Tablet', '12.5mg Tablet', '25mg Tablet'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Ferozmet', company: 'Ferozsons', generic: 'Metformin', forms: ['500mg Tablet', '850mg Tablet', '1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Ferozlip', company: 'Ferozsons', generic: 'Rosuvastatin', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },

  // --- MARTIN DOW ---
  { brand: 'Dolo', company: 'Martin Dow', generic: 'Paracetamol', forms: ['500mg Tablet', '650mg Tablet', '120mg/5ml Syrup', '250mg/5ml DS Syrup', 'Infusion 1000mg/100ml'], category: 'Analgesics & Antipyretics' },
  { brand: 'Dolo-Meta', company: 'Martin Dow', generic: 'Paracetamol + Metoclopramide', forms: ['Tablet', 'Syrup'], category: 'Analgesics & Antiemetic' },
  { brand: 'Epilim', company: 'Martin Dow / Sanofi', generic: 'Sodium Valproate', forms: ['200mg Gastro-Resistant Tablet', '500mg Gastro-Resistant Tablet', '200mg/5ml Syrup 100ml', '300mg Chrono CR Tablet', '500mg Chrono CR Tablet', '400mg IV Injection'], category: 'Neurology & Antiepileptic' },
  { brand: 'Frisium', company: 'Martin Dow / Sanofi', generic: 'Clobazam', forms: ['10mg Tablet', '20mg Tablet'], category: 'Neurology & Anxiolytic' },
  { brand: 'Stemetil', company: 'Martin Dow / Sanofi', generic: 'Prochlorperazine Maleate', forms: ['5mg Tablet', '12.5mg/ml Injection'], category: 'Antiemetic & Vestibular' },
  { brand: 'Prothiaden', company: 'Martin Dow', generic: 'Dosulepin Hydrochloride', forms: ['25mg Capsule', '75mg Tablet'], category: 'Psychiatry & Antidepressant' },
  { brand: 'Surmontil', company: 'Martin Dow', generic: 'Trimipramine Maleate', forms: ['25mg Tablet', '100mg Tablet'], category: 'Psychiatry & Antidepressant' },
  { brand: 'Largactil', company: 'Martin Dow / Sanofi', generic: 'Chlorpromazine Hydrochloride', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet', '50mg/2ml Injection'], category: 'Psychiatry & Antipsychotic' },
  { brand: 'Tavegyl', company: 'Martin Dow / Novartis', generic: 'Clemastine Fumarate', forms: ['1mg Tablet', '0.5mg/5ml Syrup', '2mg/2ml Injection'], category: 'Antiallergic & Antihistamines' },

  // --- CCL PHARMACEUTICALS ---
  { brand: 'Pulmonol', company: 'CCL Pharmaceuticals', generic: 'Dextromethorphan + Chlorpheniramine + Pseudoephedrine', forms: ['Cough Syrup 60ml', 'Cough Syrup 120ml', 'Expectorant Syrup 60ml', 'Expectorant Syrup 120ml'], category: 'Cough & Respiratory' },
  { brand: 'C-Cal', company: 'CCL Pharmaceuticals', generic: 'Calcium Carbonate + Vitamin D3 + Minerals', forms: ['Tablet 30s', 'D 1000 Effervescent Tablet', 'Syrup 120ml'], category: 'Vitamins & Calcium Supplements' },
  { brand: 'C-Cef', company: 'CCL Pharmaceuticals', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'C-Flox', company: 'CCL Pharmaceuticals', generic: 'Ciprofloxacin', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '200mg Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'C-Zole', company: 'CCL Pharmaceuticals', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'C-Pride', company: 'CCL Pharmaceuticals', generic: 'Glimepiride', forms: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'C-Mont', company: 'CCL Pharmaceuticals', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'C-Dol', company: 'CCL Pharmaceuticals', generic: 'Tramadol + Paracetamol', forms: ['Tablet', 'Injection'], category: 'Analgesics & Pain Relief' },
  { brand: 'C-Clav', company: 'CCL Pharmaceuticals', generic: 'Amoxicillin + Clavulanate', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },

  // --- BOSCH PHARMACEUTICALS ---
  { brand: 'Bosflox', company: 'Bosch Pharmaceuticals', generic: 'Levofloxacin', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '500mg/100ml Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Boscef', company: 'Bosch Pharmaceuticals', generic: 'Ceftriaxone Sodium', forms: ['250mg IV/IM', '500mg IV/IM', '1g IV/IM', '2g IV'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Bosclav', company: 'Bosch Pharmaceuticals', generic: 'Co-Amoxiclav', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', 'Suspension 156mg', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Bosmet', company: 'Bosch Pharmaceuticals', generic: 'Metformin', forms: ['500mg Tablet', '850mg Tablet', '1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Boscard', company: 'Bosch Pharmaceuticals', generic: 'Bisoprolol Fumarate', forms: ['2.5mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Bosgesic', company: 'Bosch Pharmaceuticals', generic: 'Paracetamol + Tramadol', forms: ['Tablet', 'Injection'], category: 'Analgesics & Pain Relief' },
  { brand: 'Boszole', company: 'Bosch Pharmaceuticals', generic: 'Esomeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Bosmont', company: 'Bosch Pharmaceuticals', generic: 'Montelukast Sodium', forms: ['4mg Chewable', '5mg Chewable', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Boscal', company: 'Bosch Pharmaceuticals', generic: 'Calcium + Vitamin D3', forms: ['Tablet 30s', 'Suspension 120ml'], category: 'Vitamins & Calcium Supplements' },

  // --- BAYER ---
  { brand: 'Aspirin', company: 'Bayer', generic: 'Acetylsalicylic Acid', forms: ['75mg Cardio Tablet', '81mg Low Dose Tablet', '100mg Protect Tablet', '300mg Tablet', '500mg Tablet', '500mg Effervescent Tablet'], category: 'Analgesics & Cardiovascular' },
  { brand: 'Glucobay', company: 'Bayer', generic: 'Acarbose', forms: ['50mg Tablet', '100mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Adalat', company: 'Bayer', generic: 'Nifedipine', forms: ['10mg Soft Capsule', '20mg Retard Tablet', '30mg LA Tablet', '60mg LA Tablet', 'CC 30mg Tablet', 'CC 60mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Xarelto', company: 'Bayer', generic: 'Rivaroxaban', forms: ['2.5mg Tablet', '10mg Tablet', '15mg Tablet', '20mg Tablet'], category: 'Cardiovascular & Anticoagulant' },
  { brand: 'Levitra', company: 'Bayer', generic: 'Vardenafil Hydrochloride', forms: ['10mg Tablet', '20mg Tablet', '10mg ODT Orodispersible Tablet'], category: 'Urology & Men Health' },
  { brand: 'Canesten', company: 'Bayer', generic: 'Clotrimazole', forms: ['1% Cream 20g', '1% Solution 20ml', '1% Powder 30g', '100mg Vaginal Tablet 6s', '500mg Vaginal Tablet 1s', '10% Vaginal Cream 5g'], category: 'Antifungal & Gynecological' },
  { brand: 'Bepanthen', company: 'Bayer', generic: 'Dexpanthenol (Pro-Vitamin B5)', forms: ['Ointment 30g', 'Ointment 100g', 'Cream 30g', 'Plus Wound Cream 30g', 'Lotion 200ml'], category: 'Dermatologicals & Baby Care' },
  { brand: 'Redoxon', company: 'Bayer', generic: 'Vitamin C 1000mg + Zinc', forms: ['Orange Effervescent Tablet 10s', 'Orange Effervescent Tablet 20s', 'Blackcurrant Effervescent 15s', 'Immune Triple Action 15s'], category: 'Vitamins & Immunity' },
  { brand: 'Berocca', company: 'Bayer', generic: 'B-Complex + Vitamin C + Minerals', forms: ['Orange Effervescent Tablet 10s', 'Mango Effervescent Tablet 15s'], category: 'Vitamins & Energy Boosters' },
  { brand: 'Claritin', company: 'Bayer', generic: 'Loratadine', forms: ['10mg Tablet', '5mg/5ml Syrup 60ml', 'RediTabs 10mg'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Diane-35', company: 'Bayer', generic: 'Cyproterone Acetate + Ethinylestradiol', forms: ['Tablet 21s'], category: 'Gynecological & Anti-Androgen' },
  { brand: 'Yasmin', company: 'Bayer', generic: 'Drospirenone + Ethinylestradiol', forms: ['Tablet 21s', 'Yaz 28s'], category: 'Gynecological & Oral Contraceptive' },

  // --- ASTRAZENECA ---
  { brand: 'Nexium', company: 'AstraZeneca', generic: 'Esomeprazole Magnesium', forms: ['20mg MUPS Tablet', '40mg MUPS Tablet', '40mg IV Injection', '10mg Sachet Granules', '20mg Sachet Granules'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Crestor', company: 'AstraZeneca', generic: 'Rosuvastatin Calcium', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Symbicort', company: 'AstraZeneca', generic: 'Budesonide + Formoterol Fumarate', forms: ['80/4.5mcg Turbuhaler', '160/4.5mcg Turbuhaler', '320/9mcg Turbuhaler', 'Rapihaler 160/4.5mcg'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Pulmicort', company: 'AstraZeneca', generic: 'Budesonide', forms: ['100mcg Turbuhaler', '200mcg Turbuhaler', '400mcg Turbuhaler', '0.25mg/ml Respules 2ml', '0.5mg/ml Respules 2ml'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Betaloc', company: 'AstraZeneca', generic: 'Metoprolol Tartrate', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet', '5mg/5ml Injection', 'ZOK 25mg CR Tablet', 'ZOK 50mg CR Tablet', 'ZOK 100mg CR Tablet'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Tenormin', company: 'AstraZeneca', generic: 'Atenolol', forms: ['25mg Tablet', '50mg Tablet', '100mg Tablet', '5mg/10ml Injection'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Farxiga', company: 'AstraZeneca', generic: 'Dapagliflozin', forms: ['5mg Tablet', '10mg Tablet'], category: 'Antidiabetic & SGLT2 Inhibitor' },
  { brand: 'Brilinta', company: 'AstraZeneca', generic: 'Ticagrelor', forms: ['60mg Tablet', '90mg Tablet'], category: 'Cardiovascular & Antiplatelet' },
  { brand: 'Zestril', company: 'AstraZeneca', generic: 'Lisinopril', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet'], category: 'Cardiovascular & ACE Inhibitor' },
  { brand: 'Inderal', company: 'AstraZeneca', generic: 'Propranolol Hydrochloride', forms: ['10mg Tablet', '40mg Tablet', '80mg Tablet', '1mg/ml Injection'], category: 'Cardiovascular & Beta Blocker' },
  { brand: 'Atacand', company: 'AstraZeneca', generic: 'Candesartan Cilexetil', forms: ['4mg Tablet', '8mg Tablet', '16mg Tablet', '32mg Tablet', 'Plus 16/12.5mg Tablet'], category: 'Cardiovascular & ARB' },

  // --- HIGHNOON LABORATORIES ---
  { brand: 'Tagipmet', company: 'Highnoon', generic: 'Sitagliptin + Metformin', forms: ['50/500mg Tablet', '50/850mg Tablet', '50/1000mg Tablet', 'XR 50/500mg Tablet', 'XR 50/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Glitarit', company: 'Highnoon', generic: 'Pioglitazone Hydrochloride', forms: ['15mg Tablet', '30mg Tablet', '45mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Vildagliz', company: 'Highnoon', generic: 'Vildagliptin', forms: ['50mg Tablet', 'M 50/500mg Tablet', 'M 50/850mg Tablet', 'M 50/1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Combo-Statin', company: 'Highnoon', generic: 'Atorvastatin + Ezetimibe', forms: ['10/10mg Tablet', '20/10mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Maxima', company: 'Highnoon', generic: 'Esomeprazole Magnesium', forms: ['20mg Capsule', '40mg Capsule', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Highcef', company: 'Highnoon', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml DS Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Highclav', company: 'Highnoon', generic: 'Amoxicillin + Clavulanate', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Highzole', company: 'Highnoon', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Highmont', company: 'Highnoon', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet 4mg'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Highflam', company: 'Highnoon', generic: 'Aceclofenac', forms: ['100mg Tablet', '200mg SR Tablet'], category: 'Analgesics & NSAIDs' },

  // --- BARRETT HODGSON ---
  { brand: 'Maxcef', company: 'Barrett Hodgson', generic: 'Cefepime Hydrochloride', forms: ['500mg IV/IM Injection', '1g IV/IM Injection', '2g IV Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Cefolac', company: 'Barrett Hodgson', generic: 'Cefotaxime Sodium', forms: ['250mg IV/IM', '500mg IV/IM', '1g IV/IM', '2g IV'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Biocef', company: 'Barrett Hodgson', generic: 'Cefradine', forms: ['250mg Capsule', '500mg Capsule', '125mg/5ml Suspension', '250mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Barclav', company: 'Barrett Hodgson', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Bardipine', company: 'Barrett Hodgson', generic: 'Amlodipine Besylate', forms: ['5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Barzole', company: 'Barrett Hodgson', generic: 'Pantoprazole', forms: ['20mg Tablet', '40mg Tablet', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Barmont', company: 'Barrett Hodgson', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Respiratory & Anti-Asthma' },

  // --- AGP LIMITED ---
  { brand: 'Rigix', company: 'AGP Limited', generic: 'Cetirizine Dihydrochloride', forms: ['10mg Tablet', '5mg/5ml Syrup 60ml', '10mg/ml Drops 15ml'], category: 'Antiallergic & Antihistamines' },
  { brand: 'Spasfon', company: 'AGP Limited', generic: 'Phloroglucinol + Trimethylphloroglucinol', forms: ['80mg Tablet', '40mg/4ml Injection', 'Oral Lyophilisate 80mg'], category: 'Gastrointestinal & Antispasmodic' },
  { brand: 'Ceclor', company: 'AGP Limited / Lilly', generic: 'Cefaclor', forms: ['250mg Capsule', '500mg Capsule', '125mg/5ml Suspension', '250mg/5ml Suspension', '375mg MR Tablet'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Keflex', company: 'AGP Limited / Lilly', generic: 'Cephalexin', forms: ['250mg Capsule', '500mg Capsule', '1g Tablet', '125mg/5ml Suspension', '250mg/5ml Suspension', '100mg/ml Drops'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Agp-Clav', company: 'AGP Limited', generic: 'Amoxicillin + Clavulanate Potassium', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Agp-Fix', company: 'AGP Limited', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml DS Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Agp-Card', company: 'AGP Limited', generic: 'Atorvastatin', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Agp-Met', company: 'AGP Limited', generic: 'Metformin', forms: ['500mg Tablet', '850mg Tablet', '1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },

  // --- PLATINUM PHARMACEUTICALS ---
  { brand: 'Platcef', company: 'Platinum', generic: 'Ceftriaxone', forms: ['250mg Injection', '500mg Injection', '1g Injection', '2g Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Platclav', company: 'Platinum', generic: 'Co-Amoxiclav', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', 'Suspension 156mg', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Platflam', company: 'Platinum', generic: 'Diclofenac Potassium', forms: ['50mg Tablet', '75mg Injection'], category: 'Analgesics & NSAIDs' },
  { brand: 'Platzole', company: 'Platinum', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Platmont', company: 'Platinum', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Platcard', company: 'Platinum', generic: 'Amlodipine', forms: ['5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Antihypertensive' },

  // --- PHARMEVO ---
  { brand: 'Evokast', company: 'PharmEvo', generic: 'Montelukast Sodium', forms: ['4mg Chewable Tablet', '5mg Chewable Tablet', '10mg Tablet', '4mg Granules Sachet'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Evorise', company: 'PharmEvo', generic: 'Rabeprazole Sodium', forms: ['10mg Tablet', '20mg Tablet', '20mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Evopril', company: 'PharmEvo', generic: 'Ramipril', forms: ['2.5mg Tablet', '5mg Tablet', '10mg Tablet', 'Plus 5/12.5mg Tablet'], category: 'Cardiovascular & ACE Inhibitor' },
  { brand: 'Evostatin', company: 'PharmEvo', generic: 'Rosuvastatin', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Evodip', company: 'PharmEvo', generic: 'Amlodipine', forms: ['5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Antihypertensive' },
  { brand: 'Evoflox', company: 'PharmEvo', generic: 'Ciprofloxacin', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '200mg Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Evogesic', company: 'PharmEvo', generic: 'Paracetamol + Tramadol', forms: ['Tablet', 'Injection'], category: 'Analgesics & Pain Relief' },
  { brand: 'Evocal', company: 'PharmEvo', generic: 'Calcium + Vitamin D3 + Minerals', forms: ['Tablet 30s', 'Effervescent Tablet', 'Syrup 120ml'], category: 'Vitamins & Calcium Supplements' },

  // --- RECKITT BENCKISER ---
  { brand: 'Disprin', company: 'Reckitt Benckiser', generic: 'Soluble Aspirin (Acetylsalicylic Acid)', forms: ['300mg Soluble Tablet 100s', 'Cardio 75mg Tablet', 'Direct 300mg Chewable Tablet'], category: 'Analgesics & Antipyretics' },
  { brand: 'Gaviscon', company: 'Reckitt Benckiser', generic: 'Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate', forms: ['Liquid Aniseed 120ml', 'Liquid Peppermint 120ml', 'Double Action Liquid 120ml', 'Double Action Liquid 200ml', 'Double Action Chewable Tablet 16s', 'Advance Liquid 150ml', 'Advance Sachet 10ml'], category: 'Gastrointestinal & Antacids' },
  { brand: 'Strepsils', company: 'Reckitt Benckiser', generic: 'Dichlorobenzyl Alcohol + Amylmetacresol', forms: ['Honey & Lemon Lozenge 24s', 'Orange with Vitamin C Lozenge 24s', 'Extra Cherry Lozenge 24s', 'Original Lozenge 24s', 'Menthol & Eucalyptus Lozenge 24s', 'Sugar Free Strawberry Lozenge 24s'], category: 'Throat & Respiratory' },
  { brand: 'Dettol', company: 'Reckitt Benckiser', generic: 'Chloroxylenol (Antiseptic Disinfectant)', forms: ['Antiseptic Liquid 60ml', 'Antiseptic Liquid 120ml', 'Antiseptic Liquid 250ml', 'Antiseptic Liquid 500ml', 'Antiseptic Liquid 1 Liter', 'Antiseptic Cream 30g'], category: 'Antiseptic & Wound Care' },
  { brand: 'Bonjela', company: 'Reckitt Benckiser', generic: 'Choline Salicylate + Cetalkonium Chloride', forms: ['Oromucosal Gel 15g', 'Junior Gel 15g'], category: 'Oral & Dental Care' },
  { brand: 'Lemsip', company: 'Reckitt Benckiser', generic: 'Paracetamol + Phenylephrine Hydrochloride', forms: ['Max Cold & Flu Lemon Sachet', 'Max Cold & Flu Blackcurrant Sachet', 'Cold & Flu Capsule'], category: 'Cold & Cough & Respiratory' },
  { brand: 'Fybogel', company: 'Reckitt Benckiser', generic: 'Ispaghula Husk (Natural Fiber)', forms: ['Orange Sachet 10s', 'Orange Sachet 30s', 'Lemon Sachet 10s'], category: 'Gastrointestinal & Laxatives' },

  // --- OBS PAKISTAN ---
  { brand: 'Ostocare', company: 'OBS Pakistan', generic: 'Calcium + Magnesium + Zinc + Vitamin D3', forms: ['Tablet 30s', 'Syrup 120ml', 'Plus Tablet 30s'], category: 'Vitamins & Calcium Supplements' },
  { brand: 'Cal-D-Vit', company: 'OBS Pakistan', generic: 'Calcium Carbonate + Vitamin D3', forms: ['Effervescent Tablet', 'Chewable Tablet 30s'], category: 'Vitamins & Calcium Supplements' },
  { brand: 'Obs-Clav', company: 'OBS Pakistan', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Obs-Cef', company: 'OBS Pakistan', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml DS Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Obs-Met', company: 'OBS Pakistan', generic: 'Metformin Hydrochloride', forms: ['500mg Tablet', '850mg Tablet', '1000mg Tablet'], category: 'Antidiabetic & Endocrinology' },
  { brand: 'Obs-Mont', company: 'OBS Pakistan', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },

  // --- MACTER INTERNATIONAL ---
  { brand: 'Mac-Cef', company: 'Macter', generic: 'Ceftriaxone', forms: ['250mg IV/IM', '500mg IV/IM', '1g IV/IM', '2g IV'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Mac-Clav', company: 'Macter', generic: 'Co-Amoxiclav', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', 'Suspension 156mg', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Mac-Flox', company: 'Macter', generic: 'Ciprofloxacin', forms: ['250mg Tablet', '500mg Tablet', '750mg Tablet', 'Infusion 200mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Mac-Zole', company: 'Macter', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Mac-Card', company: 'Macter', generic: 'Atorvastatin', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Mac-Mont', company: 'Macter', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },

  // --- ATCO LABORATORIES ---
  { brand: 'Atco-Cef', company: 'Atco', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension', '200mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Atco-Clav', company: 'Atco', generic: 'Amoxicillin + Clavulanic Acid', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Atco-Flox', company: 'Atco', generic: 'Moxifloxacin', forms: ['400mg Tablet', '400mg Infusion'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Atco-Zole', company: 'Atco', generic: 'Esomeprazole', forms: ['20mg Capsule', '40mg Capsule', '40mg IV'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Atco-Card', company: 'Atco', generic: 'Rosuvastatin', forms: ['5mg Tablet', '10mg Tablet', '20mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'Atco-Mont', company: 'Atco', generic: 'Montelukast Sodium', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet', 'Sachet'], category: 'Respiratory & Anti-Asthma' },

  // --- GENETICS PHARMACEUTICALS ---
  { brand: 'Gen-Cef', company: 'Genetics', generic: 'Cefoperazone + Sulbactam', forms: ['1g IV Injection', '2g IV Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Gen-Clav', company: 'Genetics', generic: 'Amoxicillin + Clavulanate', forms: ['625mg Tablet', '1g Tablet', 'Suspension 156mg', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Gen-Zole', company: 'Genetics', generic: 'Pantoprazole', forms: ['20mg Tablet', '40mg Tablet', '40mg IV Injection'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Gen-Mont', company: 'Genetics', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Respiratory & Anti-Asthma' },
  { brand: 'Gen-Card', company: 'Genetics', generic: 'Bisoprolol', forms: ['2.5mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Cardiovascular & Beta Blocker' },

  // --- WILSONS PHARMACEUTICALS ---
  { brand: 'Wil-Cef', company: 'Wilsons', generic: 'Ceftriaxone', forms: ['250mg Injection', '500mg Injection', '1g Injection', '2g Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Wil-Clav', company: 'Wilsons', generic: 'Co-Amoxiclav', forms: ['375mg Tablet', '625mg Tablet', '1g Tablet', 'Suspension 156mg', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Wil-Zole', company: 'Wilsons', generic: 'Omeprazole', forms: ['20mg Capsule', '40mg Capsule'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Wil-Mont', company: 'Wilsons', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Respiratory & Anti-Asthma' },

  // --- NABIQASIM / SANTE / MEDISURE / SHAIGAN / ICI ---
  { brand: 'Nabi-Cef', company: 'Nabiqasim', generic: 'Cefixime', forms: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Nabi-Zole', company: 'Nabiqasim', generic: 'Esomeprazole', forms: ['20mg Capsule', '40mg Capsule'], category: 'Gastrointestinal & Anti-Ulcerants' },
  { brand: 'Sante-Tears', company: 'Sante', generic: 'Carboxymethylcellulose Eye Drops', forms: ['0.5% Drops 10ml', '1% Drops 10ml'], category: 'Ophthalmic & Eye Care' },
  { brand: 'Sante-Dex', company: 'Sante', generic: 'Tobramycin + Dexamethasone Eye Drops', forms: ['5ml Drops'], category: 'Ophthalmic & Eye Care' },
  { brand: 'Med-Clav', company: 'Medisure', generic: 'Amoxicillin + Clavulanate', forms: ['625mg Tablet', '1g Tablet', 'Suspension 312mg'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'Shai-Cef', company: 'Shaigan', generic: 'Ceftriaxone', forms: ['500mg Injection', '1g Injection', '2g Injection'], category: 'Antibiotics & Anti-Infectives' },
  { brand: 'ICI-Atorva', company: 'ICI Pakistan', generic: 'Atorvastatin', forms: ['10mg Tablet', '20mg Tablet', '40mg Tablet'], category: 'Cardiovascular & Lipid Lowering' },
  { brand: 'ICI-Mont', company: 'ICI Pakistan', generic: 'Montelukast', forms: ['4mg Tablet', '5mg Tablet', '10mg Tablet'], category: 'Respiratory & Anti-Asthma' },
];

// Additional extensive drug classes and molecules to build a complete 5,000+ medicine master library
const ADDITIONAL_MAPPING: {
  companies: string[];
  generics: { generic: string; category: string; brandPrefix: string; variants: string[] }[];
} = {
  companies: [
    'GSK', 'Abbott', 'Getz Pharma', 'Pfizer', 'Sanofi', 'Novartis', 'Sami', 'Hilton Pharma',
    'Searle', 'Ferozsons', 'Martin Dow', 'CCL Pharmaceuticals', 'Bosch Pharmaceuticals',
    'Bayer', 'AstraZeneca', 'Highnoon', 'Barrett Hodgson', 'AGP Limited', 'Platinum',
    'PharmEvo', 'Reckitt Benckiser', 'OBS Pakistan', 'Macter', 'Atco', 'Genetics', 'Wilsons',
    'Nabiqasim', 'Sante', 'Medisure', 'Shaigan', 'ICI Pakistan', 'Horizon', 'Brookes Pharma',
    'Zafa Pharmaceuticals', 'Remington', 'Scotmann', 'Pharmatec', 'Standpharm', 'Surge Laboratories',
    'Indus Pharma', 'Pharmalink', 'Global Pharmaceuticals', 'Macter Labs', 'Mediceena', 'Wilshire'
  ],
  generics: [
    // Pain & NSAIDs
    { generic: 'Paracetamol', category: 'Analgesics & Antipyretics', brandPrefix: 'Para', variants: ['500mg Tablet', '650mg Tablet', '1000mg Infusion', '120mg/5ml Syrup', '250mg/5ml DS Syrup', '100mg/ml Drops', '125mg Suppository', '250mg Suppository'] },
    { generic: 'Ibuprofen', category: 'Analgesics & NSAIDs', brandPrefix: 'Ibu', variants: ['200mg Tablet', '400mg Tablet', '600mg Tablet', '800mg SR Tablet', '100mg/5ml Syrup', '200mg/5ml DS Syrup'] },
    { generic: 'Diclofenac Sodium', category: 'Analgesics & NSAIDs', brandPrefix: 'Diclo', variants: ['25mg Tablet', '50mg Tablet', '75mg Injection', '100mg SR Tablet', '1% Gel 20g', '1% Gel 50g'] },
    { generic: 'Diclofenac Potassium', category: 'Analgesics & NSAIDs', brandPrefix: 'Potas-Diclo', variants: ['25mg Tablet', '50mg Tablet', '75mg Injection', '50mg Sachet'] },
    { generic: 'Mefenamic Acid', category: 'Analgesics & NSAIDs', brandPrefix: 'Mefe', variants: ['250mg Capsule', '500mg Tablet', 'Forte 500mg Tablet', '50mg/5ml Suspension'] },
    { generic: 'Tramadol Hydrochloride', category: 'Analgesics & Pain Relief', brandPrefix: 'Trama', variants: ['50mg Capsule', '100mg SR Tablet', '50mg/ml Injection', '100mg/2ml Injection'] },
    { generic: 'Tramadol + Paracetamol', category: 'Analgesics & Pain Relief', brandPrefix: 'Tra-Para', variants: ['37.5/325mg Tablet', '75/650mg Tablet'] },
    { generic: 'Celecoxib', category: 'Analgesics & NSAIDs', brandPrefix: 'Cele', variants: ['100mg Capsule', '200mg Capsule', '400mg Capsule'] },
    { generic: 'Ketorolac Tromethamine', category: 'Analgesics & NSAIDs', brandPrefix: 'Keto', variants: ['10mg Tablet', '30mg/ml Injection', '0.5% Eye Drops 5ml'] },
    { generic: 'Naproxen Sodium', category: 'Analgesics & NSAIDs', brandPrefix: 'Napro', variants: ['250mg Tablet', '500mg Tablet', '500mg SR Tablet', '125mg/5ml Suspension'] },
    { generic: 'Piroxicam', category: 'Analgesics & NSAIDs', brandPrefix: 'Piro', variants: ['10mg Capsule', '20mg Capsule', '20mg Fast Dissolve Tablet', '20mg/ml Injection', '0.5% Gel 30g'] },
    { generic: 'Aceclofenac', category: 'Analgesics & NSAIDs', brandPrefix: 'Aceclo', variants: ['100mg Tablet', '200mg SR Tablet', 'Plus Paracetamol 100/500mg Tablet'] },

    // Antibiotics & Anti-Infectives
    { generic: 'Amoxicillin', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Amoxi', variants: ['250mg Capsule', '500mg Capsule', '125mg/5ml Suspension', '250mg/5ml Suspension', '500mg Injection'] },
    { generic: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Clav-Amox', variants: ['375mg Tablet', '625mg Tablet', '1g Tablet', '156mg/5ml Suspension', '312mg/5ml Suspension', '457mg/5ml DS Suspension', '600mg ES Suspension', '1.2g IV Injection'] },
    { generic: 'Cefixime', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Cefi', variants: ['200mg Capsule', '400mg Capsule', '100mg/5ml Suspension 30ml', '100mg/5ml Suspension 60ml', '200mg/5ml DS Suspension 30ml'] },
    { generic: 'Ceftriaxone Sodium', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Ceftri', variants: ['250mg IV/IM Injection', '500mg IV/IM Injection', '1g IV/IM Injection', '2g IV Infusion'] },
    { generic: 'Ciprofloxacin Hydrochloride', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Cipro', variants: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '200mg/100ml Infusion', '0.3% Eye/Ear Drops 5ml'] },
    { generic: 'Levofloxacin', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Levo', variants: ['250mg Tablet', '500mg Tablet', '750mg Tablet', '500mg/100ml Infusion', '0.5% Eye Drops 5ml'] },
    { generic: 'Moxifloxacin', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Moxi', variants: ['400mg Tablet', '400mg/250ml Infusion', '0.5% Eye Drops 5ml'] },
    { generic: 'Azithromycin', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Azithro', variants: ['250mg Capsule', '500mg Tablet', '200mg/5ml Suspension 15ml', '200mg/5ml Suspension 22.5ml', '500mg IV Infusion'] },
    { generic: 'Clarithromycin', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Clari', variants: ['250mg Tablet', '500mg Tablet', '500mg XL Tablet', '125mg/5ml Suspension', '250mg/5ml Suspension'] },
    { generic: 'Cefoperazone + Sulbactam', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Cefo-Sulb', variants: ['1g IV/IM Injection', '2g IV/IM Injection'] },
    { generic: 'Meropenem', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Mero', variants: ['500mg IV Injection', '1g IV Injection'] },
    { generic: 'Metronidazole', category: 'Antibiotics & Antiprotozoal', brandPrefix: 'Metro', variants: ['200mg Tablet', '400mg Tablet', '200mg/5ml Suspension', '500mg/100ml Infusion'] },
    { generic: 'Doxycycline Hyclate', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Doxy', variants: ['100mg Capsule', '100mg Tablet'] },
    { generic: 'Cephradine', category: 'Antibiotics & Anti-Infectives', brandPrefix: 'Cephra', variants: ['250mg Capsule', '500mg Capsule', '1g Capsule', '125mg/5ml Suspension', '250mg/5ml Suspension', '500mg Injection', '1g Injection'] },

    // Gastrointestinal & Anti-Ulcerants
    { generic: 'Omeprazole', category: 'Gastrointestinal & Anti-Ulcerants', brandPrefix: 'Ome', variants: ['20mg Capsule', '40mg Capsule', '40mg IV Injection', 'Insta 20mg Sachet', 'Insta 40mg Sachet'] },
    { generic: 'Esomeprazole Magnesium', category: 'Gastrointestinal & Anti-Ulcerants', brandPrefix: 'Eso', variants: ['20mg Capsule', '40mg Capsule', '40mg IV Injection', 'Insta 20mg Sachet', 'Insta 40mg Sachet'] },
    { generic: 'Pantoprazole Sodium', category: 'Gastrointestinal & Anti-Ulcerants', brandPrefix: 'Panto', variants: ['20mg Tablet', '40mg Tablet', '40mg IV Injection'] },
    { generic: 'Rabeprazole Sodium', category: 'Gastrointestinal & Anti-Ulcerants', brandPrefix: 'Rabe', variants: ['10mg Tablet', '20mg Tablet', '20mg IV Injection'] },
    { generic: 'Dexlansoprazole', category: 'Gastrointestinal & Anti-Ulcerants', brandPrefix: 'Dexlan', variants: ['30mg MR Capsule', '60mg MR Capsule'] },
    { generic: 'Lactulose', category: 'Gastrointestinal & Laxatives', brandPrefix: 'Lactu', variants: ['Syrup 120ml', 'Syrup 240ml', 'Syrup 450ml', 'Sachet 15ml'] },
    { generic: 'Itopride Hydrochloride', category: 'Gastrointestinal & Motility', brandPrefix: 'Ito', variants: ['50mg Tablet', '150mg SR Tablet'] },
    { generic: 'Domperidone', category: 'Gastrointestinal & Antiemetic', brandPrefix: 'Domper', variants: ['10mg Tablet', '5mg/5ml Suspension 60ml', '10mg/ml Drops', '30mg Suppository'] },
    { generic: 'Ondansetron', category: 'Gastrointestinal & Antiemetic', brandPrefix: 'Ondan', variants: ['4mg Tablet', '8mg Tablet', '4mg/2ml Injection', '8mg/4ml Injection', '4mg/5ml Syrup 60ml'] },
    { generic: 'Hyoscine Butylbromide', category: 'Gastrointestinal & Antispasmodic', brandPrefix: 'Hyos', variants: ['10mg Tablet', '20mg/ml Injection', 'Plus Paracetamol Tablet'] },
    { generic: 'Mebeverine Hydrochloride', category: 'Gastrointestinal & Antispasmodic', brandPrefix: 'Mebe', variants: ['135mg Tablet', '200mg Retard Capsule'] },

    // Cardiovascular & Antihypertensive
    { generic: 'Amlodipine Besylate', category: 'Cardiovascular & Antihypertensive', brandPrefix: 'Amlo', variants: ['2.5mg Tablet', '5mg Tablet', '10mg Tablet'] },
    { generic: 'Losartan Potassium', category: 'Cardiovascular & Antihypertensive', brandPrefix: 'Losar', variants: ['25mg Tablet', '50mg Tablet', '100mg Tablet', 'Plus 50/12.5mg Tablet', 'Plus 100/25mg Tablet'] },
    { generic: 'Valsartan', category: 'Cardiovascular & Antihypertensive', brandPrefix: 'Valsar', variants: ['40mg Tablet', '80mg Tablet', '160mg Tablet', '320mg Tablet', 'Plus 80/12.5mg', 'Plus 160/12.5mg', 'Plus 160/25mg'] },
    { generic: 'Telmisartan', category: 'Cardiovascular & Antihypertensive', brandPrefix: 'Telmi', variants: ['20mg Tablet', '40mg Tablet', '80mg Tablet', 'Plus 40/12.5mg Tablet', 'Plus 80/12.5mg Tablet', 'AM 40/5mg Tablet', 'AM 80/5mg Tablet'] },
    { generic: 'Bisoprolol Fumarate', category: 'Cardiovascular & Beta Blocker', brandPrefix: 'Biso', variants: ['1.25mg Tablet', '2.5mg Tablet', '5mg Tablet', '10mg Tablet', 'Plus 5/6.25mg Tablet'] },
    { generic: 'Carvedilol', category: 'Cardiovascular & Beta Blocker', brandPrefix: 'Carve', variants: ['3.125mg Tablet', '6.25mg Tablet', '12.5mg Tablet', '25mg Tablet'] },
    { generic: 'Metoprolol Tartrate', category: 'Cardiovascular & Beta Blocker', brandPrefix: 'Meto', variants: ['25mg Tablet', '50mg Tablet', '100mg Tablet', 'ZOK 25mg CR', 'ZOK 50mg CR', 'ZOK 100mg CR'] },
    { generic: 'Atorvastatin Calcium', category: 'Cardiovascular & Lipid Lowering', brandPrefix: 'Atorva', variants: ['10mg Tablet', '20mg Tablet', '40mg Tablet', '80mg Tablet'] },
    { generic: 'Rosuvastatin Calcium', category: 'Cardiovascular & Lipid Lowering', brandPrefix: 'Rosuva', variants: ['5mg Tablet', '10mg Tablet', '20mg Tablet', '40mg Tablet'] },
    { generic: 'Clopidogrel Bisulfate', category: 'Cardiovascular & Antiplatelet', brandPrefix: 'Clopi', variants: ['75mg Tablet', '300mg Tablet', 'Plus Aspirin 75/75mg Tablet', 'Plus Aspirin 75/100mg Tablet'] },
    { generic: 'Rivaroxaban', category: 'Cardiovascular & Anticoagulant', brandPrefix: 'Rivaro', variants: ['2.5mg Tablet', '10mg Tablet', '15mg Tablet', '20mg Tablet'] },

    // Antidiabetic & Endocrinology
    { generic: 'Metformin Hydrochloride', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Metfor', variants: ['500mg Tablet', '850mg Tablet', '1000mg Tablet', '500mg XR Tablet', '750mg XR Tablet', '1000mg XR Tablet'] },
    { generic: 'Glimepiride', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Glime', variants: ['1mg Tablet', '2mg Tablet', '3mg Tablet', '4mg Tablet', 'Plus 1/500mg Tablet', 'Plus 2/500mg Tablet', 'Plus 4/500mg Tablet'] },
    { generic: 'Vildagliptin', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Vilda', variants: ['50mg Tablet', 'Met 50/500mg Tablet', 'Met 50/850mg Tablet', 'Met 50/1000mg Tablet'] },
    { generic: 'Sitagliptin', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Sita', variants: ['25mg Tablet', '50mg Tablet', '100mg Tablet', 'Met 50/500mg Tablet', 'Met 50/850mg Tablet', 'Met 50/1000mg Tablet'] },
    { generic: 'Linagliptin', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Lina', variants: ['5mg Tablet', 'Met 2.5/500mg Tablet', 'Met 2.5/850mg Tablet', 'Met 2.5/1000mg Tablet'] },
    { generic: 'Empagliflozin', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Empa', variants: ['10mg Tablet', '25mg Tablet', 'Met 5/500mg Tablet', 'Met 5/1000mg Tablet', 'Met 12.5/500mg Tablet', 'Met 12.5/1000mg Tablet'] },
    { generic: 'Dapagliflozin', category: 'Antidiabetic & Endocrinology', brandPrefix: 'Dapa', variants: ['5mg Tablet', '10mg Tablet', 'Met 5/500mg Tablet', 'Met 5/1000mg Tablet', 'Met 10/1000mg Tablet'] },

    // Respiratory, Allergy & Cough
    { generic: 'Montelukast Sodium', category: 'Respiratory & Anti-Asthma', brandPrefix: 'Montelu', variants: ['4mg Chewable Tablet', '5mg Chewable Tablet', '10mg Tablet', '4mg Sachet Granules', 'Plus Levocetirizine 10/5mg Tablet'] },
    { generic: 'Cetirizine Hydrochloride', category: 'Antiallergic & Antihistamines', brandPrefix: 'Cetiri', variants: ['10mg Tablet', '5mg/5ml Syrup 60ml', '10mg/ml Drops 15ml'] },
    { generic: 'Levocetirizine Dihydrochloride', category: 'Antiallergic & Antihistamines', brandPrefix: 'Levocet', variants: ['5mg Tablet', '2.5mg/5ml Syrup 60ml', '5mg/ml Drops 15ml'] },
    { generic: 'Fexofenadine Hydrochloride', category: 'Antiallergic & Antihistamines', brandPrefix: 'Fexo', variants: ['60mg Tablet', '120mg Tablet', '180mg Tablet', '30mg/5ml Suspension 60ml'] },
    { generic: 'Loratadine', category: 'Antiallergic & Antihistamines', brandPrefix: 'Lora', variants: ['10mg Tablet', '5mg/5ml Syrup 60ml'] },
    { generic: 'Salbutamol', category: 'Respiratory & Anti-Asthma', brandPrefix: 'Salbu', variants: ['2mg Tablet', '4mg Tablet', '2mg/5ml Syrup', 'Inhaler 100mcg', 'Nebulizer Solution 5mg/ml'] },
    { generic: 'Salmeterol + Fluticasone Propionate', category: 'Respiratory & Anti-Asthma', brandPrefix: 'Salm-Fluti', variants: ['50/100mcg Diskus', '50/250mcg Diskus', '50/500mcg Diskus', '125/25mcg Inhaler', '250/25mcg Inhaler'] },

    // Vitamins, Minerals & Supplements
    { generic: 'Calcium Carbonate + Vitamin D3', category: 'Vitamins & Calcium Supplements', brandPrefix: 'Calci-D', variants: ['500mg/400IU Tablet 30s', '600mg/400IU Tablet 30s', 'Effervescent Tablet 10s', 'Syrup 120ml'] },
    { generic: 'Vitamin D3 (Cholecalciferol)', category: 'Vitamins & Minerals', brandPrefix: 'D-Vit', variants: ['5,000 IU Capsule', '10,000 IU Capsule', '50,000 IU Softgel', '200,000 IU Oral Ampoule', '200,000 IU/ml Injection', '400 IU/ml Drops'] },
    { generic: 'Ferrous Sulfate + Folic Acid', category: 'Vitamins & Hematological', brandPrefix: 'Fero-Folic', variants: ['Capsule 30s', 'Tablet 30s', 'Syrup 120ml', 'Drops 15ml'] },
    { generic: 'Vitamin B-Complex + Vitamin C + Zinc', category: 'Vitamins & Minerals', brandPrefix: 'B-Zinc', variants: ['Tablet 30s', 'Tablet 60s', 'Effervescent Tablet', 'Syrup 120ml'] },
    { generic: 'Vitamin E (Tocopheryl Acetate)', category: 'Vitamins & Minerals', brandPrefix: 'E-Vit', variants: ['200 IU Capsule', '400 IU Capsule', '600 IU Softgel', '1000 IU Softgel'] }
  ]
};

const SURGICAL_AND_ORTHO_SEEDS: {
  brand: string;
  company: string;
  generic: string;
  category: string;
  forms: string[];
}[] = [
  // --- SURGICAL DISPOSABLES, CANNULAS & SYRINGES ---
  {
    brand: 'BD Venflon / BD Cannula',
    company: 'Becton Dickinson (BD)',
    generic: 'Intravenous (IV) Cannula with Injection Port & Wings',
    category: 'Surgical & Disposable Supplies',
    forms: ['16G Grey (1.8 x 45mm)', '18G Green (1.3 x 45mm)', '20G Pink (1.1 x 32mm)', '22G Blue (0.9 x 25mm)', '24G Yellow (0.7 x 19mm)', '26G Violet Pediatric (0.6 x 19mm)']
  },
  {
    brand: 'BD Discardit / Emerald Syringe',
    company: 'Becton Dickinson (BD)',
    generic: 'Sterile Single-Use Hypodermic Syringe with Needle',
    category: 'Surgical & Disposable Supplies',
    forms: ['1ml Insulin 31G x 6mm U-100', '1ml Tuberculin 27G', '2ml Luer Slip with 23G Needle', '3ml Luer Lock with 23G Needle', '5ml Luer Slip with 22G Needle', '10ml Luer Lock with 21G Needle', '20ml Luer Lock Eccentric', '50ml Perfusion / Infusion Pump Syringe', '50ml Catheter Tip Feeding Syringe']
  },
  {
    brand: 'Ethicon Vicryl Suture',
    company: 'Johnson & Johnson Ethicon',
    generic: 'Polyglactin 910 Braided Absorbable Surgical Suture',
    category: 'Surgical & Disposable Supplies',
    forms: ['1-0 Round Body 36mm Needle (75cm)', '2-0 Round Body 30mm Needle (75cm)', '3-0 Cutting 19mm Needle (75cm)', '3-0 Round Body 26mm Needle (75cm)', '4-0 Reverse Cutting 16mm (45cm)', '5-0 Undyed Rapid 12mm Needle (45cm)']
  },
  {
    brand: 'Ethicon Prolene Suture',
    company: 'Johnson & Johnson Ethicon',
    generic: 'Polypropylene Non-Absorbable Monofilament Suture',
    category: 'Surgical & Disposable Supplies',
    forms: ['2-0 Round Body 26mm Needle (75cm)', '3-0 Cutting 24mm Needle (75cm)', '4-0 Cutting 19mm Needle (45cm)', '5-0 Reverse Cutting 16mm (45cm)', '6-0 Micro Vascular 10mm (45cm)']
  },
  {
    brand: 'Ethicon Mersilk / Silk Suture',
    company: 'Johnson & Johnson Ethicon',
    generic: 'Braided Black Silk Non-Absorbable Suture',
    category: 'Surgical & Disposable Supplies',
    forms: ['1-0 Round Body (75cm)', '2-0 Cutting 26mm Needle', '3-0 Cutting 19mm Needle', '4-0 Cutting 16mm Needle']
  },
  {
    brand: 'Swann-Morton Surgical Scalpel Blades',
    company: 'Swann-Morton UK',
    generic: 'Sterile Carbon Steel Surgical Scalpel Blades',
    category: 'Surgical & Disposable Supplies',
    forms: ['Blade No. 10 (Box of 100)', 'Blade No. 11 (Box of 100)', 'Blade No. 12 (Box of 100)', 'Blade No. 15 (Box of 100)', 'Blade No. 20 (Box of 100)', 'Blade No. 22 (Box of 100)', 'Blade No. 24 (Box of 100)', 'Disposable Scalpel Handle with Blade No. 11', 'Disposable Scalpel Handle with Blade No. 15', 'Disposable Scalpel Handle with Blade No. 20']
  },
  {
    brand: 'Ansell Gammex / Medi-Grip',
    company: 'Ansell Healthcare',
    generic: 'Sterile Powder-Free Surgical Latex & Nitrile Gloves',
    category: 'Surgical & Disposable Supplies',
    forms: ['Sterile Surgical Latex Gloves Size 6.0 (Pair)', 'Sterile Surgical Latex Gloves Size 6.5 (Pair)', 'Sterile Surgical Latex Gloves Size 7.0 (Pair)', 'Sterile Surgical Latex Gloves Size 7.5 (Pair)', 'Sterile Surgical Latex Gloves Size 8.0 (Pair)', 'Sterile Surgical Latex Gloves Size 8.5 (Pair)', 'Nitrile Non-Sterile Exam Gloves Small (Box 100)', 'Nitrile Non-Sterile Exam Gloves Medium (Box 100)', 'Nitrile Non-Sterile Exam Gloves Large (Box 100)']
  },
  {
    brand: 'Rusch / Medtronic Foley Catheter',
    company: 'Teleflex Rusch',
    generic: '2-Way & 3-Way Silicone & Latex Foley Balloon Catheter',
    category: 'Surgical & Disposable Supplies',
    forms: ['2-Way Latex Balloon 12Fr (30ml)', '2-Way Latex Balloon 14Fr (30ml)', '2-Way Latex Balloon 16Fr (30ml)', '2-Way Latex Balloon 18Fr (30ml)', '2-Way 100% Silicone 16Fr', '2-Way 100% Silicone 18Fr', '3-Way Hematuria Irrigation Catheter 20Fr (30ml)', '3-Way Hematuria Irrigation Catheter 22Fr (30ml)', 'Urine Drainage Bag 2000ml with Anti-Reflux Valve & Tap']
  },
  {
    brand: '3M Micropore / Transpore Surgical Tape',
    company: '3M Health Care',
    generic: 'Hypoallergenic Surgical Adhesive Paper & Plastic Tape',
    category: 'Surgical & Disposable Supplies',
    forms: ['Micropore Paper Tape 0.5 Inch x 10yd (Box 24)', 'Micropore Paper Tape 1.0 Inch x 10yd (Box 12)', 'Micropore Paper Tape 2.0 Inch x 10yd (Box 6)', 'Micropore Paper Tape 3.0 Inch x 10yd (Box 4)', 'Transpore Clear Plastic Tape 1.0 Inch x 10yd', 'Transpore Clear Plastic Tape 2.0 Inch x 10yd', 'Durapore Silk Adhesive Tape 1.0 Inch', 'Durapore Silk Adhesive Tape 2.0 Inch', 'Tegaderm Transparent Film IV Dressing 6x7cm (Box 100)', 'Tegaderm Film Dressing with Pad 9x10cm (Box 50)']
  },
  {
    brand: 'B. Braun Intrafix / Sangofix Infusion Set',
    company: 'B. Braun Medical',
    generic: 'IV Gravity Infusion & Blood Transfusion Administration Set',
    category: 'Surgical & Disposable Supplies',
    forms: ['Intrafix SafeSet Standard IV Infusion Line', 'Micro-Drip Pediatric Infusion Set (60 Drops/ml)', 'Sangofix Blood Transfusion Set with 200um Filter', '3-Way Stopcock Extension Tube 10cm', '3-Way Stopcock Extension Tube 50cm', 'Needleless IV Connector Valve']
  },
  {
    brand: 'Sterile Surgical Gauze & Cotton Pack',
    company: 'Universal Medical Textiles',
    generic: '100% Bleached Cotton Absorbent Gauze & Swabs',
    category: 'Surgical & Disposable Supplies',
    forms: ['Absorbent Gauze Roll 90cm x 18m (B.P. Quality)', 'Sterile Gauze Swabs 4x4 Inch (10x10cm) 8-Ply (Pack of 5)', 'Sterile Gauze Swabs 3x3 Inch (7.5x7.5cm) 8-Ply (Pack of 5)', 'Sterile Gauze Swabs 2x2 Inch (5x5cm) (Pack of 5)', 'Non-Sterile Gauze Swabs 4x4 (Pack of 100)', 'Absorbent Cotton Wool Roll 100g', 'Absorbent Cotton Wool Roll 250g', 'Absorbent Cotton Wool Roll 500g', 'Absorbent Cotton Wool Roll 1000g', 'Gamgee Surgical Pad 10x20cm', 'Gamgee Surgical Pad 20x20cm']
  },
  {
    brand: 'DynaPlast / BSN Crepe & Elastic Bandage',
    company: 'Johnson & Johnson / Essity',
    generic: 'Cotton Stretch Crepe Bandage & Elastic Adhesive Bandage',
    category: 'Surgical & Disposable Supplies',
    forms: ['Crepe Bandage 5cm x 4.5m Stretched', 'Crepe Bandage 7.5cm x 4.5m Stretched', 'Crepe Bandage 10cm x 4.5m Stretched', 'Crepe Bandage 15cm x 4.5m Stretched', 'DynaPlast Elastic Adhesive Bandage 8cm x 4m', 'DynaPlast Elastic Adhesive Bandage 10cm x 4m', 'Zinc Oxide Rigid Adhesive Strapping Tape 5cm x 5m']
  },
  {
    brand: 'Covidien / Medtronic Endotracheal Tube',
    company: 'Medtronic',
    generic: 'Oral/Nasal Sterile Cuffed & Uncuffed Tracheal Tube',
    category: 'Surgical & Disposable Supplies',
    forms: ['Cuffed Endotracheal Tube 6.0mm ID', 'Cuffed Endotracheal Tube 6.5mm ID', 'Cuffed Endotracheal Tube 7.0mm ID', 'Cuffed Endotracheal Tube 7.5mm ID', 'Cuffed Endotracheal Tube 8.0mm ID', 'Cuffed Endotracheal Tube 8.5mm ID', 'Uncuffed Pediatric Endotracheal Tube 3.5mm ID', 'Uncuffed Pediatric Endotracheal Tube 4.0mm ID', 'Suction Catheter with Control Valve 10Fr', 'Suction Catheter with Control Valve 12Fr', 'Suction Catheter with Control Valve 14Fr', 'Ryle\'s Stomach Nasogastric NG Tube 14Fr', 'Ryle\'s Stomach Nasogastric NG Tube 16Fr', 'Ryle\'s Stomach Nasogastric NG Tube 18Fr']
  },
  {
    brand: 'Appose / Proximate Skin Stapler',
    company: 'Ethicon / Medtronic',
    generic: 'Sterile Disposable Skin Stapler & Staple Remover',
    category: 'Surgical & Disposable Supplies',
    forms: ['Disposable Skin Stapler 35 Wide (35W)', 'Disposable Skin Stapler 35 Regular (35R)', 'Sterile Skin Staple Remover Forceps']
  },
  {
    brand: 'Pyodine / Betadine Surgical Solution',
    company: 'Brookes Pharma / Mundipharma',
    generic: 'Povidone Iodine Antiseptic & Surgical Scrub',
    category: 'Surgical & Disposable Supplies',
    forms: ['10% Solution 60ml', '10% Solution 120ml', '10% Solution 250ml', '10% Solution 450ml', '10% Solution 1 Liter', '7.5% Surgical Scrub 450ml', '7.5% Surgical Scrub 1 Liter', '10% Ointment 20g Tube', 'Surgical Spirit 70% 450ml', 'Hydrogen Peroxide 6% 450ml']
  },
  {
    brand: 'BD Spinal Needle / Quincke Point',
    company: 'Becton Dickinson (BD)',
    generic: 'Sterile Lumbar Puncture / Spinal Anesthesia Needle',
    category: 'Surgical & Disposable Supplies',
    forms: ['23G x 3.50 Inch (0.64 x 90mm)', '25G x 3.50 Inch (0.50 x 90mm)', '26G x 3.50 Inch (0.45 x 90mm)', '27G x 3.50 Inch (0.40 x 90mm) Whitacre Pencil Point', 'Epidural Minipack Tuohy Needle 18G with Catheter Set']
  },

  // --- ORTHOPEDIC CASTS, PADDING & SPLINTS ---
  {
    brand: 'Gypsona / BSN Plaster of Paris (POP)',
    company: 'BSN Medical / Essity',
    generic: 'Fast Setting Plaster of Paris Bandage for Bone Immobilization',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['10cm x 2.7m (4 Inch) POP Bandage', '15cm x 2.7m (6 Inch) POP Bandage', '20cm x 2.7m (8 Inch) POP Bandage', 'Plaster Slab 10cm x 20m Dispenser Box', 'Plaster Slab 15cm x 20m Dispenser Box']
  },
  {
    brand: 'Scotchcast / Delta-Cast Fiberglass',
    company: '3M Health Care / BSN',
    generic: 'Synthetic Fiberglass Orthopedic Casting Tape',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['2 Inch (5.0cm x 3.6m) White Casting Tape', '3 Inch (7.5cm x 3.6m) White Casting Tape', '4 Inch (10.0cm x 3.6m) White Casting Tape', '5 Inch (12.5cm x 3.6m) White Casting Tape', 'Soft Cast Semi-Rigid Tape 3 Inch', 'Soft Cast Semi-Rigid Tape 4 Inch']
  },
  {
    brand: 'Softban / Orthoban Cast Padding',
    company: 'BSN Medical',
    generic: 'Orthopedic Under-Cast Synthetic & Cotton Padding',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['7.5cm x 2.7m Cast Padding (Pack of 12)', '10cm x 2.7m Cast Padding (Pack of 12)', '15cm x 2.7m Cast Padding (Pack of 12)', 'Tubular Stockinette Cotton 2 Inch x 25m', 'Tubular Stockinette Cotton 3 Inch x 25m', 'Tubular Stockinette Cotton 4 Inch x 25m']
  },

  // --- ORTHOPEDIC BRACES, COLLARS & BELTS ---
  {
    brand: 'Tynor Cervical Collar',
    company: 'Tynor Orthotics',
    generic: 'Cervical Spine Support & Immobilizer',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Soft Foam Collar Small (S)', 'Soft Foam Collar Medium (M)', 'Soft Foam Collar Large (L)', 'Soft Foam Collar Extra Large (XL)', 'Hard Adjustable Collar with Chin Support (S)', 'Hard Adjustable Collar with Chin Support (M)', 'Hard Adjustable Collar with Chin Support (L)', 'Philadelphia Tracheostomy Collar Small (S)', 'Philadelphia Tracheostomy Collar Medium (M)', 'Philadelphia Tracheostomy Collar Large (L)']
  },
  {
    brand: 'Tynor Lumbar Sacral (L.S.) Belt',
    company: 'Tynor Orthotics',
    generic: 'Lumbosacral Spinal Support Belt with Rigid Aluminium Stays',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['L.S. Support Belt Small (28-32 Inch)', 'L.S. Support Belt Medium (32-36 Inch)', 'L.S. Support Belt Large (36-40 Inch)', 'L.S. Support Belt Extra Large (40-44 Inch)', 'L.S. Support Belt XXL (44-48 Inch)', 'L.S. Support Belt XXXL (48-52 Inch)', 'Taylor\'s Dorsolumbar Spinal Brace (Short / Long Spine)', 'Hyperextension Cash Spinal Brace Universal']
  },
  {
    brand: 'Tynor Knee Support & Hinged Knee Brace',
    company: 'Tynor Orthotics',
    generic: 'Bi-Axial Hinged & Neoprene Knee Immobilizer Support',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Open Patella Neoprene Knee Support (S)', 'Open Patella Neoprene Knee Support (M)', 'Open Patella Neoprene Knee Support (L)', 'Open Patella Neoprene Knee Support (XL)', 'ROM Hinged Knee Brace with Dial Angle Lock Universal', 'Knee Immobilizer 14 Inch (Short) (M/L)', 'Knee Immobilizer 19 Inch (Medium) (M/L)', 'Knee Immobilizer 22 Inch (Long) (L/XL)']
  },
  {
    brand: 'Tynor Ankle Brace & Stirrup',
    company: 'Tynor Orthotics',
    generic: 'Ankle Support Binder with Figure-of-8 Strap & Air-Cast Stirrup',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Ankle Binder with Compression Strap (S)', 'Ankle Binder with Compression Strap (M)', 'Ankle Binder with Compression Strap (L)', 'Ankle Binder with Compression Strap (XL)', 'Air-Cast Ankle Stirrup Splint Universal', 'Lace-Up Ankle Support with Lateral Stays (M/L)']
  },
  {
    brand: 'Tynor Wrist & Forearm Cock-Up Splint',
    company: 'Tynor Orthotics',
    generic: 'Carpal Tunnel Syndrome Rigid Palmar Wrist Brace',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Wrist Splint with Thumb Spica Left Hand (S/M)', 'Wrist Splint with Thumb Spica Right Hand (S/M)', 'Wrist Splint with Thumb Spica Left Hand (L/XL)', 'Wrist Splint with Thumb Spica Right Hand (L/XL)', 'Cock-Up Forearm Splint Palmar Rigid (Left S/M/L)', 'Cock-Up Forearm Splint Palmar Rigid (Right S/M/L)', 'Tennis Elbow Support Band with Pressure Pad Universal']
  },
  {
    brand: 'Tynor Arm Sling & Shoulder Immobilizer',
    company: 'Tynor Orthotics',
    generic: 'Pouch Arm Sling & Abduction Pillow Shoulder Support',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Pouch Arm Sling Breathable Mesh Small (S)', 'Pouch Arm Sling Breathable Mesh Medium (M)', 'Pouch Arm Sling Breathable Mesh Large (L)', 'Pouch Arm Sling Breathable Mesh XL', 'Shoulder Immobilizer with Chest Band (S/M/L/XL)', 'Shoulder Abduction Pillow 15-30 Degree Universal', 'Clavicle Fracture Brace with Figure-8 Buckle (S/M/L/XL)']
  },
  {
    brand: 'Tynor Finger Splint Assortment',
    company: 'Tynor Orthotics',
    generic: 'Malleable Aluminium & Foam Finger Protection Splints',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Mallet Finger Splint (Size 1, 2, 3, 4, 5)', 'Frog Finger Splint (Small, Medium, Large)', 'Finger Extension Cot Splint (Small, Medium, Large)', 'Finger Base Protector Splint']
  },
  {
    brand: 'Tynor Abdominal & Rib Belts',
    company: 'Tynor Orthotics',
    generic: 'Post-Operative Compression & Fracture Rib Binder',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Abdominal Belt 8 Inch (S/M/L/XL/XXL)', 'Abdominal Belt 10 Inch Post-Cesarean / Hernia (S/M/L/XL)', 'Thoracic Rib Belt for Male (S/M/L/XL)', 'Thoracic Rib Belt for Female (S/M/L/XL)', 'Inguinal Hernia Belt Single Sided (S/M/L/XL)', 'Inguinal Hernia Belt Double Sided Bilateral (S/M/L/XL)']
  },
  {
    brand: 'Tynor Walker Boot & Fracture Boot',
    company: 'Tynor Orthotics',
    generic: 'Rigid CAM Walker Boot with Pneumatic Air Pump',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Fixed CAM Walker Boot Short (S, M, L)', 'Fixed CAM Walker Boot Long (S, M, L)', 'Air CAM Pneumatic Walker Boot with Inbuilt Pump (Small)', 'Air CAM Pneumatic Walker Boot with Inbuilt Pump (Medium)', 'Air CAM Pneumatic Walker Boot with Inbuilt Pump (Large)']
  },
  {
    brand: 'Flamingo / Tynor Silicone Foot Care',
    company: 'Flamingo / Tynor',
    generic: '100% Medical Grade Silicone Heel Cups & Orthotic Insoles',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Silicone Heel Cup Spur Cushion (Small Pair)', 'Silicone Heel Cup Spur Cushion (Medium Pair)', 'Silicone Heel Cup Spur Cushion (Large Pair)', 'Full Length Silicone Gel Insole with Metatarsal Pad (Pair S/M/L/XL)', 'Medial Longitudinal Arch Support Gel Cushion (Pair)', 'Silicone Toe Separator / Bunion Relief Splint (Pair)']
  },
  {
    brand: 'Tynor Traction Kit & Pelvic Belt',
    company: 'Tynor Orthotics',
    generic: 'Cervical, Pelvic & Skin Traction Weight Kits',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Skin Traction Kit with Adhesive Extension Straps (Adult)', 'Skin Traction Kit with Adhesive Extension Straps (Child)', 'Pelvic Traction Belt (Small / Medium / Large)', 'Over-Door Cervical Traction Head Halter Set with Water Weight Bag']
  },
  {
    brand: 'Medline / Vissco Mobility Aids',
    company: 'Medline Medical',
    generic: 'Aluminium Lightweight Adjustable Rehabilitation Mobility Aids',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Aluminium Axillary Underarm Crutches Pair (Small 4\'6"-5\'2")', 'Aluminium Axillary Underarm Crutches Pair (Medium 5\'2"-5\'10")', 'Aluminium Axillary Underarm Crutches Pair (Large 5\'10"-6\'6")', 'Elbow Forearm Crutches Height Adjustable Pair', 'Quad Walking Cane with 4-Prong Base Chrome Finish', 'Single Point Push-Button Adjustable Aluminium Walking Stick', 'Tripod Walking Cane with Folding Rest Seat', 'Folding Aluminium Lightweight Walker Frame without Wheels', 'Rollator Walker Frame with 4 Wheels, Hand Brakes & Padded Seat', 'Standard Foldable Chrome Steel Wheelchair 18 Inch Seat', 'Commode Wheelchair with Removable Pot & Flip-Up Armrests']
  },
  {
    brand: 'Jobst / Sigvaris T.E.D. Anti-Embolism Stockings',
    company: 'Jobst Medical',
    generic: 'Graduated Compression Anti-Thromboembolic Stockings',
    category: 'Orthopedic & Rehabilitation Care',
    forms: ['Knee-High Class 1 (18-21 mmHg) Small (Short/Regular)', 'Knee-High Class 1 (18-21 mmHg) Medium (Short/Regular)', 'Knee-High Class 1 (18-21 mmHg) Large (Short/Regular)', 'Knee-High Class 2 (23-32 mmHg) Medium', 'Knee-High Class 2 (23-32 mmHg) Large', 'Thigh-High with Waist Belt Class 1 (18-21 mmHg) Medium', 'Thigh-High with Waist Belt Class 1 (18-21 mmHg) Large']
  }
];

/**
 * Builds the ultra-comprehensive 5,000+ medicine master library
 */
function generateExpandedCentralMedicineCatalog(): CentralMedicine[] {
  const catalog: CentralMedicine[] = [];
  const seenIds = new Set<string>();

  // 1. First add all defined brand seeds (approx 600 specific high-fidelity formulations)
  for (const seed of POPULAR_PHARMA_SEEDS) {
    for (const form of seed.forms) {
      const fullName = `${seed.brand} ${form}`.trim();
      const rawId = `cmed_${seed.company}_${seed.brand}_${form}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      if (!seenIds.has(rawId)) {
        seenIds.add(rawId);
        catalog.push({
          id: rawId,
          name: fullName,
          brandName: seed.brand,
          genericFormula: seed.generic,
          company: seed.company,
          category: seed.category,
          source: 'SYSTEM_PRESET',
          assignedTenantIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        });
      }
    }
  }

  // 1.5 Add rich Surgical & Orthopedic Care seed catalog
  for (const seed of SURGICAL_AND_ORTHO_SEEDS) {
    for (const form of seed.forms) {
      const fullName = `${seed.brand} - ${form}`.trim();
      const rawId = `cmed_${seed.company}_${seed.brand}_${form}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      if (!seenIds.has(rawId)) {
        seenIds.add(rawId);
        catalog.push({
          id: rawId,
          name: fullName,
          brandName: seed.brand,
          genericFormula: seed.generic,
          company: seed.company,
          category: seed.category,
          dosageForm: seed.category.includes('Surgical') ? 'Surgical Item' : 'Orthopedic Device',
          unit: 'Piece',
          source: 'SYSTEM_PRESET',
          assignedTenantIds: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        });
      }
    }
  }

  // 2. Expand across all top companies and standardized formulations to reach 5,000+ catalog entries
  let genIndex = 0;
  for (const company of ADDITIONAL_MAPPING.companies) {
    for (const genericItem of ADDITIONAL_MAPPING.generics) {
      for (const variant of genericItem.variants) {
        genIndex++;
        // Generate authentic pharma naming pattern (e.g. "Getz-Cefi 400mg Capsule", "GSK-Para 500mg Tablet")
        const brandName = `${company.split(' ')[0]}-${genericItem.brandPrefix}`;
        const fullName = `${brandName} ${variant}`.trim();

        const rawId = `cmed_${company}_${genericItem.brandPrefix}_${variant}_${genIndex}`
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        if (!seenIds.has(rawId)) {
          seenIds.add(rawId);
          catalog.push({
            id: rawId,
            name: fullName,
            brandName,
            genericFormula: genericItem.generic,
            company,
            category: genericItem.category,
            source: 'SYSTEM_PRESET',
            assignedTenantIds: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          });
        }
      }
    }
  }

  return catalog;
}

export const INITIAL_CENTRAL_MEDICINE_CATALOG: CentralMedicine[] = generateExpandedCentralMedicineCatalog();
