
import React from 'react';
import { BatteryStatus } from '../types';
import {
    ShieldCheck, RefreshCw, History, Package,
    ShieldAlert, Building2, Clock
} from 'lucide-react';

interface StatusDisplayProps {
    status: BatteryStatus;
    isExpired: boolean;
    dealerId?: string | null;
    variant?: 'banner' | 'badge';
    className?: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
    status,
    isExpired,
    dealerId,
    variant = 'banner',
    className = ''
}) => {
    const isBanner = variant === 'banner';

    const getStatusConfig = () => {
        if (isExpired && status !== BatteryStatus.MANUFACTURED) {
            return {
                label: 'Warranty Expired',
                icon: ShieldAlert,
                bg: isBanner ? 'bg-rose-600' : 'bg-rose-50',
                text: isBanner ? 'text-white' : 'text-rose-600',
                border: isBanner ? 'border-transparent' : 'border-rose-100'
            };
        }

        switch (status) {
            case BatteryStatus.ACTIVE:
                return {
                    label: 'Active Warranty',
                    icon: ShieldCheck,
                    bg: isBanner ? 'bg-emerald-600' : 'bg-emerald-50',
                    text: isBanner ? 'text-white' : 'text-emerald-600',
                    border: isBanner ? 'border-transparent' : 'border-emerald-100'
                };
            case BatteryStatus.REPLACEMENT:
                return {
                    label: 'Replacement Issued',
                    icon: RefreshCw,
                    bg: isBanner ? 'bg-amber-500' : 'bg-amber-50',
                    text: isBanner ? 'text-white' : 'text-amber-600',
                    border: isBanner ? 'border-transparent' : 'border-amber-100'
                };
            case BatteryStatus.RETURNED:
                return {
                    label: 'Returned / Failed',
                    icon: History,
                    bg: isBanner ? 'bg-slate-700' : 'bg-slate-100',
                    text: isBanner ? 'text-white' : 'text-slate-600',
                    border: isBanner ? 'border-transparent' : 'border-slate-200'
                };
            case BatteryStatus.RETURNED_PENDING:
                return {
                    label: 'Exchange Pending',
                    icon: Clock,
                    bg: isBanner ? 'bg-orange-600' : 'bg-orange-50',
                    text: isBanner ? 'text-white' : 'text-orange-600',
                    border: isBanner ? 'border-transparent' : 'border-orange-100'
                };
            case BatteryStatus.MANUFACTURED:
                const isPartner = !!dealerId;
                return {
                    label: isPartner ? 'Partner Stock' : 'Central Stock',
                    icon: isPartner ? Building2 : Package,
                    bg: isBanner ? (isPartner ? 'bg-indigo-600' : 'bg-blue-600') : (isPartner ? 'bg-indigo-50' : 'bg-blue-50'),
                    text: isBanner ? 'text-white' : (isPartner ? 'text-indigo-600' : 'text-blue-600'),
                    border: isBanner ? 'border-transparent' : (isPartner ? 'border-indigo-100' : 'border-blue-100')
                };
            default:
                return {
                    label: status,
                    icon: Clock,
                    bg: isBanner ? 'bg-slate-600' : 'bg-slate-50',
                    text: isBanner ? 'text-white' : 'text-slate-600',
                    border: isBanner ? 'border-transparent' : 'border-slate-100'
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    if (isBanner) {
        return (
            <div className={`py-4 px-8 flex justify-between items-center ${config.bg} ${config.text} font-black text-[11px] uppercase tracking-[0.3em] ${className}`}>
                <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{config.label}</span>
                </div>
                <div className="flex items-center gap-2 opacity-60">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                    <span>Verified Status</span>
                </div>
            </div>
        );
    }

    return (
        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border} flex items-center gap-1.5 w-fit ${className}`}>
            <Icon size={10} />
            {config.label}
        </span>
    );
};
