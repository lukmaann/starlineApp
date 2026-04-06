import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { ProductionLog, RawMaterial } from '../types';
import { getLocalDate } from '../utils';
import { getAllBatteryModels, BatteryModelData } from '../components/calculator/calculatorData';
import { toast } from 'sonner';
import {
    ArrowLeft, ArrowRight, Check, Filter, Loader2, RefreshCw,
    X, ChevronRight, Factory, Layers, BookOpen, Package, Zap, FlaskConical,
    BatteryCharging, Copy
} from 'lucide-react';

const PAGE_SIZE = 10;
type ProdStep = 1 | 2 | 3 | 4 | 5 | 6;
type ProductionStage = 'CASTING' | 'PASTING' | 'ASSEMBLY';
type StageDetail = 'POSITIVE_CASTING' | 'NEGATIVE_CASTING' | 'POSITIVE_PASTING' | 'NEGATIVE_PASTING';
type PastingMaterialKey = 'grey_oxide' | 'dinal_fiber' | 'dm_water' | 'acid' | 'lugnin' | 'carbon_black' | 'graphite_powder' | 'barium_sulfate';

type MaterialSnapshot = {
    material: RawMaterial | null;
    avgUnitPrice: number | null;
};

type AssemblyDashboardPricing = {
    positivePlateAvgPrice: number;
    negativePlateAvgPrice: number;
};

const POSITIVE_PASTING_MATERIALS: Array<{
    key: PastingMaterialKey;
    name: string;
    unit: string;
    defaultQty: string;
}> = [
    { key: 'grey_oxide', name: 'Grey Oxide', unit: 'kg', defaultQty: '' },
    { key: 'dinal_fiber', name: 'Dinal Fiber', unit: 'kg', defaultQty: '0' },
    { key: 'dm_water', name: 'DM Water', unit: 'liters', defaultQty: '0' },
    { key: 'acid', name: 'Acid', unit: 'liters', defaultQty: '0' },
];

const NEGATIVE_PASTING_MATERIALS: Array<{
    key: PastingMaterialKey;
    name: string;
    unit: string;
    defaultQty: string;
}> = [
    { key: 'grey_oxide', name: 'Grey Oxide', unit: 'kg', defaultQty: '' },
    { key: 'dinal_fiber', name: 'Dinal Fiber', unit: 'kg', defaultQty: '0' },
    { key: 'lugnin', name: 'Lignin (Lugnin)', unit: 'kg', defaultQty: '0' },
    { key: 'carbon_black', name: 'Carbon Black', unit: 'kg', defaultQty: '0' },
    { key: 'graphite_powder', name: 'Graphite Powder', unit: 'kg', defaultQty: '0' },
    { key: 'dm_water', name: 'DM Water', unit: 'liters', defaultQty: '0' },
    { key: 'acid', name: 'Acid', unit: 'liters', defaultQty: '0' },
    { key: 'barium_sulfate', name: 'Barium Sulfate', unit: 'kg', defaultQty: '0' },
];

