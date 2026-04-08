export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  fixes: string[];
  areas: string[];
}

export const releaseNotes: ReleaseEntry[] = [
  {
    version: 'v1.0.6',
    date: '2026-04-08',
    title: 'Print & Inventory Management Refinement',
    summary: 'This update resolves critical printing layout issues and introduces flexible dealer re-assignment logic.',
    fixes: [
      'Professional PDF Support: Removed page counters and forced clean margins for professional document output.',
      'Dealer Re-assignment: Enabled moving unsold stock between dealers while maintaining integrity for sold/replacement units.',
      'Process Stability: Hardened the application against Mac-specific EPIPE crashes during high-volume logging.'
    ],
    areas: ['Printing', 'Scanner', 'Inventory', 'Stability']
  },
  {
    version: 'v1.0.4',
    date: '2026-04-06',
    title: 'Factory Operations & UI Modernization',
    summary: 'This update brings a significant overhaul to Factory Operations and a more modern administrative interface.',
    fixes: [
      'Enhanced Factory Operations: Major updates to Expenses, Purchases, and Production modules.',
      'Modern Admin UI: Standardized aesthetics for Danger Zone and User Management with premium card-based designs.',
      'Notification System: Added audible and visual update notifications.',
      'Session Management: Improved session handling and authentication flows.'
    ],
    areas: ['Factory Operations', 'UI', 'Authentication', 'Notifications']
  },
  {
    version: 'v1.0.2',
    date: '2026-04-06',
    title: 'Better Printing & New Features',
    summary: 'We made printing much more reliable for large orders and added this help page.',
    fixes: [
      'Big Orders Print Better: Printing 100+ batteries at once now works perfectly across multiple pages.',
      'Neater Receipts: Headers (titles) now show on every page, and signatures stay at the bottom.',
      'Fixed Layout Issues: Long names and empty lists no longer mess up the screen.',
      'Consistent Printing: Scanning and approving batches now use the same, improved printing style.',
      'Release History: You can now see what\'s new in each update right here.'
    ],
    areas: ['Printing', 'Scanner', 'Batches', 'Help System']
  }
];
