
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
import SessionLock from '../components/SessionLock';
import { BatteryStatus, type Battery, type Dealer, WarrantyCardStatus, type Sale, Replacement, BatteryModel, WarrantyStatus } from '../types';
import { AuthSession } from '../utils/AuthSession';
import BatteryPrintTemplate from '../components/BatteryPrintTemplate';

interface ScannerProps {
  initialSearch?: string | null;
  onSearchHandled?: () => void;
  initialState?: any;
  onStateChange?: (state: any) => void;
  active?: boolean;
}


const TraceHub: React.FC<ScannerProps> = ({ initialSearch, onSearchHandled, initialState, onStateChange, active }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const batchIntervalRef = useRef<any>(null);
  const isBatchProcessingRef = useRef(false);

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
  const [pendingAction, setPendingAction] = useState<'EXCHANGE' | 'EDIT' | null>(null);
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

  // Warranty Date Correction State
  const [showDateCorrection, setShowDateCorrection] = useState(false);
  const [correctedSaleDate, setCorrectedSaleDate] = useState('');
  const [warrantyProofFile, setWarrantyProofFile] = useState<File | null>(null);
  const [warrantyCalculation, setWarrantyCalculation] = useState<any>(null);
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);

  // Batch Feedback State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);
  const [batchSuccessDetails, setBatchSuccessDetails] = useState<{ dealerName: string; count: number; items: any[] }>({ dealerName: '', count: 0, items: [] });

  // Lock Screen State
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [isSessionValid, setIsSessionValid] = useState(AuthSession.isValid());

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
      handleSearch(initialSearch);
      if (onSearchHandled) onSearchHandled();
    }
  }, [initialSearch]);

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

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message, type } }));
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
        // Default soldDate to when battery was dispatched to dealer (activationDate)
        // not when it was sold to customer (warrantyStartDate)
        setReplacementData(prev => ({
          ...prev,
          soldDate: data.battery.actualSaleDate || data.battery.activationDate || '',
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
    window.print();
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

      AuthSession.saveSession();
      notify('Security Clearance Approved', 'success');

      if (pendingAction === 'EDIT') {
        setShowEdit(true);
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

  const isExpired = activeAsset?.battery?.warrantyExpiry ? new Date() > new Date(activeAsset.battery.warrantyExpiry) : false;

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
      <div className={`transition-all duration-300 ${batchMode ? 'bg-indigo-900 border-indigo-700' : 'bg-white border-slate-200'} border rounded-2xl p-8 shadow-sm no-print`}>
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setBatchMode(!batchMode)} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${batchMode ? 'bg-white text-indigo-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {batchMode ? 'Batch Mode Active' : 'Normal Trace'}
              </button>
              {batchMode && <span className="text-indigo-200 text-xs font-bold uppercase animate-pulse">Ready for rapid assignment</span>}
            </div>
            {batchMode && lastScanned && <div className="text-white font-mono text-sm">Last: {lastScanned} <CheckCircle2 className="inline text-emerald-400" size={16} /></div>}
          </div>

          {batchMode && (
            <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
              <select className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400" value={batchConfig.dealerId} onChange={e => setBatchConfig({ ...batchConfig, dealerId: e.target.value })}>
                <option value="">Select Target Dealer</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400" value={batchConfig.modelId} onChange={e => setBatchConfig({ ...batchConfig, modelId: e.target.value })}>
                <option value="">Select Default Model</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input
                type="date"
                className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400"
                value={batchConfig.date}
                onChange={e => setBatchConfig({ ...batchConfig, date: e.target.value })}
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0"><div className={`${batchMode ? 'bg-white/10 text-white' : 'bg-blue-600/10 text-blue-600'} p-4 rounded-2xl`}><Barcode size={32} /></div></div>
            <div className="flex-1 w-full relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${batchMode ? 'text-indigo-300' : 'text-slate-400'}`} size={20} />
              <input ref={inputRef} disabled={isProcessing} placeholder={batchMode ? "SCAN TO STAGE..." : "Input serial identifier..."} className={`w-full pl-12 pr-6 py-4 rounded-xl outline-none font-bold text-lg transition-all uppercase tracking-widest mono ${batchMode ? 'bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400 focus:bg-indigo-950 focus:border-indigo-400' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'}`} value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(scanBuffer)} />
              {isProcessing && <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${batchMode ? 'text-white' : 'text-blue-600'}`} size={20} />}
            </div>
            <button onClick={() => handleSearch(scanBuffer)} disabled={isProcessing || !scanBuffer || (batchMode && (!batchConfig.dealerId || !batchConfig.modelId))} className={`px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-30 uppercase tracking-widest ${batchMode ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-black'}`}>{batchMode ? 'Stage' : 'Trace Unit'}</button>

            {(activeAsset || scanBuffer) && (
              <button
                onClick={handleClear}
                className="p-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-95"
                title="Clear Search"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {batchMode && stagedItems.length > 0 && (
            <div className="border-t border-indigo-800 pt-6 animate-in slide-in-from-top-2">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center text-indigo-200 text-[10px] font-bold uppercase tracking-widest">
                    <span>Staging Log ({stagedItems.length})</span>
                    <button onClick={() => setStagedItems([])} className="hover:text-white transition-colors">Clear All</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {stagedItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-indigo-950/50 rounded-lg border border-indigo-800/50 group/item">
                        <div className="flex flex-col">
                          <span className="text-white font-mono font-bold text-lg">{item.id}</span>
                          <span className="text-sm font-bold text-indigo-400">{item.model}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.exists ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">UPDATE</span> : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">NEW</span>}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStagedItem(item.id); }}
                            className="p-1.5 text-indigo-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover/item:opacity-100"
                            title="Remove from stage"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-64 bg-indigo-950 rounded-xl p-6 flex flex-col justify-between shrink-0 border border-indigo-800">
                  <div className="space-y-4">
                    <h4 className="text-white font-bold text-sm uppercase tracking-tight">Batch Summary</h4>
                    <div className="space-y-2">
                      {Object.entries(batchSummary).map(([model, count]) => (
                        <div key={model} className="flex justify-between text-xs font-bold text-indigo-200 uppercase">
                          <span>{model}</span>
                          <span className="text-white mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
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

                        await Database.batchAssign(stagedItems, batchConfig.date);
                        await Database.logActivity('BATCH_ASSIGN', `Batch assigned ${stagedItems.length} items to ${dealerName}`, { count: stagedItems.length, dealerId: batchConfig.dealerId, dealerName: dealerName, batteryIds: stagedItems.map(i => i.id) });

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
                          notify('Error: Batch processing failed. Please try again.', 'error');
                        }
                      }
                    }}
                    disabled={isActionLoading}
                    className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isActionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Confirm Process
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddStock && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl animate-in zoom-in-95 no-print text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldQuestion size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Unregistered Unit Found</h3>
          <p className="text-slate-500 font-medium mb-8">
            The identifier <span className="font-mono font-bold text-slate-900">{missingSerial}</span> is not in the registry.
            To add new stock and assign it to a dealer, please switch to Batch Mode.
          </p>

          <button
            onClick={() => {
              setBatchMode(true);
              setShowAddStock(false);
              setScanBuffer('');
              setMissingSerial('');
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-3 group"
          >
            <Layers size={18} className="group-hover:scale-110 transition-transform" />
            Switch to Batch Mode
          </button>
        </div>
      )}

      {activeAsset && (() => {
        const isExp = activeAsset.battery.warrantyExpiry ? new Date() > new Date(activeAsset.battery.warrantyExpiry) : false;
        const getCardColor = () => {
          if (isExp && activeAsset.battery.status !== BatteryStatus.MANUFACTURED) return 'border-rose-200 bg-rose-50';
          switch (activeAsset.battery.status) {
            case BatteryStatus.ACTIVE: return 'border-emerald-200 bg-emerald-50';
            case BatteryStatus.RETURNED: return 'border-slate-300 bg-slate-100 opacity-75';
            case BatteryStatus.REPLACEMENT: return 'border-amber-200 bg-amber-50';
            case BatteryStatus.MANUFACTURED: return activeAsset.battery.dealerId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white';
            default: return 'border-slate-200 bg-white';
          }
        };

        return (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            {isExp && (
              <div className="bg-rose-600 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <ShieldAlert size={32} />
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Warranty Expired</h2>
                    <p className="text-xs font-bold opacity-90 uppercase tracking-widest">Coverage ended on {formatDate(activeAsset.battery.warrantyExpiry)}</p>
                  </div>
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <span className="text-xs font-black uppercase tracking-widest">No Claims Allowed</span>
                </div>
              </div>
            )}

            {/* Warranty Date Correction Section - Only if Unlocked */}
            {isExp && !showDateCorrection && isSessionValid && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-amber-600" size={24} />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">Warranty Date Correction Available</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        If the dealer sold this battery later than the activation date, you can correct the warranty period.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDateCorrection(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Correct Date
                  </button>
                </div>
              </div>
            )}

            {isExp && showDateCorrection && isSessionValid && (
              <div className="bg-white border-2 border-amber-300 rounded-2xl p-8 shadow-xl animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Calendar className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Warranty Date Correction</h3>
                      <p className="text-xs text-amber-600 uppercase tracking-wider">Enter actual customer sale date from warranty card</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDateCorrection(false);
                      setCorrectedSaleDate('');
                      setWarrantyCalculation(null);
                      setWarrantyProofFile(null);
                    }}
                    className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <X className="text-amber-600" size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Current vs Corrected Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Current Activation Date</p>
                      <p className="text-lg font-black text-slate-900 mono">{formatDate(activeAsset.battery.activationDate)}</p>
                      <p className="text-xs text-slate-500 mt-1">Warranty Expires: {formatDate(activeAsset.battery.warrantyExpiry)}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-amber-600 uppercase mb-2">Actual Sale Date (from Card)</p>
                      <input
                        type="date"
                        className="w-full px-4 py-2 border-2 border-amber-300 rounded-lg font-bold text-lg text-slate-900 focus:border-amber-500 focus:outline-none transition-all"
                        value={correctedSaleDate}
                        onChange={(e) => handleDateCorrectionChange(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">Upload Warranty Card Proof (Optional)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 transition-all"
                      />
                    </div>
                    {warrantyProofFile && (
                      <p className="text-xs text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        File uploaded: {warrantyProofFile.name}
                      </p>
                    )}
                  </div>

                  {/* Recalculated Warranty Display */}
                  {warrantyCalculation && (
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="text-emerald-600" size={24} />
                        <h4 className="font-black text-emerald-900 uppercase tracking-tight">Recalculated Warranty</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">New Expiry Date</p>
                          <p className="text-2xl font-black text-emerald-600 mono">{formatDate(warrantyCalculation.effectiveExpiryDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Warranty Status</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border-2 ${WarrantyCalculator.getStatusColorClass(warrantyCalculation.status)}`}>
                              {WarrantyCalculator.getStatusText(warrantyCalculation.status)}
                            </span>
                            {warrantyCalculation.isInGracePeriod && (
                              <span className="text-xs text-amber-600 font-bold">⚠️ Grace Period</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {warrantyCalculation.status === WarrantyStatus.VALID && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200">
                          <p className="text-xs text-emerald-700 font-bold flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            This battery is now VALID for warranty replacement!
                          </p>
                        </div>
                      )}

                      {warrantyCalculation.isInGracePeriod && (
                        <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                          <p className="text-xs text-amber-800 font-bold">
                            ⚠️ Grace period ends on: {formatDate(warrantyCalculation.gracePeriodEndsOn)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        setShowDateCorrection(false);
                        setCorrectedSaleDate('');
                        setWarrantyCalculation(null);
                        setWarrantyProofFile(null);
                      }}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyDateCorrection}
                      disabled={!correctedSaleDate || !warrantyCalculation || isApplyingCorrection}
                      className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isApplyingCorrection ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Applying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Apply Correction
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEdit ? (
              <BatteryEdit
                batteryId={activeAsset.battery.id}
                onClose={() => setShowEdit(false)}
                onUpdate={() => handleSearch(activeAsset.battery.id)}
              />
            ) : (
              <>
                {/* Status Banner System */}
                {!isExp && (
                  <StatusDisplay
                    status={activeAsset.battery.status}
                    isExpired={isExp}
                    dealerId={activeAsset.battery.dealerId}
                    variant="banner"
                    className="rounded-t-2xl"
                  />
                )}

                <div className={`border rounded-2xl rounded-t-none shadow-sm overflow-hidden transition-colors duration-500 ${getCardColor()}`}>
                  <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-4"><h1 className="text-4xl font-black tracking-tight text-slate-900 mono uppercase">{activeAsset.battery.id}</h1></div>
                      <p className="text-slate-500 font-bold text-lg uppercase">{activeAsset.battery.model} • {activeAsset.battery.capacity}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Hide Edit Button if Locked */}
                      {!isLocked && (
                        <button onClick={() => {
                          if (AuthSession.isValid()) {
                            setShowEdit(true);
                          } else {
                            setPendingAction('EDIT');
                            setIsLocked(true);
                          }
                        }} className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-100 no-print flex items-center gap-2">
                          <Edit size={20} />
                          <span className="text-xs font-bold uppercase">Edit Record</span>
                        </button>
                      )}
                      <Sheet>
                        <SheetTrigger asChild>
                          <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 no-print flex items-center gap-2">
                            <FileText size={20} />
                            <span className="text-xs font-bold uppercase">Create Report</span>
                          </button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-[50vw] p-0">
                          <BatteryReportSheet
                            battery={activeAsset.battery}
                            lineage={activeAsset.lineage}
                            replacements={activeAsset.replacements}
                            dealers={dealers}
                            saleDate={activeAsset.lineageSales?.find((s: any) => s.batteryId === activeAsset.battery.id)?.saleDate}
                            onPrint={handlePrintReport}
                          />
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ownership record</p><div className="flex items-center space-x-3">{activeAsset.battery.customerName ? <><div className="p-2 bg-slate-50 rounded-lg"><User size={18} /></div><span className="font-bold text-slate-900 uppercase">{activeAsset.battery.customerName}</span></> : <p className="text-sm font-bold text-slate-300 italic">Inventory Stock</p>}</div></div> */}
                    <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lifecycle timeline</p><div className="space-y-2 text-xs font-bold"><div className="flex justify-between"><span className="text-slate-400">Sold On</span><span className="mono">{formatDate(activeAsset.battery.activationDate)}</span></div><div className="flex justify-between"><span className="text-slate-400">Expiry</span><span className="mono text-rose-600 font-black">{formatDate(activeAsset.battery.warrantyExpiry)}</span></div></div></div>
                    <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dispatch metadata</p><div className="space-y-2 text-xs font-bold"><div className="flex justify-between"><span className="text-slate-400">Dealer</span><span className="text-blue-600 truncate max-w-[120px] uppercase">{dealers.find(d => d.id === activeAsset.battery.dealerId)?.name || 'Central'}</span></div><div className="flex justify-between"><span className="text-slate-400">Swap count</span><span className="mono">{activeAsset.battery.replacementCount}</span></div></div></div>
                  </div>
                </div>

                <div className="no-print">
                  {activeAsset.battery.status === BatteryStatus.MANUFACTURED ? (
                    <div className="bg-blue-600 p-8 rounded-2xl shadow-xl flex justify-between items-center text-white"><div><h3 className="text-xl font-bold uppercase tracking-tight mb-2">Central Stock Unit</h3><p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">This unit is currently in central stock. Use Batch Mode to dispatch and activate.</p></div><Package size={32} className="opacity-40" /></div>
                  ) : !isExpired && activeAsset.battery.status !== BatteryStatus.RETURNED ? (
                    <div className="space-y-6">

                      {!isReplacing && !isConfirmingReplacement && !isLocked && (
                        <div className="space-y-4">
                          {activeAsset.battery.status === BatteryStatus.RETURNED_PENDING ? (
                            <button
                              onClick={() => {
                                if (AuthSession.isValid()) {
                                  setIsReplacing(true);
                                  setReplacementStep(1);
                                } else {
                                  setPendingAction('EXCHANGE');
                                  setIsLocked(true);
                                }
                              }}
                              className="w-full py-8 text-2xl bg-orange-600 text-white rounded-3xl font-black flex items-center justify-center space-x-4 hover:bg-orange-700 transition-all shadow-2xl active:scale-[0.98] uppercase tracking-[0.2em] animate-pulse border-4 border-orange-600 hover:border-white/20"
                            >
                              <RefreshCw size={28} />
                              <span>Resume Exchange</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (AuthSession.isValid()) {
                                  setIsReplacing(true);
                                  setReplacementStep(1);
                                } else {
                                  setPendingAction('EXCHANGE');
                                  setIsLocked(true);
                                }
                              }}
                              className="w-full py-8 text-2xl bg-slate-900 text-white rounded-3xl font-black flex items-center justify-center space-x-4 hover:bg-black transition-all shadow-2xl active:scale-[0.98] uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 border-4 border-slate-900 hover:border-white/20"
                            >
                              <RefreshCw size={28} />
                              <span>Start Warranty Exchange</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* SessionLock component now handles this overlay */}

                      {isReplacing && !isConfirmingReplacement && (
                        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-6 space-y-8 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600"></div>
                          <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                            <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Exchange Protocol</h3>
                              <p className="text-xs font-bold text-amber-600 uppercase mt-1 tracking-widest bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-100">Swapping Model: {activeAsset.battery.model}</p>
                            </div>
                            <button onClick={() => { setIsReplacing(false); setReplacementStep(1); }} className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><X size={24} /></button>
                          </div>

                          {replacementStep === 1 ? (
                            <form onSubmit={handleReplacementRequest} className="space-y-8 py-4">
                              <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Step 1: Scan Replacement Unit</label>
                                <div className="relative group">
                                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                    <Barcode size={32} />
                                  </div>
                                  <input
                                    ref={replacementInputRef}
                                    required
                                    autoFocus
                                    placeholder="SCAN NEW SERIAL..."
                                    className="w-full pl-20 pr-6 py-8 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-3xl outline-none focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10 uppercase transition-all mono placeholder:text-slate-300"
                                    value={replacementData.newBatteryId}
                                    onChange={e => setReplacementData({ ...replacementData, newBatteryId: e.target.value.toUpperCase() })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (replacementData.newBatteryId) {
                                          document.getElementById('card-status-select')?.focus();
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>

                              {/* [MOVED] Details from Step 2 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Warranty Proof Status</label>
                                  <div className="relative">
                                    <select id="card-status-select" required className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm uppercase outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none text-slate-700" value={replacementData.warrantyCardStatus} onChange={e => setReplacementData({ ...replacementData, warrantyCardStatus: e.target.value as WarrantyCardStatus })}>
                                      <option value="RECEIVED">Original Card Collected</option>
                                      <option value="XEROX">Xerox Only</option>
                                      <option value="WHATSAPP">Digital / WhatsApp</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Original Sale Date</label>
                                  <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-900 focus:border-amber-500 transition-all"
                                    value={replacementData.soldDate}
                                    onChange={(e) => setReplacementData({ ...replacementData, soldDate: e.target.value })}
                                  />
                                </div>
                              </div>

                              {showReturnDatePicker && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Returning Date</label>
                                  <input
                                    type="date"
                                    className="w-full px-7 py-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl outline-none focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10 transition-all mono shadow-inner"
                                    value={pendingReturnDate}
                                    onChange={e => setPendingReturnDate(e.target.value)}
                                  />
                                </div>
                              )}
                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={handleMarkPending}
                                  disabled={isActionLoading}
                                  className={`px-8 py-6 font-bold rounded-2xl transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2 ${showReturnDatePicker ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                  {showReturnDatePicker ? (
                                    <>
                                      <Check size={20} strokeWidth={3} />
                                      Confirm & Mark Pending
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={20} />
                                      Keep Pending
                                    </>
                                  )}
                                </button>
                                <button
                                  type="submit"
                                  disabled={isActionLoading}
                                  className="flex-1 bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-blue-700 transition-all uppercase text-lg tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl shadow-blue-500/20 group"
                                >
                                  {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : <>Validate Unit <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" /></>}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="space-y-8">
                              {/* Battery Comparison */}
                              <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 p-6 flex flex-col justify-center border-r border-slate-200">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"> Old Battery</p>
                                  <p className="text-2xl font-black mono text-rose-600 break-all">{activeAsset.battery.id}</p>
                                </div>
                                <div className="bg-emerald-50/50 p-6 flex flex-col justify-center items-end text-right">
                                  <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">New Battery</p>
                                  <p className="text-2xl font-black mono text-emerald-600 break-all">{replacementData.newBatteryId}</p>
                                </div>
                              </div>

                              {/* Details Form */}
                              <form onSubmit={handleReplacementRequest} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Failure Reason</label>
                                    <div className="relative">
                                      <select required className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg uppercase outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none text-slate-700" value={replacementData.reason} onChange={e => setReplacementData({ ...replacementData, reason: e.target.value })}>
                                        <option value="DEAD CELL">Dead Cell</option>
                                        <option value="INTERNAL SHORT">Internal Short</option>
                                        <option value="BULGE">Casing Bulge</option>
                                        <option value="LOW GRAVITY">Low Gravity</option>
                                        <option value="LEAKAGE">Leakage</option>
                                      </select>
                                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                    </div>
                                  </div>
                                  <div className="hidden">

                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Calendar size={20} /></div>
                                      <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">Validation Config</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-amber-700 uppercase ml-1">Exchange Date (Today)</label>
                                        <input
                                          required
                                          type="date"
                                          className="w-full px-6 py-4 bg-white/50 border-2 border-amber-200/50 rounded-xl outline-none font-bold text-lg text-slate-500 focus:border-amber-500 transition-all"
                                          value={replacementData.replacementDate}
                                          onChange={e => setReplacementData({ ...replacementData, replacementDate: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                    <Store size={18} className="text-blue-600" /> Dealer Settlement Method
                                  </h4>

                                  <div className="grid grid-cols-3 gap-4">
                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                      <input
                                        type="radio"
                                        name="settlementMethod"
                                        value="CREDIT"
                                        className="hidden"
                                        checked={replacementData.settlementMethod === 'CREDIT'}
                                        onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'CREDIT' }))}
                                      />
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'CREDIT' ? 'border-blue-600' : 'border-slate-300'}`}>
                                          {replacementData.settlementMethod === 'CREDIT' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'CREDIT' ? 'text-blue-700' : 'text-slate-500'}`}>Account Credit</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium pl-6">Value credited. Pending/Paid status.</p>
                                    </label>

                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'STOCK' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                      <input
                                        type="radio"
                                        name="settlementMethod"
                                        value="STOCK"
                                        className="hidden"
                                        checked={replacementData.settlementMethod === 'STOCK'}
                                        onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'STOCK' }))}
                                      />
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'STOCK' ? 'border-indigo-600' : 'border-slate-300'}`}>
                                          {replacementData.settlementMethod === 'STOCK' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'STOCK' ? 'text-indigo-700' : 'text-slate-500'}`}>Stock Replacement</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium pl-6">Physical battery given to dealer now.</p>
                                    </label>

                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'DIRECT' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                      <input
                                        type="radio"
                                        name="settlementMethod"
                                        value="DIRECT"
                                        className="hidden"
                                        checked={replacementData.settlementMethod === 'DIRECT'}
                                        onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'DIRECT' }))}
                                      />
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'DIRECT' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                          {replacementData.settlementMethod === 'DIRECT' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'DIRECT' ? 'text-emerald-700' : 'text-slate-500'}`}>Direct Settlement</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium pl-6">Immediate handover of {replacementData.newBatteryId}. No tracking.</p>
                                    </label>
                                  </div>

                                  {replacementData.settlementMethod === 'CREDIT' && (
                                    <div className="p-4 bg-blue-100/50 rounded-xl border border-blue-200 transition-all animate-in fade-in slide-in-from-top-1 cursor-pointer" onClick={() => setReplacementData(prev => ({ ...prev, paidInAccount: !prev.paidInAccount }))}>
                                      <label className="flex items-center gap-4 cursor-pointer select-none">
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${replacementData.paidInAccount ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'}`}>
                                          {replacementData.paidInAccount && <CheckCircle2 size={16} />}
                                        </div>
                                        <div>
                                          <span className="text-xs font-black text-blue-900 uppercase block">Mark as Paid?</span>
                                          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Tick to confirm payment settled</span>
                                        </div>
                                      </label>
                                    </div>
                                  )}

                                  {replacementData.settlementMethod === 'STOCK' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                      <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider ml-1 flex items-center gap-2">
                                        <Barcode size={14} /> Scan Replenishment Unit (For Dealer)
                                      </label>
                                      <input
                                        required
                                        placeholder="SCAN DEALER UNIT..."
                                        className="w-full px-6 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl font-bold text-xl outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 uppercase transition-all mono placeholder:text-indigo-300 text-indigo-900"
                                        value={replacementData.replenishmentBatteryId}
                                        onChange={e => setReplacementData({ ...replacementData, replenishmentBatteryId: e.target.value.toUpperCase() })}
                                      />
                                    </div>
                                  )}

                                  {replacementData.settlementMethod === 'DIRECT' && (
                                    <div className="p-4 bg-emerald-100/50 rounded-xl border border-emerald-200 transition-all animate-in fade-in slide-in-from-top-1">
                                      <div className="flex items-center gap-3 text-emerald-800">
                                        <CheckCircle2 size={20} />
                                        <div>
                                          <span className="text-xs font-black uppercase block">Settled Directly</span>
                                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Transaction will be marked as fully settled.</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                  <button type="button" onClick={() => setReplacementStep(1)} className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Back</button>
                                  <button type="submit" className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black py-5 rounded-xl hover:from-black hover:to-slate-900 transition-all uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.99]">
                                    Review & Authorize Swap <ArrowRight size={20} />
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      )}

                      {isConfirmingReplacement && (
                        <div className="bg-slate-900 text-white rounded-[2rem] p-12 border-4 border-amber-500 shadow-2xl animate-in zoom-in-95 duration-300 space-y-12 max-w-4xl mx-auto">
                          <div className="flex flex-col items-center text-center space-y-4 border-b border-white/10 pb-8">
                            <div className="p-5 bg-amber-500 text-slate-900 rounded-3xl shadow-lg shadow-amber-500/20 mb-2">
                              <ShieldCheck size={48} />
                            </div>
                            <div>
                              <h3 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">Final Authorization</h3>
                              <p className="text-amber-500 text-xs font-black uppercase tracking-[0.4em]">Please confirm exchange details</p>
                            </div>
                          </div>

                          <div className="space-y-8">
                            {/* Visual Comparison Block */}
                            <div className="bg-white/5 rounded-3xl p-2 border border-white/10">
                              <div className="grid grid-cols-2 divide-x divide-white/5">
                                <div className="p-8 text-center bg-rose-500/10 rounded-l-2xl">
                                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Old battery number</p>
                                  <p className="text-3xl font-black mono text-white">{activeAsset.battery.id}</p>
                                </div>
                                <div className="p-8 text-center bg-emerald-500/10 rounded-r-2xl">
                                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">new battery number</p>
                                  <p className="text-3xl font-black mono text-white">{replacementData.newBatteryId}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Failure Reason</p>
                                <p className="text-xs font-black text-amber-400 uppercase tracking-wide">{replacementData.reason}</p>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Exchange Date</p>
                                <p className="text-xs font-black text-white mono">{formatDate(replacementData.replacementDate)}</p>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Evidence Status</p>
                                <p className="text-xs font-black text-blue-400 uppercase tracking-wide">{replacementData.warrantyCardStatus.replace('_', ' ')}</p>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Dealer Settlement</p>
                                {replacementData.settlementMethod === 'STOCK' ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Stock Replaced</span>
                                    <span className="text-xs font-black text-white mono">{replacementData.replenishmentBatteryId}</span>
                                  </div>
                                ) : replacementData.settlementMethod === 'DIRECT' ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Method</span>
                                    <span className="text-xs font-black text-white uppercase tracking-wider">DIRECT SETTLEMENT</span>
                                  </div>
                                ) : (
                                  <div className={`text-xs font-black uppercase tracking-wide justify-center flex items-center gap-2 ${replacementData.paidInAccount ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {replacementData.paidInAccount ? <><CheckCircle2 size={14} /> PAID</> : 'PENDING'}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                              <p className="text-[10px] font-bold text-amber-500/60 uppercase mb-2">battery selling date by dealer </p>
                              <p className="text-xl font-black text-amber-400 mono">{formatDate(replacementData.soldDate)}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4 pt-4">
                            <button onClick={executeReplacement} disabled={isActionLoading} className="w-full py-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-[0.2em] text-lg flex items-center justify-center gap-4 transform active:scale-[0.98]">
                              {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                              Confirm & Finalize Swap
                            </button>
                            <button onClick={() => setIsConfirmingReplacement(false)} className="w-full py-4 bg-white/5 text-slate-400 font-bold rounded-2xl hover:bg-white/10 hover:text-white uppercase tracking-widest text-xs transition-all border border-white/5">
                              Cancel & Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                      <History size={18} className="text-slate-400" /> Asset Audit History
                    </h3>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Protocol Segments: {activeAsset.lineage.length}</span>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4 whitespace-nowrap">Battery ID</th>
                          <th className="px-6 py-4 whitespace-nowrap">Replaced By</th>
                          <th className="px-6 py-4 whitespace-nowrap">Dispatched to Dealer</th>
                          <th className="px-6 py-4 whitespace-nowrap">Sold to Customer</th>
                          <th className="px-6 py-4 whitespace-nowrap">Replaced On</th>
                          <th className="px-6 py-4 whitespace-nowrap">Settlement</th>
                          <th className="px-6 py-4 whitespace-nowrap">Status</th>
                          <th className="px-6 py-4 whitespace-nowrap">Outcome / Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activeAsset.lineage.map((item: any, index: number) => {
                          const next = activeAsset.replacements.find((r: any) => r.oldBatteryId === item.id);
                          const incoming = activeAsset.replacements.find((r: any) => r.newBatteryId === item.id);
                          const sale = activeAsset.lineageSales?.find((s: any) => s.batteryId === item.id);
                          const isCurrent = item.id === activeAsset.battery.id;
                          const isFirst = index === 0;
                          const isLast = index === activeAsset.lineage.length - 1;

                          const itemExpired = item.warrantyExpiry ? new Date() > new Date(item.warrantyExpiry) : false;

                          // Determine when customer received this battery
                          let customerReceivedDate;
                          if (incoming) {
                            // This is a replacement - customer got it on replacement date
                            customerReceivedDate = incoming.replacementDate;
                          } else if (item.actualSaleDate) {
                            // Corrected sale date
                            customerReceivedDate = item.actualSaleDate;
                          } else if (sale) {
                            // Original sale
                            customerReceivedDate = sale.saleDate;
                          } else {
                            // Fallback to activation
                            customerReceivedDate = item.activationDate;
                          }

                          return (
                            <tr key={item.id} className={`${isCurrent ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-all text-xs`}>
                              {/* Battery ID */}
                              <td className="px-6 py-5 font-bold text-slate-900 mono text-sm flex items-center gap-3 whitespace-nowrap">
                                {!isFirst && <span className="text-slate-300 mr-2">↳</span>}
                                {item.id}
                                {isCurrent && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                              </td>

                              {/* Replaced By */}
                              <td className="px-6 py-5 font-bold text-blue-600 mono text-sm whitespace-nowrap cursor-pointer hover:underline" onClick={(e) => {
                                if (next) { e.stopPropagation(); handleSearch(next.newBatteryId); }
                              }}>
                                {next ? (
                                  <div className="flex items-center gap-2">
                                    {next.newBatteryId}
                                    <span className="text-slate-400">→</span>
                                  </div>
                                ) : isLast ? (
                                  <span className="text-emerald-600 font-bold text-xs">CURRENT UNIT</span>
                                ) : '-'}
                              </td>

                              {/* Dispatched to Dealer (when you scanned it) */}
                              <td className="px-6 py-5 font-bold text-slate-500 text-xs mono whitespace-nowrap">
                                {formatDate(item.manufactureDate)}
                              </td>

                              {/* Sold to Customer */}
                              <td className="px-6 py-5 text-xs whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  {item.actualSaleDate && item.warrantyCalculationBase === 'ACTUAL_SALE' ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 mono">{formatDate(item.actualSaleDate)}</span>
                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase border border-amber-200">
                                          Corrected
                                        </span>
                                      </div>
                                      <span className="text-slate-400 text-[10px] line-through">{formatDate(item.activationDate)}</span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-900 mono">{customerReceivedDate ? formatDate(customerReceivedDate) : '-'}</span>
                                  )}
                                </div>
                              </td>

                              {/* Replaced On */}
                              <td className="px-6 py-5 font-bold text-slate-500 text-xs mono whitespace-nowrap">
                                {next ? formatDate(next.replacementDate) : '-'}
                              </td>

                              {/* Settlement */}
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  {next ? (
                                    <>
                                      {next.settlementType === 'DIRECT' ? (
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Direct Settlement
                                          </span>
                                          <span className="text-xs font-bold text-slate-700 mono">{next.newBatteryId}</span>
                                        </div>
                                      ) : next.replenishmentBatteryId ? (
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Stock Given</span>
                                          <span className="text-xs font-bold text-slate-700 mono">{next.replenishmentBatteryId}</span>
                                        </div>
                                      ) : (
                                        <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide flex w-fit items-center gap-1 ${next.paidInAccount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                          {next.paidInAccount ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                          {next.paidInAccount ? 'PAID' : 'PENDING'}
                                        </span>
                                      )}
                                    </>
                                  ) : (sale && !incoming) ? (
                                    <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide flex w-fit items-center gap-1 ${sale.paidInAccount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                      {sale.paidInAccount ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                      {sale.paidInAccount ? 'PAID' : 'PENDING'}
                                    </span>
                                  ) : <span className="text-slate-300 font-bold text-xs">-</span>}

                                  {/* Settlement Date Display */}
                                  {next && (next.settlementDate || next.settlementType === 'DIRECT') && (
                                    <span className="text-[9px] font-bold text-slate-400 mono pl-1">
                                      {formatDate(next.settlementType === 'DIRECT' ? next.replacementDate : next.settlementDate)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide ${getStatusBadge(item.status, itemExpired)}`}>
                                  {itemExpired ? 'EXPIRED' : item.status}
                                </span>
                              </td>

                              {/* Outcome / Evidence */}
                              <td className="px-6 py-5 whitespace-nowrap">
                                {next ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="text-xs font-bold text-amber-700 flex items-center gap-1 uppercase"><AlertCircle size={14} /> FAILED: {next.reason}</div>
                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase pl-5"><FileText size={10} /> Doc: {formatReference(next.warrantyCardStatus)}</div>
                                  </div>
                                ) : item.status === BatteryStatus.ACTIVE ? (
                                  itemExpired ? (
                                    <div className="text-xs font-bold text-rose-600 flex items-center gap-1 uppercase"><X size={14} /> Warranty Expired</div>
                                  ) : (
                                    <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 size={14} /> Healthy / Active</div>
                                  )
                                ) : <span className="text-slate-300 font-bold text-xs">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
            }
          </div>
        )
      })()}

      {/* Footer Info */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none p-4 flex justify-between items-end opacity-20 hover:opacity-100 transition-opacity">
        <div className="bg-white/50 backdrop-blur-md p-2 rounded-lg text-[10px] font-mono text-slate-500 pointer-events-auto">
          {dealers.length}DL • {models.length}MD • v2.4.0
        </div>
      </div>

      {/* Session Lock handled via Navigation */}

      {/* Batch Processing Overlay */}
      {isBatchProcessing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Assigning Batteries</h2>
              <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">Dealer: {batchSuccessDetails.dealerName}</p>
            </div>

            <div className="relative h-4 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
              <div
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                style={{ width: `${batchProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-white mono text-xs font-bold">
              <span>{Math.round(batchProgress)}% COMPLETE</span>
              <span>{stagedItems.length} UNITS</span>
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                DO NOT CLOSE THE APPLICATION
              </p>

              <button
                onClick={handleCancelBatch}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
              >
                Cancel Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Success Dialog */}
      {showBatchSuccess && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-1 shadow-2xl max-w-sm w-full relative overflow-hidden">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-50 to-transparent -z-10" />

            <div className="p-10 space-y-8">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Outer pulse ring */}
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center relative shadow-inner">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 animate-in bounce-in duration-700">
                      <CheckCircle2 size={40} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mt-6">Done</h3> */}
                <div className="h-1 w-12 bg-emerald-500 rounded-full mt-3" />
                <p className="text-slate-500 font-bold text-sm mt-3">Batch assigned successfully</p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 space-y-6">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units Processed</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{batchSuccessDetails.count}</span>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="flex flex-col items-center space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealer Name</span>
                  <span className="text-xs font-black text-blue-600 uppercase text-center leading-tight">{batchSuccessDetails.dealerName}</span>
                </div>
              </div>


              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button
                  onClick={() => {
                    setShowBatchSuccess(false);
                    window.location.reload();
                  }}
                  className="py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 group"
                >
                  Close
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Hidden Print Portal */}
            {createPortal(
              <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
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
        </div>
      )}
    </div>
  );
};

export default TraceHub;
