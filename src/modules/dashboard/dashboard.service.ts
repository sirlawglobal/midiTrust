import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from '../billing/invoices.repository';
import { PaymentsRepository } from '../payments/payments.repository';
import { ReceiptsRepository } from '../receipts/receipts.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';
import { startOfDay, endOfDay, subDays } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  async getSummary() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // 1. Total Revenue Today
    const revenuePipeline = [
      {
        $match: {
          status: 'PAID',
          paidOn: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amountPaid' },
        },
      },
    ];
    const revenueResult = await this.paymentsRepository.aggregate(revenuePipeline);
    const totalRevenueToday = revenueResult[0]?.totalRevenue || 0;

    // 2. Pending Invoices
    const pendingInvoices = await this.invoicesRepository.count({
      status: InvoiceStatus.PENDING_PAYMENT,
    });

    // 3. Verified Receipts (All time)
    const verifiedReceipts = await this.receiptsRepository.count({
      isVerified: true,
    });

    // 4. Invoices paid today (mirrors the revenue query's match criteria)
    const paidInvoicesToday = await this.paymentsRepository.count({
      status: 'PAID',
      paidOn: { $gte: todayStart, $lte: todayEnd },
    });

    // 5. Total registered patients (all time)
    const totalPatients = await this.patientsRepository.count({});

    return {
      totalRevenueToday,
      // Kept as an alias for `totalRevenueToday` because the frontend dashboard
      // (AdminDashboard.jsx) reads `revenueToday`.
      revenueToday: totalRevenueToday,
      pendingInvoices,
      verifiedReceipts,
      paidInvoicesToday,
      totalPatients,
      timestamp: new Date().toISOString(),
    };
  }

  async getRevenueChart(days: number = 7) {
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const pipeline = [
      {
        $match: {
          status: 'PAID',
          paidOn: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidOn' },
            month: { $month: '$paidOn' },
            day: { $dayOfMonth: '$paidOn' },
          },
          revenue: { $sum: '$amountPaid' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ];

    const data = await this.paymentsRepository.aggregate(pipeline);

    // Format output
    return data.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      revenue: item.revenue,
    }));
  }

  async getRecentTransactions() {
    const payments = await this.paymentsRepository.findPaginated(
      {},
      { page: 1, limit: 10, sort: { createdAt: -1 } }
    );
    return payments.data;
  }
}
