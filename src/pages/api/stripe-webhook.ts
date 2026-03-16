import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createVoucher, getVoucherBySessionId, formatAmount } from '../../lib/voucher-storage';
import { generateVoucherQRDataUrl } from '../../lib/voucher-pdf';
import { getEnv, FROM_EMAIL, isSmtpConfigured } from '../../lib/env';
import { createSmtpTransporter } from '../../lib/smtp';

export const POST: APIRoute = async ({ request }) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    console.error('[Webhook] STRIPE_SECRET_KEY nicht konfiguriert');
    return new Response('Server error', { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' as any });

  // Webhook-Signatur verifizieren (wenn Secret konfiguriert)
  let event: Stripe.Event;

  if (webhookSecret) {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }
    try {
      const body = await request.text();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`[Webhook] Signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
  } else {
    // Produktion: Ohne Webhook-Secret ist der Webhook deaktiviert (fail-closed)
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_INSECURE_STRIPE_WEBHOOKS !== 'true') {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET nicht gesetzt - Webhook deaktiviert in Produktion');
      return new Response('Webhook not configured', { status: 503 });
    }
    // Nur in Entwicklung: Event direkt parsen ohne Signaturprüfung
    console.warn('[Webhook] DEV: Signatur wird nicht geprüft');
    const body = await request.text();
    event = JSON.parse(body) as Stripe.Event;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log(`[Webhook] checkout.session.completed: ${session.id}`);

    // Prüfe ob es ein Gutschein-Kauf ist (anhand metadata)
    const voucherType = session.metadata?.voucher_type;
    if (!voucherType) {
      console.log('[Webhook] Keine voucher_type metadata - kein Gutschein-Kauf');
      return new Response('OK', { status: 200 });
    }

    // Prüfe ob Gutschein bereits erstellt wurde (Idempotenz)
    const existing = await getVoucherBySessionId(session.id);
    if (existing) {
      console.log(`[Webhook] Gutschein für Session ${session.id} existiert bereits: ${existing.code}`);
      return new Response('OK', { status: 200 });
    }

    // Gutschein erstellen
    const amount = session.amount_total || 0;
    const customerEmail = session.customer_details?.email || session.customer_email || '';

    if (!customerEmail) {
      console.error(`[Webhook] Keine E-Mail für Session ${session.id}`);
      return new Response('OK', { status: 200 });
    }

    const voucher = await createVoucher({
      amount,
      customerEmail,
      customerName: session.customer_details?.name || undefined,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    });

    // E-Mail mit Gutschein senden
    if (isSmtpConfigured()) {
      try {
        const siteUrl = getEnv('SITE_URL', 'https://keramik-auszeit.de');
        const redeemUrl = `${siteUrl}/gutschein/einloesen/${voucher.code}`;
        const qrDataUrl = await generateVoucherQRDataUrl(redeemUrl);
        const amountStr = formatAmount(voucher.amount);

        const transporter = createSmtpTransporter();

        const html = `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #faf7f4; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #423430 0%, #8B6F47 100%); padding: 30px; text-align: center;">
              <h1 style="color: #f2ebe5; margin: 0; font-size: 24px;">🎨 Atelier Auszeit</h1>
              <p style="color: #CFA874; margin: 8px 0 0;">Gutschein</p>
            </div>
            <div style="padding: 30px; text-align: center;">
              <p style="color: #423430; font-size: 16px;">Vielen Dank für Ihren Kauf!</p>
              <div style="background: white; border: 2px dashed #CFA874; border-radius: 12px; padding: 24px; margin: 20px 0;">
                <p style="color: #8B6F47; font-size: 14px; margin: 0 0 8px;">Gutschein-Code</p>
                <p style="color: #423430; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 2px;">${voucher.code}</p>
                <p style="color: #423430; font-size: 32px; font-weight: bold; margin: 16px 0 0;">${amountStr}</p>
              </div>
              <div style="margin: 20px 0;">
                <img src="${qrDataUrl}" alt="QR-Code" style="width: 180px; height: 180px;" />
                <p style="color: #8B6F47; font-size: 12px; margin: 8px 0 0;">QR-Code scannen zum Einlösen</p>
              </div>
              <p style="color: #666; font-size: 13px; line-height: 1.6;">
                Zeigen Sie diesen Gutschein einfach im Atelier vor.<br>
                Der QR-Code kann direkt gescannt werden.
              </p>
              <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 20px 0;" />
              <p style="color: #999; font-size: 11px;">
                Atelier Auszeit · Irena Woschkowiak · Gronau<br>
                <a href="${siteUrl}" style="color: #8B6F47;">keramik-auszeit.de</a>
              </p>
            </div>
          </div>`;

        await transporter.sendMail({
          from: `"Atelier Auszeit" <${FROM_EMAIL}>`,
          to: voucher.customerEmail,
          subject: `Dein Gutschein über ${amountStr} – Atelier Auszeit`,
          html,
        });

        console.log(`[Webhook] Gutschein-Mail gesendet an ${voucher.customerEmail}`);
      } catch (err) {
        console.error('[Webhook] Fehler beim E-Mail-Versand:', err);
      }
    }
  }

  return new Response('OK', { status: 200 });
};

