/**
 * Default rental contract — mapped from the agency CONTRAT-WORD template (French A4).
 * Placeholders use {{snake_case}} keys from templateEngine.buildTemplateVariables.
 */
import { DEFAULT_CONTRACT_TERMS_CSS } from './rentalTermsConditions.js';

export { DEFAULT_CONTRACT_TERMS_HTML } from './rentalTermsConditions.js';

export const DEFAULT_CONTRACT_CUSTOM_CSS = `
  .doc-page { padding: 8mm 9mm !important; font-size: 8.5pt !important; line-height: 1.25 !important; }
  .doc-header { border-bottom: 2px solid #E62117 !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
  .doc-footer { margin-top: 8px !important; padding-top: 6px !important; font-size: 7.5pt !important; }
  h1 { font-size: 13pt !important; color: #E62117 !important; margin: 0 0 4px !important; }
  h2 { font-size: 9.5pt !important; color: #E62117 !important; margin: 8px 0 4px !important; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #E62117; padding-bottom: 2px; }
  table { margin: 4px 0 !important; }
  th, td { border: 1px solid #ccc !important; padding: 2px 5px !important; font-size: 8pt !important; }
  .brand-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .brand-name { font-size: 14pt; font-weight: 800; color: #E62117; letter-spacing: 0.02em; }
  .brand-meta { text-align: right; font-size: 8pt; color: #333; line-height: 1.35; }
  .contract-no { display: inline-block; border: 1.5px solid #E62117; border-radius: 8px; padding: 3px 10px; font-weight: 700; color: #E62117; margin-top: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .check-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px 8px; font-size: 7.5pt; }
  .check-item::before { content: "☐ "; color: #E62117; }
  .sign-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 10px; }
  .sign-box { border: 1px solid #E62117; border-radius: 4px; min-height: 48px; padding: 4px 6px; font-size: 7.5pt; }
  .legal { font-size: 7.5pt; margin: 8px 0 4px; }
  .muted { color: #666; font-size: 7.5pt; }
  @page { size: A4; margin: 8mm; }
  @media print {
    .doc-page { padding: 0 !important; max-width: 100% !important; }
  }
${DEFAULT_CONTRACT_TERMS_CSS}
`;

export const DEFAULT_CONTRACT_HEADER = `
<div class="brand-row">
  <div>
    <div class="brand-name">{{agency_name}}</div>
    <div class="contract-no">CONTRAT N° : {{contract_number}}</div>
  </div>
  <div class="brand-meta">
    <div>Tél: {{agency_phone}}</div>
    <div>{{agency_email}}</div>
    <div>{{agency_address}}</div>
    <div class="muted">Réservation: {{reservation_id}} · {{generated_date}}</div>
  </div>
</div>
`;

