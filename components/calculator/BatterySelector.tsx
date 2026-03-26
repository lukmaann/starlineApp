import React, { useState, useEffect } from 'react';
import { Battery, Plus, Edit2, Trash2 } from 'lucide-react';
import { getAvailableBatteryModels, deleteBatteryModel, getBatteryModelData, BatteryModelData } from './calculatorData';
import CustomBatteryModal from './CustomBatteryModal';

interface BatterySelectorProps {
    onSelect: (model: string) => void;
}

const BatterySelector: React.FC<BatterySelectorProps> = ({ onSelect }) => {
    const [models, setModels] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<BatteryModelData | null>(null);

    const loadModels = () => {
        setModels(getAvailableBatteryModels());
    };

    useEffect(() => {
        loadModels();
    }, []);

    const handleOpenNew = () => {
        setEditingData(null);
        setIsModalOpen(true);
    };

    const handleEdit = (e: React.MouseEvent, modelName: string) => {
        e.stopPropagation();
        const data = getBatteryModelData(modelName);
        if (data) {
            setEditingData(data);
            setIsModalOpen(true);
        }
    };

    const handleDelete = (e: React.MouseEvent, modelName: string) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the ${modelName} model?`)) {
            deleteBatteryModel(modelName);
            loadModels();
        }
    };

    const handleCustomSave = (newModelName: string) => {
        loadModels(); // Refresh the list to include the newly saved custom model
        onSelect(newModelName); // Auto-select it to jump straight into the calculator
    };
    return (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="text-center mb-10">
                <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <Battery size={28} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Battery Model</h2>
                <p className="text-slate-500 mt-2 font-medium max-w-md mx-auto">
                    Choose a Starline battery model to pre-fill the raw material quantities for the cost calculation.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                <button
                    onClick={handleOpenNew}
                    className="group relative flex flex-col items-center justify-center p-6 bg-slate-50/50 border border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all z-10 overflow-hidden min-h-[140px]"
                >
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="text-blue-500" strokeWidth={3} />
                    </div>
                    <span className="relative z-10 text-sm font-bold tracking-tight text-slate-500 group-hover:text-blue-700 transition-colors uppercase">
                        New Custom Model
                    </span>
                </button>

                {models.map(model => (
                    <div
                        key={model}
                        onClick={() => onSelect(model)}
                        className="group relative flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all cursor-pointer z-10 overflow-hidden min-h-[140px]"
                    >
                        {/* Hover Actions */}
                        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all z-20">
                            <button
                                onClick={(e) => handleEdit(e, model)}
                                className="w-8 h-8 rounded-md bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, model)}
                                className="w-8 h-8 rounded-md bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-50 transition-opacity z-0" />
                        <span className="relative z-10 text-lg font-bold tracking-tight text-slate-700 group-hover:text-blue-600 transition-colors">
                            {model}
                        </span>
                    </div>
                ))}
            </div>

            <CustomBatteryModal
                isOpen={isModalOpen}
                initialData={editingData}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCustomSave}
            />
        </div>
    );
};

export default BatterySelector;
