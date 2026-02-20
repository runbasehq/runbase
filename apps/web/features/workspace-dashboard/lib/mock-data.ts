import type { DashboardThread } from "~/workspace-dashboard/lib/types";

export const dashboardThreads: DashboardThread[] = [
  {
    id: "design-feedback-onboarding",
    title: "Design feedback for onboarding flow",
    breadcrumb: ["Inbox", "View all"],
    lastActivity: "2h ago",
    status: "pendingExternal",
    summary:
      "You reached out to Leonard and Jade for feedback on a new onboarding prototype focused on user engagement. The conversation centers around personalized pathways, interactive checkpoints, and ways to improve retention. Leonard responded positively, highlighting the value of goal-based onboarding and suggesting exploring gamification or visual progress indicators to further motivate users.",
    participants: [
      {
        id: "leonard",
        name: "Leonard L.",
        email: "alex@stripe.com",
        respondedAt: "2h ago",
      },
      {
        id: "valentin",
        name: "Valentin C.",
        email: "cassa@echo.com",
        respondedAt: "2h ago",
      },
      {
        id: "jade",
        name: "Jade M.",
        email: "jade@figma.com",
        respondedAt: "2h ago",
      },
    ],
    notes: [
      "Exploring personalized onboarding tied to user goals as a way to drive engagement.",
      "Interactive checkpoints already in prototype - looking for ideas to reinforce completion.",
    ],
    tasks: [
      {
        id: "task-1",
        label: "Evaluate potential for gamification or visual progress",
        dueLabel: "Today",
      },
      {
        id: "task-2",
        label: "Iterate on prototype with feedback from thread",
        dueLabel: "3 days ago",
      },
    ],
    activity: [
      {
        id: "activity-1",
        label: "Jade answered an email",
        when: "2h ago",
      },
      {
        id: "activity-2",
        label: "Leonard answered an email",
        when: "2 weeks ago",
      },
      {
        id: "activity-3",
        label: "You sent an email",
        when: "2 weeks ago",
      },
    ],
    messages: [
      {
        id: "message-1",
        sender: "You sent",
        senderType: "you",
        sentAt: "March 21, 2025 at 09:31 AM",
        body: [
          "Hey Leonard and Jade,",
          "We're refining the onboarding experience to boost user engagement and make the journey feel more intuitive and rewarding. I'd love your insights on the latest prototype.",
          "We've explored personalized pathways based on user goals, along with interactive checkpoints to maintain engagement. Are there additional opportunities or best practices you've encountered that could enhance this?",
          "Excited to hear your thoughts!",
          "Thanks, Valentin",
        ],
      },
      {
        id: "message-2",
        sender: "Leonard replied",
        senderType: "participant",
        sentAt: "March 21, 2025 at 09:31 AM",
        body: [
          "Hey Valentin, Jade,",
          "Great direction! Tailoring onboarding to individual goals sounds like a strong approach - I've seen this significantly boost retention in past projects.",
          "Interactive checkpoints sound promising, too. Have you considered gamification or visual progress indicators to reinforce completion and motivate users?",
          "Looking forward to your perspectives, Leonard",
        ],
      },
    ],
  },
];
