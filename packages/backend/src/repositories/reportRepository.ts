import { prisma } from '../lib/prisma.js'

export class ReportRepository {
  async getTransactionSummary(barbershopId: string, dateFrom: Date, dateTo: Date) {
    return prisma.transaction.groupBy({
      by: ['type', 'category'],
      where: {
        barbershopId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    })
  }

  async getAppointmentsSummary(barbershopId: string, dateFrom: Date, dateTo: Date) {
    return prisma.appointment.aggregate({
      where: {
        barbershopId,
        status: 'COMPLETED',
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        price: true,
        commissionValue: true,
      },
      _count: {
        _all: true,
      },
    })
  }

  async getCommissionsByProfessional(
    barbershopId: string,
    dateFrom: Date,
    dateTo: Date,
    professionalId?: string
  ) {
    // First get aggregation by professional
    const aggregations = await prisma.appointment.groupBy({
      by: ['professionalId'],
      where: {
        barbershopId,
        status: 'COMPLETED',
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
        ...(professionalId ? { professionalId } : {}),
      },
      _sum: {
        price: true,
        commissionValue: true,
      },
      _count: {
        _all: true,
      },
    })

    // Then get professional details for each result
    const professionals = await prisma.professional.findMany({
      where: {
        barbershopId,
        id: {
          in: aggregations.map((a) => a.professionalId),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        commissionRate: true,
      },
    })

    return aggregations.map((agg) => {
      const professional = professionals.find((p) => p.id === agg.professionalId)
      return {
        ...agg,
        professional,
      }
    })
  }
}

export const reportRepository = new ReportRepository()
