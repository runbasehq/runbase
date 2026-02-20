export type DashboardStatus =
  | "onTrack"
  | "pendingExternal"
  | "atRisk"
  | "blocked";

export interface DashboardMessage {
  id: string;
  sender: string;
  senderType: "you" | "participant";
  sentAt: string;
  body: string[];
}

export interface DashboardParticipant {
  id: string;
  name: string;
  email: string;
  respondedAt: string;
}

export interface DashboardTask {
  id: string;
  label: string;
  dueLabel: string;
}

export interface DashboardActivity {
  id: string;
  label: string;
  when: string;
}

export interface DashboardThread {
  id: string;
  title: string;
  breadcrumb: string[];
  lastActivity: string;
  summary: string;
  notes: string[];
  tasks: DashboardTask[];
  activity: DashboardActivity[];
  participants: DashboardParticipant[];
  messages: DashboardMessage[];
  status: DashboardStatus;
}
