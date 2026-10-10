# Changelog

All notable changes to this project will be documented in this file.

## [1.0.12] - 2026-10-10

### Added
- **Replacement Validation**: Blocks replacement attempts when the old battery is missing, already exchanged, sold under a different dealer, or when the proposed replacement battery is sold, already exchanged, or assigned to another dealer.
- **Replacement Regression Coverage**: Added isolated tests for replacement eligibility and registry conflict cases.

### Changed
- **Replacement Experience**: Simplified the replacement workflow, protocol, authorization, and scanner header while keeping the batch scanning design intact.
- **Replacement Persistence**: Added transaction guards to prevent invalid or repeated replacements from being recorded.

## [1.0.11] - 2026-07-10

### Added
- **Error Alert on Search Failure**: Displays an error alert when a battery search query fails.

### Changed
- **Danger Zone Refactoring**: Redesigned settings dashboard's Danger Zone with a cleaner Factory Reset workflow and single record search.
- **Passcode Theme Update**: Unified passcode screen theme to match the Main Login screen.

## [1.0.10] - 2026-06-09

### Added
- **Secure Battery Deletion**: Added a secure delete battery button to battery details.

## [1.0.9] - 2026-04-22

### Added
- **Redesigned Settlement Flow**: Transitioned from a modal-based interface to a premium, full-page wizard-like experience.
- **Settlement Wizard**: A step-by-step resolution process including Context Review, Method Selection, and Final Audit.
- **Final Confirmation Step**: Added an explicit confirmation dialog before final database execution to prevent accidental submissions.
- **Success Animations**: Professional success screen with animated checkmark and detailed settlement summary.
- **Nomenclature Update**: Renamed "Credit Note" to "Paid in Account" for better business alignment.

### Changed
- **UI Compactness**: Refined the wizard layout for a focused, single-screen experience without scrolling.
- **Notification Cleanup**: Removed the automatic "Database Synced" toast notification to reduce visual noise.
- **Component Management**: Deprecated and removed the old `SettlementModal.tsx`.

### Fixed
- Improved focus management and input validation in the settlement resolution flow.