export const DEFAULT_CONTRACT_BODY = `
<div class="grid-2">
  <div>
    <h2>Locataire</h2>
    <table>
      <tr><td>Nom / Prénom</td><td>{{customer_name}}</td></tr>
      <tr><td>Date de naissance</td><td>{{customer_dob}}</td></tr>
      <tr><td>Lieu de naissance</td><td>{{customer_birth_place}}</td></tr>
      <tr><td>Pièce d'identité (CIN / Passeport)</td><td>{{identity_document}}</td></tr>
      <tr><td>N° Passeport</td><td>{{passport_number}}</td></tr>
      <tr><td>Délivré le</td><td>{{identity_issued_on}}</td></tr>
      <tr><td>Permis de conduire N°</td><td>{{driver_license}}</td></tr>
      <tr><td>Permis délivré le</td><td>{{driver_license_issued_on}}</td></tr>
      <tr><td>Permis expire le</td><td>{{driver_license_expiry}}</td></tr>
      <tr><td>Adresse</td><td>{{customer_address}}</td></tr>
      <tr><td>Tél.</td><td>{{customer_phone}}</td></tr>
      <tr><td>Email</td><td>{{customer_email}}</td></tr>
      <tr><td>Nationalité</td><td>{{customer_nationality}}</td></tr>
    </table>
  </div>
  <div>
    <h2>Véhicule</h2>
    <table>
      <tr><td>Marque</td><td>{{car_make}}</td></tr>
      <tr><td>Immatriculation</td><td>{{car_registration}}</td></tr>
      <tr><td>Catégorie / Année</td><td>{{car_category}} / {{car_year}}</td></tr>
      <tr><td>Carburant</td><td>{{car_fuel}}</td></tr>
      <tr><td>Boîte de vitesses</td><td>{{car_transmission}}</td></tr>
      <tr><td>Intermédiaire / Apporteur</td><td>{{broker_referrer}}</td></tr>
      <tr><td>Chauffeur de livraison</td><td>{{vehicle_delivery_driver}}</td></tr>
      <tr><td>Livré par</td><td>{{delivered_by}}</td></tr>
      <tr><td>Réceptionné par</td><td>{{received_by}}</td></tr>
      <tr><td>Date / heure départ</td><td>{{pickup_date}}</td></tr>
      <tr><td>Date / heure retour</td><td>{{return_date}}</td></tr>
      <tr><td>Nombre de jours</td><td>{{rental_days}}</td></tr>
      <tr><td>Livrée à</td><td>{{pickup_location}}</td></tr>
      <tr><td>Retour à</td><td>{{return_location}}</td></tr>
      <tr><td>Carburant (départ)</td><td>{{fuel_level_start}}</td></tr>
      <tr><td>Km départ / retour</td><td>{{km_depart}} / {{km_retour}}</td></tr>
      <tr><td>Prix unitaire</td><td>{{price_per_day}}</td></tr>
      <tr><td>Sous-total</td><td>{{rental_price}}</td></tr>
      <tr><td>Remise</td><td>−{{discount_total}}</td></tr>
      <tr><td>Montant T.T.C.</td><td><strong>{{total_price}}</strong></td></tr>
      <tr><td>Montant de la franchise</td><td>{{franchise_amount}}</td></tr>
      <tr><td>Statut paiement</td><td>{{payment_status}}</td></tr>
    </table>
  </div>
</div>

{{second_driver_section}}

<h2>Check-list état du véhicule</h2>
<p class="muted">Cocher les éléments présents à la prise en charge. Zone AVANT / APRÈS à compléter sur place.</p>
<div class="check-grid">
  <span class="check-item">Carte grise</span>
  <span class="check-item">Vignette / talon</span>
  <span class="check-item">Visite technique</span>
  <span class="check-item">Autorisation</span>
  <span class="check-item">Assurance</span>
  <span class="check-item">Contrat</span>
  <span class="check-item">Radio</span>
  <span class="check-item">Antenne</span>
  <span class="check-item">Roue de secours + cric</span>
  <span class="check-item">Rétroviseur G</span>
  <span class="check-item">Rétroviseur D</span>
  <span class="check-item">Enjoliveurs (4)</span>
  <span class="check-item">Pneus (4)</span>
  <span class="check-item">Feux antibrouillard</span>
  <span class="check-item">Triangle</span>
  <span class="check-item">Gilet</span>
</div>

<p class="legal">Je reconnais avoir pris connaissance des conditions générales de location au verso du contrat et j'accepte de m'y conformer. Le locataire est seul responsable des infractions au code de la route.</p>

{{signatures_row_html}}
`;

export const DEFAULT_CONTRACT_FOOTER = `
<p>{{agency_name}} — {{agency_address}}</p>
<p>Tél: {{agency_phone}} | Email: {{agency_email}} | ICE / IF / RC: {{agency_tax_id}}</p>
`;

export const DEFAULT_INVOICE_HEADER = `
<div class="inv-title-block">
  <div class="inv-doc-label">FACTURE</div>
  <div class="inv-number">N° {{invoice_number}}</div>
  <div class="inv-meta-line"><span>Date de facture</span><strong>{{invoice_date}}</strong></div>
  <div class="inv-meta-line"><span>Date d'échéance</span><strong>{{due_date}}</strong></div>
</div>
`;

