
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { WarrantyCalculator } from '../utils/warrantyCalculator';
import {
  Barcode, Search, ShieldCheck, History,
  RefreshCw, Store, Phone, Calendar,
  X, CheckCircle, Check, ArrowRight, PackagePlus,
  Loader2, Zap, LayoutGrid, Package, ArrowDown,
  AlertCircle, ShieldAlert, BadgeCheck, Clock, Lock, Fingerprint,
  User, ChevronRight, Layers, FileText, Smartphone, Copy,
  Printer, Download, FileSpreadsheet, FileJson, StickyNote,
  ArrowDownCircle, HelpCircle, ArrowRightLeft, AlertOctagon,
  ShieldQuestion, CheckCircle2, FileCheck, ClipboardList, Activity, ChevronDown, Edit
} from 'lucide-react';
import { formatDate, getLocalDate } from '../utils';
import { StatusDisplay } from '../components/StatusDisplay';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import BatteryReportSheet from '../components/BatteryReportSheet';
import BatteryEdit from '../components/BatteryEdit';
import { BatteryStatus, type Battery, type Dealer, WarrantyCardStatus, type Sale, Replacement, BatteryModel, WarrantyStatus } from '../types';
import { AuthSession } from '../utils/AuthSession';
import BatteryPrintTemplate from '../components/BatteryPrintTemplate';
import { ProgressFlow } from '../components/ProgressFlow';
import { SuccessFlow } from '../components/SuccessFlow';
import { BatteryInspection } from '../components/BatteryInspection';
import { notify } from '../utils/notifications';
import { SettlementModal, type SettlementTarget } from '../components/SettlementModal';

// Scanner Sub-components
import { ScannerHeader } from '../components/scanner/ScannerHeader';
import { BatchStagingArea } from '../components/scanner/BatchStagingArea';
import { BatteryDetailsCard } from '../components/scanner/BatteryDetailsCard';
import { ReplacementFlow } from '../components/scanner/ReplacementFlow';
import { AuditHistoryTable } from '../components/scanner/AuditHistoryTable';
import { WarrantyCorrectionForm } from '../components/scanner/WarrantyCorrectionForm';
import { UnregisteredUnitFound } from '../components/scanner/UnregisteredUnitFound';

interface ScannerProps {
  initialSearch?: string | null;
  onSearchHandled?: () => void;
  initialState?: any;
  onStateChange?: (state: any) => void;
  active?: boolean;
  onOpenDealers?: (dealerId: string, batteryId: string, status: BatteryStatus, isExpired: boolean) => void;
  onOpenDealerProfile?: (dealerId: string) => void;
}


