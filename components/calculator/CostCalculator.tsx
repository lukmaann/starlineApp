import React, { useState, useEffect } from 'react';
import { BatteryModelData } from './calculatorData';
import { ArrowLeft, Save, Plus, Trash2, BatteryCharging } from 'lucide-react';
import { Database } from '../../db';

interface CostCalculatorProps {
    modelData: BatteryModelData;
    onBack: () => void;
}

interface RowItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    transport: number;
}

const CostCalculator: React.FC<CostCalculatorProps> = ({ modelData, onBack }) => {
    const [rows, setRows] = useState<RowItem[]>([]);

    const [containerPrice, setContainerPrice] = useState<number>(0);
    const [batteryPackingPrice, setBatteryPackingPrice] = useState<number>(0);
    const [chargingPrice, setChargingPrice] = useState<number>(0);
    const [batteryScreeningPrice, setBatteryScreeningPrice] = useState<number>(0);
    const [minusPlusCapsPrice, setMinusPlusCapsPrice] = useState<number>(0);
    const [labourPrice, setLabourPrice] = useState<number>(0);

    // Initialize rows based on selected model
    useEffect(() => {
        const initCalculator = async () => {
            try {
                const materials = await Database.getRawMaterials();
                const purchases = await Database.getMaterialPurchases(10000);

                // Calculate Average Costs
                const avgCosts: Record<string, number> = {};
                const norm = (name: string) => (name || '').trim().toLowerCase();
                materials.forEach(m => {
                    const matsPurchased = purchases.filter(p => p.material_id === m.id);
                    if (matsPurchased.length > 0) {
                        const totalQty = matsPurchased.reduce((sum, p) => sum + p.quantity, 0);
                        const totalCost = matsPurchased.reduce((sum, p) => sum + p.total_cost, 0);
                        avgCosts[norm(m.name)] = totalQty > 0 ? totalCost / totalQty : 0;
                    } else {
                        avgCosts[norm(m.name)] = 0;
                    }
                });

                setRows([
                    { id: 'pos', name: 'Positive Plates', quantity: modelData.positivePlates, price: 0, transport: 0 },
                    { id: 'neg', name: 'Negative Plates', quantity: modelData.negativePlates, price: 0, transport: 0 },
                    { id: 'pvc', name: 'PVC Separator', quantity: modelData.pvcSeparator, price: avgCosts['pvc separator'] || 0, transport: 0 },
                    { id: 'lead', name: 'Lead (kg)', quantity: modelData.leadKg, price: avgCosts['raw lead'] || 0, transport: 0 },
                    { id: 'jali', name: 'Packing Jali', quantity: modelData.packingJali, price: avgCosts['packing jali'] || 0, transport: 0 },
                    { id: 'acid', name: 'Acid (Liters)', quantity: modelData.acidLiters, price: avgCosts['acid'] || 0, transport: 0 },
                ]);

                const containerKey = `container - ${modelData.model}`.toLowerCase();
                setContainerPrice(avgCosts[containerKey] || 0);
                setBatteryPackingPrice(0);
                setChargingPrice(modelData.charging);
                setBatteryScreeningPrice(modelData.batteryScreening);
                setMinusPlusCapsPrice(avgCosts['plus minus caps'] || modelData.minusPlusCaps);
                setLabourPrice(modelData.labour);

            } catch (e) {
                console.error("Failed to fetch live prices", e);
                setRows([
                    { id: 'pos', name: 'Positive Plates', quantity: modelData.positivePlates, price: 0, transport: 0 },
                    { id: 'neg', name: 'Negative Plates', quantity: modelData.negativePlates, price: 0, transport: 0 },
                    { id: 'pvc', name: 'PVC Separator', quantity: modelData.pvcSeparator, price: 0, transport: 0 },
                    { id: 'lead', name: 'Lead (kg)', quantity: modelData.leadKg, price: 0, transport: 0 },
                    { id: 'jali', name: 'Packing Jali', quantity: modelData.packingJali, price: 0, transport: 0 },
                    { id: 'acid', name: 'Acid (Liters)', quantity: modelData.acidLiters, price: 0, transport: 0 },
                ]);
                setContainerPrice(modelData.containerId);
                setBatteryPackingPrice(modelData.batteryPacking);
                setChargingPrice(modelData.charging);
                setBatteryScreeningPrice(modelData.batteryScreening);
                setMinusPlusCapsPrice(modelData.minusPlusCaps);
                setLabourPrice(modelData.labour);
            }
        };

        initCalculator();
    }, [modelData]);

    const updateRow = (id: string, field: keyof RowItem, value: number) => {
        setRows(current => current.map(row =>
            row.id === id ? { ...row, [field]: value || 0 } : row
        ));
    };

    // Calculations
    const calculateRowTotal = (row: RowItem) => {
        return (row.quantity * row.price) + row.transport;
    };

    const rawMaterialTotal = rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
    const staticTotal = containerPrice + batteryPackingPrice + chargingPrice + batteryScreeningPrice + minusPlusCapsPrice + labourPrice;

    const finalEstimatedPrice = rawMaterialTotal + staticTotal;

    return (
        <div className="w-full mx-auto animate-in fade-in zoom-in-95 duration-300">

            {/* Header Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            Final Costing For
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{modelData.model}</span>
                        </h2>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left Side: Inputs */}
                <div className="flex-1 space-y-6">

                    {/* Dynamic Rows */}
                    <div className="bg-white text-slate-900 p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-12 gap-4 mb-4 px-2">
                            <div className="col-span-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</div>
                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</div>
                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Unit Price (₹)</div>
                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Transport (₹)</div>
                            <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total (₹)</div>
                        </div>

                        <div className="space-y-2 relative">
                            {rows.map(row => (
                                <div key={row.id} className="grid grid-cols-12 gap-4 items-center group py-1">
                                    <div className="col-span-4 text-xs font-semibold text-slate-700 transition-colors pl-2">{row.name}</div>

                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={row.quantity || ''}
                                            onChange={e => updateRow(row.id, 'quantity', parseFloat(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-center text-slate-900 font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all font-mono"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={row.price || ''}
                                            onChange={e => updateRow(row.id, 'price', parseFloat(e.target.value))}
                                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-center text-slate-900 font-medium focus:outline-none focus:border-blue-400 transition-all font-mono"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={row.transport || ''}
                                            onChange={e => updateRow(row.id, 'transport', parseFloat(e.target.value))}
                                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-center text-slate-900 font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="col-span-2 text-right text-sm font-semibold text-slate-900 font-mono py-2 px-3">
                                        {calculateRowTotal(row).toFixed(1)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100 my-8" />

                        {/* Static Costs */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-5 px-2">
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Container</span>
                                <input
                                    type="number"
                                    value={containerPrice || ''}
                                    onChange={e => setContainerPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Battery Screening</span>
                                <input
                                    type="number"
                                    value={batteryScreeningPrice || ''}
                                    onChange={e => setBatteryScreeningPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Battery Packing</span>
                                <input
                                    type="number"
                                    value={batteryPackingPrice || ''}
                                    onChange={e => setBatteryPackingPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Minus Plus Caps</span>
                                <input
                                    type="number"
                                    value={minusPlusCapsPrice || ''}
                                    onChange={e => setMinusPlusCapsPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Charging</span>
                                <input
                                    type="number"
                                    value={chargingPrice || ''}
                                    onChange={e => setChargingPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Labour</span>
                                <input
                                    type="number"
                                    value={labourPrice || ''}
                                    onChange={e => setLabourPrice(parseFloat(e.target.value))}
                                    className="w-28 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-900 text-right font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Total Panel */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-slate-50 h-full min-h-[360px] rounded-xl border border-slate-200 relative overflow-hidden flex flex-col justify-end p-6 shadow-sm">

                        {/* Background design */}
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <BatteryCharging size={180} className="text-slate-400 transform rotate-12" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Final Estimated Price</p>
                                <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200/60">
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-bold text-slate-400">₹</span>
                                        <span className="text-3xl font-black tracking-tight text-slate-800 font-mono">
                                            {Math.round(finalEstimatedPrice).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Breakdown helper */}
                            <div className="mt-8 space-y-2 border-t border-slate-200 pt-4">
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                    <span>Raw Materials</span>
                                    <span className="font-mono text-slate-700">₹{rawMaterialTotal.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                    <span>Static & Labour</span>
                                    <span className="font-mono text-slate-700">₹{staticTotal.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        <button className="w-full mt-6 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm">
                            <Save size={16} />
                            Save Estimate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostCalculator;
