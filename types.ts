export enum BatteryStatus {
  MANUFACTURED = 'Manufactured', // Kept generic title case as per existing data
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  RETURNED_PENDING = 'RETURNED_PENDING',
  REPLACEMENT = 'REPLACEMENT',
  EXPIRED = 'EXPIRED',
  FAULTY = 'FAULTY',
  GOOD = 'GOOD'
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
  ADMIN = 'ADMIN',
  FACTORY_WORKER = 'FACTORY_WORKER'
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

  // Inspection Fields
  inspectionStatus?: 'PENDING' | 'IN_PROGRESS' | 'GOOD' | 'FAULTY';
  inspectionDate?: string;
  inspectionStartDate?: string;
  inspectionReturnDate?: string; // Date sent back to dealer if GOOD
  inspectionNotes?: string;
  inspectionReason?: string;
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
  settlementType?: 'CREDIT' | 'STOCK' | 'DIRECT';
  settlementDate?: string;
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

export interface PriceRecord {
  id: number;
  modelId: string;
  price: number;
  effectiveDate: string;
  timestamp: string;
}

export interface StagedBatch {
  id: string;
  createdBy: string;
  dealerId: string;
  modelId: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  // UI helper fields
  creatorName?: string;
  dealerName?: string;
  modelName?: string;
  itemCount?: number;
}

export interface StagedBatchItem {
  id: number;
  batchId: string;
  serialNumber: string;
}

// --- MANUFACTURING & INVENTORY (ERP) ---

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  alert_threshold: number;
}

export interface MaterialPurchase {
  id: string;
  material_id: string;
  date: string;
  quantity: number;
  unit_price: number;
  transport_cost: number;
  total_cost: number;
  supplier_name?: string;
}

export interface ProductionLog {
  id: string;
  date: string;
  battery_model: string;
  quantity_produced: number;
  labour_cost_total: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface FactoryWorker {
  id: string;
  enrollment_no: string;
  full_name: string;
  gender?: string;
  phone?: string;
  join_date?: string;
  date_of_birth?: string; // Phase 2: Track age
  base_salary?: number;
  emergency_contact?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  salary_paid_month?: string | null;
  passkey_credential?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FactoryWorkerSalaryLog {
  id: number;
  worker_id: string;
  amount: number;
  payment_date: string;
  type: 'BASE' | 'INCREMENT' | 'BONUS' | 'DEDUCTION' | 'OTHER';
  notes?: string;
}
