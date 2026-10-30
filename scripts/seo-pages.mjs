/* Writes the Google title, description and keywords of every page in Sanity
   (and hides the older blog posts from the blog page).

     node scripts/seo-pages.mjs [--dry]

   Edit the table below and run it again to change the texts in bulk; the
   same fields are editable per page in Studio -> Pages -> "Google (SEO)". */

import { existsSync } from 'node:fs';
import { createClient } from '@sanity/client';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const DRY = process.argv.includes('--dry');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

const BRAND = 'Reviva Skin & Surgery';
const TAIL = ' at Reviva, Noida & Ghaziabad. Book a consultation with our dermatologist.';

/* path: [title, description lead (TAIL is added unless the text ends with "."), keywords] */
const PAGES = {
  '/': [
    `Skin Specialist in Noida & Ghaziabad | ${BRAND}`,
    'Dermatologist-led skin, hair and laser care at Reviva Skin & Surgery Clinic, Sector 76 Noida and Raj Nagar Extension Ghaziabad. Book your consultation today.',
    ['dermatologist in Noida', 'skin specialist in Noida', 'skin clinic in Ghaziabad', 'Reviva Skin & Surgery Clinic', 'best skin doctor Noida'],
  ],
  '/about': [
    `About ${BRAND} Clinic | Dr. Aarushi Tyagi`,
    'Meet Dr. Aarushi Tyagi and the team at Reviva Skin & Surgery Clinic: dermatologist-led skin, hair, laser and aesthetic care in Noida and Ghaziabad.',
    ['Dr. Aarushi Tyagi', 'Reviva Skin & Surgery Clinic', 'dermatologist in Ghaziabad', 'skin clinic Noida'],
  ],
  '/contact': [
    'Contact Reviva Skin Clinic | Noida & Ghaziabad',
    'Book an appointment at Reviva Skin & Surgery Clinic. Call, WhatsApp or visit us in Sector 76 Noida or Raj Nagar Extension Ghaziabad. Open six days a week at each clinic.',
    ['skin clinic appointment Noida', 'dermatologist appointment Ghaziabad', 'Reviva clinic contact'],
  ],
  '/noida': [
    `Skin Clinic in Sector 76, Noida | ${BRAND}`,
    'Visit Reviva Skin & Surgery Clinic at Amarpali Silicon City, Sector 76, Noida for dermatology, hair, laser and aesthetic treatments. Call to book your consultation.',
    ['skin clinic Sector 76 Noida', 'dermatologist in Noida', 'laser clinic Noida', 'Amarpali Silicon City clinic'],
  ],
  '/ghaziabad': [
    'Skin Clinic in Raj Nagar Extension, Ghaziabad | Reviva',
    'Visit Reviva Skin & Surgery Clinic at Quantum Homes, Raj Nagar Extension, Ghaziabad for skin, hair, laser and aesthetic care. Call to book a consultation.',
    ['skin clinic Raj Nagar Extension', 'dermatologist in Ghaziabad', 'laser clinic Ghaziabad', 'skin doctor Ghaziabad'],
  ],
  '/treatment': [
    'Skin, Hair & Laser Treatments in Noida & Ghaziabad | Reviva',
    'Explore acne, pigmentation, laser hair removal, hair transplant, anti-ageing, Botox and filler treatments at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['skin treatments Noida', 'laser treatments Ghaziabad', 'cosmetic dermatology Noida', 'hair treatment Ghaziabad'],
  ],
  '/reviews': [
    `Patient Reviews | ${BRAND} Clinic Noida & Ghaziabad`,
    'Read what patients say about their skin, hair and laser treatment experience at Reviva Skin & Surgery Clinic in Noida and Ghaziabad.',
    ['Reviva clinic reviews', 'skin clinic reviews Noida', 'dermatologist reviews Ghaziabad'],
  ],
  '/blogs': [
    'Skin & Hair Care Blog | Dermatologist Guides | Reviva',
    'Dermatologist-written guides on acne, pigmentation, hair fall, laser hair reduction, anti-ageing and bridal skincare from Reviva Skin & Surgery, Noida and Ghaziabad.',
    ['skin care blog', 'dermatologist advice India', 'acne treatment guide', 'hair fall treatment guide', 'bridal skincare tips'],
  ],
  '/gallery': [
    `Before & After Results Gallery | ${BRAND}`,
    'See consented before and after results of skin, hair and laser treatments performed at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['before and after skin treatment', 'laser results Noida', 'hair transplant results Ghaziabad'],
  ],
  '/acnetreatmentgallery': [
    'Acne Treatment Before & After Photos | Reviva',
    'Real acne and acne scar treatment results from patients of Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with consent.',
    ['acne treatment before and after', 'acne scar results Noida'],
  ],
  '/botoxfillergallery': [
    'Botox & Dermal Filler Before & After | Reviva Skin Clinic',
    'Natural-looking Botox and dermal filler results from Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with patient consent.',
    ['botox before and after', 'filler results Noida', 'dermal filler gallery'],
  ],
  '/hairtransplantgallery': [
    'Hair Transplant & PRP Results Gallery | Reviva Skin Clinic',
    'Hair transplant, PRP and GFC hair restoration results from Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with consent.',
    ['hair transplant before and after', 'PRP hair results', 'hair transplant results Ghaziabad'],
  ],
  '/laserhairremovalgallery': [
    'Laser Hair Removal Results Gallery | Reviva Skin Clinic',
    'Laser hair removal and hair reduction results from patients of Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with consent.',
    ['laser hair removal before and after', 'laser hair reduction results Noida'],
  ],
  '/pigmentationgallery': [
    'Pigmentation Treatment Results Gallery | Reviva Skin Clinic',
    'Pigmentation, melasma and dark spot treatment results from Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with patient consent.',
    ['pigmentation before and after', 'melasma treatment results Noida'],
  ],
  '/skinrejunvationgallery': [
    'Skin Rejuvenation Results Gallery | Reviva Skin & Surgery',
    'Skin rejuvenation, HIFU and facial treatment results from Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with patient consent.',
    ['skin rejuvenation before and after', 'HIFU results Noida', 'anti-ageing results Ghaziabad'],
  ],
  '/xanthelesmagallery': [
    'Xanthelasma Removal Before & After | Reviva Skin Clinic',
    'Xanthelasma removal and skin treatment results from Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Photos shared with patient consent.',
    ['xanthelasma removal results', 'xanthelasma treatment Noida'],
  ],

  '/acne': [
    'Acne & Acne Scar Treatment in Ghaziabad & Noida | Reviva',
    'Clear, calmer skin with dermatologist-led medical and laser acne and acne scar care at Reviva Skin & Surgery Clinic, Ghaziabad and Noida. Book a consultation.',
    ['acne treatment in Ghaziabad', 'acne treatment in Noida', 'pimple treatment', 'acne scar treatment', 'acne specialist'],
  ],
  '/acne-treatment': [
    'Acne Treatment in Noida | Pimple & Breakout Care | Reviva',
    'Persistent pimples or cystic acne? Get a personalised, dermatologist-led acne treatment plan at Reviva Skin & Surgery Clinic, Sector 76 Noida and Ghaziabad.',
    ['acne treatment in Noida', 'pimple treatment Noida', 'cystic acne treatment', 'best acne doctor Noida'],
  ],
  '/acne-scars': [
    'Acne Scar Removal in Noida & Ghaziabad | Reviva Skin Clinic',
    'Treat pitted, boxcar and ice-pick acne scars with advanced laser and skin-resurfacing options at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['acne scar removal Noida', 'acne scar treatment Ghaziabad', 'laser for acne scars', 'pitted scars treatment'],
  ],
  '/alopecia-treatment': [
    'Alopecia & Hair Loss Treatment in Ghaziabad | Reviva',
    'Patchy or sudden hair loss? Dermatologist-led alopecia diagnosis and treatment at Reviva Skin & Surgery Clinic, Ghaziabad and Noida. Book a consultation.',
    ['alopecia treatment Ghaziabad', 'alopecia areata treatment', 'hair loss treatment Noida', 'patchy hair loss'],
  ],
  '/antiageing': [
    'Anti-Ageing & Skin Rejuvenation in Noida & Ghaziabad | Reviva',
    'Medical-grade anti-ageing: HIFU, RF tightening, fillers, Botox and rejuvenation treatments at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['anti-ageing treatment Noida', 'skin rejuvenation Ghaziabad', 'wrinkle treatment', 'skin tightening Noida'],
  ],
  '/birth-mark': [
    'Birthmark Removal in Noida & Ghaziabad | Laser | Reviva',
    'Safe laser birthmark and dark mark removal with diode and Nd:YAG lasers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a skin assessment.',
    ['birthmark removal Noida', 'laser birthmark removal Ghaziabad', 'mole and mark removal'],
  ],
  '/body-polishing': [
    'Body Polishing in Noida & Ghaziabad | Reviva Skin Clinic',
    'Exfoliate, brighten and smooth your skin with dermatologist-supervised body polishing at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['body polishing Noida', 'body polishing Ghaziabad', 'full body skin brightening'],
  ],
  '/butox': [
    'Botox & Dermal Fillers in Noida & Ghaziabad | Reviva',
    'Subtle, natural-looking Botox and dermal filler treatments by a board-certified dermatologist at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['Botox in Noida', 'dermal fillers Ghaziabad', 'Botox for wrinkles', 'filler treatment Noida'],
  ],
  '/cheek-enhancement': [
    'Cheek Enhancement with Fillers in Noida | Reviva Skin Clinic',
    'Restore volume and define your cheekbones with non-surgical cheek filler treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['cheek fillers Noida', 'cheek enhancement Ghaziabad', 'non-surgical cheek lift'],
  ],
  '/dark-circles-treatment': [
    'Dark Circles Treatment in Noida & Ghaziabad | Reviva',
    'Reduce dark circles and tired-looking eyes with dermatologist-led under-eye treatments at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['dark circles treatment Noida', 'under eye dark circles removal', 'dark circles Ghaziabad'],
  ],
  '/dark-lips-treatment': [
    'Dark Lips Treatment in Noida & Ghaziabad | Reviva Skin Clinic',
    'Lighten and even out dark, pigmented lips with safe dermatologist-led treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['dark lips treatment Noida', 'lip pigmentation treatment', 'lip lightening Ghaziabad'],
  ],
  '/double-chin-reduction': [
    'Double Chin Reduction in Noida & Ghaziabad | Reviva',
    'Define your jawline with non-surgical double chin reduction at Reviva Skin & Surgery Clinic, Sector 76 Noida and Raj Nagar Extension Ghaziabad.',
    ['double chin reduction Noida', 'non-surgical chin fat treatment', 'jawline contouring Ghaziabad'],
  ],
  '/dutexome-mesotherapy': [
    'DUTEXOME Mesotherapy for Hair in Ghaziabad & Noida | Reviva',
    'DUTEXOME mesotherapy supports scalp health and hair growth. Dermatologist-led hair rejuvenation at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['DUTEXOME mesotherapy', 'hair mesotherapy Ghaziabad', 'scalp mesotherapy Noida'],
  ],
  '/earlobe-repair': [
    'Earlobe Repair in Noida & Ghaziabad | Reviva Skin Clinic',
    'Torn, stretched or split earlobes? Minor-surgery earlobe repair by a dermatologist at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['earlobe repair Noida', 'torn earlobe surgery', 'earlobe repair Ghaziabad'],
  ],
  '/eyebrows-microblading': [
    'Eyebrow Microblading in Noida & Ghaziabad | Reviva',
    'Fuller, defined brows with semi-permanent eyebrow microblading at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a consultation.',
    ['eyebrow microblading Noida', 'microblading Ghaziabad', 'semi-permanent eyebrows'],
  ],
  '/face-lift-fillers': [
    'Non-Surgical Face Lift with Fillers in Noida | Reviva',
    'Restore facial volume and lift sagging skin without surgery using a filler face lift at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['non-surgical face lift Noida', 'face lift fillers Ghaziabad', 'liquid facelift'],
  ],
  '/female-hair-thinning': [
    'Female Hair Thinning Treatment in Ghaziabad & Noida | Reviva',
    'Thinning hair or widening parting? Dermatologist-led diagnosis and treatment for female hair loss at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['female hair thinning treatment', 'hair loss in women Ghaziabad', 'hair fall treatment Noida'],
  ],
  '/fire-and-ice-facial': [
    'Fire & Ice Facial in Noida & Ghaziabad | Reviva Skin Clinic',
    'Resurface, refresh and brighten dull skin with a Fire & Ice facial at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['fire and ice facial Noida', 'fire and ice facial Ghaziabad', 'skin resurfacing facial'],
  ],
  '/freckles': [
    'Freckles Removal in Noida & Ghaziabad | Laser | Reviva',
    'Safe laser freckle reduction with diode and Nd:YAG lasers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a skin assessment.',
    ['freckles removal Noida', 'laser freckle removal Ghaziabad', 'freckle treatment'],
  ],
  '/gfc-therapy': [
    'GFC Hair Therapy in Ghaziabad & Noida | Hair Growth | Reviva',
    'GFC (Growth Factor Concentrate) therapy supports hair regrowth and density. Available at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['GFC therapy Ghaziabad', 'GFC hair treatment Noida', 'growth factor hair therapy'],
  ],
  '/growth-factors-mesotherapy': [
    'Growth Factor Mesotherapy for Hair | Ghaziabad & Noida | Reviva',
    'Non-surgical growth factor mesotherapy to support healthier, fuller hair at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['growth factor mesotherapy', 'hair mesotherapy Ghaziabad', 'hair regrowth Noida'],
  ],
  '/hair': [
    'Hair Transplant & PRP Therapy in Ghaziabad & Noida | Reviva',
    'FUE hair transplant, GFC, PRP, QR678 and mesotherapy for hair loss at Reviva Skin & Surgery Clinic, Ghaziabad and Noida. Book a hair consultation.',
    ['hair transplant Ghaziabad', 'PRP hair treatment Noida', 'hair fall treatment', 'hair loss clinic Noida'],
  ],
  '/hair-transplant': [
    'Hair Transplant in Ghaziabad & Noida | FUE | Reviva',
    'Permanent hair restoration with surgical hair transplant planned by a dermatologist at Reviva Skin & Surgery Clinic, Ghaziabad and Noida.',
    ['hair transplant Ghaziabad', 'FUE hair transplant Noida', 'baldness treatment', 'hair transplant cost Ghaziabad'],
  ],
  '/hifu-face-lift': [
    'HIFU Face Lift in Noida & Ghaziabad | Skin Tightening | Reviva',
    'Non-surgical HIFU (high-intensity focused ultrasound) face lift to tighten and lift skin at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['HIFU face lift Noida', 'HIFU treatment Ghaziabad', 'non-surgical skin tightening'],
  ],
  '/hifu-treatment-in-noida': [
    'HIFU Treatment in Noida | Non-Surgical Skin Tightening | Reviva',
    'Firmer, lifted skin without surgery. HIFU skin tightening in Sector 76 Noida at Reviva Skin & Surgery Clinic. Book a consultation.',
    ['HIFU treatment in Noida', 'HIFU skin tightening Noida', 'non-surgical face lift Noida', 'HIFU cost Noida'],
  ],
  '/hydra-facial': [
    'Hydrafacial in Noida & Ghaziabad | Deep Cleansing | Reviva',
    'Deeply cleanse, exfoliate and hydrate with a medical-grade Hydrafacial at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['hydrafacial in Noida', 'hydrafacial Ghaziabad', 'hydrafacial cost Noida', 'deep cleansing facial'],
  ],
  '/jawline-enhancement': [
    'Jawline Enhancement with Fillers in Noida | Reviva',
    'Sharper, balanced jawline with non-surgical jawline fillers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a facial assessment.',
    ['jawline fillers Noida', 'jawline enhancement Ghaziabad', 'non-surgical jawline contouring'],
  ],
  '/laser-for-pigmentation': [
    'Laser Pigmentation Treatment in Noida & Ghaziabad | Reviva',
    'Reduce dark spots and uneven skin tone with diode and Nd:YAG laser pigmentation treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['laser for pigmentation Noida', 'dark spot laser Ghaziabad', 'pigmentation laser treatment'],
  ],
  '/laser-hair-reduction': [
    'Laser Hair Reduction in Noida & Ghaziabad | Reviva',
    'Long-lasting reduction of unwanted body and facial hair with USFDA-approved laser at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['laser hair reduction Noida', 'laser hair reduction Ghaziabad', 'laser hair reduction cost', 'unwanted hair removal'],
  ],
  '/laser-hair-removal': [
    'Laser Hair Removal in Noida & Ghaziabad | Diode & Nd:YAG',
    'Permanent-reduction laser hair removal with diode and Nd:YAG lasers at Reviva Skin & Surgery Clinic, Raj Nagar Extension and Sector 76 Noida.',
    ['laser hair removal Noida', 'laser hair removal Ghaziabad', 'diode laser hair removal', 'full body laser hair removal'],
  ],
  '/lip-fillers': [
    'Lip Fillers in Noida & Ghaziabad | Natural Lip Shape | Reviva',
    'Enhance lip shape, volume and symmetry naturally with lip fillers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['lip fillers Noida', 'lip filler Ghaziabad', 'lip enhancement', 'lip filler cost Noida'],
  ],
  '/lumiere-glow-ritual': [
    'Lumière Glow Ritual Facial in Noida & Ghaziabad | Reviva',
    'A luxury skin revitalisation facial to restore glow and hydration at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['glow facial Noida', 'skin revitalisation Ghaziabad', 'luxury facial Noida'],
  ],
  '/medi-facials': [
    'Medi Facials in Noida & Ghaziabad | Medical-Grade | Reviva',
    'Medical-grade facials to improve skin health, hydration and texture, performed at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['medi facial Noida', 'medical facial Ghaziabad', 'medifacial treatment'],
  ],
  '/melasma-treatment': [
    'Melasma Treatment in Noida & Ghaziabad | Reviva Skin Clinic',
    'Dermatologist-led melasma treatment for stubborn dark patches on cheeks and forehead at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['melasma treatment Noida', 'melasma Ghaziabad', 'dark patches on face treatment'],
  ],
  '/neck-lines-treatment': [
    'Neck Lines Treatment in Noida & Ghaziabad | Reviva',
    'Soften horizontal neck lines and crepey skin with non-surgical neck rejuvenation at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['neck lines treatment Noida', 'neck wrinkles treatment', 'neck rejuvenation Ghaziabad'],
  ],
  '/non-surgical-rhinoplasty': [
    'Non-Surgical Nose Job (Rhinoplasty) in Noida | Reviva',
    'Refine your nose shape without surgery using filler rhinoplasty at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a consultation.',
    ['non-surgical rhinoplasty Noida', 'nose filler Ghaziabad', 'liquid rhinoplasty'],
  ],
  '/oxygeneo-facial': [
    'OxyGeneo Facial in Noida & Ghaziabad | Oxygenating | Reviva',
    'Exfoliate, oxygenate and nourish your skin with the OxyGeneo facial at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['OxyGeneo facial Noida', 'oxygen facial Ghaziabad', 'OxyGeneo treatment'],
  ],
  '/pigmentation-treatment': [
    'Pigmentation Treatment in Noida & Ghaziabad | Dark Spots | Reviva',
    'Treat dark spots, patches and uneven skin tone with dermatologist-led pigmentation treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['pigmentation treatment Noida', 'dark spots removal Ghaziabad', 'skin pigmentation specialist'],
  ],
  '/prx-plus-treatment': [
    'PRX Plus Skin Treatment in Noida & Ghaziabad | Reviva',
    'PRX Plus improves skin quality, firmness and tone without needles or downtime. Available at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['PRX Plus treatment Noida', 'PRX-T33 Ghaziabad', 'skin booster peel'],
  ],
  '/reviva-glow-infusion': [
    'Reviva Glow Infusion Facial in Noida & Ghaziabad | Reviva',
    'A customised skin revitalisation facial that deeply hydrates and nourishes, at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['glow infusion facial', 'hydrating facial Noida', 'skin revitalisation Ghaziabad'],
  ],
  '/rf-face-tightening': [
    'RF Face Tightening in Noida & Ghaziabad | Reviva Skin Clinic',
    'Non-invasive radiofrequency skin tightening to firm sagging skin at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['RF skin tightening Noida', 'radiofrequency face tightening Ghaziabad', 'non-surgical face tightening'],
  ],
  '/scar-excision': [
    'Scar Excision & Revision in Noida & Ghaziabad | Reviva',
    'Improve prominent, widened or raised scars with minor-surgery scar excision at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['scar excision Noida', 'scar removal surgery Ghaziabad', 'scar revision'],
  ],
  '/skin': [
    'Skin Rejuvenation Treatments in Noida & Ghaziabad | Reviva',
    'Glow, tighten and renew your skin with medical-grade rejuvenation treatments at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['skin rejuvenation Noida', 'skin glow treatment Ghaziabad', 'skin clinic Noida'],
  ],
  '/skin-brightening': [
    'Skin Brightening Treatment in Noida & Ghaziabad | Reviva',
    'Restore even tone and radiance with dermatologist-led skin brightening treatments at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['skin brightening Noida', 'skin whitening treatment Ghaziabad', 'glutathione skin brightening'],
  ],
  '/skin-tag': [
    'Mole, Wart & Skin Tag Removal in Noida & Ghaziabad | Reviva',
    'Quick, safe laser removal of moles, warts and skin tags at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a skin check.',
    ['skin tag removal Noida', 'wart removal Ghaziabad', 'mole removal laser'],
  ],
  '/stretch-marks': [
    'Stretch Marks Removal in Noida & Ghaziabad | Laser | Reviva',
    'Fade stretch marks with dermatologist-led laser treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a skin assessment.',
    ['stretch marks removal Noida', 'stretch marks treatment Ghaziabad', 'laser for stretch marks'],
  ],
  '/tattoo': [
    'Laser Tattoo Removal in Noida & Ghaziabad | Reviva',
    'Safe laser tattoo removal with diode and Nd:YAG lasers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a consultation.',
    ['tattoo removal Noida', 'laser tattoo removal Ghaziabad', 'tattoo removal cost'],
  ],
  '/thread-lift': [
    'Thread Lift in Noida & Ghaziabad | Non-Surgical Lift | Reviva',
    'Lift and reposition sagging skin with a minimally invasive thread lift at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['thread lift Noida', 'PDO thread lift Ghaziabad', 'non-surgical face lift'],
  ],
  '/under-eye-fillers': [
    'Under Eye Fillers in Noida & Ghaziabad | Tear Trough | Reviva',
    'Soften hollows and dark under-eye shadows with tear trough fillers at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['under eye fillers Noida', 'tear trough filler Ghaziabad', 'under eye hollows treatment'],
  ],
  '/underarm': [
    'Underarm Lightening in Noida & Ghaziabad | Reviva Skin Clinic',
    'Even-toned, smooth underarms with safe dermatologist-led underarm pigmentation treatment at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['underarm lightening Noida', 'dark underarm treatment Ghaziabad', 'underarm pigmentation'],
  ],
  '/wrinkle-reduction': [
    'Wrinkle Reduction in Noida & Ghaziabad | Reviva Skin Clinic',
    'Soften fine lines and wrinkles with non-surgical wrinkle reduction at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.',
    ['wrinkle reduction Noida', 'anti wrinkle treatment Ghaziabad', 'fine lines treatment'],
  ],
  '/xanthelasma-removal': [
    'Xanthelasma Removal in Noida & Ghaziabad | Reviva Skin Clinic',
    'Remove yellowish xanthelasma patches around the eyes safely at Reviva Skin & Surgery Clinic, Noida and Ghaziabad. Book a consultation.',
    ['xanthelasma removal Noida', 'xanthelasma treatment Ghaziabad', 'eyelid cholesterol patches'],
  ],

  '/privacy': [`Privacy Policy | ${BRAND} Clinic`, 'How Reviva Skin & Surgery Clinic collects, uses and protects your personal and medical information. Read our privacy policy.', []],
  '/cookie': [`Cookie Policy | ${BRAND} Clinic`, 'How the Reviva Skin & Surgery Clinic website uses cookies to improve the site and analyse usage, and how you can control them.', []],
  '/norefundpolicy': [`No Refund Policy | ${BRAND} Clinic`, 'Payment and no-refund terms for consultations, treatments, packages and products at Reviva Skin & Surgery Clinic, Noida and Ghaziabad.', []],
  '/patientdata': [`Patient Data Protection Policy | ${BRAND}`, 'Reviva Skin & Surgery Clinic does not share, sell or disclose patient records, photos or contact details. Read our patient data protection policy.', []],
  '/treatmentdisclaimer': [`Treatment Risk Disclaimer | ${BRAND}`, 'Understand the possible risks and individual results of medical and aesthetic procedures at Reviva Skin & Surgery Clinic before you book.', []],
  '/sitemap': [`Website Sitemap | ${BRAND} Clinic`, 'Find every page of the Reviva Skin & Surgery Clinic website: treatments, galleries, clinic locations, blog and contact details for Noida and Ghaziabad.', []],
};

