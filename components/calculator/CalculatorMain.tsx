import React, { useState } from 'react';
import BatterySelector from './BatterySelector';
import CostCalculator from './CostCalculator';
import { getBatteryModelData, BatteryModelData } from './calculatorData';

interface CalculatorProps {
    active?: boolean;
}

const CalculatorMain: React.FC<CalculatorProps> = ({ active }) => {
    const [selectedModel, setSelectedModel] = useState<BatteryModelData | null>(null);

    if (!active) return null;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 w-full max-w-6xl mx-auto">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Price Calculator</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Calculate battery prices based on raw materials
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[400px]">
                {!selectedModel ? (
                    <BatterySelector onSelect={(model) => setSelectedModel(getBatteryModelData(model) || null)} />
                ) : (
                    <CostCalculator
                        modelData={selectedModel}
                        onBack={() => setSelectedModel(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default CalculatorMain;
