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
    version: 'v1.0.2',
    date: '2026-04-06',
    title: 'Print Reliability and Release Tracking',
    summary: 'Stabilized long batch printouts and added an in-app release notes screen reachable from the Starline brand.',
    fixes: [
      'Batch receipts now paginate automatically for large runs such as 100 or more batteries.',
      'Print headers repeat on every page and the final signature section stays on the last page.',
      'Long serial numbers, dealer names, and empty datasets now render safely instead of breaking the layout.',
      'Scanner and batch approval flows now use the same print portal behavior for more consistent output.',
      'Added an in-app release notes page so fix history can be reviewed by date.'
    ],
    areas: ['Batch Printing', 'Scanner', 'Batches', 'Release Notes']
  }
];
