import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Database } from '../db';
import Dashboard from './Dashboard';
import RawMaterials from './RawMaterials';
import Purchases from './Purchases';
import Expenses from './Expenses';
import FactoryWorkers from './FactoryWorkers';
import Production from './Production';
import { LayoutDashboard, ShoppingCart, Wallet, Users, Factory } from 'lucide-react';

interface ManufacturingHubProps {
    active: boolean;
    onNavigateTo?: (page: string) => void;
    userRole?: string;
}

const ManufacturingHub: React.FC<ManufacturingHubProps> = ({ active, onNavigateTo, userRole }) => {
    type ManufacturingTab = 'dashboard' | 'purchases' | 'expenses' | 'workers' | 'production';
    const [activeTab, setActiveTab] = useState<ManufacturingTab>('dashboard');

    if (!active) return null;

    useEffect(() => {
        if (!active) return;

        const notifyBirthdays = async () => {
            const hasChecked = sessionStorage.getItem('checked_worker_birthdays');
            if (hasChecked) return;

            try {
                const bdays = await Database.getUpcomingWorkerBirthdays();
                if (bdays.length > 0) {
                    bdays.forEach(worker => {
                        toast(`🎉 Happy Birthday, ${worker.full_name}!`, {
                            description: `Wish them well today! (Enrollment: ${worker.enrollment_no})`,
                            duration: 10000,
                        });
                    });
                }
                sessionStorage.setItem('checked_worker_birthdays', 'true');
            } catch (err) {
                console.error('Failed to check birthdays', err);
            }
        };

        notifyBirthdays();
    }, [active]);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 w-full">
            <div className="px-3 pt-0 pb-0 border-b border-slate-200 bg-white shrink-0">
                <div className="flex flex-wrap gap-6 mt-0">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'production', label: 'Production', icon: Factory },
                        { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
                        { id: 'expenses', label: 'Expenses', icon: Wallet },
                        { id: 'workers', label: 'Factory Workers', icon: Users }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ManufacturingTab)}
                            className={`pb-3 text-sm font-bold tracking-tight capitalize transition-colors relative flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => {
                    if (tab === 'purchases' || tab === 'expenses' || tab === 'workers') setActiveTab(tab);
                    else onNavigateTo?.(tab);
                }} />}
                {activeTab === 'production' && <Production />}
                {activeTab === 'purchases' && <Purchases onNavigate={(tab) => {
                    if (tab === 'dashboard' || tab === 'purchases' || tab === 'expenses' || tab === 'workers') {
                        setActiveTab(tab);
                    }
                }} />}
                {activeTab === 'expenses' && <Expenses />}
                {activeTab === 'workers' && <FactoryWorkers userRole={userRole} />}
            </div>
        </div>
    );
};

export default ManufacturingHub;
