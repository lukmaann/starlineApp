export interface BatteryModelData {
    model: string;
    containerId: number;
    pvcSeparator: number;
    leadKg: number;
    batteryPacking: number;
    charging: number;
    acidLiters: number;
    batteryScreening: number;
    packingJali: number;
    minusPlusCaps: number;
    labour: number;
    positivePlates: number;
    negativePlates: number;
}

export const batteryModels: Record<string, BatteryModelData> = {
    SL35: {
        model: "SL35",
        containerId: 188,
        pvcSeparator: 18,
        leadKg: 0.6,
        batteryPacking: 18,
        charging: 100,
        acidLiters: 2,
        batteryScreening: 10,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 18,
        negativePlates: 24,
    },
    SL40: {
        model: "SL40",
        containerId: 188,
        pvcSeparator: 24,
        leadKg: 0.6,
        batteryPacking: 18,
        charging: 100,
        acidLiters: 2,
        batteryScreening: 10,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 24,
        negativePlates: 30,
    },
    SL60: {
        model: "SL60",
        containerId: 306,
        pvcSeparator: 24,
        leadKg: 1.2,
        batteryPacking: 18,
        charging: 100,
        acidLiters: 3,
        batteryScreening: 10,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 24,
        negativePlates: 30,
    },
    SL70: {
        model: "SL70",
        containerId: 306,
        pvcSeparator: 30,
        leadKg: 1.4,
        batteryPacking: 18,
        charging: 100,
        acidLiters: 3,
        batteryScreening: 10,
        packingJali: 0,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 30,
        negativePlates: 36,
    },
    SL75: {
        model: "SL75",
        containerId: 319,
        pvcSeparator: 30,
        leadKg: 1.5,
        batteryPacking: 20,
        charging: 150,
        acidLiters: 4,
        batteryScreening: 10,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 30,
        negativePlates: 36,
    },
    SL80: {
        model: "SL80",
        containerId: 319,
        pvcSeparator: 36,
        leadKg: 1.6,
        batteryPacking: 20,
        charging: 150,
        acidLiters: 4,
        batteryScreening: 10,
        packingJali: 0,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 36,
        negativePlates: 42,
    },
    SL90: {
        model: "SL90",
        containerId: 410,
        pvcSeparator: 36,
        leadKg: 1.6,
        batteryPacking: 25,
        charging: 200,
        acidLiters: 6,
        batteryScreening: 25,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 36,
        negativePlates: 42,
    },
    SL100: {
        model: "SL100",
        containerId: 410,
        pvcSeparator: 42,
        leadKg: 1.8,
        batteryPacking: 25,
        charging: 200,
        acidLiters: 6,
        batteryScreening: 25,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 42,
        negativePlates: 48,
    },
    SL120: {
        model: "SL120",
        containerId: 410,
        pvcSeparator: 48,
        leadKg: 1.8,
        batteryPacking: 25,
        charging: 200,
        acidLiters: 6,
        batteryScreening: 25,
        packingJali: 0,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 48,
        negativePlates: 54,
    },
    SL130: {
        model: "SL130",
        containerId: 565,
        pvcSeparator: 54,
        leadKg: 2,
        batteryPacking: 50,
        charging: 300,
        acidLiters: 8,
        batteryScreening: 50,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 54,
        negativePlates: 60,
    },
    SL150: {
        model: "SL150",
        containerId: 585,
        pvcSeparator: 60,
        leadKg: 2.2,
        batteryPacking: 50,
        charging: 300,
        acidLiters: 12,
        batteryScreening: 50,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 60,
        negativePlates: 66,
    },
    SL180: {
        model: "SL180",
        containerId: 675,
        pvcSeparator: 72,
        leadKg: 2.5,
        batteryPacking: 50,
        charging: 300,
        acidLiters: 15,
        batteryScreening: 50,
        packingJali: 12,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 72,
        negativePlates: 78,
    },
    B23: {
        model: "B23",
        containerId: 306,
        pvcSeparator: 30,
        leadKg: 1.2,
        batteryPacking: 18,
        charging: 100,
        acidLiters: 3,
        batteryScreening: 10,
        packingJali: 0,
        minusPlusCaps: 2,
        labour: 0,
        positivePlates: 30,
        negativePlates: 36,
    },
    CUSTOM: {
        model: "Custom Variant",
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
    }
};

export const getCustomBatteryModels = (): Record<string, BatteryModelData> => {
    try {
        const stored = localStorage.getItem('starline_custom_batteries');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to parse custom batteries", e);
    }
    return {};
};

export const getDeletedBatteryModels = (): string[] => {
    try {
        const stored = localStorage.getItem('starline_deleted_batteries');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to parse deleted batteries", e);
    }
    return [];
};

export const saveCustomBatteryModel = (model: BatteryModelData, oldModelName?: string) => {
    const current = getCustomBatteryModels();

    // If the model was renamed, delete the old custom record if it existed
    if (oldModelName && oldModelName !== model.model && current[oldModelName]) {
        delete current[oldModelName];
    }

    current[model.model] = model;
    localStorage.setItem('starline_custom_batteries', JSON.stringify(current));

    // If we are editing/saving a model that was previously deleted, "undelete" it
    const deleted = getDeletedBatteryModels();
    if (deleted.includes(model.model)) {
        localStorage.setItem('starline_deleted_batteries', JSON.stringify(deleted.filter(m => m !== model.model)));
    }
};

export const deleteBatteryModel = (modelName: string) => {
    // 1. Delete from custom if it exists there
    const currentCustom = getCustomBatteryModels();
    if (currentCustom[modelName]) {
        delete currentCustom[modelName];
        localStorage.setItem('starline_custom_batteries', JSON.stringify(currentCustom));
    }

    // 2. Add to deleted tracking list so base models are also hidden
    const deleted = getDeletedBatteryModels();
    if (!deleted.includes(modelName)) {
        deleted.push(modelName);
        localStorage.setItem('starline_deleted_batteries', JSON.stringify(deleted));
    }
};

export const getAllBatteryModels = (): Record<string, BatteryModelData> => {
    const merged = { ...batteryModels, ...getCustomBatteryModels() };
    const deleted = getDeletedBatteryModels();

    // Remove the strictly internal CUSTOM stub and any user-deleted models
    deleted.push('CUSTOM');

    Object.keys(merged).forEach(key => {
        if (deleted.includes(key)) {
            delete merged[key];
        }
    });

    return merged;
};

export const getAvailableBatteryModels = () => {
    return Object.keys(getAllBatteryModels());
};

export const getBatteryModelData = (modelName: string): BatteryModelData | undefined => {
    return getAllBatteryModels()[modelName];
};
