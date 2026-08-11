/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {'admin'|'manager'|'sales'|'accounts'|'operations'} role
 * @property {'active'|'inactive'} status
 * @property {string} [avatar]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Lead
 * @property {number} id
 * @property {string} name
 * @property {string} [email]
 * @property {string} phone
 * @property {string} [destination]
 * @property {string} [travel_date]
 * @property {number} travelers
 * @property {number} [budget]
 * @property {string} [requirements]
 * @property {'facebook'|'instagram'|'google'|'whatsapp'|'referral'|'walkin'|'website'|'other'} lead_source
 * @property {'new'|'quotation'|'followup'|'confirmed'|'lost'} status
 * @property {number} [assigned_to]
 * @property {string} [assigned_to_name]
 * @property {string} [notes]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Customer
 * @property {number} id
 * @property {number} [lead_id]
 * @property {string} name
 * @property {string} [email]
 * @property {string} phone
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [country]
 * @property {string} [id_proof_type]
 * @property {string} [id_proof_number]
 * @property {string} [date_of_birth]
 * @property {string} [nationality]
 * @property {string} [emergency_contact_name]
 * @property {string} [emergency_contact_phone]
 * @property {number} total_bookings
 * @property {number} total_spent
 * @property {number} outstanding_amount
 * @property {string} [notes]
 * @property {string} created_at
 */

/**
 * @typedef {Object} TourPackage
 * @property {number} id
 * @property {string} name
 * @property {string} destination
 * @property {string} [country]
 * @property {number} duration_days
 * @property {number} duration_nights
 * @property {string} [description]
 * @property {string} [highlights]
 * @property {string} [inclusions]
 * @property {string} [exclusions]
 * @property {string} [terms_conditions]
 * @property {number} cost
 * @property {number} selling_price
 * @property {string} [image_url]
 * @property {'active'|'inactive'} status
 * @property {number} [booking_count]
 */

/**
 * @typedef {Object} Pagination
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} pages
 */

export const LEAD_STATUSES = ['new', 'quotation', 'followup', 'confirmed', 'lost'];
export const LEAD_SOURCES = ['facebook', 'instagram', 'google', 'whatsapp', 'referral', 'walkin', 'website', 'other'];
export const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected'];
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
export const PAYMENT_TYPES = ['advance', 'installment', 'final', 'refund', 'other'];
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'online'];
export const SUPPLIER_TYPES = ['hotel', 'transport', 'guide', 'activity', 'airline', 'other'];
export const EXPENSE_CATEGORIES = ['hotel', 'transport', 'tickets', 'food', 'guide', 'activities', 'staff', 'marketing', 'misc'];
export const DOCUMENT_TYPES = ['passport', 'visa', 'ticket', 'hotel_voucher', 'insurance', 'receipt', 'booking_doc', 'customer_doc', 'other'];
export const USER_ROLES = ['admin', 'manager', 'sales', 'accounts', 'operations'];
export const REMINDER_TYPES = ['followup', 'payment', 'document', 'travel', 'hotel_confirmation', 'supplier_payment', 'feedback'];
export const MARKETING_SOURCES = ['facebook', 'instagram', 'google', 'whatsapp', 'other'];

export const STATUS_COLORS = {
  new: 'info', quotation: 'primary', followup: 'warning', confirmed: 'success', lost: 'danger',
  draft: 'warning', sent: 'primary', accepted: 'success', rejected: 'danger',
  pending: 'warning', cancelled: 'danger', completed: 'info',
  active: 'success', inactive: 'danger',
  paid: 'success', done: 'success', missed: 'danger',
};
