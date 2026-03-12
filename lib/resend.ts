import { Resend } from 'resend';
import type { CartLineItem, Order } from '@/types';

const FROM = process.env.RESEND_FROM_EMAIL || 'orders@luxehaven.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://luxehaven.com';

// Lazy-initialise Resend so a placeholder API key doesn't crash the app at startup.
// The client is created on first use — if the key is missing/placeholder we log a
// warning and return a no-op result instead of throwing.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('re_placeholder') || key === 'your_resend_key') {
    console.warn('[Resend] RESEND_API_KEY is not configured — emails will not be sent.');
    return null;
  }
  _resend = new Resend(key);
  return _resend;
}

export const resend = { emails: { send: async (opts: Parameters<Resend['emails']['send']>[0]) => {
  const client = getResend();
  if (!client) return { id: 'no-op', error: null };
  return client.emails.send(opts);
}}};

// ─── Shared brand styles ───────────────────────────────────────────────────
const brandStyles = `
  body { font-family: 'Georgia', serif; background: #f8f5f0; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #1a2744; padding: 32px; text-align: center; }
  .header h1 { color: #e8c99b; font-size: 28px; margin: 0; letter-spacing: 3px; }
  .body { padding: 32px; color: #333; line-height: 1.6; }
  .footer { background: #f8f5f0; padding: 24px; text-align: center; font-size: 12px; color: #999; }
  .btn { display: inline-block; background: #e8c99b; color: #1a2744; padding: 14px 28px;
         text-decoration: none; font-weight: bold; letter-spacing: 1px; border-radius: 2px; margin: 16px 0; }
  .order-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .order-table th { background: #f8f5f0; padding: 10px; text-align: left; font-size: 12px;
                    text-transform: uppercase; letter-spacing: 1px; }
  .order-table td { padding: 12px 10px; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #1a2744; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: bold; }
  .badge-processing { background: #dbeafe; color: #1e40af; }
  .badge-shipped { background: #d1fae5; color: #065f46; }
  .unsubscribe { font-size: 11px; color: #bbb; margin-top: 16px; }
`;

function currencySymbol(currency: string) {
  return currency.toUpperCase() === 'GBP' ? '£' : '$';
}

function formatPrice(amount: number, currency: string) {
  return `${currencySymbol(currency)}${amount.toFixed(2)}`;
}

