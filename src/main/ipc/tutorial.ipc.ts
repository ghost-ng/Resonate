import { ipcMain } from 'electron';
import type { ServiceContainer } from '../index';

const TUTORIAL_NOTEBOOK_NAME = 'Getting Started';

export function registerTutorialHandlers(services: ServiceContainer): void {
  ipcMain.handle('tutorial:seed-data', () => {
    const { notebooks, recordings, transcripts, summaries } = services;

    // Check if tutorial data already exists
    const existing = notebooks.findAll().find((nb) => nb.name === TUTORIAL_NOTEBOOK_NAME);
    if (existing) {
      return { notebookId: existing.id, alreadyExists: true };
    }

    // 1. Create notebook
    const notebook = notebooks.create(TUTORIAL_NOTEBOOK_NAME, '🎓');

    // 2. Create example recording — "Team Standup Meeting"
    const rec1 = recordings.create({
      title: 'Team Standup Meeting',
      notebookId: notebook.id,
      sourceApp: 'Zoom',
    });
    recordings.update(rec1.id, { status: 'complete', participant_count: 3 });

    // 3. Create transcript with realistic segments
    const segments = [
      { speaker: 'Sarah', text: "Good morning everyone. Let's do a quick standup. I'll go first.", start_time_ms: 0, end_time_ms: 4500, confidence: 0.95 },
      { speaker: 'Sarah', text: "Yesterday I finished the API integration for the payment system. Today I'm going to start on the email notification service. No blockers from my side.", start_time_ms: 4500, end_time_ms: 14000, confidence: 0.92 },
      { speaker: 'Mike', text: "Nice. I spent yesterday debugging that memory leak in the dashboard. Turns out it was a missing cleanup in the useEffect hook.", start_time_ms: 14500, end_time_ms: 22000, confidence: 0.91 },
      { speaker: 'Mike', text: "Today I'm going to write tests for the fix and then move on to the search feature. One blocker — I need the updated API docs from the backend team.", start_time_ms: 22000, end_time_ms: 31000, confidence: 0.93 },
      { speaker: 'Sarah', text: "I can send those over after this meeting. I updated them yesterday.", start_time_ms: 31500, end_time_ms: 35000, confidence: 0.94 },
      { speaker: 'Mike', text: "Perfect, thanks Sarah.", start_time_ms: 35000, end_time_ms: 36500, confidence: 0.97 },
      { speaker: 'Jordan', text: "Hey, sorry I'm a minute late. For my update — the design review for the mobile app went well. The team approved the new navigation pattern.", start_time_ms: 37000, end_time_ms: 46000, confidence: 0.90 },
      { speaker: 'Jordan', text: "Today I'll be creating the component library for the new design system. I might need to sync with Mike on the shared color tokens.", start_time_ms: 46000, end_time_ms: 54000, confidence: 0.88 },
      { speaker: 'Mike', text: "Yeah, let's do that after lunch. I'll share my screen and we can go through the theme config together.", start_time_ms: 54500, end_time_ms: 60000, confidence: 0.92 },
      { speaker: 'Sarah', text: "Sounds good. One more thing — the sprint retro is scheduled for Thursday at 3 PM. Please come prepared with your feedback.", start_time_ms: 60500, end_time_ms: 68000, confidence: 0.94 },
      { speaker: 'Sarah', text: "Also, don't forget to update your Jira tickets before end of day. Anything else from anyone?", start_time_ms: 68000, end_time_ms: 73000, confidence: 0.93 },
      { speaker: 'Jordan', text: "Nope, I'm good. Thanks everyone!", start_time_ms: 73500, end_time_ms: 75500, confidence: 0.96 },
      { speaker: 'Mike', text: "All good here. Have a great day.", start_time_ms: 75500, end_time_ms: 77500, confidence: 0.95 },
      { speaker: 'Sarah', text: "Great standup. Let's keep the momentum going. Talk to you all later!", start_time_ms: 78000, end_time_ms: 82000, confidence: 0.94 },
    ];

    const fullText = segments.map((s) => `${s.speaker}: ${s.text}`).join('\n');
    transcripts.create(rec1.id, 'tutorial-example', fullText, segments);

    recordings.update(rec1.id, { duration_seconds: 82 });

    // 4. Create summary with action items
    const summaryContent = `## Brief Summary

A quick 90-second team standup with Sarah, Mike, and Jordan covering progress updates, blockers, and coordination items.

## Discussion Topics

### Payment System Integration
Sarah completed the API integration for the payment system and will move on to the email notification service today.

### Dashboard Memory Leak
Mike identified and fixed a memory leak caused by a missing cleanup in a \`useEffect\` hook. He'll write tests for the fix today.

### Mobile App Design
Jordan received approval on the new navigation pattern during the design review. The team will begin building a component library for the new design system.

### Coordination
- Sarah will send updated API docs to Mike
- Mike and Jordan will sync on shared color tokens after lunch
- Sprint retro scheduled for **Thursday at 3 PM**

## Key Decisions
- New mobile navigation pattern approved
- Color token alignment between frontend and design system`;

    summaries.create(rec1.id, {
      modelUsed: 'tutorial-example',
      content: summaryContent,
      actionItems: [
        { text: 'Send updated **API docs** to Mike', assignee: 'Sarah', sort_order: 0 },
        { text: 'Write tests for the dashboard memory leak fix', assignee: 'Mike', sort_order: 1 },
        { text: 'Sync on shared color tokens after lunch', assignee: 'Mike', sort_order: 2 },
        { text: 'Create component library for the new design system', assignee: 'Jordan', sort_order: 3 },
        { text: 'Update Jira tickets before end of day', assignee: null, sort_order: 4 },
        { text: 'Prepare feedback for sprint retro on **Thursday 3 PM**', assignee: null, sort_order: 5 },
      ],
    });

    // 5. Create a second example recording — "Project Brainstorm"
    const rec2 = recordings.create({
      title: 'Product Brainstorm Session',
      notebookId: notebook.id,
      sourceApp: 'Google Meet',
    });
    recordings.update(rec2.id, { status: 'complete', participant_count: 2 });

    const segments2 = [
      { speaker: 'Alex', text: "Alright, let's brainstorm some ideas for the Q2 launch. What features do we think will have the biggest impact?", start_time_ms: 0, end_time_ms: 7000, confidence: 0.93 },
      { speaker: 'Priya', text: "I think we should prioritize the real-time collaboration feature. Every user interview this quarter mentioned it.", start_time_ms: 7500, end_time_ms: 14000, confidence: 0.91 },
      { speaker: 'Alex', text: "Good call. That aligns with the competitive analysis too. How complex is the implementation?", start_time_ms: 14500, end_time_ms: 19000, confidence: 0.90 },
      { speaker: 'Priya', text: "We'd need WebSocket infrastructure and conflict resolution. Maybe 4-6 weeks with two engineers.", start_time_ms: 19500, end_time_ms: 26000, confidence: 0.88 },
      { speaker: 'Alex', text: "Let's scope it out. Priya, can you draft a technical proposal by Friday?", start_time_ms: 26500, end_time_ms: 31000, confidence: 0.94 },
      { speaker: 'Priya', text: "Absolutely. I'll include the WebSocket architecture and a phased rollout plan.", start_time_ms: 31500, end_time_ms: 36000, confidence: 0.92 },
    ];

    const fullText2 = segments2.map((s) => `${s.speaker}: ${s.text}`).join('\n');
    transcripts.create(rec2.id, 'tutorial-example', fullText2, segments2);
    recordings.update(rec2.id, { duration_seconds: 36 });

    summaries.create(rec2.id, {
      modelUsed: 'tutorial-example',
      content: `## Brief Summary

Alex and Priya brainstormed Q2 launch features. Real-time collaboration was identified as the top priority based on user research and competitive analysis.

## Key Decisions
- Real-time collaboration is the **#1 priority** for Q2
- Estimated effort: 4-6 weeks with two engineers
- WebSocket infrastructure needed with conflict resolution`,
      actionItems: [
        { text: 'Draft technical proposal for real-time collaboration by **Friday**', assignee: 'Priya', sort_order: 0 },
        { text: 'Include WebSocket architecture and phased rollout plan', assignee: 'Priya', sort_order: 1 },
      ],
    });

    return { notebookId: notebook.id, alreadyExists: false };
  });
}
