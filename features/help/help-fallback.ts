export type HelpItem = {
  id: string;
  question: string;
  answer: string;
  steps?: string[];
  tags: string[];
};

export const fallbackHelpItemsEn: HelpItem[] = [
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

export const fallbackHelpItemsIt: HelpItem[] = [
  {
    id: 'fallback-1-it',
    question: 'Come posso aggiungere una carta?',
    answer:
      'Dalla schermata principale tocca Aggiungi carta e scegli Scansiona codice a barre o Aggiungi manualmente.',
    steps: [
      'Apri la schermata principale',
      'Tocca Aggiungi carta',
      'Scegli Scansiona codice a barre o Aggiungi manualmente'
    ],
    tags: ['aggiungi', 'scansione', 'manuale']
  },
  {
    id: 'fallback-2-it',
    question: 'Perche la fotocamera non funziona?',
    answer: 'Abilita il permesso Fotocamera nelle Impostazioni per scansionare i codici a barre.',
    steps: [
      'Apri Impostazioni',
      'Vai su myLoyaltyCards > Fotocamera',
      "Abilita l'accesso alla fotocamera"
    ],
    tags: ['fotocamera', 'permessi']
  },
  {
    id: 'fallback-3-it',
    question: 'Come posso contattare il supporto?',
    answer: "Usa l'azione Contatta supporto in Aiuto e FAQ per contattarci.",
    steps: ['Apri Aiuto e FAQ', 'Tocca Contatta supporto'],
    tags: ['supporto', 'feedback']
  }
];

export const fallbackHelpItems = fallbackHelpItemsEn;