const TraceHub: React.FC<ScannerProps> = ({ initialSearch, onSearchHandled, initialState, onStateChange, active, onOpenDealers, onOpenDealerProfile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const batchIntervalRef = useRef<any>(null);
  const isBatchProcessingRef = useRef(false);
  const inspectionRef = useRef<HTMLDivElement>(null);

  const [scanBuffer, setScanBuffer] = useState('');
  const [activeAsset, setActiveAsset] = useState<any>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [showAddStock, setShowAddStock] = useState(false);
  const [missingSerial, setMissingSerial] = useState('');
  const [stockForm, setStockForm] = useState({ modelId: '', capacity: '', warranty: 0 });
  const [showEdit, setShowEdit] = useState(false);

  // Batch Assignment Mode State
  const [batchMode, setBatchMode] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ dealerId: '', modelId: '', date: getLocalDate() });
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [stagedItems, setStagedItems] = useState<any[]>([]);

  // Calculate summary for batch mode
  const batchSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    stagedItems.forEach(item => {
      counts[item.model] = (counts[item.model] || 0) + 1;
    });
    return counts;
  }, [stagedItems]);


  const [isReplacing, setIsReplacing] = useState(false);
  const [replacementStep, setReplacementStep] = useState(1);
  const [isConfirmingReplacement, setIsConfirmingReplacement] = useState(false);
  const [pendingAction, setPendingAction] = useState<'EXCHANGE' | 'EDIT' | 'MOVE' | null>(null);
  const [replacementData, setReplacementData] = useState({
    newBatteryId: '',
    dealerId: dealers[0]?.id || '',
    reason: 'DEAD CELL',
    problemDescription: '',
    warrantyCardStatus: 'RECEIVED' as WarrantyCardStatus,
    replacementDate: getLocalDate(),
    soldDate: '',
    paidInAccount: false,
    replenishmentBatteryId: '',
    settlementMethod: 'CREDIT' as 'CREDIT' | 'STOCK' | 'DIRECT'
  });

  const [pendingReturnDate, setPendingReturnDate] = useState(getLocalDate());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showMoveDealer, setShowMoveDealer] = useState(false);
  const [moveDealerData, setMoveDealerData] = useState({ dealerId: '', sentToShopDate: getLocalDate() });

  // Warranty Date Correction State
  const [showDateCorrection, setShowDateCorrection] = useState(false);
  const [correctedSaleDate, setCorrectedSaleDate] = useState('');
  const [warrantyProofFile, setWarrantyProofFile] = useState<File | null>(null);
  const [warrantyCalculation, setWarrantyCalculation] = useState<any>(null);
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);

  // Batch Feedback State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);
  const [batchSuccessDetails, setBatchSuccessDetails] = useState<{ dealerName: string; count: number; items: any[] }>({ dealerName: '', count: 0, items: [] });
  const [resolvingSettlement, setResolvingSettlement] = useState<SettlementTarget | null>(null);

  // Lock Screen State
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [isSessionValid, setIsSessionValid] = useState(AuthSession.isValid());
  const userRole = AuthSession.getCurrentUser()?.role;
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (isInspecting && inspectionRef.current) {
      setTimeout(() => {
        inspectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isInspecting]);

  const loadData = async () => {
    const [d, m, p] = await Promise.all([
      Database.getAll<Dealer>('dealers'),
      Database.getAll<BatteryModel>('models'),
      Database.getConfig('starline_admin_pass')
    ]);
    setDealers(d.sort((a, b) => a.name.localeCompare(b.name)));
    setModels(m.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })));
    setAdminPassword(p || 'starline@2025');
  };

  useEffect(() => {
    loadData();

    // Restore State if available
    if (initialState) {
      if (initialState.scanBuffer) setScanBuffer(initialState.scanBuffer);
      if (initialState.activeAsset) setActiveAsset(initialState.activeAsset);
      if (initialState.batchMode) setBatchMode(initialState.batchMode);
      if (initialState.stagedItems) setStagedItems(initialState.stagedItems);
      if (initialState.batchConfig) setBatchConfig(initialState.batchConfig);
      if (initialState.showAddStock) setShowAddStock(initialState.showAddStock);
      if (initialState.missingSerial) setMissingSerial(initialState.missingSerial);
    } else {
      focusMainInput();
    }
  }, []);

  useEffect(() => {
    if (active) {
      loadData();
      focusMainInput();
    }
  }, [active]);

  // Listen for session changes
  useEffect(() => {
    const handleSessionChange = (e: any) => {
      setIsSessionValid(e.detail.isAuthenticated);
    };

    window.addEventListener('session-changed' as any, handleSessionChange);
    return () => window.removeEventListener('session-changed' as any, handleSessionChange);
  }, []);

  // Handle deep link requests to inspect batteries (from Batches screen)
  useEffect(() => {
    const checkDeepLink = () => {
      const id = localStorage.getItem('deep_link_inspection_id');
      if (id && active) {
        localStorage.removeItem('deep_link_inspection_id');
        setBatchMode(false);
        setScanBuffer(id);
        handleSearch(id);
      }
    };

    // Check on mount and when active state changes
    if (active) {
      checkDeepLink();
    }

    // Listen to cross-component storage triggers
    window.addEventListener('storage', checkDeepLink);
    return () => window.removeEventListener('storage', checkDeepLink);
  }, [active]);

  const handleCancelBatch = () => {
    if (batchIntervalRef.current) {
      clearInterval(batchIntervalRef.current);
    }
    isBatchProcessingRef.current = false;
    setIsBatchProcessing(false);
    setBatchProgress(0);
  };

  // Save State on Change
  useEffect(() => {
    if (onStateChange) {
      const stateToSave = {
        scanBuffer,
        activeAsset,
        batchMode,
        stagedItems,
        batchConfig,
        showAddStock,
        missingSerial
      };
      onStateChange(stateToSave);
    }
  }, [scanBuffer, activeAsset, batchMode, stagedItems, batchConfig, showAddStock, missingSerial]);

  useEffect(() => {
    if (initialSearch) {
      setBatchMode(false);
      handleSearch(initialSearch);
      if (onSearchHandled) onSearchHandled();
    }
  }, [initialSearch]);

  useEffect(() => {
    if (activeAsset?.battery && active) {
      const autoInspect = localStorage.getItem('auto_inspect');
      if (autoInspect === activeAsset.battery.id) {
        setIsInspecting(true);
        localStorage.removeItem('auto_inspect');
      }
    }
  }, [activeAsset, active]);

  // Global Session Sync
  useEffect(() => {
    const handleSessionChange = (e: any) => {
      if (e.detail.isAuthenticated) {
        setIsLocked(false);
        setLockError('');
      } else {
        setIsLocked(true); // LOCK INSTANTLY when global session clears
      }
    };
    window.addEventListener('session-changed' as any, handleSessionChange);
    return () => window.removeEventListener('session-changed' as any, handleSessionChange);
  }, []);

  useEffect(() => {
    if (isReplacing && activeAsset?.battery?.dealerId) {
      setReplacementData(prev => ({ ...prev, dealerId: activeAsset.battery.dealerId }));
      setTimeout(() => replacementInputRef.current?.focus(), 150);
    }
  }, [isReplacing, activeAsset]);

  const focusMainInput = () => {
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Session Lock State
  // const [isLocked, setIsLocked] = useState(false); // Already declared above
  // const [pendingAction, setPendingAction] = useState<string | null>(null); // Already declared above

  const handleLockToggle = (locked: boolean) => {
    if (!locked) {
      // Unlocked successfully
      setIsLocked(false);
      if (pendingAction === 'EDIT' && activeAsset) {
        setShowEdit(true);
      }
      setPendingAction(null);
      notify('Security Clearance Approved', 'success');
    } else {
      // Locked manually
      setIsLocked(true);
      AuthSession.clearSession();
      setPendingAction(null);
    }
  };

  const handleSearch = async (id: string, isAutoScan = false) => {
    if (!id) return;
    const cleanId = id.toUpperCase().trim();

    // BATCH MODE LOGIC
    if (batchMode && batchConfig.dealerId && batchConfig.modelId) {
      if (stagedItems.find(i => i.id === cleanId)) {
        notify(`${cleanId} already staged`, 'error');
        setScanBuffer('');
        return;
      }

      setIsProcessing(true);
      try {
        const selectedModel = models.find(m => m.id === batchConfig.modelId);
        if (!selectedModel) throw new Error("Invalid Model");

        const data = await Database.searchBattery(cleanId);

        // BUG FIX: Prevent batch usage of Sold/Dead units
        if (data && data.battery && data.battery.status !== BatteryStatus.MANUFACTURED) {
          notify(`Cannot stage ${data.battery.status} unit`, 'error');
          setScanBuffer('');
          return;
        }

        const newItem = {
          id: cleanId,
          model: selectedModel.name,
          dealerId: batchConfig.dealerId,
          dealerName: dealers.find(d => d.id === batchConfig.dealerId)?.name || 'DEALER',
          exists: !!(data && data.battery),
          capacity: selectedModel.defaultCapacity,
          manufactureDate: getLocalDate(),
          status: BatteryStatus.ACTIVE,
          warrantyMonths: selectedModel.defaultWarrantyMonths
        };

        setStagedItems(prev => [newItem, ...prev]);
        setLastScanned(cleanId);
        notify(`${cleanId} staged`);

      } catch (e) {
        notify('Batch Scan Failed', 'error');
      } finally {
        setIsProcessing(false);
        setScanBuffer('');
        focusMainInput();
      }
      return;
    }


    // NORMAL MODE LOGIC
    setIsProcessing(true);
    setActiveAsset(null);
    setIsReplacing(false);
    setIsConfirmingReplacement(false);
    setShowAddStock(false);

    try {
      if (!isAutoScan) await new Promise(r => setTimeout(r, 400));
      const data = await Database.searchBattery(cleanId);
      if (data && data.battery) {
        setActiveAsset(data);
        setReplacementData(prev => ({
          ...prev,
          soldDate: data.battery.actualSaleDate || '',
          warrantyCardStatus: data.battery.warrantyCardStatus || 'RECEIVED'
        }));
        notify(`${cleanId} traced successfully`);
      } else {
        setMissingSerial(cleanId);
        setShowAddStock(true);
        notify(`${cleanId} not found in registry`, 'error');
      }
    } catch (e) {
      notify('Trace Interrupted', 'error');
    } finally {
      setIsProcessing(false);
      setScanBuffer('');
      focusMainInput();
    }
  };

  const handleClear = () => {
    setScanBuffer('');
    setActiveAsset(null);
    setMissingSerial('');
    setShowAddStock(false);
    setIsReplacing(false);
    setReplacementStep(1);
    setWarrantyCalculation(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePrintReport = () => {
    Database.logActivity('PRINT_REPORT', 'Printed detailed battery report', { source: 'Scanner' });
    window.electronAPI ? window.electronAPI.printOrPdf() : window.print();
  };

  // Warranty Date Correction Handlers
  const handleDateCorrectionChange = (date: string) => {
    setCorrectedSaleDate(date);

    if (!activeAsset?.battery || !date) {
      setWarrantyCalculation(null);
      return;
    }

    // Validate the date
    const validation = WarrantyCalculator.validateDateCorrection(activeAsset.battery, date);
    if (!validation.valid) {
      notify(validation.reason || 'Invalid date', 'error');
      setWarrantyCalculation(null);
      return;
    }

    // Calculate new warranty expiry
    const newExpiry = WarrantyCalculator.calculateCorrectedExpiry(activeAsset.battery, date);
    const tempBattery = {
      ...activeAsset.battery,
      actualSaleDate: date,
      warrantyCalculationBase: 'ACTUAL_SALE' as const,
      warrantyExpiry: newExpiry
    };

    const result = WarrantyCalculator.calculate(tempBattery);
    setWarrantyCalculation(result);
  };

  const handleApplyDateCorrection = async () => {
    if (!activeAsset?.battery || !correctedSaleDate) {
      notify('Please enter a valid sale date', 'error');
      return;
    }

    setIsApplyingCorrection(true);
    try {
      // In a real implementation, you'd upload the file first and get the path
      const proofPath = warrantyProofFile ? `warranty_proofs/${activeAsset.battery.id}_${Date.now()}.jpg` : undefined;

      await Database.correctSaleDate(
        activeAsset.battery.id,
        correctedSaleDate,
        'WARRANTY_CARD',
        proofPath,
        'Date correction from warranty card during replacement'
      );

      notify('Warranty date corrected successfully', 'success');
      setShowDateCorrection(false);

      // Reload the battery to show updated data
      handleSearch(activeAsset.battery.id);
    } catch (error) {
      console.error(error);
      notify('Failed to apply date correction', 'error');
    } finally {
      setIsApplyingCorrection(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWarrantyProofFile(file);
    }
  };


  const removeStagedItem = (id: string) => {
    setStagedItems(prev => prev.filter(item => item.id !== id));
    if (lastScanned === id) setLastScanned(null);
    notify(`${id} removed from stage`);
  };



  const handleUnlockAndExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword === adminPassword) {
      setIsLocked(false);
      setLockPassword('');
      setLockError('');

      const currentUser = AuthSession.getCurrentUser();
      if (currentUser) {
        AuthSession.saveSession(currentUser);
      }
      notify('Security Clearance Approved', 'success');

      if (pendingAction === 'EDIT') {
        setShowEdit(true);
      } else if (pendingAction === 'MOVE') {
        setShowMoveDealer(true);
      } else {
        setIsReplacing(true);
        setReplacementStep(1);
      }
      setPendingAction(null);
    } else {
      setLockError('Invalid Access Key. Authorization Denied.');
      setLockPassword('');
    }
  };

  const handleReplacementRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;

    if (replacementStep === 1) {
      const newUnitId = replacementData.newBatteryId.toUpperCase().trim();
      if (!newUnitId) {
        notify('Please scan new unit', 'error');
        return;
      }

      if (newUnitId === activeAsset.battery.id) {
        notify('Cannot replace with same unit', 'error');
        return;
      }

      // Check if the unit exists
      const newUnitCheck = await Database.searchBattery(newUnitId);
      if (newUnitCheck && newUnitCheck.battery) {
        // Allow if it's in a valid state for assignment (MANUFACTURED or ACTIVE in dealer stock)
        const validStates = [BatteryStatus.MANUFACTURED, BatteryStatus.ACTIVE];
        if (!validStates.includes(newUnitCheck.battery.status)) {
          notify(`Stock Conflict: ID ${newUnitId} is ${newUnitCheck.battery.status}. Cannot use as replacement.`, 'error');
          return;
        }

        // ✅ BUG FIX: Cross-Dealer Validation
        // If the unit is already assigned to a dealer (e.g. ACTIVE stock), it MUST belong to the SAME dealer
        if (newUnitCheck.battery.dealerId && newUnitCheck.battery.dealerId !== activeAsset.battery.dealerId) {
          const ownerName = dealers.find(d => d.id === newUnitCheck.battery.dealerId)?.name || 'Another Dealer';
          notify(`Stock Conflict: Unit belongs to ${ownerName}. Cannot exchange.`, 'error');
          return;
        }

        // It's valid stock, we will effectively "transfer" it
      }

      // If we are merely in Step 1, we stop here and advance to Step 2
      if (replacementStep === 1) {
        setReplacementStep(2);
        return;
      }
    }

    // ----------------------------------------
    // STEP 2 VALIDATION: Replenishment & Details (Runs on "Confirm" click)
    // ----------------------------------------

    // Check Replenishment Unit if STOCK method selected
    if (replacementData.settlementMethod === 'STOCK') {
      const replId = replacementData.replenishmentBatteryId.toUpperCase().trim();
      if (!replId) {
        notify('Please scan Replenishment Unit for Dealer', 'error');
        return;
      }

      if (replId === replacementData.newBatteryId || replId === activeAsset.battery.id) {
        notify('Replenishment unit cannot be same as faulty or customer unit', 'error');
        return;
      }

      const replCheck = await Database.searchBattery(replId);
      // Ensure unit is valid for assignment
      if (replCheck && replCheck.battery) {
        const isDealerStock = replCheck.battery.dealerId === replacementData.dealerId;
        const status = (replCheck.battery.status || '').toUpperCase();

        // BUG FIX: Allow ACTIVE if it belongs to dealer (Dealer Stock)
        const isValidStock = status === 'MANUFACTURED' || (status === 'ACTIVE' && isDealerStock);

        if (!isValidStock) {
          notify(`Replenishment Unit ${replId} is invalid status: ${replCheck.battery.status}. Must be FRESH STOCK or DEALER STOCK.`, 'error');
          return;
        }
      }
    }

    // Validate soldDate before proceeding to confirmation
    if (!replacementData.soldDate || replacementData.soldDate.trim() === '') {
      notify('Please select the Original Sale Date (Battery Sold by Dealer)', 'error');
      return;
    }

    // ✅ Bug #5: Validate sold date is not in future or before manufacture
    const soldDate = new Date(replacementData.soldDate);
    // Use local date for comparison to avoid timezone issues
    const today = new Date(getLocalDate());
    // Normalize time components for accurate date-only comparison
    soldDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const manufactureDate = new Date(activeAsset.battery.manufactureDate);
    manufactureDate.setHours(0, 0, 0, 0);

    const activationDate = activeAsset.battery.activationDate ? new Date(activeAsset.battery.activationDate) : null;
    if (activationDate) activationDate.setHours(0, 0, 0, 0);

    if (soldDate > today) {
      notify('Sale date cannot be in the future', 'error');
      return;
    }

    // ✅ Fix: Use ORIGINAL battery manufacture date for validation (Start of Lineage)
    // We collect all known batteries in the lineage + current one, and find the EARLIEST manufacture date.
    // This handles cases where lineage arrays might be unsorted or incomplete.
    const allKnownBatteries = [activeAsset.battery, ...(activeAsset.lineage || [])];

    const earliestBattery = allKnownBatteries.reduce((earliest, current) => {
      const eDate = new Date(earliest.manufactureDate);
      const cDate = new Date(current.manufactureDate);
      return cDate < eDate ? current : earliest;
    }, activeAsset.battery);

    const originalManufactureDate = new Date(earliestBattery.manufactureDate);
    originalManufactureDate.setHours(0, 0, 0, 0);

    // Relaxed Validation: Allow dates before manufacture/activation for legacy data support
    // BUT Enforce Strict rule: Sold Date cannot be before ORIGINAL battery manufacture date
    if (soldDate < originalManufactureDate) {
      // This is the Original Battery's manufacture date. Strictly impossible to sell before made.
      notify(`Invalid Date: Sold date cannot be before Original Battery manufacture (${formatDate(earliestBattery.manufactureDate)})`, 'error');
      return;
    }

    // Note: We intentionally ALLOW soldDate < NewBattery.manufactureDate (The inheritance feature)

    if (activationDate && soldDate < activationDate) {
      notify('Note: Customer sale date is before dealer activation (Legacy Record)', 'success');
    }

    setIsConfirmingReplacement(true);
  };

  useEffect(() => {
    if (!activeAsset?.battery) return;

    setMoveDealerData({
      dealerId: activeAsset.battery.dealerId || dealers[0]?.id || '',
      sentToShopDate: activeAsset.battery.activationDate || activeAsset.battery.manufactureDate || getLocalDate()
    });
  }, [activeAsset?.battery?.id, activeAsset?.battery?.dealerId, activeAsset?.battery?.activationDate, activeAsset?.battery?.manufactureDate, dealers]);

  const handleMoveDealerSave = async () => {
    if (!activeAsset?.battery) return;

    if (!moveDealerData.dealerId) {
      notify('Please select a dealer', 'error');
      return;
    }

    if (moveDealerData.dealerId === activeAsset.battery.dealerId) {
      notify('Choose a different dealer to move this battery', 'error');
      return;
    }

    if (!moveDealerData.sentToShopDate) {
      notify('Please select sent to shop date', 'error');
      return;
    }

    try {
      await Database.moveBatteryToDealer(
        activeAsset.battery.id,
        moveDealerData.dealerId,
        moveDealerData.sentToShopDate
      );

      await Database.logActivity(
        'BATTERY_MOVE_DEALER',
        `Moved ${activeAsset.battery.id} to another dealer`,
        {
          batteryId: activeAsset.battery.id,
          previousDealerId: activeAsset.battery.dealerId || null,
          newDealerId: moveDealerData.dealerId,
          sentToShopDate: moveDealerData.sentToShopDate
        }
      );

      notify('Battery moved to other dealer', 'success');
      setShowMoveDealer(false);
      handleSearch(activeAsset.battery.id);
    } catch (error) {
      console.error(error);
      notify(error instanceof Error ? error.message : 'Failed to move battery', 'error');
    }
  };

  const executeReplacement = async () => {
    if (!activeAsset) return;
    setIsActionLoading(true);
    setIsConfirmingReplacement(false);
    const newUnitId = replacementData.newBatteryId.toUpperCase().trim();

    try {
      // 1. Create the new battery record first (Fresh Stock)
      // We clone the physical specs (Model/Capacity) from the old unit
      // 1. Create OR Update the new battery record (Fresh Stock or Stock Transfer)
      // If it exists, we update strict fields. If new, we create.
      const existingNewUnit = await Database.getBattery(newUnitId);

      if (existingNewUnit) {
        // Update existing unit to link it as a replacement
        await Database.run(
          `UPDATE batteries SET 
              replacementCount = ?, 
              originalBatteryId = ?,
              status = 'MANUFACTURED' -- Temporarily set to MANUFACTURED so addReplacement logic can activate it correctly
            WHERE id = ?`,
          [
            (activeAsset.battery.replacementCount || 0) + 1,
            activeAsset.battery.originalBatteryId || activeAsset.battery.id,
            newUnitId
          ]
        );
      } else {
        // Create new
        await Database.addBattery({
          id: newUnitId,
          model: activeAsset.battery.model,
          capacity: activeAsset.battery.capacity,
          manufactureDate: getLocalDate(),
          status: BatteryStatus.MANUFACTURED,
          replacementCount: (activeAsset.battery.replacementCount || 0) + 1, // ✅ Bug #7: Increment count
          warrantyMonths: activeAsset.battery.warrantyMonths,
          dealerId: activeAsset.battery.dealerId || 'CENTRAL',
          originalBatteryId: activeAsset.battery.originalBatteryId || activeAsset.battery.id // ✅ Bug #1: Track original battery
        });
      }

      // 1.5 Handle Replenishment Unit (If STOCK method)
      // Check if unit exists - if not create it (Fresh Stock behavior), if yes update it
      if (replacementData.settlementMethod === 'STOCK' && replacementData.replenishmentBatteryId) {
        const replId = replacementData.replenishmentBatteryId.toUpperCase().trim();
        const existingRepl = await Database.getBattery(replId);

        if (existingRepl) {
          // Existing unit: Mark as Active (Dispatched to Dealer)
          await Database.run(
            `UPDATE batteries SET status = 'ACTIVE', dealerId = ? WHERE id = ?`,
            [activeAsset.battery.dealerId || 'CENTRAL', replId]
          );
        } else {
          // New Unit (Not in DB): Create it and mark Active
          await Database.addBattery({
            id: replId,
            model: activeAsset.battery.model,
            capacity: activeAsset.battery.capacity,
            manufactureDate: getLocalDate(),
            status: BatteryStatus.ACTIVE, // Created and immediately Active (Dispatched)
            replacementCount: 0,
            warrantyMonths: activeAsset.battery.warrantyMonths,
            dealerId: activeAsset.battery.dealerId || 'CENTRAL'
          });
        }
      }

      // 2. Execute the official Swap Protocol
      // Calculate new expiry based on soldDate
      let finalExpiry = activeAsset.sale?.warrantyExpiry || activeAsset.battery.warrantyExpiry;
      if (replacementData.soldDate) {
        const months = activeAsset.battery.warrantyMonths || 24;
        const newExp = new Date(replacementData.soldDate);
        newExp.setMonth(newExp.getMonth() + months);
        finalExpiry = newExp.toISOString().split('T')[0];
      }

      const replacement: Replacement = {
        id: `REP-${Date.now()}`,
        oldBatteryId: activeAsset.battery.id,
        newBatteryId: replacementData.newBatteryId,
        dealerId: replacementData.dealerId,
        replacementDate: replacementData.replacementDate,
        reason: replacementData.reason,
        problemDescription: replacementData.problemDescription,
        warrantyCardStatus: replacementData.warrantyCardStatus,
        paidInAccount: replacementData.settlementMethod === 'CREDIT' ? replacementData.paidInAccount : (replacementData.settlementMethod === 'DIRECT' ? true : false),
        replenishmentBatteryId: replacementData.settlementMethod === 'STOCK' ? replacementData.replenishmentBatteryId : undefined,
        settlementType: replacementData.settlementMethod
      };
      await Database.addReplacement(replacement, {
        customerName: activeAsset.sale?.customerName || null,
        customerPhone: activeAsset.sale?.customerPhone || null,
        warrantyExpiry: finalExpiry,
        correctedOriginalSaleDate: replacementData.soldDate
      });

      await Database.logActivity('EXCHANGE_COMPLETED', `Exchanged ${activeAsset.battery.id} with ${replacementData.newBatteryId}`, {
        oldBatteryId: activeAsset.battery.id,
        newBatteryId: replacementData.newBatteryId,
        dealerId: replacementData.dealerId,
        dealerName: dealers.find(d => d.id === replacementData.dealerId)?.name || 'N/A',
        type: replacementData.settlementMethod
      });

      notify('Exchange Sequence Complete. New Unit Active.', 'success');
      setReplacementData({
        newBatteryId: '',
        dealerId: dealers[0]?.id || '',
        reason: 'DEAD CELL',
        problemDescription: '',
        replacementDate: getLocalDate(),
        warrantyCardStatus: 'RECEIVED',
        soldDate: '',
        paidInAccount: false,
        replenishmentBatteryId: '',
        settlementMethod: 'CREDIT'
      });
      setIsReplacing(false);
      setReplacementStep(1);
      setIsConfirmingReplacement(false);

      // Reload to show the new state
      handleSearch(activeAsset.battery.id);
    } catch (e) {
      console.error(e);
      await Database.logActivity('EXCHANGE_FAILED', `Exchange failed for ${activeAsset.battery.id}`, { error: String(e) });
      notify('Exchange failed during write protocol', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkPending = async () => {
    if (!activeAsset) return;

    if (!showReturnDatePicker) {
      setShowReturnDatePicker(true);
      return;
    }

    setIsActionLoading(true);
    try {
      await Database.markAsPendingExchange(
        activeAsset.battery.id,
        activeAsset.battery.dealerId || 'CENTRAL',
        pendingReturnDate,
        replacementData.warrantyCardStatus,
        replacementData.soldDate
      );
      await Database.logActivity('RETURN_PENDING', `Marked ${activeAsset.battery.id} as Pending Exchange`, { dealerId: activeAsset.battery.dealerId });
      notify(`${activeAsset.battery.id} marked as pending exchange`);
      setActiveAsset(null);
      setIsReplacing(false);
      setReplacementStep(1);
      setShowReturnDatePicker(false);
    } catch (e: any) {
      notify(e.message || 'Failed to mark as pending', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmBatch = async () => {
    const dealerName = dealers.find(d => d.id === batchConfig.dealerId)?.name || 'Unknown Dealer';
    setBatchSuccessDetails({ dealerName: dealerName, count: stagedItems.length, items: [...stagedItems] });

    isBatchProcessingRef.current = true;
    setIsBatchProcessing(true);
    setBatchProgress(0);

    // Progress animation over 5 seconds
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    batchIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setBatchProgress(progress);

      if (currentStep >= steps) {
        clearInterval(batchIntervalRef.current);
      }
    }, interval);

    try {
      // Create a promise that can be cancelled if needed
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, duration);
        // Periodically check if we should abort using the Ref
        const abortCheck = setInterval(() => {
          if (!isBatchProcessingRef.current && currentStep < steps) {
            clearTimeout(timeout);
            clearInterval(abortCheck);
            reject('CANCELLED');
          } else if (currentStep >= steps || !isBatchProcessingRef.current) {
            clearInterval(abortCheck);
            if (!isBatchProcessingRef.current) reject('CANCELLED');
          }
        }, 100);
      });


      const currentUser = AuthSession.getCurrentUser();

      if (userRole === 'ADMIN') {
        // Admins bypass staging and assign directly
        await Database.batchAssign(stagedItems, batchConfig.date);
        await Database.logActivity('BATCH_ASSIGN', `Batch assigned ${stagedItems.length} items to ${dealerName}`, { count: stagedItems.length, dealerId: batchConfig.dealerId, dealerName: dealerName, batteryIds: stagedItems.map(i => i.id) });
        notify(`Directly assigned ${stagedItems.length} units to ${dealerName}`, 'success');
      } else {
        // Workers STAGE
        await Database.createStagedBatch({
          createdBy: currentUser?.id || 'unknown',
          dealerId: batchConfig.dealerId,
          modelId: batchConfig.modelId,
          date: batchConfig.date
        }, stagedItems.map(i => i.id));
        await Database.logActivity('BATCH_STAGED', `Batch staged by ${currentUser?.username || 'Worker'}: ${stagedItems.length} units`, { count: stagedItems.length, dealerId: batchConfig.dealerId });
        notify('Batch processed and staged successfully', 'success');
      }

      isBatchProcessingRef.current = false;
      setIsBatchProcessing(false);
      setShowBatchSuccess(true);
      setStagedItems([]);
    } catch (err) {
      isBatchProcessingRef.current = false;
      setIsBatchProcessing(false);
      if (err === 'CANCELLED') {
        console.log('Batch assignment cancelled by user');
      } else {
        console.error('Batch assignment failed:', err);
        notify(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    }
  };

  const isExpired = activeAsset?.battery?.warrantyExpiry ? new Date() > new Date(activeAsset.battery.warrantyExpiry) : false;
  const pendingSettlement = useMemo(() => {
    if (!activeAsset?.battery?.id || !activeAsset?.replacements?.length) return null;

    return [...activeAsset.replacements]
      .reverse()
      .find((replacement: Replacement) => {
        const isLinkedToBattery =
          replacement.oldBatteryId === activeAsset.battery.id ||
          replacement.newBatteryId === activeAsset.battery.id;

        const isPendingSettlement =
          !replacement.settlementType ||
          (replacement.settlementType === 'CREDIT' && !replacement.paidInAccount);

        return isLinkedToBattery && isPendingSettlement && !!replacement.newBatteryId;
      }) || null;
  }, [activeAsset]);

  const currentDealer = useMemo(
    () => dealers.find((dealer) => dealer.id === activeAsset?.battery?.dealerId) || null,
    [dealers, activeAsset?.battery?.dealerId]
  );

  const destinationDealer = useMemo(
    () => dealers.find((dealer) => dealer.id === moveDealerData.dealerId) || null,
    [dealers, moveDealerData.dealerId]
  );

  const isSameDealerMove = !!activeAsset?.battery?.dealerId && activeAsset.battery.dealerId === moveDealerData.dealerId;

  const getStatusBadge = (status: BatteryStatus, expired: boolean) => {
    if (expired && status !== BatteryStatus.MANUFACTURED) return "bg-rose-50 text-rose-700 border-rose-200";
    switch (status) {
      case BatteryStatus.ACTIVE: return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case BatteryStatus.REPLACEMENT: return "bg-amber-50 text-amber-700 border-amber-200";
      case BatteryStatus.RETURNED: return "bg-slate-100 text-slate-700 border-slate-300";
      case BatteryStatus.RETURNED_PENDING: return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const formatReference = (status: WarrantyCardStatus | string) => {
    switch (status) {
      case 'RECEIVED': return 'Original Card';
      case 'XEROX': return 'Xerox Copy';
      case 'WHATSAPP': return 'WhatsApp/Digital';
      case 'NOT_RECEIVED': return 'Not Received';
      default: return status || 'N/A';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 tracking-tight">
      <style>
        {`
        @media print {
          body > *:not(#batch-print-portal-root) {
            display: none !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: auto !important;
            overflow: visible !important;
          }

          #batch-print-portal-root {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            height: auto !important;
            overflow: visible !important;
            z-index: 9999 !important;
            background-color: white !important;
          }
        }

        #batch-print-portal-root {
          display: none;
        }
        `}
      </style>
      <ScannerHeader
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        lastScanned={lastScanned}
        stagedCount={stagedItems.length}
        dealers={dealers}
        models={models}
        batchConfig={batchConfig}
        setBatchConfig={setBatchConfig}
        scanBuffer={scanBuffer}
        setScanBuffer={setScanBuffer}
        handleSearch={handleSearch}
        handleClear={handleClear}
        isProcessing={isProcessing}
        activeAsset={activeAsset}
        inputRef={inputRef}
        userRole={userRole}
        onOpenDealerProfile={onOpenDealerProfile}
      />

      {batchMode && (
        <BatchStagingArea
          stagedItems={stagedItems}
          setStagedItems={setStagedItems}
          batchSummary={batchSummary}
          removeStagedItem={removeStagedItem}
          handleConfirmBatch={handleConfirmBatch}
          isActionLoading={isActionLoading}
          lastScanned={lastScanned}
        />
      )}

      {showAddStock && (
        <UnregisteredUnitFound
          missingSerial={missingSerial}
          setBatchMode={setBatchMode}
          setScanBuffer={setScanBuffer}
          setMissingSerial={setMissingSerial}
        />
      )}

      {!batchMode && activeAsset && (
        <>
          {showEdit && createPortal(
            <div className="fixed inset-0 z-[120] bg-slate-950/40 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                <BatteryEdit
                  batteryId={activeAsset.battery.id}
                  onClose={() => setShowEdit(false)}
                  onUpdate={() => {
                    setShowEdit(false);
                    handleSearch(activeAsset.battery.id);
                  }}
                />
              </div>
            </div>,
            document.body
          )}

          {showMoveDealer && createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowMoveDealer(false)}
            >
              <div
                className="w-full max-w-md animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="bg-white rounded-xl p-8 shadow-2xl relative border border-slate-200"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded flex items-center justify-center">
                        <Store size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Move Battery</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Update dealer assignment
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMoveDealer(false)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                      aria-label="Close move battery dialog"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">New Dealer</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all outline-none text-xs"
                        value={moveDealerData.dealerId}
                        onChange={(e) => setMoveDealerData(prev => ({ ...prev, dealerId: e.target.value }))}
                      >
                        <option value="">Select dealer</option>
                        {dealers.map((dealer) => (
                          <option key={dealer.id} value={dealer.id}>
                            {dealer.name}{dealer.location ? ` - ${dealer.location}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Sent To Shop Date</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all outline-none text-xs"
                        value={moveDealerData.sentToShopDate}
                        onChange={(e) => setMoveDealerData(prev => ({ ...prev, sentToShopDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="pt-5">
                    <button
                      onClick={handleMoveDealerSave}
                      disabled={!moveDealerData.dealerId || !moveDealerData.sentToShopDate || isSameDealerMove}
                      className="w-full py-4 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-[0.1em] text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSameDealerMove ? 'Choose another dealer' : 'Confirm move'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          <WarrantyCorrectionForm
            isExp={isExpired}
            showDateCorrection={showDateCorrection}
            setShowDateCorrection={setShowDateCorrection}
            isSessionValid={isSessionValid}
            activeAsset={activeAsset}
            correctedSaleDate={correctedSaleDate}
            setCorrectedSaleDate={setCorrectedSaleDate}
            handleDateCorrectionChange={handleDateCorrectionChange}
            handleFileUpload={handleFileUpload}
            warrantyProofFile={warrantyProofFile}
            setWarrantyProofFile={setWarrantyProofFile}
            warrantyCalculation={warrantyCalculation}
            setWarrantyCalculation={setWarrantyCalculation}
            handleApplyDateCorrection={handleApplyDateCorrection}
            isApplyingCorrection={isApplyingCorrection}
          />

          <BatteryDetailsCard
            activeAsset={activeAsset}
            dealers={dealers}
            isLocked={isLocked}
            isSessionValid={isSessionValid}
            isExpired={isExpired}
            showEdit={showEdit}
            setShowEdit={setShowEdit}
            setPendingAction={setPendingAction}
            setIsLocked={setIsLocked}
            handleSearch={handleSearch}
            handlePrintReport={handlePrintReport}
            setIsInspecting={setIsInspecting}
            setIsReplacing={setIsReplacing}
            setReplacementStep={setReplacementStep}
            showDateCorrection={showDateCorrection}
            setShowDateCorrection={setShowDateCorrection}
            userRole={userRole}
            onOpenDealers={onOpenDealers}
            pendingSettlement={pendingSettlement}
            onSettleHere={() => {
              if (!pendingSettlement) return;
              setResolvingSettlement({
                id: pendingSettlement.id,
                dealerName: dealers.find(d => d.id === pendingSettlement.dealerId)?.name || 'Dealer',
                oldBatteryId: pendingSettlement.oldBatteryId
              });
            }}
            onMoveDealer={() => {
              if (AuthSession.isValid()) {
                setShowMoveDealer(true);
              } else {
                setPendingAction('MOVE');
                setIsLocked(true);
              }
            }}
          />

          {isInspecting && (
            <div ref={inspectionRef} className="scroll-mt-6">
              <BatteryInspection
                battery={activeAsset.battery}
                onClose={() => setIsInspecting(false)}
                onComplete={() => {
                  setIsInspecting(false);
                  handleSearch(activeAsset.battery.id);
                }}
                onRefresh={() => {
                  handleSearch(activeAsset.battery.id);
                }}
                onStartExchange={(reason) => {
                  setIsInspecting(false);
                  setIsReplacing(true);
                  setReplacementStep(1);
                  setReplacementData(prev => ({ ...prev, reason }));
                }}
                userRole={userRole}
              />
            </div>
          )}


          <ReplacementFlow
            isReplacing={isReplacing}
            setIsReplacing={setIsReplacing}
            replacementStep={replacementStep}
            setReplacementStep={setReplacementStep}
            replacementData={replacementData}
            setReplacementData={setReplacementData}
            activeAsset={activeAsset}
            handleReplacementRequest={handleReplacementRequest}
            isConfirmingReplacement={isConfirmingReplacement}
            setIsConfirmingReplacement={setIsConfirmingReplacement}
            executeReplacement={executeReplacement}
            isActionLoading={isActionLoading}
            handleMarkPending={handleMarkPending}
            showReturnDatePicker={showReturnDatePicker}
            pendingReturnDate={pendingReturnDate}
            setPendingReturnDate={setPendingReturnDate}
            replacementInputRef={replacementInputRef}
          />

          <AuditHistoryTable
            activeAsset={activeAsset}
            dealers={dealers}
            handleSearch={handleSearch}
            formatReference={formatReference}
            getStatusBadge={getStatusBadge}
          />

          <SettlementModal
            isOpen={!!resolvingSettlement}
            target={resolvingSettlement}
            onClose={() => setResolvingSettlement(null)}
            onSuccess={() => {
              const currentBatteryId = activeAsset?.battery?.id;
              setResolvingSettlement(null);
              if (currentBatteryId) {
                handleSearch(currentBatteryId, true);
              }
            }}
          />
        </>
      )}

      {/* Footer Info */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none p-4 flex justify-between items-end opacity-20 hover:opacity-100 transition-opacity">
        <div className="bg-white/50 backdrop-blur-md p-2 rounded-lg text-[10px] font-mono text-slate-500 pointer-events-auto">
          {dealers.length}DL • {models.length}MD • v2.4.0
        </div>
      </div>

      {/* Session Lock handled via Navigation */}

      {/* Batch Processing Overlay */}
      <ProgressFlow
        isOpen={isBatchProcessing}
        title="Assigning Batteries"
        subtitle={`Dealer: ${batchSuccessDetails.dealerName}`}
        progress={batchProgress}
        stageLabel="DO NOT CLOSE THE APPLICATION"
        onCancel={handleCancelBatch}
      />

      {/* Batch Success Dialog */}
      <SuccessFlow
        isOpen={showBatchSuccess}
        title="Batch Processed"
        details={[
          { label: 'Units Processed', value: batchSuccessDetails.count, primary: true },
          { label: 'Dealer Name', value: batchSuccessDetails.dealerName }
        ]}
        onPrint={() => window.electronAPI ? window.electronAPI.printOrPdf() : window.print()}
        onClose={() => {
          setShowBatchSuccess(false);
          window.location.reload();
        }}
      />

      {/* Hidden Print Portal */}
      {createPortal(
        <div id="batch-print-portal-root" className="bg-white">
          <BatteryPrintTemplate
            dealerName={batchSuccessDetails.dealerName}
            dealerId={batchConfig.dealerId}
            reportTitle={formatDate(batchConfig.date)}
            reportType="batch"
            date={batchConfig.date}
            data={batchSuccessDetails.items}
            tableType="BATCH"
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default TraceHub;