export const DEFAULT_INVOICE_BODY = `
<div class="inv-agency-block">
  <div class="inv-agency">{{agency_name}}</div>
  <div class="inv-muted">{{agency_address}}</div>
  <div class="inv-muted">Tél: {{agency_phone}} · {{agency_email}}</div>
  <div class="inv-muted">ICE / IF / RC: {{agency_tax_id}}</div>
</div>

<div class="inv-refs">
  <div><span>N° Réservation</span><strong>{{reservation_id}}</strong></div>
  <div><span>N° Contrat</span><strong>{{contract_number}}</strong></div>
  <div><span>N° Facture</span><strong>{{invoice_number}}</strong></div>
</div>

<div class="inv-grid">
  <section class="inv-card">
    <h2>Client</h2>
    <p class="inv-strong">{{customer_name}}</p>
    <p>{{customer_phone}}</p>
    <p>{{customer_email}}</p>
    <p>{{customer_address}}</p>
    <p class="inv-muted">Identifiant fiscal: {{customer_tax_id}}</p>
  </section>
  <section class="inv-card">
    <h2>Location</h2>
    <p class="inv-strong">{{car_make}}</p>
    <p>Immatriculation: <strong>{{car_registration}}</strong></p>
    <p>Départ : <strong>{{pickup_date}}</strong></p>
    <p>Retour : <strong>{{return_date}}</strong></p>
    <p>Durée : <strong>{{rental_days}} jour(s)</strong></p>
  </section>
</div>

<section class="inv-section">
  <h2>Détails de facturation</h2>
  <table class="inv-table">
    <thead>
      <tr>
        <th>Désignation</th>
        <th class="num">Qté / durée</th>
        <th class="num">Prix unitaire</th>
        <th class="num">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Location véhicule — {{car_make}}</td>
        <td class="num">{{rental_days}}</td>
        <td class="num">{{price_per_day}}</td>
        <td class="num">{{rental_price}}</td>
      </tr>
      <tr>
        <td>Frais livraison départ</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">{{pickup_fee}}</td>
      </tr>
      <tr>
        <td>Frais livraison retour</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">{{dropoff_fee}}</td>
      </tr>
      <tr>
        <td>Remise</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">-{{discount_total}}</td>
      </tr>
    </tbody>
  </table>
</section>

<section class="inv-totals">
  <div class="inv-totals-row"><span>Sous-total</span><strong>{{subtotal}}</strong></div>
  <div class="inv-totals-row"><span>Taxe</span><strong>{{tax_total}}</strong></div>
  <div class="inv-totals-row"><span>Remise</span><strong>-{{discount_total}}</strong></div>
  <div class="inv-totals-row inv-totals-main"><span>Total TTC</span><strong>{{total_price}}</strong></div>
  <div class="inv-totals-row"><span>Montant déjà payé</span><strong>{{amount_paid}}</strong></div>
  <div class="inv-totals-row"><span>Solde restant</span><strong>{{balance_due}}</strong></div>
</section>

<p class="inv-words">{{amount_in_words_sentence}}</p>
<p class="inv-thanks">Merci d'avoir choisi {{agency_name}}.</p>
{{signatures_row_html}}
`;

export const DEFAULT_INVOICE_FOOTER = `
<p>{{agency_name}} — {{agency_address}}</p>
<p>Tél: {{agency_phone}} | Email: {{agency_email}} | ICE / IF / RC: {{agency_tax_id}}</p>
<p>Facture {{invoice_number}} · Émise le {{invoice_date}} · Échéance {{due_date}}</p>
`;

export const DEFAULT_INVOICE_CUSTOM_CSS = `
.inv-title-block { text-align:right; margin-bottom:8px; }
.inv-doc-label { font-size:22px; font-weight:800; letter-spacing:0.08em; color:#8f1f1f; }
.inv-number { font-size:16px; font-weight:700; margin:6px 0 10px; color:#111827; }
.inv-meta-line { display:flex; justify-content:flex-end; gap:12px; font-size:12px; margin-top:3px; }
.inv-meta-line span { color:#6b7280; }
.inv-agency-block { margin:0 0 18px; padding-bottom:14px; border-bottom:2px solid #1f2937; }
.inv-agency { font-size:16px; font-weight:700; color:#111827; margin-bottom:4px; }
.inv-muted { color:#6b7280; font-size:11px; line-height:1.45; }
.inv-refs { display:flex; flex-wrap:wrap; gap:20px 28px; margin:0 0 22px; font-size:12px; }
.inv-refs span { display:block; color:#6b7280; font-size:11px; }
.inv-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:22px; }
.inv-card { border:1px solid #e5e7eb; border-radius:10px; padding:14px 16px; background:#fafafa; }
.inv-card h2, .inv-section h2 { font-size:12px; text-transform:uppercase; letter-spacing:0.06em; color:#8f1f1f; margin:0 0 10px; }
.inv-strong { font-weight:700; font-size:14px; margin:0 0 4px; }
.inv-card p { margin:2px 0; font-size:12px; line-height:1.45; }
.inv-section { margin-bottom:18px; }
.inv-table { width:100%; border-collapse:collapse; font-size:12px; }
.inv-table th { text-align:left; background:#111827; color:#fff; padding:9px 10px; font-weight:600; }
.inv-table td { padding:9px 10px; border-bottom:1px solid #e5e7eb; }
.inv-table .num { text-align:right; white-space:nowrap; }
.inv-totals { margin:18px 0 14px auto; width:280px; }
.inv-totals-row { display:flex; justify-content:space-between; gap:16px; padding:5px 0; font-size:12px; }
.inv-totals-main { border-top:2px solid #111827; margin-top:6px; padding-top:10px; font-size:14px; }
.inv-words { margin:18px 0 10px; padding:12px 14px; background:#f8fafc; border-left:3px solid #8f1f1f; font-size:12px; line-height:1.5; }
.inv-thanks { margin-top:18px; font-size:12px; color:#374151; }
`;

export default {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_CONTRACT_CUSTOM_CSS,
  DEFAULT_INVOICE_BODY,
  DEFAULT_INVOICE_HEADER,
  DEFAULT_INVOICE_FOOTER,
  DEFAULT_INVOICE_CUSTOM_CSS,
};

