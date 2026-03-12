import React, { useState } from 'react';
import { X, Save, Battery } from 'lucide-react';
import { BatteryModelData, saveCustomBatteryModel } from './calculatorData';

interface CustomBatteryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (modelName: string, oldModelName?: string) => void;
    initialData?: BatteryModelData | null;
}

const CustomBatteryModal: React.FC<CustomBatteryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<BatteryModelData>({
        model: '',
        containerId: 0,
        pvcSeparator: 0,
        leadKg: 0,
        batteryPacking: 0,
        charging: 0,
        acidLiters: 0,
        batteryScreening: 0,
        packingJali: 0,
        minusPlusCaps: 0,
        labour: 0,
        positivePlates: 0,
        negativePlates: 0,
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen) {
            setFormData({
                model: '', containerId: 0, pvcSeparator: 0, leadKg: 0, batteryPacking: 0,
                charging: 0, acidLiters: 0, batteryScreening: 0, packingJali: 0,
                minusPlusCaps: 0, labour: 0, positivePlates: 0, negativePlates: 0,
            });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (field: keyof BatteryModelData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: field === 'model' ? value : parseFloat(value) || 0
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.model.trim()) {
            alert("Please enter a model name.");
            return;
        }

        // Save to local storage
        saveCustomBatteryModel(formData, initialData?.model);

        // Notify parent to refresh and select the new model
        onSave(formData.model, initialData?.model);
        onClose();

        // Reset form
        setFormData({
            model: '', containerId: 0, pvcSeparator: 0, leadKg: 0, batteryPacking: 0,
            charging: 0, acidLiters: 0, batteryScreening: 0, packingJali: 0,
            minusPlusCaps: 0, labour: 0, positivePlates: 0, negativePlates: 0,
        });
    };

    const inputFields: { label: string; field: keyof BatteryModelData; step?: string }[] = [
        { label: 'Positive Plates', field: 'positivePlates' },
        { label: 'Negative Plates', field: 'negativePlates' },
        { label: 'PVC Separator', field: 'pvcSeparator' },
        { label: 'Lead (kg)', field: 'leadKg', step: '0.1' },
        { label: 'Acid (Liters)', field: 'acidLiters', step: '0.1' },
        { label: 'Packing Jali', field: 'packingJali' },
        { label: 'Container', field: 'containerId' },
        { label: 'Battery Packing', field: 'batteryPacking' },
        { label: 'Charging', field: 'charging' },
        { label: 'Battery Screening', field: 'batteryScreening' },
        { label: 'Minus Plus Caps', field: 'minusPlusCaps' },
        { label: 'Labour', field: 'labour' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                            <Battery size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Battery Model' : 'New Custom Battery'}</h2>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Define raw material quantities</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body / Form */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                    <form id="custom-battery-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Model Name */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">Model Name</label>
                            <input
                                type="text"
                                required
                                value={formData.model}
                                onChange={(e) => handleChange('model', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-md px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                placeholder="e.g. SL200 Custom"
                            />
                        </div>

                        <div className="h-px bg-slate-200" />

                        {/* Grid Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inputFields.map((item) => (
                                <div key={item.field} className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        {item.label}
                                    </label>
                                    <input
                                        type="number"
                                        step={item.step || "1"}
                                        min="0"
                                        value={formData[item.field] || ''}
                                        onChange={(e) => handleChange(item.field, e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-400 transition-all font-mono shadow-sm"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="custom-battery-form"
                        className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Model
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CustomBatteryModal;
