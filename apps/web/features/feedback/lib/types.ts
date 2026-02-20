export interface FeedbackBoardItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
}

export interface FeedbackStatusItem {
  id: string;
  key: string;
  label: string;
  color: string | null;
  position: number;
  isClosed: boolean;
}

export interface FeedbackPostItem {
  id: string;
  boardId: string;
  statusId: string;
  title: string;
  slug: string;
  content: string;
  upvoteCount: number;
  commentCount: number;
  createdAt: Date;
  statusLabel: string;
  statusKey: string;
  boardName: string;
  viewerHasVoted: boolean;
}

export interface FeedbackSnapshot {
  boards: FeedbackBoardItem[];
  statuses: FeedbackStatusItem[];
  posts: FeedbackPostItem[];
}

export type VoteIdentity =
  | { userId: string; anonSessionId: null }
  | { userId: null; anonSessionId: string };
