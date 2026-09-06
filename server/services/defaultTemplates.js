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
<div class="inv-brand-details">
  <div class="inv-company-name">{{agency_name}}</div>
  <div class="inv-company-line">{{agency_address}}</div>
  <div class="inv-company-line"><span>Tél</span> {{agency_phone}}</div>
  <div class="inv-company-line"><span>Email</span> {{agency_email}}</div>
</div>
<div class="inv-title-block">
  <div class="inv-doc-label">FACTURE</div>
  <div class="inv-meta"><span>Facture N°</span> : <strong>{{invoice_number}}</strong></div>
  <div class="inv-meta"><span>Date</span> : <strong>{{invoice_date}}</strong></div>
</div>
`;

export const DEFAULT_INVOICE_BODY = `
<div class="inv-client">
  <div class="inv-line"><span>Société / Client</span> : <strong>{{customer_name}}</strong></div>
  <div class="inv-line"><span>Adresse</span> : {{customer_address}}</div>
  <div class="inv-line"><span>Tél</span> : {{customer_phone}} &nbsp;&nbsp; <span>Email</span> : {{customer_email}}</div>
  <div class="inv-line"><span>ICE</span> : {{customer_tax_id}}</div>
</div>

{{invoice_rental_section_html}}

<table class="inv-table">
  <thead>
    <tr>
      <th class="col-desc">Description</th>
      <th class="col-qty">Quantité</th>
      <th class="col-tva">TVA</th>
      <th class="col-price">Prix unitaire TTC</th>
      <th class="col-amount">Montant</th>
    </tr>
  </thead>
  <tbody>
    {{invoice_items_rows_html}}
  </tbody>
</table>

<div class="inv-bottom">
  <div class="inv-payment-block">
    <p class="inv-words">{{amount_in_words_banner}}</p>
    <div class="inv-pay-line"><span>Mode de règlement</span> : <strong>{{payment_method}}</strong></div>
    <div class="inv-pay-line"><span>Date d'échéance</span> : <strong>{{due_date}}</strong></div>
    <div class="inv-pay-line"><span>Montant déjà payé</span> : <strong>{{amount_paid}}</strong></div>
    <div class="inv-pay-line"><span>Solde restant</span> : <strong>{{balance_due}}</strong></div>
  </div>
  <div class="inv-side">
    <div class="inv-totals">
      <div class="inv-totals-row"><span>Remise</span><strong>{{discount_total}}</strong></div>
      <div class="inv-totals-row"><span>Total net HT</span><strong>{{subtotal}}</strong></div>
      <div class="inv-totals-row"><span>Total TVA</span><strong>{{tax_total}}</strong></div>
      <div class="inv-totals-row inv-totals-main"><span>Montant total TTC</span><strong>{{total_price}}</strong></div>
    </div>
    <div class="inv-stamp">{{company_signature_html}}</div>
  </div>
</div>
`;

export const DEFAULT_INVOICE_FOOTER = `
<div class="inv-footer">
  <div class="inv-footer-bar">
    <div class="inv-footer-item"><span class="inv-ico">☎</span>{{agency_phone}}</div>
    <div class="inv-footer-item"><span class="inv-ico">✉</span>{{agency_email}}</div>
    <div class="inv-footer-item"><span class="inv-ico">⌖</span>{{agency_address}}</div>
  </div>
  <div class="inv-footer-legal">
    <span>N° I.C.E : {{agency_ice}}</span>
    <span class="inv-legal-sep">—</span>
    <span>IF : {{agency_if}}</span>
    <span class="inv-legal-sep">—</span>
    <span>RC : {{agency_rc}}</span>
  </div>