const withTail = (d) => (d.endsWith('.') ? d : d + TAIL);

const pages = await client.fetch(`*[_type == "page" && !(_id in path("drafts.**"))]{ _id, path }`);
const byPath = new Map(pages.map((p) => [p.path, p._id]));
const missing = pages.filter((p) => !PAGES[p.path]).map((p) => p.path);
if (missing.length) console.log('No SEO text for:', missing.join(', '));

const tx = client.transaction();
let bad = 0;
for (const [path, [title, description, keywords]] of Object.entries(PAGES)) {
  const id = byPath.get(path);
  if (!id) {
    console.log('Page not found:', path);
    continue;
  }
  const d = withTail(description);
  if (title.length > 65 || d.length < 110 || d.length > 165) {
    bad++;
    console.log(`length? ${path}: title ${title.length}, description ${d.length}`);
  }
  tx.patch(id, (p) => p.set({ title, metaDescription: d, ...(keywords.length ? { keywords } : {}) }));
}

// Blog page: only the posts imported from the WordPress blog stay in the list.
const old = await client.fetch(`*[_type == "post" && !(_id match "wp-post-*") && !(_id in path("drafts.**"))]._id`);
old.forEach((id) => tx.patch(id, (p) => p.set({ hideFromBlog: true })));
console.log(`${Object.keys(PAGES).length} pages, ${old.length} older posts hidden from the blog, ${bad} length warnings`);

if (!DRY) {
  await tx.commit();
  console.log('Saved.');
}
