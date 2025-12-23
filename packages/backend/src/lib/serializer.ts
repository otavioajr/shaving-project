import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recursively converts Prisma Decimal values to numbers for JSON serialization
 */
export function serializeResponse<T>(obj: T): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (obj instanceof Decimal) {
    return obj.toNumber()
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeResponse(item))
  }

  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeResponse(value)
    }
    return serialized
  }

  return obj
}

// =============================================================================
// Type-safe serializers for entities with Decimal fields
// These are called in the service layer BEFORE response schema validation
// =============================================================================

/**
 * Converts Decimal to number safely (handles null/undefined)
 */
export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }
  return value.toNumber()
}

/**
 * Serializes Professional: commissionRate Decimal → number
 */
export function serializeProfessional<T extends { commissionRate: Decimal }>(
  professional: T
): Omit<T, 'commissionRate'> & { commissionRate: number } {
  return {
    ...professional,
    commissionRate: professional.commissionRate.toNumber(),
  }
}

/**
 * Serializes Service: price Decimal → number
 */
export function serializeService<T extends { price: Decimal }>(
  service: T
): Omit<T, 'price'> & { price: number } {
  return {
    ...service,
    price: service.price.toNumber(),
  }
}

/**
 * Serializes Appointment: price, commissionValue Decimal → number
 * Does NOT handle nested relations (use serializeAppointmentWithRelations)
 */
export function serializeAppointment<T extends { price: Decimal; commissionValue: Decimal | null }>(
  appointment: T
): Omit<T, 'price' | 'commissionValue'> & { price: number; commissionValue: number | null } {
  return {
    ...appointment,
    price: appointment.price.toNumber(),
    commissionValue: appointment.commissionValue?.toNumber() ?? null,
  }
}

/**
 * Serializes Transaction: amount Decimal → number
 * Does NOT handle nested relations (use serializeTransactionWithRelations)
 */
export function serializeTransaction<T extends { amount: Decimal }>(
  transaction: T
): Omit<T, 'amount'> & { amount: number } {
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
  }
}

// =============================================================================
// Composite serializers for entities with nested Decimal relations
// =============================================================================

// Types for entities with relations
interface ProfessionalRelation {
  commissionRate: Decimal
}

interface ServiceRelation {
  price: Decimal
}

interface AppointmentWithRelations {
  price: Decimal
  commissionValue: Decimal | null
  professional?: ProfessionalRelation | null
  createdBy?: ProfessionalRelation | null
  service?: ServiceRelation | null
}

interface TransactionWithRelations {
  amount: Decimal
  createdBy?: ProfessionalRelation | null
}

/**
 * Serializes Appointment with all nested Decimal relations
 */
export function serializeAppointmentWithRelations<T extends AppointmentWithRelations>(
  appointment: T
): Omit<T, 'price' | 'commissionValue' | 'professional' | 'createdBy' | 'service'> & {
  price: number
  commissionValue: number | null
  professional?: ReturnType<typeof serializeProfessional> | null
  createdBy?: ReturnType<typeof serializeProfessional> | null
  service?: ReturnType<typeof serializeService> | null
} {
  return {
    ...appointment,
    price: appointment.price.toNumber(),
    commissionValue: appointment.commissionValue?.toNumber() ?? null,
    professional: appointment.professional
      ? serializeProfessional(appointment.professional)
      : appointment.professional,
    createdBy: appointment.createdBy
      ? serializeProfessional(appointment.createdBy)
      : appointment.createdBy,
    service: appointment.service ? serializeService(appointment.service) : appointment.service,
  }
}

/**
 * Serializes Transaction with nested createdBy Decimal relation
 */
export function serializeTransactionWithRelations<T extends TransactionWithRelations>(
  transaction: T
): Omit<T, 'amount' | 'createdBy'> & {
  amount: number
  createdBy?: ReturnType<typeof serializeProfessional> | null
} {
  return {
    ...transaction,
    amount: transaction.amount.toNumber(),
    createdBy: transaction.createdBy
      ? serializeProfessional(transaction.createdBy)
      : transaction.createdBy,
  }
}