const STAGE_OPTIONS: Array<{
    value: ProductionStage;
    label: string;
    description: string;
    accent: string;
}> = [
    { value: 'CASTING', label: 'Casting', description: 'Lead casting and grid preparation', accent: 'bg-amber-50 border-amber-200 text-amber-700' },
    { value: 'PASTING', label: 'Pasting', description: 'Paste filling and plate finishing', accent: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
    { value: 'ASSEMBLY', label: 'Assemble Battery', description: 'Final assembly and battery build', accent: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

function getStageMeta(stage: ProductionStage | string | undefined) {
    return STAGE_OPTIONS.find(option => option.value === stage) ?? STAGE_OPTIONS[2];
}

function getStageLabel(stage: ProductionStage | string | undefined, stageDetail?: StageDetail | string | null) {
    if (stage === 'CASTING' && stageDetail === 'POSITIVE_CASTING') return 'Positive Casting';
    if (stage === 'CASTING' && stageDetail === 'NEGATIVE_CASTING') return 'Negative Casting';
    if (stage === 'PASTING' && stageDetail === 'POSITIVE_PASTING') return 'Positive Pasting';
    if (stage === 'PASTING' && stageDetail === 'NEGATIVE_PASTING') return 'Negative Pasting';
    return getStageMeta(stage).label;
}

function getDefaultGridWeight(stageDetail: StageDetail | null) {
    if (stageDetail === 'POSITIVE_CASTING') return '0.133';
    if (stageDetail === 'NEGATIVE_CASTING') return '0.116';
    return '0.133';
}

function formatDerivedValue(value: number) {
    if (!Number.isFinite(value)) return '0';
    return Number(value.toFixed(3)).toString();
}

// ─── Bill of Materials Panel ─────────────────────────────────────────────────
function BomPanel({ modelName, modelData, qty, onClose }: {
    modelName: string;
    modelData: BatteryModelData;
    qty: number;
    onClose: () => void;
}) {
    const q = Math.max(qty, 1);
    const materials = [
        { label: 'Lead', icon: '🔩', value: modelData.leadKg, unit: 'kg', total: modelData.leadKg * q, color: 'bg-slate-100 border-slate-300 text-slate-700' },
        { label: 'Acid', icon: '🧪', value: modelData.acidLiters, unit: 'L', total: modelData.acidLiters * q, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { label: 'PVC Separator', icon: '📋', value: modelData.pvcSeparator, unit: 'pcs', total: modelData.pvcSeparator * q, color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
        { label: 'Packing Jali', icon: '🗂️', value: modelData.packingJali, unit: 'pcs', total: modelData.packingJali * q, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { label: 'Battery Packing', icon: '📦', value: modelData.batteryPacking, unit: 'pcs', total: modelData.batteryPacking * q, color: 'bg-orange-50 border-orange-200 text-orange-700' },
        { label: '±Caps', icon: '🔘', value: modelData.minusPlusCaps, unit: 'pcs', total: modelData.minusPlusCaps * q, color: 'bg-purple-50 border-purple-200 text-purple-700' },
        { label: 'Positive Plates', icon: '+', value: modelData.positivePlates, unit: 'pcs', total: modelData.positivePlates * q, color: 'bg-rose-50 border-rose-200 text-rose-700' },
        { label: 'Negative Plates', icon: '−', value: modelData.negativePlates, unit: 'pcs', total: modelData.negativePlates * q, color: 'bg-green-50 border-green-200 text-green-700' },
    ].filter(m => m.value > 0);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <BookOpen size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">Bill of Materials — {modelName}</p>
                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Per battery → For {q} unit{q !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"><X size={14} /></button>
            </div>
            <div className="p-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Package size={16} className="text-slate-500" />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Container</p>
                            <p className="text-sm font-bold text-slate-900">Model-specific container (ID #{modelData.containerId})</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">For {q} batch</p>
                        <p className="text-sm font-black text-slate-900">{q} container{q !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {modelData.charging > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
                            <Zap size={14} className="text-yellow-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">Charging</p>
                            <p className="text-base font-black text-yellow-800">₹{modelData.charging}</p>
                            <p className="text-[9px] text-yellow-600">per battery</p>
                        </div>
                    )}
                    {modelData.batteryScreening > 0 && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-center">
                            <FlaskConical size={14} className="text-teal-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Screening</p>
                            <p className="text-base font-black text-teal-800">₹{modelData.batteryScreening}</p>
                            <p className="text-[9px] text-teal-600">per battery</p>
                        </div>
                    )}
                    {modelData.labour > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-center">
                            <BatteryCharging size={14} className="text-indigo-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Labour</p>
                            <p className="text-base font-black text-indigo-800">₹{modelData.labour}</p>
                            <p className="text-[9px] text-indigo-600">per battery</p>
                        </div>
                    )}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider pl-6">Material</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Per Battery</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right pr-6">For {q} Unit{q !== 1 ? 's' : ''}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {materials.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3.5 pl-6">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${m.color}`}>{m.label}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-700">{m.value} <span className="text-[10px] text-slate-400 font-medium">{m.unit}</span></td>
                                    <td className="px-5 py-3.5 text-right pr-6">
                                        <span className="text-base font-black text-slate-900">{m.total % 1 === 0 ? m.total : m.total.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1">{m.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Production() {
    const [allModels, setAllModels] = useState<Record<string, BatteryModelData>>({});
    const [modelNames, setModelNames] = useState<string[]>([]);
    const [data, setData] = useState<ProductionLog[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoad, setIsLoad] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showBom, setShowBom] = useState(false);
    const [step, setStep] = useState<ProdStep>(1);
    const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
    const [rawLeadMaterial, setRawLeadMaterial] = useState<RawMaterial | null>(null);
    const [rawLeadAvgPrice, setRawLeadAvgPrice] = useState<number | null>(null);
    const [isRawLeadLoading, setIsRawLeadLoading] = useState(false);
    const [pastingMaterials, setPastingMaterials] = useState<Record<PastingMaterialKey, MaterialSnapshot>>({
        grey_oxide: { material: null, avgUnitPrice: null },
        dinal_fiber: { material: null, avgUnitPrice: null },
        dm_water: { material: null, avgUnitPrice: null },
        acid: { material: null, avgUnitPrice: null },
        lugnin: { material: null, avgUnitPrice: null },
        carbon_black: { material: null, avgUnitPrice: null },
        graphite_powder: { material: null, avgUnitPrice: null },
        barium_sulfate: { material: null, avgUnitPrice: null },
    });
    const [isPastingMaterialsLoading, setIsPastingMaterialsLoading] = useState(false);
    const [assemblyAvgCosts, setAssemblyAvgCosts] = useState<Record<string, number>>({});
    const [assemblyPlatePricing, setAssemblyPlatePricing] = useState<AssemblyDashboardPricing>({ positivePlateAvgPrice: 0, negativePlateAvgPrice: 0 });
    const [isAssemblyPricingLoading, setIsAssemblyPricingLoading] = useState(false);

    const [form, setForm] = useState({
        date: getLocalDate(),
        stage: 'ASSEMBLY' as ProductionStage,
        stage_detail: null as StageDetail | null,
        battery_model: '',
        quantity_produced: '',
        labour_cost_total: '',
        raw_lead_used: '',
        grid_weight: '0.133',
        grey_oxide_qty: '',
        dinal_fiber_qty: '0',
        dm_water_qty: '0',
        acid_qty: '0',
        lugnin_qty: '0',
        carbon_black_qty: '0',
        graphite_powder_qty: '0',
        barium_sulfate_qty: '0',
        oxide_weight: '0.257',
        grid_quantity: '4000',
        machine_operator: '0',
    });

    const [filterModel, setFilterModel] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const rawLeadUsed = Number(form.raw_lead_used);
    const gridWeight = Number(form.grid_weight);
    const totalGrids = Number.isFinite(rawLeadUsed) && rawLeadUsed > 0 && Number.isFinite(gridWeight) && gridWeight > 0
        ? Math.floor(rawLeadUsed / gridWeight)
        : 0;
    const totalCost = Number.isFinite(rawLeadUsed) && rawLeadUsed > 0 && rawLeadAvgPrice !== null
        ? rawLeadUsed * rawLeadAvgPrice
        : 0;
    const pricePerGrid = totalGrids > 0 ? totalCost / totalGrids : 0;
    const needsPositiveNegative = form.stage === 'CASTING' || form.stage === 'PASTING';
    const isCastingFlow = form.stage === 'CASTING';
    const isAssemblyFlow = form.stage === 'ASSEMBLY';
    const isPositivePastingFlow = form.stage_detail === 'POSITIVE_PASTING';
    const isNegativePastingFlow = form.stage_detail === 'NEGATIVE_PASTING';
    const isPastingWorkflow = isPositivePastingFlow || isNegativePastingFlow;
    const greyOxideQty = Number(form.grey_oxide_qty);
    const dinalFiberQty = Number(form.dinal_fiber_qty);
    const dmWaterQty = Number(form.dm_water_qty);
    const acidQty = Number(form.acid_qty);
    const lugninQty = Number(form.lugnin_qty);
    const carbonBlackQty = Number(form.carbon_black_qty);
    const graphitePowderQty = Number(form.graphite_powder_qty);
    const bariumSulfateQty = Number(form.barium_sulfate_qty);
    const oxideWeight = Number(form.oxide_weight);
    const gridQuantity = Number(form.grid_quantity);
    const machineOperator = Number(form.machine_operator) || 0;
    const positivePastingMaterialCost =
        ((Number.isFinite(greyOxideQty) ? greyOxideQty : 0) * (pastingMaterials.grey_oxide.avgUnitPrice ?? 0)) +
        ((Number.isFinite(dinalFiberQty) ? dinalFiberQty : 0) * (pastingMaterials.dinal_fiber.avgUnitPrice ?? 0)) +
        ((Number.isFinite(dmWaterQty) ? dmWaterQty : 0) * (pastingMaterials.dm_water.avgUnitPrice ?? 0)) +
        ((Number.isFinite(acidQty) ? acidQty : 0) * (pastingMaterials.acid.avgUnitPrice ?? 0)) +
        machineOperator;
    const totalPlates = Number.isFinite(greyOxideQty) && greyOxideQty > 0 && Number.isFinite(oxideWeight) && oxideWeight > 0
        ? Math.floor(greyOxideQty / oxideWeight) * 2
        : 0;
    const costPerPlate = gridQuantity > 0 ? Math.ceil(positivePastingMaterialCost / gridQuantity) : 0;
    const negativePastingMaterialCost =
        ((Number.isFinite(greyOxideQty) ? greyOxideQty : 0) * (pastingMaterials.grey_oxide.avgUnitPrice ?? 0)) +
        ((Number.isFinite(dinalFiberQty) ? dinalFiberQty : 0) * (pastingMaterials.dinal_fiber.avgUnitPrice ?? 0)) +
        ((Number.isFinite(lugninQty) ? lugninQty : 0) * (pastingMaterials.lugnin.avgUnitPrice ?? 0)) +
        ((Number.isFinite(carbonBlackQty) ? carbonBlackQty : 0) * (pastingMaterials.carbon_black.avgUnitPrice ?? 0)) +
        ((Number.isFinite(graphitePowderQty) ? graphitePowderQty : 0) * (pastingMaterials.graphite_powder.avgUnitPrice ?? 0)) +
        ((Number.isFinite(dmWaterQty) ? dmWaterQty : 0) * (pastingMaterials.dm_water.avgUnitPrice ?? 0)) +
        ((Number.isFinite(acidQty) ? acidQty : 0) * (pastingMaterials.acid.avgUnitPrice ?? 0)) +
        ((Number.isFinite(bariumSulfateQty) ? bariumSulfateQty : 0) * (pastingMaterials.barium_sulfate.avgUnitPrice ?? 0)) +
        machineOperator;
    const negativeCostPerPlate = gridQuantity > 0 ? Math.ceil(negativePastingMaterialCost / gridQuantity) : 0;
    const assemblyQuantity = Number(form.quantity_produced);
    const assemblyLabourPerBattery = Number(form.labour_cost_total) || 0;
    const normalizedModelName = (form.battery_model || '').trim().toLowerCase();
    const containerKey = `container - ${normalizedModelName}`;
    const selectedModelData = form.battery_model ? allModels[form.battery_model] : null;
    const assemblyRows = useMemo(() => {
        if (!selectedModelData || !isAssemblyFlow) return [];
        const getCost = (name: string, fallback = 0) => assemblyAvgCosts[name] ?? fallback;
        return [
            { key: 'positive_plates', label: 'Positive Plates', unit: 'pcs', qtyPerBattery: selectedModelData.positivePlates, unitPrice: assemblyPlatePricing.positivePlateAvgPrice, source: 'Dashboard plate cost' },
            { key: 'negative_plates', label: 'Negative Plates', unit: 'pcs', qtyPerBattery: selectedModelData.negativePlates, unitPrice: assemblyPlatePricing.negativePlateAvgPrice, source: 'Dashboard plate cost' },
            { key: 'pvc_separator', label: 'PVC Separator', unit: 'pcs', qtyPerBattery: selectedModelData.pvcSeparator, unitPrice: getCost('pvc separator'), source: 'Avg material cost' },
            { key: 'acid', label: 'Acid', unit: 'liters', qtyPerBattery: selectedModelData.acidLiters, unitPrice: getCost('acid'), source: 'Avg material cost' },
            { key: 'packing_jali', label: 'Packing Jali', unit: 'pcs', qtyPerBattery: selectedModelData.packingJali, unitPrice: getCost('packing jali'), source: 'Avg material cost' },
            { key: 'plus_minus_caps', label: 'Plus Minus Caps', unit: 'pairs', qtyPerBattery: selectedModelData.minusPlusCaps, unitPrice: getCost('plus minus caps'), source: 'Avg material cost' },
            { key: 'container', label: 'Container', unit: 'pcs', qtyPerBattery: 1, unitPrice: getCost(containerKey), source: 'Avg material cost' },
            { key: 'battery_packing', label: 'Battery Packing', unit: 'pcs', qtyPerBattery: 1, unitPrice: getCost('battery packing', selectedModelData.batteryPacking), source: getCost('battery packing') > 0 ? 'Avg material cost' : 'Model cost' },
            { key: 'charging', label: 'Charging', unit: 'service', qtyPerBattery: 1, unitPrice: selectedModelData.charging, source: 'Model cost' },
            { key: 'battery_screening', label: 'Battery Screening', unit: 'service', qtyPerBattery: 1, unitPrice: selectedModelData.batteryScreening, source: 'Model cost' },
            { key: 'labour', label: 'Labour', unit: 'service', qtyPerBattery: 1, unitPrice: assemblyLabourPerBattery, source: 'Operator input' },
        ];
    }, [selectedModelData, isAssemblyFlow, assemblyAvgCosts, assemblyPlatePricing, containerKey, assemblyLabourPerBattery]);
    const assemblyPerBatteryCost = assemblyRows.reduce((sum, row) => sum + (row.qtyPerBattery * row.unitPrice), 0);
    const assemblyTotalCost = Number.isFinite(assemblyQuantity) && assemblyQuantity > 0 ? assemblyPerBatteryCost * assemblyQuantity : 0;
    const canGoStep2 = Boolean(form.date);
    const canGoStep3 = Boolean(form.stage);
    const canGoStep4 = needsPositiveNegative ? Boolean(form.stage_detail) : true;
    const canGoStep5 = Number.isFinite(rawLeadUsed) && rawLeadUsed > 0 && Number.isFinite(gridWeight) && gridWeight > 0 && totalGrids > 0;
    const canGoPositivePastingStep5 =
        Number.isFinite(greyOxideQty) && greyOxideQty > 0 &&
        Number.isFinite(dinalFiberQty) && dinalFiberQty >= 0 &&
        Number.isFinite(dmWaterQty) && dmWaterQty >= 0 &&
        Number.isFinite(acidQty) && acidQty >= 0;
    const canGoNegativePastingStep5 =
        Number.isFinite(greyOxideQty) && greyOxideQty > 0 &&
        Number.isFinite(dinalFiberQty) && dinalFiberQty >= 0 &&
        Number.isFinite(lugninQty) && lugninQty >= 0 &&
        Number.isFinite(carbonBlackQty) && carbonBlackQty >= 0 &&
        Number.isFinite(graphitePowderQty) && graphitePowderQty >= 0 &&
        Number.isFinite(dmWaterQty) && dmWaterQty >= 0 &&
        Number.isFinite(acidQty) && acidQty >= 0 &&
        Number.isFinite(bariumSulfateQty) && bariumSulfateQty >= 0;
    const canGoStep6 = Number.isFinite(greyOxideQty) && greyOxideQty > 0 &&
        Number.isFinite(dinalFiberQty) && dinalFiberQty >= 0 &&
        Number.isFinite(dmWaterQty) && dmWaterQty >= 0 &&
        Number.isFinite(acidQty) && acidQty >= 0 &&
        Number.isFinite(oxideWeight) && oxideWeight > 0 &&
        Number.isFinite(gridQuantity) && gridQuantity > 0;
    const canGoAssemblyStep4 = Boolean(selectedModelData) && Number.isFinite(assemblyQuantity) && assemblyQuantity > 0;

    const refreshModels = () => {
        const models = getAllBatteryModels();
        setAllModels(models);
        const names = Object.keys(models);
        setModelNames(names);
        if (names.length > 0) setForm(f => ({ ...f, battery_model: f.battery_model || names[0] }));
    };

    useEffect(() => { refreshModels(); }, []);

    useEffect(() => {
        let active = true;

        const loadRawLead = async () => {
            if (!(showWizard && (step === 4 || step === 5) && (form.stage_detail === 'POSITIVE_CASTING' || form.stage_detail === 'NEGATIVE_CASTING'))) return;
            setIsRawLeadLoading(true);
            try {
                await Database.addMissingMaterialByName('Raw Lead');
                const materials = await Database.getRawMaterials();
                const rawLead = materials.find(material => material.name.trim().toLowerCase() === 'raw lead') ?? null;
                const avgPrice = rawLead ? await Database.getAverageMaterialUnitPrice(rawLead.id) : null;
                if (!active) return;
                setRawLeadMaterial(rawLead);
                setRawLeadAvgPrice(avgPrice);
            } catch {
                if (!active) return;
                setRawLeadMaterial(null);
                setRawLeadAvgPrice(null);
                toast.error('Failed to load Raw Lead material details.');
            } finally {
                if (active) setIsRawLeadLoading(false);
            }
        };

        loadRawLead();
        return () => { active = false; };
    }, [showWizard, step, form.stage_detail]);

    useEffect(() => {
        let active = true;
        const loadPositivePastingMaterials = async () => {
            if (!(showWizard && (step === 4 || step === 5 || step === 6) && (form.stage_detail === 'POSITIVE_PASTING' || form.stage_detail === 'NEGATIVE_PASTING'))) return;
            setIsPastingMaterialsLoading(true);
            try {
                const materialDefs = form.stage_detail === 'NEGATIVE_PASTING' ? NEGATIVE_PASTING_MATERIALS : POSITIVE_PASTING_MATERIALS;
                const entries = await Promise.all(materialDefs.map(async (item) => {
                    const snapshot = await Database.getAverageMaterialCostSnapshot(item.name);
                    return [item.key, {
                        material: snapshot.material,
                        avgUnitPrice: snapshot.avg_unit_price,
                    }] as const;
                }));
                if (!active) return;
                setPastingMaterials(current => ({
                    ...current,
                    ...(Object.fromEntries(entries) as Partial<Record<PastingMaterialKey, MaterialSnapshot>>),
                }));
            } catch {
                if (!active) return;
                toast.error('Failed to load pasting material prices.');
            } finally {
                if (active) setIsPastingMaterialsLoading(false);
            }
        };
        loadPositivePastingMaterials();
        return () => { active = false; };
    }, [showWizard, step, form.stage_detail]);

    useEffect(() => {
        let active = true;
        const loadAssemblyPricing = async () => {
            if (!(showWizard && isAssemblyFlow && step >= 3)) return;
            setIsAssemblyPricingLoading(true);
            try {
                const [materials, purchases, stats] = await Promise.all([
                    Database.getRawMaterials(),
                    Database.getMaterialPurchases(10000),
                    Database.getManufacturingDashboardStats(),
                ]);
                const avgCosts: Record<string, number> = {};
                const normalize = (value: string) => (value || '').trim().toLowerCase();
                materials.forEach(material => {
                    const materialPurchases = purchases.filter((purchase) => purchase.material_id === material.id);
                    if (materialPurchases.length === 0) {
                        avgCosts[normalize(material.name)] = 0;
                        return;
                    }
                    const totalQty = materialPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
                    const totalCostValue = materialPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
                    avgCosts[normalize(material.name)] = totalQty > 0 ? totalCostValue / totalQty : 0;
                });
                if (!active) return;
                setAssemblyAvgCosts(avgCosts);
                setAssemblyPlatePricing({
                    positivePlateAvgPrice: stats.positivePlateAvgPrice || 0,
                    negativePlateAvgPrice: stats.negativePlateAvgPrice || 0,
                });
            } catch {
                if (!active) return;
                toast.error('Failed to load assembly pricing.');
            } finally {
                if (active) setIsAssemblyPricingLoading(false);
            }
        };
        loadAssemblyPricing();
        return () => { active = false; };
    }, [showWizard, step, isAssemblyFlow]);

    useEffect(() => {
        if (!isPastingWorkflow) return;
        const oxide = Number(form.grey_oxide_qty);
        if (!Number.isFinite(oxide) || oxide < 0) return;
        setForm(current => ({
            ...current,
            dinal_fiber_qty: formatDerivedValue(oxide * 0.002),
            dm_water_qty: formatDerivedValue(oxide * 0.08),
            acid_qty: formatDerivedValue(oxide * 0.07),
            lugnin_qty: current.stage_detail === 'NEGATIVE_PASTING' ? formatDerivedValue(oxide * 0.004) : current.lugnin_qty,
            carbon_black_qty: current.stage_detail === 'NEGATIVE_PASTING' ? formatDerivedValue(oxide * 0.003) : current.carbon_black_qty,
            graphite_powder_qty: current.stage_detail === 'NEGATIVE_PASTING' ? formatDerivedValue(oxide * 0.001) : current.graphite_powder_qty,
            barium_sulfate_qty: current.stage_detail === 'NEGATIVE_PASTING' ? formatDerivedValue(oxide * 0.015) : current.barium_sulfate_qty,
        }));
    }, [form.grey_oxide_qty, form.stage_detail, isPastingWorkflow]);

    const loadData = useCallback(async (p = page) => {
        setIsLoad(true);
        try {
            const res = await Database.getPaginatedProduction(
                p, PAGE_SIZE,
                filterModel || undefined,
                filterDateFrom || undefined,
                filterDateTo || undefined
            );
            setData(res.data);
            setTotal(res.total);
        } catch { toast.error('Failed to load production logs.'); }
        finally { setIsLoad(false); }
    }, [page, filterModel, filterDateFrom, filterDateTo]);

    useEffect(() => { loadData(); }, [page, filterModel, filterDateFrom, filterDateTo]);

    const resetForm = () => {
        setForm({
            date: getLocalDate(),
            stage: 'ASSEMBLY',
            stage_detail: null,
            battery_model: modelNames[0] ?? '',
            quantity_produced: '',
            labour_cost_total: '',
            raw_lead_used: '',
            grid_weight: '0.133',
            grey_oxide_qty: '',
            dinal_fiber_qty: '0',
            dm_water_qty: '0',
            acid_qty: '0',
            lugnin_qty: '0',
            carbon_black_qty: '0',
            graphite_powder_qty: '0',
            barium_sulfate_qty: '0',
            oxide_weight: '0.257',
            grid_quantity: '4000',
            machine_operator: '0',
        });
        setStep(1);
        setShowBom(false);
        setRawLeadMaterial(null);
        setRawLeadAvgPrice(null);
        setPastingMaterials({
            grey_oxide: { material: null, avgUnitPrice: null },
            dinal_fiber: { material: null, avgUnitPrice: null },
            dm_water: { material: null, avgUnitPrice: null },
            acid: { material: null, avgUnitPrice: null },
            lugnin: { material: null, avgUnitPrice: null },
            carbon_black: { material: null, avgUnitPrice: null },
            graphite_powder: { material: null, avgUnitPrice: null },
            barium_sulfate: { material: null, avgUnitPrice: null },
        });
        setAssemblyAvgCosts({});
        setAssemblyPlatePricing({ positivePlateAvgPrice: 0, negativePlateAvgPrice: 0 });
    };

    const handleSave = async () => {
        if (form.stage_detail === 'NEGATIVE_PASTING') {
            if (!canGoStep6) {
                toast.error('Enter valid negative pasting values.');
                return;
            }
            setIsSaving(true);
            try {
                await Database.addProductionLog({
                    date: form.date,
                    stage: form.stage,
                    stage_detail: form.stage_detail,
                    battery_model: getStageLabel(form.stage, form.stage_detail),
                    quantity_produced: totalPlates,
                    labour_cost_total: machineOperator,
                    material_name: 'Negative Oxide Mix',
                    material_quantity: greyOxideQty + dinalFiberQty + lugninQty + carbonBlackQty + graphitePowderQty + dmWaterQty + acidQty + bariumSulfateQty,
                    unit_weight: oxideWeight,
                    average_unit_price: pastingMaterials.grey_oxide.avgUnitPrice,
                    price_per_grid: negativeCostPerPlate,
                    total_process_cost: negativePastingMaterialCost,
                    process_data: JSON.stringify({
                        grey_oxide_qty: greyOxideQty,
                        dinal_fiber_qty: dinalFiberQty,
                        lugnin_qty: lugninQty,
                        carbon_black_qty: carbonBlackQty,
                        graphite_powder_qty: graphitePowderQty,
                        dm_water_qty: dmWaterQty,
                        acid_qty: acidQty,
                        barium_sulfate_qty: bariumSulfateQty,
                        oxide_weight: oxideWeight,
                        grid_quantity: gridQuantity,
                        total_plates: totalPlates,
                        machine_operator: machineOperator,
                        avg_prices: {
                            grey_oxide: pastingMaterials.grey_oxide.avgUnitPrice,
                            dinal_fiber: pastingMaterials.dinal_fiber.avgUnitPrice,
                            lugnin: pastingMaterials.lugnin.avgUnitPrice,
                            carbon_black: pastingMaterials.carbon_black.avgUnitPrice,
                            graphite_powder: pastingMaterials.graphite_powder.avgUnitPrice,
                            dm_water: pastingMaterials.dm_water.avgUnitPrice,
                            acid: pastingMaterials.acid.avgUnitPrice,
                            barium_sulfate: pastingMaterials.barium_sulfate.avgUnitPrice,
                        },
                    }),
                });
                toast.success('Production run logged.');
                resetForm();
                setShowWizard(false);
                setPage(1);
                await loadData(1);
            } catch {
                toast.error('Failed to save production log.');
            } finally {
                setIsSaving(false);
            }
            return;
        }
        if (form.stage_detail === 'POSITIVE_PASTING') {
            if (!canGoStep6) {
                toast.error('Enter valid positive pasting values.');
                return;
            }
            setIsSaving(true);
            try {
                await Database.addProductionLog({
                    date: form.date,
                    stage: form.stage,
                    stage_detail: form.stage_detail,
                    battery_model: getStageLabel(form.stage, form.stage_detail),
                    quantity_produced: totalPlates,
                    labour_cost_total: machineOperator,
                    material_name: 'Grey Oxide Mix',
                    material_quantity: greyOxideQty + dinalFiberQty + dmWaterQty + acidQty,
                    unit_weight: oxideWeight,
                    average_unit_price: pastingMaterials.grey_oxide.avgUnitPrice,
                    price_per_grid: costPerPlate,
                    total_process_cost: positivePastingMaterialCost,
                    process_data: JSON.stringify({
                        grey_oxide_qty: greyOxideQty,
                        dinal_fiber_qty: dinalFiberQty,
                        dm_water_qty: dmWaterQty,
                        acid_qty: acidQty,
                        oxide_weight: oxideWeight,
                        grid_quantity: gridQuantity,
                        total_plates: totalPlates,
                        machine_operator: machineOperator,
                        avg_prices: {
                            grey_oxide: pastingMaterials.grey_oxide.avgUnitPrice,
                            dinal_fiber: pastingMaterials.dinal_fiber.avgUnitPrice,
                            dm_water: pastingMaterials.dm_water.avgUnitPrice,
                            acid: pastingMaterials.acid.avgUnitPrice,
                        },
                    }),
                });
                toast.success('Production run logged.');
                resetForm();
                setShowWizard(false);
                setPage(1);
                await loadData(1);
            } catch {
                toast.error('Failed to save production log.');
            } finally {
                setIsSaving(false);
            }
            return;
        }
        if (isAssemblyFlow) {
            if (!canGoAssemblyStep4 || !selectedModelData) {
                toast.error('Select a valid battery model and quantity.');
                return;
            }
            setIsSaving(true);
            try {
                await Database.addProductionLog({
                    date: form.date,
                    stage: form.stage,
                    stage_detail: null,
                    battery_model: form.battery_model,
                    quantity_produced: assemblyQuantity,
                    labour_cost_total: assemblyLabourPerBattery * assemblyQuantity,
                    material_name: 'Assembly Batch',
                    material_quantity: assemblyRows.reduce((sum, row) => sum + (row.qtyPerBattery * assemblyQuantity), 0),
                    unit_weight: null,
                    average_unit_price: null,
                    price_per_grid: assemblyPerBatteryCost,
                    total_process_cost: assemblyTotalCost,
                    process_data: JSON.stringify({
                        quantity: assemblyQuantity,
                        labour_per_battery: assemblyLabourPerBattery,
                        positive_plate_avg_price: assemblyPlatePricing.positivePlateAvgPrice,
                        negative_plate_avg_price: assemblyPlatePricing.negativePlateAvgPrice,
                        rows: assemblyRows.map((row) => ({
                            key: row.key,
                            label: row.label,
                            unit: row.unit,
                            qty_per_battery: row.qtyPerBattery,
                            total_qty: row.qtyPerBattery * assemblyQuantity,
                            unit_price: row.unitPrice,
                            total_cost: row.qtyPerBattery * assemblyQuantity * row.unitPrice,
                            source: row.source,
                        })),
                        per_battery_cost: assemblyPerBatteryCost,
                        total_cost: assemblyTotalCost,
                    }),
                });
                toast.success('Assembly run logged.');
                resetForm();
                setShowWizard(false);
                setPage(1);
                await loadData(1);
            } catch {
                toast.error('Failed to save production log.');
            } finally {
                setIsSaving(false);
            }
            return;
        }
        if (!form.stage_detail || !canGoStep5) {
            toast.error('Enter valid raw lead and grid weight values.');
            return;
        }
        setIsSaving(true);
        try {
            await Database.addProductionLog({
                date: form.date,
                stage: form.stage,
                stage_detail: form.stage_detail,
                battery_model: getStageLabel(form.stage, form.stage_detail),
                quantity_produced: totalGrids,
                labour_cost_total: 0,
                material_name: rawLeadMaterial?.name ?? 'Raw Lead',
                material_quantity: rawLeadUsed,
                unit_weight: gridWeight,
                average_unit_price: rawLeadAvgPrice,
                price_per_grid: pricePerGrid,
                total_process_cost: totalCost,
                process_data: null,
            });
            toast.success('Production run logged.');
            resetForm();
            setShowWizard(false);
            setPage(1);
            await loadData(1);
        } catch { toast.error('Failed to save production log.'); }
        finally { setIsSaving(false); }
    };

    const visibleUnits = useMemo(() => data.reduce((s, r) => s + (r.quantity_produced || 0), 0), [data]);

    return (
        <div className="max-w-[1650px] mx-auto space-y-4 pb-20 text-slate-900 relative">
            <style>{`
                @keyframes priceTicker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
            {!showWizard && (
                <>
                    {/* Header */}
                    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white shadow-inner">
                                <Factory size={20} className="text-white/90" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Production</h1>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Log battery production runs and track output</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowFilters(v => !v)} className={`p-2 rounded-lg border text-slate-600 transition-colors ${showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title="Filters">
                                <Filter size={16} />
                            </button>
                            <button onClick={() => loadData(page)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                                <RefreshCw size={16} className={isLoad ? 'animate-spin cursor-not-allowed' : ''} />
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <button onClick={() => { resetForm(); setShowWizard(true); }} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95">
                                Log Run
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Battery Model</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterModel} onChange={e => { setFilterModel(e.target.value); setPage(1); }}>
                                    <option value="">All Models</option>
                                    {modelNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => { setFilterModel(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors">Clear Filters</button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Production Ledger</h2>
                            <p className="text-xs font-semibold text-slate-500">Visible Output: <span className="text-slate-900 font-black ml-1">{visibleUnits.toLocaleString('en-IN')} units</span></p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                                <th className="px-6 py-4 font-bold">Details</th>
                                                <th className="px-6 py-4 font-bold">Stage</th>
                                                <th className="px-6 py-4 font-bold">Model</th>
                                                <th className="px-6 py-4 font-bold text-right">Units Produced</th>
                                                <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {isLoad ? (
                                        <tr><td colSpan={5} className="py-20 text-center"><Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p></td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center"><Factory size={32} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">No production runs recorded yet.</p></td></tr>
                                    ) : data.map(log => {
                                        const modelLabel = String(log.battery_model || getStageLabel(log.stage, log.stage_detail) || 'Production').trim();
                                        const modelBadge = modelLabel.slice(0, 2).toUpperCase();
                                        const logUnits = Number(log.quantity_produced) || 0;
                                        return (
                                        <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black uppercase tracking-wider border border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-colors shrink-0">
                                                        {modelBadge}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Production Run</p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStageMeta(log.stage).accent}`}>
                                                    {getStageLabel(log.stage, log.stage_detail)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                    {modelLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-base font-black text-slate-900">{logUnits.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold text-slate-400">units</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        {total > PAGE_SIZE && (
                            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-white">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString('en-IN')}</p>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowLeft size={14} /></button>
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest px-3">Page {page} of {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowRight size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Log Run Wizard ────────────────────────────────────────────── */}
            {showWizard && createPortal(
                <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans">
                    <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-6 flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest">Step {step} of {isCastingFlow ? 5 : isPastingWorkflow ? 6 : isAssemblyFlow ? 5 : needsPositiveNegative ? 4 : 3}</span>
                            <span className="text-xs font-semibold text-slate-400 ml-2">
                                {step === 1 ? 'Choose Date' : step === 2 ? 'Choose Stage' : step === 3 ? (needsPositiveNegative ? `${form.stage === 'CASTING' ? 'Casting' : 'Pasting'} Type` : isAssemblyFlow ? 'Assembly Plan' : 'Under Construction') : step === 4 ? (isCastingFlow || isPastingWorkflow ? 'Material Input' : isAssemblyFlow ? 'Assembly Cost Sheet' : 'Under Construction') : step === 5 ? (isPastingWorkflow ? 'Oxide & Grid' : 'Review & Log') : 'Review & Log'}
                            </span>
                        </div>
                        <button onClick={() => { setShowWizard(false); resetForm(); }} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="max-w-2xl mx-auto py-12 px-6">
                        <div className="flex flex-col items-center mb-12">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6">
                                <Factory size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                {form.stage_detail ? getStageLabel(form.stage, form.stage_detail) : isAssemblyFlow ? 'Battery Assembly' : getStageMeta(form.stage).label}
                            </h1>
                        </div>

                        <div className="text-left w-full max-w-lg mx-auto min-h-[300px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Production Date</label>
                                        <input type="date" autoFocus className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Production Stage</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {STAGE_OPTIONS.map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setForm(current => ({
                                                        ...current,
                                                        stage: option.value,
                                                        stage_detail: option.value === 'CASTING' || option.value === 'PASTING' ? current.stage_detail : null,
                                                    }))}
                                                    className={`text-left rounded-2xl border px-5 py-4 transition-all active:scale-[0.99] ${form.stage === option.value ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-base font-black tracking-tight">{option.label}</p>
                                                            <p className={`mt-1 text-xs font-semibold ${form.stage === option.value ? 'text-slate-300' : 'text-slate-500'}`}>{option.description}</p>
                                                        </div>
                                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${form.stage === option.value ? 'border-white/20 bg-white/10 text-white' : option.accent}`}>
                                                            {option.value}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    {needsPositiveNegative ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{form.stage === 'CASTING' ? 'Casting Type' : 'Pasting Type'}</label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        {
                                                            value: (form.stage === 'CASTING' ? 'POSITIVE_CASTING' : 'POSITIVE_PASTING') as StageDetail,
                                                            label: form.stage === 'CASTING' ? 'Positive Casting' : 'Positive Pasting',
                                                            accent: 'bg-rose-50 border-rose-200 text-rose-700',
                                                            description: form.stage === 'CASTING' ? 'Proceed with positive-side casting workflow' : 'Proceed with positive-side pasting workflow',
                                                        },
                                                        {
                                                            value: (form.stage === 'CASTING' ? 'NEGATIVE_CASTING' : 'NEGATIVE_PASTING') as StageDetail,
                                                            label: form.stage === 'CASTING' ? 'Negative Casting' : 'Negative Pasting',
                                                            accent: 'bg-blue-50 border-blue-200 text-blue-700',
                                                            description: form.stage === 'CASTING' ? 'Proceed with negative-side casting workflow' : 'Proceed with negative-side pasting workflow',
                                                        },
                                                    ].map(option => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => setForm(current => ({
                                                                ...current,
                                                                stage_detail: option.value,
                                                                grid_weight: form.stage === 'CASTING' ? getDefaultGridWeight(option.value) : current.grid_weight,
                                                                oxide_weight: option.value === 'NEGATIVE_PASTING' ? '0.214' : option.value === 'POSITIVE_PASTING' ? '0.257' : current.oxide_weight,
                                                            }))}
                                                            className={`text-left rounded-2xl border px-5 py-4 transition-all active:scale-[0.99] ${form.stage_detail === option.value ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white'}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="text-base font-black tracking-tight">{option.label}</p>
                                                                    <p className={`mt-1 text-xs font-semibold ${form.stage_detail === option.value ? 'text-slate-300' : 'text-slate-500'}`}>{option.description}</p>
                                                                </div>
                                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${form.stage_detail === option.value ? 'border-white/20 bg-white/10 text-white' : option.accent}`}>
                                                                    {option.value.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : isAssemblyFlow ? (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Battery Type</label>
                                                    <select
                                                        className="mt-3 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                                        value={form.battery_model}
                                                        onChange={(e) => setForm(current => ({ ...current, battery_model: e.target.value }))}
                                                    >
                                                        {modelNames.filter((name) => name !== 'CUSTOM').map((name) => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:col-span-2">
                                                    <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Quantity Today</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        step="1"
                                                        className="mt-3 w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/60 transition-all"
                                                        value={form.quantity_produced}
                                                        onChange={(e) => setForm(current => ({ ...current, quantity_produced: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            {selectedModelData && (
                                                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Per Battery Requirement</p>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Requirement</th>
                                                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Unit</th>
                                                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 text-right">Value</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {[
                                                                        {
                                                                            key: 'positivePlates',
                                                                            label: 'Positive Plates',
                                                                            unit: 'pcs',
                                                                            value: selectedModelData.positivePlates,
                                                                            step: '1',
                                                                        },
                                                                        {
                                                                            key: 'negativePlates',
                                                                            label: 'Negative Plates',
                                                                            unit: 'pcs',
                                                                            value: selectedModelData.negativePlates,
                                                                            step: '1',
                                                                        },
                                                                        {
                                                                            key: 'pvcSeparator',
                                                                            label: 'PVC Separator',
                                                                            unit: 'pcs',
                                                                            value: selectedModelData.pvcSeparator,
                                                                            step: '1',
                                                                        },
                                                                        {
                                                                            key: 'acidLiters',
                                                                            label: 'Acid',
                                                                            unit: 'liters',
                                                                            value: selectedModelData.acidLiters,
                                                                            step: '0.01',
                                                                        },
                                                                    ].map((item) => (
                                                                        <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                                                                            <td className="px-4 py-3">
                                                                                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">{item.unit}</td>
                                                                            <td className="px-4 py-2 text-right">
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    step={item.step}
                                                                                    className="ml-auto w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-base font-black text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                                                                                    value={item.value}
                                                                                    onChange={(e) => {
                                                                                        const value = Number(e.target.value) || 0;
                                                                                        setAllModels(current => ({
                                                                                            ...current,
                                                                                            [form.battery_model]: {
                                                                                                ...current[form.battery_model],
                                                                                                [item.key]: value,
                                                                                            },
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                                                <Factory size={28} />
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Module Status</p>
                                            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Under Construction</h2>
                                            <p className="mt-3 text-sm font-semibold text-slate-500">We will build the next production steps one by one.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    {isCastingFlow && (form.stage_detail === 'POSITIVE_CASTING' || form.stage_detail === 'NEGATIVE_CASTING') ? (
                                        <>
                                            <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                                                <div className="relative overflow-hidden">
                                                    {isRawLeadLoading && (
                                                        <div className="absolute left-5 top-3 z-20">
                                                            <Loader2 size={14} className="animate-spin text-white/70" />
                                                        </div>
                                                    )}
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="flex w-max items-center gap-10 px-5 py-4" style={{ animation: 'priceTicker 18s linear infinite' }}>
                                                        {Array.from({ length: 8 }).map((_, index) => (
                                                            <div key={index} className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 shadow-inner shadow-white/[0.03]">
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{rawLeadMaterial?.name ?? 'Raw Lead'}</span>
                                                                <span className="text-sm font-black text-white">
                                                                    {rawLeadAvgPrice !== null ? `₹${rawLeadAvgPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${rawLeadMaterial?.unit ?? 'kg'}` : 'No purchase history'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Raw Lead Used ({rawLeadMaterial?.unit ?? 'kg'})</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    autoFocus
                                                    placeholder="500"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                    value={form.raw_lead_used}
                                                    onChange={(e) => setForm(current => ({ ...current, raw_lead_used: e.target.value }))}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Grid Weight ({rawLeadMaterial?.unit ?? 'kg'} per grid)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.0001"
                                                    placeholder="0.5"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                    value={form.grid_weight}
                                                    onChange={(e) => setForm(current => ({ ...current, grid_weight: e.target.value }))}
                                                />
                                            </div>
                                        </>
                                    ) : isPastingWorkflow ? (
                                        <>
                                            <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                                                <div className="relative overflow-hidden">
                                                    {isPastingMaterialsLoading && (
                                                        <div className="absolute left-5 top-3 z-20">
                                                            <Loader2 size={14} className="animate-spin text-white/70" />
                                                        </div>
                                                    )}
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="flex w-max items-center gap-10 px-5 py-4" style={{ animation: 'priceTicker 18s linear infinite' }}>
                                                        {[...(isNegativePastingFlow ? NEGATIVE_PASTING_MATERIALS : POSITIVE_PASTING_MATERIALS), ...(isNegativePastingFlow ? NEGATIVE_PASTING_MATERIALS : POSITIVE_PASTING_MATERIALS)].map((item, index) => (
                                                            <div key={`${item.key}-${index}`} className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 shadow-inner shadow-white/[0.03]">
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{item.name}</span>
                                                                <span className="text-sm font-black text-white">
                                                                    {pastingMaterials[item.key].avgUnitPrice !== null ? `₹${(pastingMaterials[item.key].avgUnitPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${pastingMaterials[item.key].material?.unit ?? item.unit}` : 'No purchase history'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 sm:px-3">Material</th>
                                                            <th className="px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 sm:px-3">Unit</th>
                                                            <th className="px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 text-right sm:px-3">Qty Used</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(isNegativePastingFlow ? NEGATIVE_PASTING_MATERIALS : POSITIVE_PASTING_MATERIALS).map((item) => (
                                                            <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="px-2.5 py-2 sm:px-3">
                                                                    <div className="group relative inline-flex">
                                                                        <p className="cursor-help text-xs font-bold text-slate-900 sm:text-sm">
                                                                            {item.name}
                                                                        </p>
                                                                        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-max max-w-[220px] rounded-md bg-slate-950 px-2.5 py-2 text-[10px] font-bold leading-relaxed text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                                                                            {pastingMaterials[item.key].avgUnitPrice !== null
                                                                                ? `${item.name}: ₹${(pastingMaterials[item.key].avgUnitPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${pastingMaterials[item.key].material?.unit ?? item.unit}`
                                                                                : `${item.name}: No purchase history`}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2.5 py-2 text-xs font-semibold text-slate-500 sm:px-3 sm:text-sm">
                                                                    {pastingMaterials[item.key].material?.unit ?? item.unit}
                                                                </td>
                                                                <td className="px-2.5 py-1.5 sm:px-3">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step="0.01"
                                                                        autoFocus={item.key === 'grey_oxide'}
                                                                        placeholder={item.key === 'grey_oxide' ? '0' : item.defaultQty}
                                                                        className={`w-full rounded-md border px-2.5 py-2 text-right text-sm font-black text-slate-900 outline-none transition-all sm:px-3 ${item.key === 'grey_oxide' ? 'border-slate-300 bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5' : 'border-slate-200 bg-slate-50'}`}
                                                                        value={form[`${item.key}_qty` as keyof typeof form]}
                                                                        onChange={(e) => {
                                                                            if (item.key !== 'grey_oxide') return;
                                                                            setForm(current => ({ ...current, [`${item.key}_qty`]: e.target.value }));
                                                                        }}
                                                                        readOnly={item.key !== 'grey_oxide'}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : isAssemblyFlow ? (
                                        <div className="space-y-5">
                                            <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.14)]">
                                                <div className="relative overflow-hidden">
                                                    {isAssemblyPricingLoading && (
                                                        <div className="absolute left-5 top-3 z-20">
                                                            <Loader2 size={14} className="animate-spin text-white/70" />
                                                        </div>
                                                    )}
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-950 via-slate-950/85 to-transparent" />
                                                    <div className="flex w-max items-center gap-10 px-5 py-4" style={{ animation: 'priceTicker 20s linear infinite' }}>
                                                        {Array.from({ length: 2 }).flatMap(() => ([
                                                            { label: 'Positive Plate', value: assemblyPlatePricing.positivePlateAvgPrice, unit: 'plate' },
                                                            { label: 'Negative Plate', value: assemblyPlatePricing.negativePlateAvgPrice, unit: 'plate' },
                                                            { label: 'Container', value: assemblyAvgCosts[containerKey] ?? 0, unit: 'pc' },
                                                            { label: 'PVC Separator', value: assemblyAvgCosts['pvc separator'] ?? 0, unit: 'pc' },
                                                            { label: 'Acid', value: assemblyAvgCosts['acid'] ?? 0, unit: 'L' },
                                                            { label: 'Plus Minus Caps', value: assemblyAvgCosts['plus minus caps'] ?? 0, unit: 'pair' },
                                                        ])).map((item, index) => (
                                                            <div key={`${item.label}-${index}`} className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 shadow-inner shadow-white/[0.03]">
                                                                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{item.label}</span>
                                                                <span className="text-sm font-black text-white">₹{item.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Item</th>
                                                            <th className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 text-right">Quantity</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {assemblyRows.map((row) => {
                                                            const totalQty = row.qtyPerBattery * (Number.isFinite(assemblyQuantity) ? assemblyQuantity : 0);
                                                            return (
                                                                <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                                                                    <td className="px-3 py-2">
                                                                        <p className="text-xs font-bold text-slate-900 sm:text-sm">{row.label}</p>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-xs font-black text-slate-900 sm:text-sm">{totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {row.unit}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                                                <Factory size={28} />
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Module Status</p>
                                            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Under Construction</h2>
                                            <p className="mt-3 text-sm font-semibold text-slate-500">{form.stage === 'PASTING' ? 'Date and pasting selection are ready. The next pasting steps will be built step by step.' : 'Date and casting selection are ready. The remaining steps will be built step by step.'}</p>
                                            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Flow</p>
                                                <p className="mt-2 text-sm font-bold text-slate-900">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">{getStageLabel(form.stage, form.stage_detail)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 5 && isPastingWorkflow && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Oxide Weight (kg)</label>
                                            <input type="number" min={0} step="0.001" className="mt-3 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.oxide_weight} onChange={(e) => setForm(current => ({ ...current, oxide_weight: e.target.value }))} />
                                        </div>
                                        <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 shadow-sm">
                                            <label className="block text-[10px] font-bold text-yellow-700 uppercase tracking-widest">Grid Quantity</label>
                                            <input type="number" min={1} step="1" className="mt-3 w-full px-4 py-3 bg-white border border-yellow-300 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200/60 transition-all" value={form.grid_quantity} onChange={(e) => setForm(current => ({ ...current, grid_quantity: e.target.value }))} />
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Machine Operator</label>
                                            <input type="number" min={0} step="0.01" className="mt-3 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.machine_operator} onChange={(e) => setForm(current => ({ ...current, machine_operator: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && isAssemblyFlow && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Per Piece Battery Cost</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{assemblyPerBatteryCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Battery Type</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border bg-slate-900 text-white border-slate-900">{form.battery_model}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity Today</span>
                                                <span className="text-xl font-black text-slate-900">{(Number.isFinite(assemblyQuantity) ? assemblyQuantity : 0).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Batch Cost</span>
                                                <span className="text-sm font-bold text-slate-900">₹{assemblyTotalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="border-t border-slate-200/60 pt-5 space-y-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assembly Mix</p>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {assemblyRows.map((row) => (
                                                        <span key={row.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                            <span className="text-slate-400">{row.label}</span>
                                                            <span className="text-slate-900">{(row.qtyPerBattery * (Number.isFinite(assemblyQuantity) ? assemblyQuantity : 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {row.unit}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 5 && !isPastingWorkflow && !isAssemblyFlow && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Costing In This Process</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Production Type</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border bg-slate-900 text-white border-slate-900">{getStageLabel(form.stage, form.stage_detail)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today</span>
                                                <span className="text-sm font-bold text-slate-900">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Raw Material Used</span>
                                                <span className="text-sm font-bold text-slate-900">{rawLeadUsed.toLocaleString('en-IN', { maximumFractionDigits: 3 })} {rawLeadMaterial?.unit ?? 'kg'} of {rawLeadMaterial?.name ?? 'Raw Lead'}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Price Per Grid</span>
                                                <span className="text-sm font-bold text-slate-900">₹{pricePerGrid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Grids Being Made</span>
                                                <span className="text-xl font-black text-slate-900">{totalGrids.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 6 && isPastingWorkflow && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{(isNegativePastingFlow ? negativePastingMaterialCost : positivePastingMaterialCost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Production Type</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest border bg-slate-900 text-white border-slate-900">{getStageLabel(form.stage, form.stage_detail)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Plates</span>
                                                <span className="text-xl font-black text-slate-900">{totalPlates.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cost Per Plate</span>
                                                <span className="text-sm font-bold text-slate-900">₹{(isNegativePastingFlow ? negativeCostPerPlate : costPerPlate).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="border-t border-slate-200/60 pt-5 space-y-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Materials Used</p>
                                                <div className="flex flex-wrap gap-2.5">
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                        <span className="text-slate-400">Grey Oxide</span>
                                                        <span className="text-slate-900">{greyOxideQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                        <span className="text-slate-400">Dinal Fiber</span>
                                                        <span className="text-slate-900">{dinalFiberQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                        <span className="text-slate-400">DM Water</span>
                                                        <span className="text-slate-900">{dmWaterQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} liters</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                        <span className="text-slate-400">Acid</span>
                                                        <span className="text-slate-900">{acidQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} liters</span>
                                                    </span>
                                                    {isNegativePastingFlow && (
                                                        <>
                                                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                                <span className="text-slate-400">Lignin</span>
                                                                <span className="text-slate-900">{lugninQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                                <span className="text-slate-400">Carbon Black</span>
                                                                <span className="text-slate-900">{carbonBlackQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                                <span className="text-slate-400">Graphite Powder</span>
                                                                <span className="text-slate-900">{graphitePowderQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                            </span>
                                                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                                <span className="text-slate-400">Barium Sulfate</span>
                                                                <span className="text-slate-900">{bariumSulfateQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg</span>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm">
                                                    <span className="text-emerald-700">Machine Operator</span>
                                                    <span>₹{machineOperator.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="mt-12 flex items-center justify-between w-full max-w-lg mx-auto">
                            <button onClick={() => step > 1 ? setStep((step - 1) as ProdStep) : setShowWizard(false)} className="px-6 py-4 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                {step === 1 ? 'Cancel' : 'Back'}
                            </button>
                            {step < (isCastingFlow ? 5 : isPastingWorkflow ? 6 : isAssemblyFlow ? 5 : needsPositiveNegative ? 4 : 3) ? (
                                <button onClick={() => {
                                    if (step === 1 && !canGoStep2) return toast.error('Select a valid production date.');
                                    if (step === 2 && !canGoStep3) return toast.error('Choose a production stage.');
                                    if (step === 2 && isAssemblyFlow) return setStep(3);
                                    if (step === 2 && !needsPositiveNegative) return setStep(3);
                                    if (step === 3 && !canGoStep4) return toast.error(`Choose positive or negative ${form.stage === 'CASTING' ? 'casting' : 'pasting'}.`);
                                    if (step === 3 && isAssemblyFlow && !canGoAssemblyStep4) return toast.error('Select a battery model and quantity to assemble.');
                                    if (step === 4 && isCastingFlow && !canGoStep5) return toast.error('Enter valid raw lead and grid weight.');
                                    if (step === 4 && isPositivePastingFlow && !canGoPositivePastingStep5) return toast.error('Enter valid positive pasting material quantities.');
                                    if (step === 4 && isNegativePastingFlow && !canGoNegativePastingStep5) return toast.error('Enter valid negative pasting material quantities.');
                                    if (step === 4 && isAssemblyFlow && !canGoAssemblyStep4) return toast.error('Assembly quantity is required.');
                                    if (step === 5 && isPastingWorkflow && !canGoStep6) return toast.error('Enter valid oxide weight and grid quantity.');
                                    setStep((step + 1) as ProdStep);
                                }} className="px-8 py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2">
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : isCastingFlow || isPastingWorkflow || isAssemblyFlow ? (
                                <button onClick={handleSave} disabled={isSaving} className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Log Production
                                </button>
                            ) : (
                                <button onClick={() => { setShowWizard(false); resetForm(); }} className="px-8 py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2">
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Detail Side Panel ─────────────────────────────────────────── */}
            {selectedLog && createPortal(
                <>
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] animate-in fade-in duration-300" onClick={() => setSelectedLog(null)} />
                    <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-[70] animate-in slide-in-from-right duration-300 flex flex-col font-sans" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <Factory size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Production Details</h3>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-3 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center group">
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-10">
                            <div className="text-center mb-12">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Units Produced</p>
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">{selectedLog.quantity_produced.toLocaleString('en-IN')}</h1>
                                <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-widest">units</p>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                        <p className="text-sm font-bold text-slate-900">{new Date(selectedLog.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stage</p>
                                        <p className="text-sm font-bold text-slate-900">{getStageLabel(selectedLog.stage, selectedLog.stage_detail)}</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Process Cost</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedLog.total_process_cost ? `₹${selectedLog.total_process_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</p>
                                    </div>
                                </div>
                                {selectedLog.material_name && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Raw Material</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedLog.material_name}</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material Used</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedLog.material_quantity ?? '—'} kg</p>
                                        </div>
                                    </div>
                                )}
                                {selectedLog.unit_weight && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grid Weight</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedLog.unit_weight} kg</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Average Price</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedLog.average_unit_price ? `₹${selectedLog.average_unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/kg` : '—'}</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price Per Grid</p>
                                            <p className="text-sm font-bold text-slate-900">{selectedLog.price_per_grid ? `₹${selectedLog.price_per_grid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Battery Model</p>
                                    <p className="text-2xl font-black">{selectedLog.battery_model}</p>
                                </div>
                                {/* BOM for selected log */}
                                {allModels[selectedLog.battery_model] && (
                                    <BomPanel
                                        modelName={selectedLog.battery_model}
                                        modelData={allModels[selectedLog.battery_model]}
                                        qty={selectedLog.quantity_produced}
                                        onClose={() => { }}
                                    />
                                )}
                                <div className="p-5 rounded-2xl bg-white border border-slate-100 flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Log ID</p>
                                        <p className="text-xs font-mono font-bold text-slate-500">{selectedLog.id}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedLog.id);
                                            toast.success('Record ID copied to clipboard');
                                        }}
                                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shadow-sm"
                                        title="Copy ID"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 text-center border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Logged in Starline Enterprise via Production</p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