function itemsHtml(items: Order['items'], currency: string) {
  if (!items?.length) return '<p>Order items unavailable.</p>';
  const sym = currencySymbol(currency);
  const rows = items.map(item => {
    const price = currency === 'GBP' ? item.unit_price_gbp : item.unit_price_usd;
    const total = currency === 'GBP' ? item.total_price_gbp : item.total_price_usd;
    return `<tr>
      <td>${item.product_snapshot.name}${
        item.product_snapshot.variant_label ? ` <small>(${item.product_snapshot.variant_label})</small>` : ''
      }</td>
      <td>${item.quantity}</td>
      <td>${sym}${price.toFixed(2)}</td>
      <td>${sym}${total.toFixed(2)}</td>
    </tr>`;
  }).join('');
  return `<table class="order-table">
    <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── 1. Order Confirmation Email ────────────────────────────────────────────
export async function sendOrderConfirmationEmail(order: Order & { items: Order['items'] }) {
  const sym = currencySymbol(order.currency);
  const subtotal = order.currency === 'GBP' ? order.subtotal_gbp : order.subtotal_usd;
  const shipping = order.currency === 'GBP' ? order.shipping_cost_gbp : order.shipping_cost_usd;
  const vat = order.currency === 'GBP' ? order.vat_amount_gbp : order.vat_amount_usd;
  const discount = order.currency === 'GBP' ? order.discount_amount_gbp : order.discount_amount_usd;
  const total = order.currency === 'GBP' ? order.total_gbp : order.total_usd;
  const trackingUrl = `${APP_URL}/orders/${order.id}/tracking?token=${order.order_token}`;
  const email = order.guest_email ?? order.shipping_address?.email ?? '';

  const html = `<!DOCTYPE html><html><head><style>${brandStyles}</style></head><body>
  <div class="wrapper">
    <div class="header"><h1>LUXEHAVEN</h1></div>
    <div class="body">
      <h2>Thank you for your order! 🎉</h2>
      <p>Hi ${order.shipping_address?.firstName ?? 'there'},</p>
      <p>Your order <strong>${order.order_number}</strong> has been confirmed and is being prepared.</p>
      ${itemsHtml(order.items, order.currency)}
      <table class="order-table">
        <tr><td>Subtotal</td><td>${formatPrice(subtotal, order.currency)}</td></tr>
        ${discount > 0 ? `<tr><td>Discount</td><td>−${formatPrice(discount, order.currency)}</td></tr>` : ''}
        <tr><td>Shipping</td><td>${shipping === 0 ? 'FREE' : formatPrice(shipping, order.currency)}</td></tr>
        ${vat > 0 ? `<tr><td>VAT (20%)</td><td>${formatPrice(vat, order.currency)}</td></tr>` : ''}
        <tr class="total-row"><td>Total</td><td>${formatPrice(total, order.currency)}</td></tr>
      </table>
      <p><strong>Shipping to:</strong><br/>
        ${order.shipping_address?.firstName} ${order.shipping_address?.lastName}<br/>
        ${order.shipping_address?.line1}${order.shipping_address?.line2 ? ', ' + order.shipping_address.line2 : ''}<br/>
        ${order.shipping_address?.city}, ${order.shipping_address?.postcode ?? order.shipping_address?.zipCode}<br/>
        ${order.shipping_address?.country}
      </p>
      <center><a href="${trackingUrl}" class="btn">Track Your Order</a></center>
      <p style="font-size:13px;color:#666">Estimated delivery: ${order.shipping_method === 'EXPRESS' ? '3–5 business days' : '7–12 business days'}.<br/>
        UK orders: All duties &amp; VAT included — no customs surprises.</p>
    </div>
    <div class="footer">
      <p>LuxeHaven | Premium Jewellery &amp; Fashion | <a href="${APP_URL}">luxehaven.com</a></p>
      <p>© ${new Date().getFullYear()} LuxeHaven. All rights reserved.</p>
    </div>
  </div></body></html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Order Confirmed: ${order.order_number} — LuxeHaven`,
    html,
  });
}

// ─── 2. Shipping Confirmation Email ─────────────────────────────────────────
export async function sendShippingConfirmationEmail(
  order: Order,
  trackingNumber: string,
  carrier: string
) {
  const trackingUrl = `${APP_URL}/orders/${order.id}/tracking?token=${order.order_token}`;
  const email = order.guest_email ?? order.shipping_address?.email ?? '';

  const html = `<!DOCTYPE html><html><head><style>${brandStyles}</style></head><body>
  <div class="wrapper">
    <div class="header"><h1>LUXEHAVEN</h1></div>
    <div class="body">
      <h2>Your order is on its way! 🚚</h2>
      <p>Hi ${order.shipping_address?.firstName ?? 'there'},</p>
      <p>Great news — your order <strong>${order.order_number}</strong> has shipped!</p>
      <table class="order-table">
        <tr><td><strong>Carrier</strong></td><td>${carrier}</td></tr>
        <tr><td><strong>Tracking Number</strong></td><td>${trackingNumber}</td></tr>
        <tr><td><strong>Estimated Delivery</strong></td><td>${order.shipping_method === 'EXPRESS' ? '3–5 business days' : '7–12 business days'}</td></tr>
      </table>
      <center><a href="${trackingUrl}" class="btn">Track Your Package</a></center>
      <p style="font-size:13px;color:#666">You can track your order any time without logging in using the link above.</p>
    </div>
    <div class="footer">
      <p>LuxeHaven | <a href="${APP_URL}">luxehaven.com</a> | <a href="${APP_URL}/returns">Returns Policy</a></p>
      <p>© ${new Date().getFullYear()} LuxeHaven. All rights reserved.</p>
    </div>
  </div></body></html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your LuxeHaven Order Has Shipped — ${trackingNumber}`,
    html,
  });
}

// ─── 3. Abandoned Cart Email 1 (60 min) ─────────────────────────────────────
export async function sendAbandonedCartEmail1(
  email: string,
  cartItems: CartLineItem[],
  sessionToken: string,
  currency: 'USD' | 'GBP' = 'USD'
) {
  const sym = currency === 'GBP' ? '£' : '$';
  const recoveryUrl = `${APP_URL}/checkout/recover/${sessionToken}`;
  const unsubscribeUrl = `${APP_URL}/api/checkout/unsubscribe?token=${sessionToken}`;

  const itemRows = cartItems.map(item => {
    const price = currency === 'GBP' ? item.priceGbp : item.priceUsd;
    return `<tr>
      <td>${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}</td>
      <td>${item.quantity}</td>
      <td>${sym}${price.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const subtotal = cartItems.reduce((sum, i) => {
    return sum + (currency === 'GBP' ? i.priceGbp : i.priceUsd) * i.quantity;
  }, 0);

  const html = `<!DOCTYPE html><html><head><style>${brandStyles}</style></head><body>
  <div class="wrapper">
    <div class="header"><h1>LUXEHAVEN</h1></div>
    <div class="body">
      <h2>You left something beautiful behind ✨</h2>
      <p>Hi there,</p>
      <p>You were so close! These items are still waiting in your cart:</p>
      <table class="order-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr class="total-row"><td colspan="2">Subtotal</td><td>${sym}${subtotal.toFixed(2)}</td></tr></tfoot>
      </table>
      <center><a href="${recoveryUrl}" class="btn">Complete My Order</a></center>
      <p style="font-size:13px;color:#666">Your cart has been saved. Click the button above to pick up exactly where you left off.</p>
      <p style="font-size:13px;color:#666">🔒 SSL Secured &nbsp;|&nbsp; 30-Day Returns &nbsp;|&nbsp; UK Duties Included</p>
    </div>
    <div class="footer">
      <p>LuxeHaven | <a href="${APP_URL}">luxehaven.com</a></p>
      <p class="unsubscribe">You're receiving this because you started a checkout at LuxeHaven.<br/>
        <a href="${unsubscribeUrl}">Unsubscribe</a> from cart reminder emails. | LuxeHaven Ltd, London, UK</p>
    </div>
  </div></body></html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'You left something behind at LuxeHaven…',
    html,
  });
}

// ─── 4. Abandoned Cart Email 2 (24hr with discount) ─────────────────────────
export async function sendAbandonedCartEmail2(
  email: string,
  cartItems: CartLineItem[],
  sessionToken: string,
  discountCode: string,
  currency: 'USD' | 'GBP' = 'USD'
) {
  const sym = currency === 'GBP' ? '£' : '$';
  const recoveryUrl = `${APP_URL}/checkout/recover/${sessionToken}?code=${discountCode}`;
  const unsubscribeUrl = `${APP_URL}/api/checkout/unsubscribe?token=${sessionToken}`;

  const subtotal = cartItems.reduce((sum, i) => {
    return sum + (currency === 'GBP' ? i.priceGbp : i.priceUsd) * i.quantity;
  }, 0);

  const html = `<!DOCTYPE html><html><head><style>${brandStyles}</style></head><body>
  <div class="wrapper">
    <div class="header"><h1>LUXEHAVEN</h1></div>
    <div class="body">
      <h2>Your cart is expiring soon — here's 10% off 🎁</h2>
      <p>Hi there,</p>
      <p>We noticed you haven't completed your order. As a thank-you for your interest,
         here's an exclusive <strong>10% discount</strong> just for you:</p>
      <div style="text-align:center;padding:24px;background:#f8f5f0;margin:16px 0;border-radius:4px">
        <p style="font-size:13px;color:#666;margin:0 0 8px 0">YOUR DISCOUNT CODE</p>
        <p style="font-size:28px;font-weight:bold;color:#1a2744;letter-spacing:3px;margin:0">${discountCode}</p>
        <p style="font-size:13px;color:#666;margin:8px 0 0 0">10% off your entire order</p>
      </div>
      <p>Your cart subtotal was <strong>${sym}${subtotal.toFixed(2)}</strong>.
         With your discount, that's just <strong>${sym}${(subtotal * 0.9).toFixed(2)}</strong>.</p>
      <center><a href="${recoveryUrl}" class="btn">Claim My 10% Off</a></center>
      <p style="font-size:12px;color:#999">⏰ This offer expires in 24 hours. Don't miss out.</p>
    </div>
    <div class="footer">
      <p>LuxeHaven | <a href="${APP_URL}">luxehaven.com</a></p>
      <p class="unsubscribe">You're receiving this because you started a checkout at LuxeHaven.<br/>
        <a href="${unsubscribeUrl}">Unsubscribe</a> from cart reminder emails. | LuxeHaven Ltd, London, UK</p>
    </div>
  </div></body></html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your cart is expiring — here's 10% off, ${discountCode}`,
    html,
  });
}

