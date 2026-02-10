export type HelpItem = {
  id: string;
  question: string;
  answer: string;
  steps?: string[];
  tags: string[];
};

export const fallbackHelpItems: HelpItem[] = [
  {
    id: 'fallback-1',
    question: 'How do I add a card?',
    answer: 'From the main screen, tap Add Card and choose Scan Barcode or Add Manually.',
    steps: ['Open the main screen', 'Tap Add Card', 'Choose Scan Barcode or Add Manually'],
    tags: ['add', 'scan', 'manual']
  },
  {
    id: 'fallback-2',
    question: 'Why is my camera not working?',
    answer: 'Enable Camera permission in Settings to scan barcodes.',
    steps: ['Open Settings', 'Find MyLoyaltyCards > Camera', 'Enable Camera access'],
    tags: ['camera', 'permissions']
  },
  {
    id: 'fallback-3',
    question: 'How can I contact support?',
    answer: 'Use the Contact Support action in Help & FAQ to reach us.',
    steps: ['Open Help & FAQ', 'Tap Contact Support'],
    tags: ['support', 'feedback']
  }
];
