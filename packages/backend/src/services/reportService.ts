import { reportRepository } from '../repositories/reportRepository.js'
import { Decimal } from '@prisma/client/runtime/library'

export interface FinancialSummaryResponse {
  period: { from: string; to: string }
  income: { total: number; count: number; byCategory: Record<string, number> }
  expenses: { total: number; count: number; byCategory: Record<string, number> }
  net: number
  appointments: { completed: number; totalRevenue: number; totalCommissions: number }
}

export interface CommissionReportResponse {
  period: { from: string; to: string }
  professionals: Array<{
    id: string
    name: string
    email: string
    commissionRate: number
    appointmentsCompleted: number
    totalCommissions: number
    totalRevenue: number
  }>
  totals: {
    professionals: number
    appointmentsCompleted: number
    totalCommissions: number
    totalRevenue: number
  }
}

export class ReportService {
  async getFinancialSummary(
    barbershopId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<FinancialSummaryResponse> {
    const [transactions, appointments] = await Promise.all([
      reportRepository.getTransactionSummary(barbershopId, dateFrom, dateTo),
      reportRepository.getAppointmentsSummary(barbershopId, dateFrom, dateTo),
    ])

    const income = { total: new Decimal(0), count: 0, byCategory: {} as Record<string, number> }
    const expenses = { total: new Decimal(0), count: 0, byCategory: {} as Record<string, number> }

    for (const t of transactions) {
      const amount = t._sum.amount ? new Decimal(t._sum.amount) : new Decimal(0)
      const count = t._count._all

      if (t.type === 'INCOME') {
        income.total = income.total.plus(amount)
        income.count += count
        income.byCategory[t.category] = (income.byCategory[t.category] || 0) + amount.toNumber()
      } else {
        expenses.total = expenses.total.plus(amount)
        expenses.count += count
        expenses.byCategory[t.category] = (expenses.byCategory[t.category] || 0) + amount.toNumber()
      }
    }

    // Appointment revenue is part of the business income, usually tracked via appointments table.
    // However, if manual transactions are used to record appointment payments, we shouldn't double count.
    // Assuming for now that "Transaction" table is the source of truth for CASH flow,
    // and "Appointment" table is for operational metrics.
    // But the requirement asks for "appointments" section in the response.

    const appointmentRevenue = appointments._sum?.price
      ? new Decimal(appointments._sum.price)
      : new Decimal(0)
    const appointmentCommissions = appointments._sum?.commissionValue
      ? new Decimal(appointments._sum.commissionValue)
      : new Decimal(0)

    const appointmentsCount =
      typeof appointments._count === 'number'
        ? appointments._count
        : ((appointments._count as any)?._all ?? 0)

    return {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      income: {
        total: income.total.toNumber(),
        count: income.count,
        byCategory: income.byCategory,
      },
      expenses: {
        total: expenses.total.toNumber(),
        count: expenses.count,
        byCategory: expenses.byCategory,
      },
      net: income.total.minus(expenses.total).toNumber(),
      appointments: {
        completed: appointmentsCount,
        totalRevenue: appointmentRevenue.toNumber(),
        totalCommissions: appointmentCommissions.toNumber(),
      },
    }
  }

  async getCommissionReport(
    barbershopId: string,
    dateFrom: Date,
    dateTo: Date,
    professionalId?: string
  ): Promise<CommissionReportResponse> {
    const commissions = await reportRepository.getCommissionsByProfessional(
      barbershopId,
      dateFrom,
      dateTo,
      professionalId
    )

    const professionalStats = commissions
      .map((c) => {
        if (!c.professional) return null

        const revenue = c._sum?.price ? new Decimal(c._sum.price) : new Decimal(0)
        const commission = c._sum?.commissionValue
          ? new Decimal(c._sum.commissionValue)
          : new Decimal(0)
        const count = typeof c._count === 'number' ? c._count : ((c._count as any)?._all ?? 0)

        return {
          id: c.professional.id,
          name: c.professional.name,
          email: c.professional.email,
          commissionRate: c.professional.commissionRate.toNumber(),
          appointmentsCompleted: count,
          totalCommissions: commission.toNumber(),
          totalRevenue: revenue.toNumber(),
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    const totals = professionalStats.reduce(
      (acc, curr) => {
        return {
          professionals: acc.professionals + 1,
          appointmentsCompleted: acc.appointmentsCompleted + curr.appointmentsCompleted,
          totalCommissions: new Decimal(acc.totalCommissions)
            .plus(curr.totalCommissions)
            .toNumber(),
          totalRevenue: new Decimal(acc.totalRevenue).plus(curr.totalRevenue).toNumber(),
        }
      },
      { professionals: 0, appointmentsCompleted: 0, totalCommissions: 0, totalRevenue: 0 }
    )

    return {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      professionals: professionalStats,
      totals,
    }
  }
}

export const reportService = new ReportService()
