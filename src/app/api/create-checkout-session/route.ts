import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Lazy-initialize Stripe only when needed
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();

    if (!stripe) {
      return NextResponse.json(
        { error: 'Payments are not configured' },
        { status: 503 }
      );
    }

    const { plan, interval, userId, email } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const priceIds: Record<string, string | undefined> = {
      'premium-month': process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      'premium-year': process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
      'pro-month': process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      'pro-year': process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    };

    const priceId = priceIds[`${plan}-${interval}`];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?plan=${plan}`,
      customer_email: email,
      metadata: {
        user_id: userId,
        plan: plan,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: userId,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
