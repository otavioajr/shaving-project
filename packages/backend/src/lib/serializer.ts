import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recursively converts Prisma Decimal values to numbers for JSON serialization
 */
export function serializeResponse<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Decimal) {
    return obj.toNumber()
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeResponse(item))
  }

  if (typeof obj === 'object') {
    const serialized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeResponse(value)
    }
    return serialized
  }

  return obj
}
