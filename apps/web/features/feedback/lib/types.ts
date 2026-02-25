export interface FeedbackBoardItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isDefault: boolean;
}

export interface FeedbackTagItem {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface FeedbackStatusItem {
  id: string;
  key: string;
  label: string;
  color: string | null;
  position: number;
  isDefault: boolean;
  isClosed: boolean;
}

export type FeedbackDefaultSort = "new" | "top" | "trending";

export interface FeedbackPublicSettings {
  defaultSort: FeedbackDefaultSort;
  hideLeaderboard: boolean;
  hideClosedStatuses: boolean;
  hideAllStatuses: boolean;
  allowPublicTagSelection: boolean;
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
  statusIsClosed: boolean;
  boardName: string;
  tags: FeedbackTagItem[];
  viewerHasVoted: boolean;
}

export interface FeedbackCommentItem {
  id: string;
  postId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorUserId: string | null;
  authorName: string | null;
  authorImage: string | null;
}

export interface FeedbackSnapshot {
  boards: FeedbackBoardItem[];
  statuses: FeedbackStatusItem[];
  tags: FeedbackTagItem[];
  settings: FeedbackPublicSettings;
  posts: FeedbackPostItem[];
}

export interface FeedbackSettingsSnapshot {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  boards: FeedbackBoardItem[];
  statuses: FeedbackStatusItem[];
  tags: FeedbackTagItem[];
  settings: FeedbackPublicSettings;
  permissions: {
    canManageFeedbackSettings: boolean;
  };
}

export type FeedbackMediaType = "image" | "video" | "attachment";

export interface FeedbackUploadedMedia {
  key: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  mediaType: FeedbackMediaType;
}

export type VoteIdentity =
  | { userId: string; anonSessionId: null }
  | { userId: null; anonSessionId: string };

export interface FeedbackVoteSyncResult {
  claimedCount: number;
}
