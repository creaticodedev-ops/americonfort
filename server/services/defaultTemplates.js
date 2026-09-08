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
      <tr><td>Livré par</td><td>{{delivered_by}}</td></tr>
      <tr><td>Réceptionné par</td><td>{{received_by}}</td></tr>
      <tr><td>Date / heure départ</td><td>{{pickup_date}}</td></tr>
      <tr><td>Date / heure retour</td><td>{{return_date}}</td></tr>
      <tr><td>Nombre de jours</td><td>{{rental_days}}</td></tr>
      <tr><td>Livrée à</td><td>{{pickup_location}}</td></tr>
      <tr><td>Retour à</td><td>{{return_location}}</td></tr>
      <tr><td>Carburant (départ)</td><td>{{fuel_level_start}}</td></tr>
      <tr><td>Km départ / retour</td><td>{{km_depart}} / {{km_retour}}</td></tr>
      <tr><td>Prix par jour</td><td>{{price_per_day}}</td></tr>
      <tr><td>Montant location</td><td>{{rental_price}}</td></tr>
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
</div>
<div class="inv-title-block">
  <div class="inv-doc-label">FACTURE</div>
  <div class="inv-meta-card">
    <div class="inv-meta"><span>Facture N°</span><strong>{{invoice_number}}</strong></div>
    <div class="inv-meta"><span>Date</span><strong>{{invoice_date}}</strong></div>
  </div>
</div>
`;

export const DEFAULT_INVOICE_BODY = `
<section class="inv-section inv-section--client">
  <div class="inv-section-label">Client</div>
  <div class="inv-client">
    <div class="inv-line"><span>Société / Client</span><strong>{{customer_name}}</strong></div>
    <div class="inv-line"><span>Adresse</span><span class="inv-value">{{customer_address}}</span></div>
    <div class="inv-line inv-line--split">
      <span class="inv-pair"><span>Tél</span><span class="inv-value">{{customer_phone}}</span></span>
      <span class="inv-pair"><span>Email</span><span class="inv-value">{{customer_email}}</span></span>
    </div>
    <div class="inv-line"><span>ICE</span><span class="inv-value">{{customer_tax_id}}</span></div>
  </div>
</section>

{{invoice_rental_section_html}}

<section class="inv-section inv-section--items">
  <div class="inv-section-label">Détails de facturation</div>
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
</section>

<div class="inv-bottom">
  <div class="inv-payment-block">
    <div class="inv-pay-grid">
      <div class="inv-pay-line"><span>Mode de règlement</span><strong>{{payment_method}}</strong></div>
      <div class="inv-pay-line"><span>Date d'échéance</span><strong>{{due_date}}</strong></div>
      <div class="inv-pay-line"><span>Montant déjà payé</span><strong>{{amount_paid}}</strong></div>
      <div class="inv-pay-line"><span>Solde restant</span><strong class="inv-balance">{{balance_due}}</strong></div>
    </div>
    <p class="inv-words">{{amount_in_words_banner}}</p>
  </div>
  <div class="inv-side">
    <div class="inv-totals">
      <div class="inv-totals-row"><span>Remise</span><strong>{{discount_total}}</strong></div>
      <div class="inv-totals-row"><span>Total net HT</span><strong>{{subtotal}}</strong></div>
      <div class="inv-totals-row"><span>Total TVA</span><strong>{{tax_total}}</strong></div>
      <div class="inv-totals-row inv-totals-main"><span>Montant total TTC</span><strong>{{total_price}}</strong></div>
    </div>
    <div class="inv-stamp">
      <div class="inv-stamp-label">Cachet &amp; signature</div>
      <div class="inv-stamp-frame">{{company_signature_html}}</div>
    </div>
  </div>
