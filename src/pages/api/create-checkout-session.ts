import type { APIRoute } from 'astro';
import Stripe from 'stripe';

// Gutschein-Produkte
const VOUCHER_PRODUCTS: Record<string, { name: string; amount: number; description: string }> = {
  'voucher-25': {
    name: 'Gutschein 25€ - Atelier Auszeit',
    amount: 2500, // in Cent
    description: 'Schnupper-Gutschein für Keramik-Malatelier Auszeit in Gronau',
  },
  'voucher-50': {
    name: 'Gutschein 50€ - Atelier Auszeit',
    amount: 5000,
    description: 'Standard-Gutschein für Keramik-Malatelier Auszeit in Gronau',
  },
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Stripe-Key aus Umgebungsvariablen lesen (zur Laufzeit)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY nicht konfiguriert');
      return new Response(
        JSON.stringify({ error: 'Zahlungssystem nicht konfiguriert' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    const body = await request.json();
    const { voucherId, customAmount, customerEmail } = body;

    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;

    if (voucherId === 'voucher-custom' && customAmount) {
      // Wunschbetrag
      const amount = Math.round(parseFloat(customAmount) * 100);
      if (amount < 500 || amount > 50000) {
        return new Response(
          JSON.stringify({ error: 'Betrag muss zwischen 5€ und 500€ liegen' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      lineItem = {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Gutschein ${customAmount}€ - Atelier Auszeit`,
            description: 'Individueller Gutschein für Keramik-Malatelier Auszeit in Gronau',
          },
          unit_amount: amount,
        },
        quantity: 1,
      };
    } else if (VOUCHER_PRODUCTS[voucherId]) {
      const product = VOUCHER_PRODUCTS[voucherId];
      lineItem = {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.amount,
        },
        quantity: 1,
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Ungültiger Gutschein' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // Automatisch alle im Stripe-Dashboard aktivierten Zahlungsmethoden anzeigen
      line_items: [lineItem],
      mode: 'payment',
      success_url: `${new URL(request.url).origin}/gutschein-erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/#gutschein-section`,
      locale: 'de',
      billing_address_collection: 'required',
      metadata: {
        voucher_type: voucherId,
      },
    };

    // E-Mail hinzufügen wenn vorhanden
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return new Response(
      JSON.stringify({ error: 'Fehler beim Erstellen der Checkout-Session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