// ─── 5. Refund Confirmation Email ────────────────────────────────────────────
export async function sendRefundConfirmationEmail(
  order: Order,
  refundAmount: number,
  reason: string
) {
  const sym = currencySymbol(order.currency);
  const email = order.guest_email ?? order.shipping_address?.email ?? '';

  const html = `<!DOCTYPE html><html><head><style>${brandStyles}</style></head><body>
  <div class="wrapper">
    <div class="header"><h1>LUXEHAVEN</h1></div>
    <div class="body">
      <h2>Your refund has been processed ✅</h2>
      <p>Hi ${order.shipping_address?.firstName ?? 'there'},</p>
      <p>We've processed a refund for order <strong>${order.order_number}</strong>.</p>
      <table class="order-table">
        <tr><td><strong>Order Number</strong></td><td>${order.order_number}</td></tr>
        <tr><td><strong>Refund Amount</strong></td><td>${sym}${refundAmount.toFixed(2)}</td></tr>
        <tr><td><strong>Reason</strong></td><td>${reason}</td></tr>
        <tr><td><strong>Timeframe</strong></td><td>5–10 business days to appear on your statement</td></tr>
      </table>
      <p>Under the UK Consumer Rights Act 2015, you're entitled to a full refund within 14 days of cancellation.
         Your refund will be returned to your original payment method.</p>
      <p>If you have any questions, please contact us at <a href="mailto:support@luxehaven.com">support@luxehaven.com</a></p>
    </div>
    <div class="footer">
      <p>LuxeHaven | <a href="${APP_URL}">luxehaven.com</a> | <a href="${APP_URL}/returns">Returns Policy</a></p>
      <p>© ${new Date().getFullYear()} LuxeHaven. All rights reserved.</p>
    </div>
  </div></body></html>`;

  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Refund Processed for Order ${order.order_number} — LuxeHaven`,
    html,
  });
}
