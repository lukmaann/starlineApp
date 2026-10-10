import { Battery, BatteryStatus, Sale } from '../types';

export type ReplacementStartBlockReason =
  | 'OLD_ALREADY_EXCHANGED'
  | 'OLD_DEALER_MISMATCH'
  | 'NEW_ALREADY_SOLD'
  | 'NEW_ALREADY_EXCHANGED'
  | 'NEW_DEALER_MISMATCH';

export type ReplacementStartValidation =
  | { allowed: true }
  | {
      allowed: false;
      reason: ReplacementStartBlockReason;
      batteryId: string;
      linkedBatteryId?: string;
      recordedDealerId?: string;
      expectedDealerId?: string;
      customerName?: string;
    };

interface ReplacementStartInput {
  oldBattery: Battery;
  oldSale?: Sale;
  oldHasExchange: boolean;
  newBattery?: Battery;
  newSale?: Sale;
}

const isCustomerSold = (battery?: Battery, sale?: Sale) => {
  if (sale && String(sale.customerPhone || '').trim().toUpperCase() !== 'STOCK') return true;
  return !!battery?.actualSaleDate && String(battery.customerPhone || '').trim().toUpperCase() !== 'STOCK';
};

const dealersDiffer = (left?: string, right?: string) =>
  !!left && !!right && left.trim().toUpperCase() !== right.trim().toUpperCase();

export const validateReplacementStart = ({
  oldBattery,
  oldSale,
  oldHasExchange,
  newBattery,
  newSale
}: ReplacementStartInput): ReplacementStartValidation => {
  if (
    oldHasExchange ||
    oldBattery.status === BatteryStatus.RETURNED ||
    !!oldBattery.nextBatteryId
  ) {
    return {
      allowed: false,
      reason: 'OLD_ALREADY_EXCHANGED',
      batteryId: oldBattery.id,
      linkedBatteryId: oldBattery.nextBatteryId
    };
  }

  if (
    isCustomerSold(oldBattery, oldSale) &&
    dealersDiffer(oldSale?.dealerId, oldBattery.dealerId)
  ) {
    return {
      allowed: false,
      reason: 'OLD_DEALER_MISMATCH',
      batteryId: oldBattery.id,
      recordedDealerId: oldSale?.dealerId,
      expectedDealerId: oldBattery.dealerId
    };
  }

  if (!newBattery) return { allowed: true };

  if (isCustomerSold(newBattery, newSale)) {
    return {
      allowed: false,
      reason: 'NEW_ALREADY_SOLD',
      batteryId: newBattery.id,
      recordedDealerId: newSale?.dealerId || newBattery.dealerId,
      customerName: newSale?.customerName || newBattery.customerName
    };
  }

  if (
    newBattery.status === BatteryStatus.REPLACEMENT ||
    !!newBattery.previousBatteryId ||
    !!newBattery.nextBatteryId
  ) {
    return {
      allowed: false,
      reason: 'NEW_ALREADY_EXCHANGED',
      batteryId: newBattery.id,
      linkedBatteryId: newBattery.previousBatteryId || newBattery.nextBatteryId
    };
  }

  if (dealersDiffer(newBattery.dealerId, oldBattery.dealerId)) {
    return {
      allowed: false,
      reason: 'NEW_DEALER_MISMATCH',
      batteryId: newBattery.id,
      recordedDealerId: newBattery.dealerId,
      expectedDealerId: oldBattery.dealerId
    };
  }

  return { allowed: true };
};
