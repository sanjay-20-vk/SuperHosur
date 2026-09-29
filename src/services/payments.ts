import { getSupabaseClient } from '../lib/supabase'

export interface MonetizationPlan {
  id: string
  name: string
  description: string
  entity_type: 'business' | 'property' | 'all'
  duration_days: number
  price_paise: number
  currency: string
  active: boolean
  features: string[]
  provider_plan_id?: string | null
}

export interface PaymentOrderRecord {
  id: string
  user_id: string
  provider: 'razorpay' | 'offline' | 'mock'
  provider_order_id: string
  plan_id: string
  amount_paise: number
  currency: string
  status: 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
  purpose: 'listing_promotion' | 'subscription' | 'one_time'
  entity_type: 'business' | 'property'
  entity_id: string
  metadata: {
    plan_name?: string
    duration_days?: number
    entity_title?: string
    [key: string]: unknown
  }
  created_at: string
  updated_at: string
}

export interface PaymentTransactionRecord {
  id: string
  order_id: string
  user_id: string
  provider: string
  provider_payment_id: string
  amount_paise: number
  currency: string
  status: 'authorized' | 'captured' | 'failed' | 'refunded'
  method?: string | null
  paid_at: string
  created_at: string
}

export interface PaymentRefundRecord {
  id: string
  transaction_id: string
  provider: string
  provider_refund_id: string
  amount_paise: number
  currency: string
  status: 'pending' | 'processed' | 'failed'
  reason?: string | null
  created_at: string
  processed_at: string
}

export interface ListingPromotionRecord {
  id: string
  owner_id: string
  entity_type: 'business' | 'property'
  entity_id: string
  plan_id: string
  order_id: string
  payment_transaction_id?: string | null
  starts_at: string
  expires_at: string
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'refunded'
  created_at: string
  updated_at: string
}

export interface PaymentProvider {
  createOrder(entityType: 'business' | 'property', entityId: string, planId: string): Promise<{
    order_id: string
    provider_order_id: string
    amount_paise: number
    currency: string
    plan_id: string
    plan_name: string
    duration_days: number
    entity_title: string
  }>
  verifyPayment(
    orderId: string,
    providerPaymentId: string,
    signature: string,
    method?: string
  ): Promise<{
    success: boolean
    order_id: string
    transaction_id: string
    promotion_id?: string
    starts_at?: string
    expires_at?: string
    status: string
  }>
}

/**
 * Fetch available monetization plans for businesses or properties
 */
export async function getMonetizationPlans(entityType?: 'business' | 'property'): Promise<MonetizationPlan[]> {
  const client = getSupabaseClient()
  let query = client
    .from('monetization_plans')
    .select('*')
    .eq('active', true)
    .order('price_paise', { ascending: true })

  if (entityType) {
    query = query.or(`entity_type.eq.${entityType},entity_type.eq.all`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message || 'Failed to load monetization plans.')
  }

  return ((data || []) as Array<Record<string, unknown>>).map((p) => ({
    id: String(p['id']),
    name: String(p['name']),
    description: String(p['description']),
    entity_type: p['entity_type'] as 'business' | 'property' | 'all',
    duration_days: Number(p['duration_days']),
    price_paise: Number(p['price_paise']),
    currency: String(p['currency']),
    active: Boolean(p['active']),
    features: Array.isArray(p['features']) ? (p['features'] as string[]) : [],
    provider_plan_id: p['provider_plan_id'] ? String(p['provider_plan_id']) : null,
  }))
}

/**
 * Server-Side Order Creation
 * Never trusts frontend amounts. Resolves plan and price entirely server-side.
 */
export async function createPromotionOrder(
  entityType: 'business' | 'property',
  entityId: string,
  planId: string
) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('create_payment_order', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_plan_id: planId,
  })

  if (error) {
    throw new Error(error.message || 'Unable to create payment order.')
  }

  return data as {
    order_id: string
    provider_order_id: string
    amount_paise: number
    currency: string
    plan_id: string
    plan_name: string
    duration_days: number
    entity_title: string
  }
}

/**
 * Verify payment with server-side signature check and activate entitlement
 */
export async function verifyAndActivatePayment(
  orderId: string,
  providerPaymentId: string,
  providerSignature: string,
  paymentMethod: string = 'upi'
) {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('verify_and_activate_payment', {
    p_order_id: orderId,
    p_provider_payment_id: providerPaymentId,
    p_provider_signature: providerSignature,
    p_payment_method: paymentMethod,
  })

  if (error) {
    throw new Error(error.message || 'Payment verification failed.')
  }

  return data as {
    success: boolean
    order_id: string
    transaction_id: string
    promotion_id?: string
    starts_at?: string
    expires_at?: string
    status: string
  }
}

/**
 * Fetch owner billing history: orders, transactions, refunds, and promotions
 */
export async function getOwnerBillingSummary() {
  const client = getSupabaseClient()
  const [ordersRes, txsRes, refundsRes, promosRes] = await Promise.all([
    client
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false }),
    client
      .from('payment_transactions')
      .select('*')
      .order('paid_at', { ascending: false }),
    client
      .from('payment_refunds')
      .select('*')
      .order('created_at', { ascending: false }),
    client
      .from('listing_promotions')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  if (ordersRes.error) throw new Error(ordersRes.error.message)
  if (txsRes.error) throw new Error(txsRes.error.message)
  if (refundsRes.error) throw new Error(refundsRes.error.message)
  if (promosRes.error) throw new Error(promosRes.error.message)

  return {
    orders: (ordersRes.data || []) as PaymentOrderRecord[],
    transactions: (txsRes.data || []) as PaymentTransactionRecord[],
    refunds: (refundsRes.data || []) as PaymentRefundRecord[],
    promotions: (promosRes.data || []) as ListingPromotionRecord[],
  }
}

/**
 * Check if a listing currently has an active promotion entitlement
 */
export async function isListingPromoted(entityType: 'business' | 'property', entityId: string): Promise<boolean> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('is_entity_promoted', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}