</div>
`;

export const DEFAULT_INVOICE_FOOTER = `
<footer class="inv-footer" role="contentinfo">
  <div class="inv-footer-rule" aria-hidden="true"></div>
  <div class="inv-footer-shell">
    <div class="inv-footer-brand">
      <div class="inv-footer-name">{{agency_name}}</div>
      <div class="inv-footer-address">{{agency_address}}</div>
    </div>
    <div class="inv-footer-contact">
      <div class="inv-footer-contact-row"><span>Tél</span>{{agency_phone}}</div>
      <div class="inv-footer-contact-row"><span>Email</span>{{agency_email}}</div>
    </div>
    <div class="inv-footer-ids">
      <div class="inv-footer-id"><span>ICE</span>{{agency_ice}}</div>
      <div class="inv-footer-id"><span>IF</span>{{agency_if}}</div>
      <div class="inv-footer-id"><span>RC</span>{{agency_rc}}</div>
    </div>
  </div>
</footer>
`;

export const DEFAULT_INVOICE_CUSTOM_CSS = `
/* Premium enterprise invoice — visual layer only */
body.doc-invoice {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}
body.doc-invoice .doc-page {
  display: flex !important;
  flex-direction: column !important;
  /* Printable A4 height with Puppeteer tight margins (~8mm each side) */
  min-height: 277mm !important;
  padding: 2mm 1.5mm 0 !important;
}
body.doc-invoice .doc-header {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1.35fr) auto;
  grid-template-areas: "logo brand title";
  align-items: start;
  column-gap: 14px;
  row-gap: 0;
  border-bottom: none !important;
  padding-bottom: 0 !important;
  margin-bottom: 16px !important;
  position: relative;
  flex: 0 0 auto;
}
body.doc-invoice .doc-body {
  flex: 1 1 auto;
  min-height: 0;
}
body.doc-invoice .doc-header::after {
  content: "";
  grid-column: 1 / -1;
  display: block;
  height: 1px;
  margin-top: 14px;
  background: linear-gradient(90deg, #8f1f1f 0%, #8f1f1f 28%, #e2e8f0 28%, #e2e8f0 100%);
}
body.doc-invoice .doc-logo {
  grid-area: logo;
  max-height: 56px !important;
  width: auto;
  margin: 0 !important;
  object-fit: contain;
}
.inv-brand-details {
  grid-area: brand;
  min-width: 0;
  padding-top: 1px;
}
.inv-company-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #0f172a;
  margin: 0;
  padding-top: 6px;
}
.inv-company-line {
  display: none;
}
.inv-title-block {
  grid-area: title;
  text-align: right;
  min-width: 168px;
}
.inv-doc-label {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #8f1f1f;
  line-height: 1;
  margin: 0 0 10px;
}
.inv-meta-card {
  display: inline-flex;
  flex-direction: column;
  gap: 5px;
  min-width: 168px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
}
.inv-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10.5px;
  color: #0f172a;
}
.inv-meta span {
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.inv-meta strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.inv-section { margin: 0 0 14px; }
.inv-section-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8f1f1f;
  margin: 0 0 7px;
}
.inv-client {
  padding: 11px 13px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
  font-size: 10.5px;
  line-height: 1.55;
}
.inv-line {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 8px;
  align-items: baseline;
  margin: 0 0 4px;
}
.inv-line > span:first-child {
  color: #64748b;
  font-weight: 600;
  font-size: 9.5px;
  letter-spacing: 0.02em;
}
.inv-line strong,
.inv-value {
  color: #0f172a;
  font-weight: 600;
}
.inv-line--split {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
}
.inv-pair {
  display: inline-flex;
  gap: 8px;
  align-items: baseline;
}
.inv-pair > span:first-child {
  color: #64748b;
  font-weight: 600;
  font-size: 9.5px;
}
.inv-rental {
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fcfcfd;
}
.inv-rental-title {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8f1f1f;
  margin: 0 0 8px;
}
.inv-rental-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 14px;
  font-size: 10px;
}
.inv-rental-grid span {
  display: block;
  color: #94a3b8;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.inv-rental-grid strong {
  color: #0f172a;
  font-weight: 600;
  font-size: 10.5px;
}
.inv-table {
  width: 100%;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  margin: 0 !important;
  font-size: 10.5px;
  overflow: hidden;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px;
}
.inv-table th,
.inv-table td {
  border: none !important;
  border-bottom: 1px solid #eef2f7 !important;
  padding: 9px 11px !important;
  vertical-align: middle;
}
.inv-table tr:last-child td { border-bottom: none !important; }
.inv-table thead th {
  background: #0f172a !important;
  color: #f8fafc !important;
  font-weight: 600;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}