</div>
`;

export const DEFAULT_INVOICE_CUSTOM_CSS = `
body.doc-invoice {
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
  color: #111827;
}
body.doc-invoice .doc-header {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "logo brand title";
  align-items: start;
  gap: 10px 16px;
  border-bottom: 2px solid #111827 !important;
  padding-bottom: 12px !important;
  margin-bottom: 14px !important;
}
body.doc-invoice .doc-logo {
  grid-area: logo;
  max-height: 62px !important;
  margin: 0 !important;
}
.inv-brand-details { grid-area: brand; min-width: 0; padding-top: 2px; }
.inv-company-name {
  font-size: 13px; font-weight: 800; color: #111827; margin: 0 0 4px; letter-spacing: 0.01em;
}
.inv-company-line { font-size: 10px; line-height: 1.45; color: #4b5563; margin: 0; }
.inv-company-line span { color: #6b7280; margin-right: 4px; font-weight: 600; }
.inv-title-block { grid-area: title; text-align: right; min-width: 175px; }
.inv-doc-label {
  font-size: 28px; font-weight: 800; letter-spacing: 0.14em; color: #8f1f1f; line-height: 1; margin: 0 0 10px;
}
.inv-meta { font-size: 11px; color: #111827; margin-top: 4px; }
.inv-meta span { color: #6b7280; font-weight: 600; }
.inv-client {
  margin: 0 0 12px; padding: 10px 12px; border: 1px solid #e5e7eb; background: #fafafa;
  font-size: 11px; line-height: 1.55;
}
.inv-line { margin: 2px 0; }
.inv-line span { color: #6b7280; font-weight: 600; }
.inv-rental {
  margin: 0 0 12px; padding: 9px 11px; border: 1px solid #ecdede; border-left: 3px solid #8f1f1f; background: #fcf8f8;
}
.inv-rental-title {
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #8f1f1f; margin: 0 0 6px;
}
.inv-rental-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; font-size: 10px; }
.inv-rental-grid span { display: block; color: #6b7280; font-size: 9px; font-weight: 600; }
.inv-rental-grid strong { color: #111827; font-weight: 700; }
.inv-table { width: 100%; border-collapse: collapse; margin: 0 0 12px !important; font-size: 11px; }
.inv-table th, .inv-table td {
  border: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 9px 10px !important; vertical-align: top;
}
.inv-table thead th {
  background: #111827 !important; color: #fff !important; font-weight: 700; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.inv-table tbody tr:nth-child(even) td { background: #f9fafb; }
.inv-table .col-desc { width: 40%; text-align: left; }
.inv-table .col-qty { width: 12%; text-align: right; }
.inv-table .col-tva { width: 12%; text-align: right; }
.inv-table .col-price { width: 18%; text-align: right; }
.inv-table .col-amount { width: 18%; text-align: right; }
.inv-table .num { text-align: right; white-space: nowrap; }
.inv-item-title { font-weight: 700; color: #111827; }
.inv-item-sub { color: #6b7280; font-size: 10px; margin-top: 2px; }
.inv-bottom { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px; align-items: start; margin-top: 4px; }
.inv-words {
  margin: 0 0 10px; padding: 8px 10px; border-left: 3px solid #8f1f1f; background: #f8fafc;
  font-size: 10px; font-weight: 700; text-transform: uppercase; line-height: 1.45; color: #111827;
}
.inv-pay-line { font-size: 11px; margin: 4px 0; color: #111827; }
.inv-pay-line span { color: #6b7280; font-weight: 600; }
.inv-totals { width: 100%; margin-left: auto; padding: 10px 12px; border: 1px solid #e5e7eb; background: #fff; }
.inv-totals-row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; font-size: 11px; }
.inv-totals-main {
  margin-top: 6px; padding-top: 8px; border-top: 2px solid #111827; font-size: 13px; font-weight: 800;
}
.inv-stamp { margin-top: 10px; text-align: right; min-height: 60px; }
.inv-stamp img { max-height: 84px !important; max-width: 170px !important; }
.inv-footer { margin-top: 10px; }
.inv-footer-bar {
  display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center;
  background: #111827; color: #fff; padding: 9px 12px; font-size: 9px;
}
.inv-footer-item { display: flex; align-items: center; gap: 6px; max-width: 100%; }
.inv-ico {
  display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px;
  border-radius: 50%; background: #8f1f1f; color: #fff; font-size: 8px; line-height: 1; flex-shrink: 0;
}
.inv-footer-legal {
  margin-top: 6px; text-align: center; font-size: 9px; color: #4b5563; line-height: 1.45;
}
.inv-legal-sep { margin: 0 6px; color: #9ca3af; }
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

