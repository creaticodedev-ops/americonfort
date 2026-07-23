/**
 * Default contract template — inspired by standard Moroccan rental contracts.
 * Admins can customize via Export Templates module.
 */
export const DEFAULT_CONTRACT_BODY = `
<h1>Vehicle Rental Contract</h1>
<p class="muted">Contract N°: <strong>{{contract_number}}</strong> &nbsp;|&nbsp; Reservation: <strong>{{reservation_id}}</strong></p>

<div class="grid-2 section">
  <div>
    <h2>Vehicle</h2>
    <table>
      <tr><td>Make</td><td>{{car_make}}</td></tr>
      <tr><td>Year</td><td>{{car_year}}</td></tr>
      <tr><td>Category</td><td>{{car_category}}</td></tr>
      <tr><td>Registration</td><td>{{car_registration}}</td></tr>
    </table>
  </div>
  <div>
    <h2>Rental Duration</h2>
    <table>
      <tr><td>Departure</td><td>{{pickup_date}}</td></tr>
      <tr><td>Return</td><td>{{return_date}}</td></tr>
      <tr><td>Duration</td><td>{{rental_days}} day(s)</td></tr>
      <tr><td>Pickup location</td><td>{{pickup_location}}</td></tr>
      <tr><td>Return location</td><td>{{return_location}}</td></tr>
    </table>
  </div>
</div>

<h2>Tenant</h2>
<table>
  <tr><td>Full Name</td><td>{{customer_name}}</td></tr>
  <tr><td>Phone</td><td>{{customer_phone}}</td></tr>
  <tr><td>Email</td><td>{{customer_email}}</td></tr>
  <tr><td>Nationality</td><td>{{customer_nationality}}</td></tr>
  <tr><td>Date of Birth</td><td>{{customer_dob}}</td></tr>
  <tr><td>Driver License</td><td>{{driver_license}}</td></tr>
  <tr><td>License Expiry</td><td>{{driver_license_expiry}}</td></tr>
  <tr><td>Passport</td><td>{{passport_number}}</td></tr>
</table>

<h2>Financial Summary</h2>
<table>
  <tr><td>Rental price</td><td>{{rental_price}}</td></tr>
  <tr><td>Pickup delivery fee</td><td>{{pickup_fee}}</td></tr>
  <tr><td>Drop-off delivery fee</td><td>{{dropoff_fee}}</td></tr>
  <tr><td>Discounts</td><td>{{discount_total}}</td></tr>
  <tr><th>Total</th><th>{{total_price}}</th></tr>
  <tr><td>Payment status</td><td>{{payment_status}}</td></tr>
</table>

<h2>Terms & Conditions</h2>
<p>The tenant confirms that all identification documents provided are valid. The vehicle must be returned in the same condition, subject to fair wear and tear. The tenant accepts liability for traffic fines, damage beyond normal use, and late returns as per agency policy.</p>
<p>The tenant has read and accepted the general rental terms and conditions. The client is solely responsible for violations of traffic laws.</p>

<div class="grid-2 section" style="margin-top:40px;">
  <div>
    <p><strong>Tenant signature</strong></p>
    <p style="margin-top:40px;border-top:1px solid #333;padding-top:4px;">{{customer_name}}</p>
  </div>
  <div>
    <p><strong>Company</strong></p>
    <p style="margin-top:40px;border-top:1px solid #333;padding-top:4px;">{{agency_name}}</p>
  </div>
</div>
`;

export const DEFAULT_CONTRACT_HEADER = `
<h1>{{agency_name}}</h1>
<p class="muted">Vehicle Rental Agreement — Generated {{generated_datetime}}</p>
`;

export const DEFAULT_CONTRACT_FOOTER = `
<p>{{agency_name}} — {{agency_address}}</p>
<p>Phone: {{agency_phone}} | Email: {{agency_email}} | Tax ID: {{agency_tax_id}}</p>
`;

export const DEFAULT_INVOICE_BODY = `
<h1>Invoice</h1>
<p class="muted">Reservation: <strong>{{reservation_id}}</strong> &nbsp;|&nbsp; Date: {{generated_date}}</p>

<h2>Bill To</h2>
<p>{{customer_name}}<br/>{{customer_email}}<br/>{{customer_phone}}</p>

<h2>Description</h2>
<p>Car rental — {{car_make}} ({{car_year}})</p>
<p>Period: {{pickup_date}} → {{return_date}}</p>

<table>
  <tr><th>Item</th><th>Amount</th></tr>
  <tr><td>Rental</td><td>{{rental_price}}</td></tr>
  <tr><td>Pickup delivery</td><td>{{pickup_fee}}</td></tr>
  <tr><td>Drop-off delivery</td><td>{{dropoff_fee}}</td></tr>
  <tr><td>Discounts</td><td>-{{discount_total}}</td></tr>
  <tr><th>Total</th><th>{{total_price}}</th></tr>
</table>
<p>Thank you for choosing {{agency_name}}.</p>
`;

export default {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_HEADER,
  DEFAULT_CONTRACT_FOOTER,
  DEFAULT_INVOICE_BODY,
};