.inv-table tbody td { background: #ffffff; }
.inv-table tbody tr:nth-child(even) td { background: #f8fafc; }
.inv-table .col-desc { width: 38%; text-align: left; }
.inv-table .col-qty { width: 12%; text-align: right; }
.inv-table .col-tva { width: 12%; text-align: right; }
.inv-table .col-price { width: 19%; text-align: right; }
.inv-table .col-amount { width: 19%; text-align: right; }
.inv-table .num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #0f172a;
}
.inv-item-title { font-weight: 600; color: #0f172a; letter-spacing: 0.01em; }
.inv-item-sub { color: #64748b; font-size: 9.5px; margin-top: 2px; font-weight: 500; }
.inv-bottom {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 18px;
  align-items: start;
  margin-top: 14px;
  margin-bottom: 8px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.inv-words {
  margin: 10px 0 0;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #8f1f1f;
  border-radius: 8px;
  background: #fafafa;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.5;
  color: #0f172a;
}
.inv-pay-grid {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
}
.inv-pay-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10.5px;
  color: #0f172a;
}
.inv-pay-line span {
  color: #64748b;
  font-weight: 600;
  font-size: 9.5px;
  letter-spacing: 0.02em;
}
.inv-pay-line strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.inv-balance { color: #8f1f1f; }
.inv-totals {
  width: 100%;
  margin-left: auto;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.inv-totals-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 5px 0;
  font-size: 10.5px;
  color: #334155;
}
.inv-totals-row span { font-weight: 600; color: #64748b; }
.inv-totals-row strong {
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}
.inv-totals-main {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1.5px solid #0f172a;
  font-size: 12.5px;
}
.inv-totals-main span,
.inv-totals-main strong {
  color: #0f172a;
  font-weight: 800;
}
.inv-stamp {
  margin-top: 14px;
  text-align: right;
  page-break-inside: avoid;
  break-inside: avoid;
}
.inv-stamp-label {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 0 0 6px;
}
.inv-stamp-frame {
  min-height: 72px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 8px 10px;
  border: 1px dashed #e2e8f0;
  border-radius: 10px;
  background: #fff;
}
.inv-stamp-frame img,
.inv-stamp img {
  max-height: 78px !important;
  max-width: 160px !important;
  opacity: 0.96;
  display: block;
  margin-left: auto;
}
body.doc-invoice .doc-footer {
  border-top: none !important;
  margin-top: auto !important;
  padding-top: 18px !important;
  padding-bottom: 0 !important;
  flex: 0 0 auto;
  page-break-inside: avoid;
  break-inside: avoid;
}
.inv-footer {
  margin: 0;
  width: 100%;
}
.inv-footer-rule {
  height: 2px;
  margin: 0 0 10px;
  background: linear-gradient(90deg, #8f1f1f 0%, #8f1f1f 22%, #cbd5e1 22%, #e2e8f0 100%);
}
.inv-footer-shell {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1.1fr;
  gap: 12px 18px;
  align-items: start;
  padding: 10px 12px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}
.inv-footer-name {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0f172a;
  margin: 0 0 4px;
  line-height: 1.35;
}
.inv-footer-address {
  font-size: 8.5px;
  line-height: 1.45;
  color: #64748b;
  margin: 0;
}
.inv-footer-contact {
  display: grid;
  gap: 4px;
  font-size: 8.5px;
  color: #334155;
  line-height: 1.4;
}
.inv-footer-contact-row {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 6px;
  align-items: baseline;
}
.inv-footer-contact-row span,
.inv-footer-id span {
  color: #94a3b8;
  font-weight: 700;
  font-size: 7.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.inv-footer-ids {
  display: grid;
  gap: 4px;
  justify-items: start;
  font-size: 8.5px;
  color: #334155;
  line-height: 1.4;
}
.inv-footer-id {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 6px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}
@media print {
  body.doc-invoice .doc-page {
    padding: 0 !important;
    min-height: 277mm !important;
  }
  body.doc-invoice .doc-footer {
    margin-top: auto !important;
  }
}
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

