import { Battery, WarrantyStatus } from '../types';

export interface WarrantyCalculationResult {
    status: WarrantyStatus;
    effectiveStartDate: string;
    effectiveExpiryDate: string;
    calculationBase: 'ACTIVATION' | 'ACTUAL_SALE';
    daysRemaining: number;
    isInGracePeriod: boolean;
    gracePeriodEndsOn?: string;
    canCorrectDate: boolean;
}

export class WarrantyCalculator {
    static GRACE_PERIOD_DAYS = 60;

    /**
     * Calculate comprehensive warranty status including grace period logic
     */
    static calculate(battery: Battery): WarrantyCalculationResult {
        const today = new Date();

        // Determine which date to use for warranty calculation
        const useActualSale = battery.actualSaleDate && battery.warrantyCalculationBase === 'ACTUAL_SALE';
        const startDate = useActualSale ? battery.actualSaleDate! : (battery.activationDate || battery.manufactureDate);
        const calculationBase: 'ACTIVATION' | 'ACTUAL_SALE' = useActualSale ? 'ACTUAL_SALE' : 'ACTIVATION';

        // Calculate expiry date
        const warrantyMonths = battery.warrantyMonths || 24;
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
        const effectiveExpiryDate = expiryDate.toISOString().split('T')[0];

        // Calculate days remaining
        const expiryTime = expiryDate.getTime();
        const todayTime = today.getTime();
        const daysRemaining = Math.ceil((expiryTime - todayTime) / (1000 * 60 * 60 * 24));

        // Determine status
        let status: WarrantyStatus;
        let isInGracePeriod = false;
        let gracePeriodEndsOn: string | undefined;
        let canCorrectDate = false;

        if (daysRemaining > 0) {
            status = WarrantyStatus.VALID;
            canCorrectDate = true; // Can always correct while valid
        } else {
            // Warranty has expired
            const daysExpired = Math.abs(daysRemaining);

            if (daysExpired <= this.GRACE_PERIOD_DAYS) {
                // Within grace period
                status = WarrantyStatus.GRACE_PERIOD;
                isInGracePeriod = true;
                canCorrectDate = true;

                const gracePeriodEnd = new Date(expiryDate);
                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
                gracePeriodEndsOn = gracePeriodEnd.toISOString().split('T')[0];
            } else {
                // Beyond grace period
                status = WarrantyStatus.EXPIRED;
                canCorrectDate = false; // Requires admin override
            }
        }

        return {
            status,
            effectiveStartDate: startDate,
            effectiveExpiryDate,
            calculationBase,
            daysRemaining,
            isInGracePeriod,
            gracePeriodEndsOn,
            canCorrectDate
        };
    }

    /**
     * Check if date correction is allowed for this battery
     */
    static canCorrectDate(battery: Battery): boolean {
        const result = this.calculate(battery);
        return result.canCorrectDate;
    }

    /**
     * Validate a proposed date correction
     */
    static validateDateCorrection(
        battery: Battery,
        proposedDate: string
    ): { valid: boolean; reason?: string } {
        const proposedDateObj = new Date(proposedDate);
        const today = new Date();

        // Cannot be in the future
        if (proposedDateObj > today) {
            return { valid: false, reason: 'Sale date cannot be in the future' };
        }

        // Should not be before manufacture date
        if (battery.manufactureDate) {
            const manufactureDate = new Date(battery.manufactureDate);
            if (proposedDateObj < manufactureDate) {
                return { valid: false, reason: 'Sale date cannot be before manufacture date' };
            }
        }

        // Should not be before activation date (dealer received it first)
        if (battery.activationDate) {
            const activationDate = new Date(battery.activationDate);
            if (proposedDateObj < activationDate) {
                return { valid: false, reason: 'Customer sale date cannot be before dealer activation date' };
            }
        }

        // Check if the proposed date is reasonable (not too far in the past)
        const maxYearsBack = 5;
        const maxDateBack = new Date();
        maxDateBack.setFullYear(maxDateBack.getFullYear() - maxYearsBack);

        if (proposedDateObj < maxDateBack) {
            return { valid: false, reason: `Sale date cannot be more than ${maxYearsBack} years in the past` };
        }

        return { valid: true };
    }

    /**
     * Calculate new warranty expiry based on corrected sale date
     */
    static calculateCorrectedExpiry(battery: Battery, actualSaleDate: string): string {
        const warrantyMonths = battery.warrantyMonths || 24;
        const saleDate = new Date(actualSaleDate);
        saleDate.setMonth(saleDate.getMonth() + warrantyMonths);
        return saleDate.toISOString().split('T')[0];
    }

    /**
     * Get warranty status display text
     */
    static getStatusText(status: WarrantyStatus): string {
        switch (status) {
            case WarrantyStatus.VALID:
                return 'Valid';
            case WarrantyStatus.EXPIRED:
                return 'Expired';
            case WarrantyStatus.GRACE_PERIOD:
                return 'Grace Period';
            case WarrantyStatus.CORRECTABLE:
                return 'Correctable';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get warranty status color class
     */
    static getStatusColorClass(status: WarrantyStatus): string {
        switch (status) {
            case WarrantyStatus.VALID:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case WarrantyStatus.EXPIRED:
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case WarrantyStatus.GRACE_PERIOD:
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case WarrantyStatus.CORRECTABLE:
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    }
}
