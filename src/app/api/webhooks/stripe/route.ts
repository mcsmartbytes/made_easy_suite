import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getTurso } from '@/lib/turso';

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
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json(
      { error: 'Payments are not configured' },
      { status: 503 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  console.log('Webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session, stripe);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe) {
  const client = getTurso();
  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id);
  const status = subscription.status === 'trialing' ? 'trialing' : 'active';

  // Check if user_profiles table exists and update (for apps that use it)
  // For SiteSense, we store subscription info on the users table
  try {
    await client.execute({
      sql: `
        UPDATE users SET
          stripe_customer_id = ?,
          stripe_subscription_id = ?,
          subscription_plan = ?,
          subscription_status = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `,
      args: [customerId, subscriptionId, plan, status, userId],
    });

    console.log(`User ${userId} subscribed to ${plan} plan`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const client = getTurso();
  const customerId = subscription.customer as string;
  const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id);
  const status = mapStripeStatus(subscription.status);

  // Find user by stripe_customer_id
  const userResult = await client.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  const user = userResult.rows[0];
  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await client.execute({
    sql: `
      UPDATE users SET
        subscription_plan = ?,
        subscription_status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [plan, status, user.id],
  });

  console.log(`Subscription updated for user ${user.id}: ${plan} (${status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const client = getTurso();
  const customerId = subscription.customer as string;

  const userResult = await client.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  const user = userResult.rows[0];
  if (!user) return;

  await client.execute({
    sql: `
      UPDATE users SET
        subscription_status = 'canceled',
        subscription_plan = 'free',
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [user.id],
  });

  console.log(`Subscription canceled for user ${user.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const client = getTurso();
  const customerId = invoice.customer as string;

  const userResult = await client.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId],
  });

  const user = userResult.rows[0];
  if (!user) return;

  await client.execute({
    sql: `
      UPDATE users SET
        subscription_status = 'past_due',
        updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [user.id],
  });

  console.log(`Payment failed for user ${user.id}`);
}

function getPlanFromPriceId(priceId: string): 'free' | 'premium' | 'pro' {
  const premiumPriceIds = [
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  ];
  const proPriceIds = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  ];

  if (premiumPriceIds.includes(priceId)) return 'premium';
  if (proPriceIds.includes(priceId)) return 'pro';
  return 'free';
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'inactive';
  }
}
