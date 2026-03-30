import { create } from 'zustand';

export interface TutorialStep {
  id: string;
  /** CSS selector to spotlight. If null, shows centered modal. */
  target: string | null;
  /** Where the tooltip appears relative to the target */
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title: string;
  description: string;
  /** Optional action to run when this step activates (e.g. open settings) */
  onEnter?: () => void;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    target: null,
    placement: 'center',
    title: 'Welcome to Resonate',
    description:
      'Turn sound into clarity. Resonate records conversations, transcribes audio, and generates structured notes with AI — all in one place. Let\'s take a quick tour.',
  },
  {
    id: 'sidebar',
    target: '[data-tutorial="sidebar"]',
    placement: 'right',
    title: 'Sidebar',
    description:
      'Your notebooks and recordings live here. Notebooks organize your recordings into groups — think of them as folders. Drag recordings between notebooks to reorganize.',
  },
  {
    id: 'notebook',
    target: '[data-tutorial="notebook-list"]',
    placement: 'right',
    title: 'Notebooks',
    description:
      'We\'ve created a "Getting Started" notebook with an example recording. Click any notebook to filter recordings, or click "All Recordings" to see everything.',
  },
  {
    id: 'recordings',
    target: '[data-tutorial="recording-list"]',
    placement: 'right',
    title: 'Recordings',
    description:
      'Your recordings appear here with title, date, and status. Click any recording to open it in a tab. Right-click for more options like rename, move, or delete.',
  },
  {
    id: 'record-button',
    target: '[data-tutorial="record-button"]',
    placement: 'bottom',
    title: 'Recording',
    description:
      'Click the record button (or press Ctrl+R) to start capturing audio. Resonate can record your microphone, system audio, or both. Stop recording when you\'re done.',
  },
  {
    id: 'tabs',
    target: '[data-tutorial="tab-bar"]',
    placement: 'bottom',
    title: 'Tabs',
    description:
      'Each recording opens in its own tab. You can have multiple recordings open at once and switch between them. Press Ctrl+Tab to cycle through tabs, or Ctrl+W to close.',
  },
  {
    id: 'post-recording',
    target: '[data-tutorial="post-controls"]',
    placement: 'bottom',
    title: 'Transcribe & Summarize',
    description:
      'After recording, click "Transcribe" to convert audio to text using your configured STT engine. Then "Send to AI" generates a summary using your chosen prompt profile.',
  },
  {
    id: 'workspace',
    target: '[data-tutorial="workspace"]',
    placement: 'top',
    title: 'Workspace Cards',
    description:
      'Your transcript, summary, and action items appear as draggable cards. Resize them, reorder by dragging, expand to full width, or add new cards. Click the export icon to download any card.',
  },
  {
    id: 'action-items',
    target: '[data-tutorial="action-items"]',
    placement: 'top',
    title: 'Action Items',
    description:
      'AI automatically extracts action items from your meetings. Check them off as you complete them, right-click to edit, and they render markdown formatting.',
  },
  {
    id: 'settings',
    target: '[data-tutorial="settings-button"]',
    placement: 'top',
    title: 'Settings',
    description:
      'Configure your STT engine (Whisper, cloud APIs), AI endpoint and model, prompt profiles for different summary styles, audio devices, and more.',
  },
  {
    id: 'shortcuts',
    target: null,
    placement: 'center',
    title: 'Keyboard Shortcuts',
    description:
      'Ctrl+R — Toggle recording\nCtrl+N — New notebook\nCtrl+F — Focus search\nCtrl+W — Close tab\nCtrl+Tab — Next tab\nEsc — Close panels\n\nYou\'re all set! The example notebook is ready to explore.',
  },
];

interface TutorialState {
  active: boolean;
  currentStep: number;
  completed: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  goTo: (step: number) => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  currentStep: 0,
  completed: localStorage.getItem('resonate-tutorial-completed') === 'true',

  start: () => set({ active: true, currentStep: 0 }),

  next: () => {
    const { currentStep } = get();
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      const step = TUTORIAL_STEPS[nextStep];
      step.onEnter?.();
      set({ currentStep: nextStep });
    } else {
      // Tutorial complete
      localStorage.setItem('resonate-tutorial-completed', 'true');
      set({ active: false, completed: true });
    }
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      const step = TUTORIAL_STEPS[prevStep];
      step.onEnter?.();
      set({ currentStep: prevStep });
    }
  },

  stop: () => set({ active: false }),

  goTo: (step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      const s = TUTORIAL_STEPS[step];
      s.onEnter?.();
      set({ currentStep: step });
    }
  },
}));
