export enum BatteryStatus {
  MANUFACTURED = 'Manufactured', // Kept generic title case as per existing data
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  REPLACEMENT = 'REPLACEMENT',
  EXPIRED = 'EXPIRED'
}

export interface Analytics {
  networkStats: {
    totalSales: number;
    totalRevenue: number;
    totalActive: number;
  };
  dealerStats: {
    id: string;
    name: string;
    location: string;
    sales: number;
    revenue: number;
    marketShare: number;
  }[];
  expiringSoon: Sale[];
}

export enum UserRole {
  ADMIN = 'Admin',
  DEALER = 'Dealer'
}

export interface BatteryModel {
  id: string;
  name: string;
  defaultCapacity: string;
  defaultWarrantyMonths: number;
}

export type WarrantyCardStatus = 'RECEIVED' | 'XEROX' | 'WHATSAPP' | 'NOT_RECEIVED';

export type DateCorrectionSource = 'WARRANTY_CARD' | 'DEALER_REPORT' | 'MANUAL_OVERRIDE';

export enum WarrantyStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  GRACE_PERIOD = 'GRACE_PERIOD',
  CORRECTABLE = 'CORRECTABLE'
}

export interface DateCorrection {
  correctedAt: string;
  correctedBy: string;
  oldDate: string;
  newDate: string;
  reason: string;
  proofDocument?: string;
}

export interface Battery {
  id: string; // Serial Number
  model: string;
  capacity: string;
  manufactureDate: string;
  activationDate?: string; // When warranty starts (dealer received)
  warrantyExpiry?: string;
  customerName?: string;
  customerPhone?: string;
  dealerId?: string;
  status: BatteryStatus;
  replacementCount: number;
  warrantyMonths: number;
  originalBatteryId?: string;
  previousBatteryId?: string;
  nextBatteryId?: string;
  warrantyCardStatus?: WarrantyCardStatus;

  // Warranty Date Management Fields
  actualSaleDate?: string; // Real customer purchase date (from warranty card)
  actualSaleDateSource?: DateCorrectionSource;
  actualSaleDateProof?: string; // File path to warranty card image
  warrantyCalculationBase?: 'ACTIVATION' | 'ACTUAL_SALE';
  gracePeriodUsed?: boolean; // Track if grace period was utilized
  dateCorrections?: DateCorrection[]; // Audit trail for date corrections
}

export interface Dealer {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  contact: string;
  location: string;
}

export interface Replacement {
  id: string;
  oldBatteryId: string;
  newBatteryId: string;
  dealerId: string;
  replacementDate: string;
  reason: string;
  problemDescription: string;
  warrantyCardStatus: WarrantyCardStatus;
  paidInAccount: boolean;
  soldDate?: string; // Corrected Original Sale Date
  replenishmentBatteryId?: string;
}

export interface Sale {
  id: string;
  batteryId: string;
  batteryType: string;
  dealerId: string;
  saleDate: string;
  salePrice: number;
  gstAmount: number;
  totalAmount: number;
  isBilled: boolean;
  customerName: string;
  customerPhone: string;
  guaranteeCardReturned: boolean;
  paidInAccount: boolean;
  warrantyStartDate: string;
  warrantyExpiry: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  dealerId?: string;
}
