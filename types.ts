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

export interface Battery {
  id: string; // Serial Number
  model: string;
  capacity: string;
  manufactureDate: string;
  activationDate?: string; // When warranty starts
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
  // Added warrantyCardStatus to Battery interface
  warrantyCardStatus?: WarrantyCardStatus;
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
