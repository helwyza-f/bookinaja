export type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  avatar_url?: string | null;
  tier?: string;
  loyalty_points?: number;
  account_stage?: string;
  registration_source?: string;
};

export type CustomerBookingSummary = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  resource: string;
  date: string;
  end_date?: string | null;
  grand_total: number;
  deposit_amount: number;
  total_spent: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  payment_method?: string;
};

export type CustomerDashboard = {
  customer: CustomerProfile;
  points: number;
  profile_completion: number;
  identity_methods: string[];
  active_bookings: CustomerBookingSummary[];
  past_history: CustomerBookingSummary[];
};

export type CustomerBookingDetail = CustomerBookingSummary & {
  start_time?: string;
  end_time?: string | null;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  unit_price?: number;
  unit_duration?: number;
  total_resource?: number;
  total_fnb?: number;
  original_grand_total?: number;
  discount_amount?: number;
  promo_code?: string;
  payment_methods?: {
    code: string;
    display_name: string;
    category: string;
    verification_type: string;
    provider: string;
    instructions?: string;
    is_active: boolean;
    sort_order: number;
    metadata?: Record<string, unknown>;
  }[];
  payment_attempts?: {
    id: string;
    method_code: string;
    method_label: string;
    verification_type: string;
    payment_scope: string;
    amount: number;
    status: string;
    reference_code?: string;
    payer_note?: string;
    admin_note?: string;
    proof_url?: string;
    created_at: string;
    submitted_at?: string | null;
    verified_at?: string | null;
    rejected_at?: string | null;
  }[];
  options?: {
    id: string;
    item_name?: string;
    quantity?: number;
    total_price?: number;
    item_type?: string;
    unit_price?: number;
    price_at_booking?: number;
  }[];
  orders?: {
    id: string;
    product_name?: string;
    qty?: number;
    total_price?: number;
    quantity?: number;
    subtotal?: number;
    price_at_purchase?: number;
    status?: string;
  }[];
  events?: {
    id: string;
    actor_type?: string;
    actor_name?: string;
    event_type?: string;
    title?: string;
    description?: string;
    created_at?: string;
  }[];
};
