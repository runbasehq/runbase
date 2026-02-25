import { relations, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  primaryKey,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspace = pgTable(
  "workspace",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    feedbackAccess: text("feedback_access").notNull().default("private"),
    primaryGoal: text("primary_goal")
      .notNull()
      .default("capture_manage_feedback"),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    welcomeEmailStatus: text("welcome_email_status")
      .notNull()
      .default("pending"),
    emailSenderFounder: text("email_sender_founder").notNull().default("fran"),
    welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
    welcomeEmailMessageId: text("welcome_email_message_id"),
    publicTheme: text("public_theme"),
    feedbackDefaultSort: text("feedback_default_sort").notNull().default("top"),
    feedbackHideLeaderboard: boolean("feedback_hide_leaderboard")
      .notNull()
      .default(false),
    feedbackHideClosedStatuses: boolean("feedback_hide_closed_statuses")
      .notNull()
      .default(false),
    feedbackHideAllStatuses: boolean("feedback_hide_all_statuses")
      .notNull()
      .default(false),
    feedbackAllowPublicTagSelection: boolean(
      "feedback_allow_public_tag_selection",
    )
      .notNull()
      .default(false),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "workspace_feedback_access_check",
      sql`${table.feedbackAccess} in ('public', 'private')`,
    ),
    check(
      "workspace_primary_goal_check",
      sql`${table.primaryGoal} in ('capture_manage_feedback')`,
    ),
    check(
      "workspace_welcome_email_status_check",
      sql`${table.welcomeEmailStatus} in ('pending', 'sending', 'sent')`,
    ),
    check(
      "workspace_email_sender_founder_check",
      sql`${table.emailSenderFounder} in ('fran', 'jere')`,
    ),
    check(
      "workspace_feedback_default_sort_check",
      sql`${table.feedbackDefaultSort} in ('new', 'top', 'trending')`,
    ),
    index("workspace_created_by_user_id_idx").on(table.createdByUserId),
  ],
);

export const workspaceBillingCustomer = pgTable(
  "workspace_billing_customer",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("polar"),
    providerCustomerId: text("provider_customer_id").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_billing_customer_workspace_id_unique").on(
      table.workspaceId,
    ),
    unique("workspace_billing_customer_provider_customer_id_unique").on(
      table.providerCustomerId,
    ),
    index("workspace_billing_customer_provider_idx").on(table.provider),
  ],
);

export const workspaceSubscription = pgTable(
  "workspace_subscription",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(
      () => workspaceBillingCustomer.id,
      {
        onDelete: "set null",
      },
    ),
    provider: text("provider").notNull().default("polar"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    planKey: text("plan_key").notNull(),
    status: text("status").notNull(),
    billingInterval: text("billing_interval").notNull().default("monthly"),
    seatLimit: integer("seat_limit"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    canceledAt: timestamp("canceled_at"),
    providerProductId: text("provider_product_id"),
    providerPriceId: text("provider_price_id"),
    rawPayload: text("raw_payload"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("workspace_subscription_workspace_id_unique").on(table.workspaceId),
    unique("workspace_subscription_provider_subscription_id_unique").on(
      table.providerSubscriptionId,
    ),
    check(
      "workspace_subscription_billing_interval_check",
      sql`${table.billingInterval} in ('monthly', 'yearly')`,
    ),
    check(
      "workspace_subscription_status_check",
      sql`${table.status} in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')`,
    ),
    check(
      "workspace_subscription_plan_key_check",
      sql`${table.planKey} in ('growth', 'professional', 'enterprise')`,
    ),
    index("workspace_subscription_status_idx").on(table.status),
    index("workspace_subscription_provider_idx").on(table.provider),
    index("workspace_subscription_period_end_idx").on(table.currentPeriodEnd),
  ],
);

export const billingWebhookEvent = pgTable(
  "billing_webhook_event",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull().default("polar"),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("received"),
    payload: text("payload").notNull(),
    lastError: text("last_error"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("billing_webhook_event_provider_event_unique").on(
      table.provider,
      table.providerEventId,
    ),
    check(
      "billing_webhook_event_status_check",
      sql`${table.status} in ('received', 'processed', 'failed', 'ignored')`,
    ),
    index("billing_webhook_event_status_idx").on(table.status),
    index("billing_webhook_event_received_at_idx").on(table.receivedAt),
  ],
);

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("contributor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "workspace_member_role_check",
      sql`${table.role} in ('admin', 'contributor')`,
    ),
    index("workspace_member_workspace_id_idx").on(table.workspaceId),
    index("workspace_member_user_id_idx").on(table.userId),
    unique("workspace_member_workspace_id_user_id_unique").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const workspaceInvitation = pgTable(
  "workspace_invitation",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("contributor"),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    canceledAt: timestamp("canceled_at"),
    lastSentAt: timestamp("last_sent_at"),
    sendCount: integer("send_count").notNull().default(0),
    emailMessageId: text("email_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "workspace_invitation_role_check",
      sql`${table.role} in ('admin', 'contributor')`,
    ),
    check(
      "workspace_invitation_status_check",
      sql`${table.status} in ('pending', 'accepted', 'canceled', 'expired')`,
    ),
    unique("workspace_invitation_token_hash_unique").on(table.tokenHash),
    uniqueIndex("workspace_invitation_workspace_email_pending_unique")
      .on(table.workspaceId, table.email)
      .where(sql`${table.status} = 'pending'`),
    index("workspace_invitation_workspace_id_idx").on(table.workspaceId),
    index("workspace_invitation_email_idx").on(table.email),
    index("workspace_invitation_status_idx").on(table.status),
  ],
);

export const workspaceDomain = pgTable(
  "workspace_domain",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    verificationStatus: text("verification_status")
      .notNull()
      .default("pending"),
    verificationDetails: text("verification_details"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "workspace_domain_verification_status_check",
      sql`${table.verificationStatus} in ('pending', 'verified')`,
    ),
    index("workspace_domain_workspace_id_idx").on(table.workspaceId),
    unique("workspace_domain_domain_unique").on(table.domain),
    unique("workspace_domain_workspace_id_domain_unique").on(
      table.workspaceId,
      table.domain,
    ),
  ],
);

export const feedbackBoard = pgTable(
  "feedback_board",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("feedback_board_workspace_id_idx").on(table.workspaceId),
    unique("feedback_board_workspace_id_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
    uniqueIndex("feedback_board_workspace_default_unique")
      .on(table.workspaceId)
      .where(sql`${table.isDefault} = true`),
    unique("feedback_board_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
  ],
);

export const feedbackStatus = pgTable(
  "feedback_status",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    color: text("color"),
    position: integer("position").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isClosed: boolean("is_closed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("feedback_status_workspace_id_idx").on(table.workspaceId),
    index("feedback_status_workspace_position_idx").on(
      table.workspaceId,
      table.position,
    ),
    unique("feedback_status_workspace_key_unique").on(
      table.workspaceId,
      table.key,
    ),
    uniqueIndex("feedback_status_workspace_default_unique")
      .on(table.workspaceId)
      .where(sql`${table.isDefault} = true`),
    unique("feedback_status_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
  ],
);

export const feedbackPost = pgTable(
  "feedback_post",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    boardId: text("board_id").notNull(),
    statusId: text("status_id").notNull(),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    upvoteCount: integer("upvote_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    isPinned: boolean("is_pinned").notNull().default(false),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.boardId],
      foreignColumns: [feedbackBoard.workspaceId, feedbackBoard.id],
      name: "feedback_post_workspace_board_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.statusId],
      foreignColumns: [feedbackStatus.workspaceId, feedbackStatus.id],
      name: "feedback_post_workspace_status_fk",
    }).onDelete("restrict"),
    index("feedback_post_workspace_id_idx").on(table.workspaceId),
    index("feedback_post_workspace_board_created_idx").on(
      table.workspaceId,
      table.boardId,
      table.createdAt,
    ),
    index("feedback_post_workspace_status_created_idx").on(
      table.workspaceId,
      table.statusId,
      table.createdAt,
    ),
    index("feedback_post_workspace_upvote_idx").on(
      table.workspaceId,
      table.upvoteCount,
    ),
    unique("feedback_post_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
    unique("feedback_post_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
  ],
);

export const feedbackVote = pgTable(
  "feedback_vote",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    anonSessionId: text("anon_session_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.postId],
      foreignColumns: [feedbackPost.workspaceId, feedbackPost.id],
      name: "feedback_vote_workspace_post_fk",
    }).onDelete("cascade"),
    check(
      "feedback_vote_exactly_one_identity",
      sql`(${table.userId} is not null and ${table.anonSessionId} is null) or (${table.userId} is null and ${table.anonSessionId} is not null)`,
    ),
    index("feedback_vote_workspace_post_idx").on(
      table.workspaceId,
      table.postId,
    ),
    index("feedback_vote_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    uniqueIndex("feedback_vote_post_user_unique")
      .on(table.postId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("feedback_vote_post_anon_session_unique")
      .on(table.postId, table.anonSessionId)
      .where(sql`${table.anonSessionId} is not null`),
  ],
);

export const feedbackComment = pgTable(
  "feedback_comment",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id").notNull(),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    anonSessionId: text("anon_session_id"),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.postId],
      foreignColumns: [feedbackPost.workspaceId, feedbackPost.id],
      name: "feedback_comment_workspace_post_fk",
    }).onDelete("cascade"),
    check(
      "feedback_comment_at_least_one_identity",
      sql`${table.authorUserId} is not null or ${table.anonSessionId} is not null`,
    ),
    index("feedback_comment_workspace_post_created_idx").on(
      table.workspaceId,
      table.postId,
      table.createdAt,
    ),
  ],
);

export const feedbackTag = pgTable(
  "feedback_tag",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("feedback_tag_workspace_id_idx").on(table.workspaceId),
    unique("feedback_tag_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
    unique("feedback_tag_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
  ],
);

export const feedbackPostTag = pgTable(
  "feedback_post_tag",
  {
    workspaceId: text("workspace_id").notNull(),
    postId: text("post_id").notNull(),
    tagId: text("tag_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.postId, table.tagId],
      name: "feedback_post_tag_pk",
    }),
    foreignKey({
      columns: [table.workspaceId, table.postId],
      foreignColumns: [feedbackPost.workspaceId, feedbackPost.id],
      name: "feedback_post_tag_workspace_post_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.tagId],
      foreignColumns: [feedbackTag.workspaceId, feedbackTag.id],
      name: "feedback_post_tag_workspace_tag_fk",
    }).onDelete("cascade"),
    index("feedback_post_tag_workspace_tag_idx").on(
      table.workspaceId,
      table.tagId,
    ),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaceMemberships: many(workspaceMember),
  createdWorkspaces: many(workspace),
  feedbackPosts: many(feedbackPost),
  feedbackVotes: many(feedbackVote),
  feedbackComments: many(feedbackComment),
  workspaceInvitations: many(workspaceInvitation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  creator: one(user, {
    fields: [workspace.createdByUserId],
    references: [user.id],
  }),
  billingCustomer: many(workspaceBillingCustomer),
  subscriptions: many(workspaceSubscription),
  members: many(workspaceMember),
  domains: many(workspaceDomain),
  invitations: many(workspaceInvitation),
  feedbackBoards: many(feedbackBoard),
  feedbackStatuses: many(feedbackStatus),
  feedbackPosts: many(feedbackPost),
  feedbackVotes: many(feedbackVote),
  feedbackComments: many(feedbackComment),
  feedbackTags: many(feedbackTag),
}));

export const workspaceBillingCustomerRelations = relations(
  workspaceBillingCustomer,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [workspaceBillingCustomer.workspaceId],
      references: [workspace.id],
    }),
    subscriptions: many(workspaceSubscription),
  }),
);

export const workspaceSubscriptionRelations = relations(
  workspaceSubscription,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceSubscription.workspaceId],
      references: [workspace.id],
    }),
    customer: one(workspaceBillingCustomer, {
      fields: [workspaceSubscription.customerId],
      references: [workspaceBillingCustomer.id],
    }),
  }),
);

export const workspaceMemberRelations = relations(
  workspaceMember,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.id],
    }),
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.id],
    }),
  }),
);

export const workspaceDomainRelations = relations(
  workspaceDomain,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceDomain.workspaceId],
      references: [workspace.id],
    }),
  }),
);

export const workspaceInvitationRelations = relations(
  workspaceInvitation,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceInvitation.workspaceId],
      references: [workspace.id],
    }),
    inviter: one(user, {
      fields: [workspaceInvitation.invitedByUserId],
      references: [user.id],
    }),
  }),
);

export const feedbackBoardRelations = relations(
  feedbackBoard,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [feedbackBoard.workspaceId],
      references: [workspace.id],
    }),
    posts: many(feedbackPost),
  }),
);

export const feedbackStatusRelations = relations(
  feedbackStatus,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [feedbackStatus.workspaceId],
      references: [workspace.id],
    }),
    posts: many(feedbackPost),
  }),
);

export const feedbackPostRelations = relations(
  feedbackPost,
  ({ one, many }) => ({
    workspace: one(workspace, {
      fields: [feedbackPost.workspaceId],
      references: [workspace.id],
    }),
    board: one(feedbackBoard, {
      fields: [feedbackPost.boardId],
      references: [feedbackBoard.id],
    }),
    status: one(feedbackStatus, {
      fields: [feedbackPost.statusId],
      references: [feedbackStatus.id],
    }),
    author: one(user, {
      fields: [feedbackPost.authorUserId],
      references: [user.id],
    }),
    votes: many(feedbackVote),
    comments: many(feedbackComment),
    tags: many(feedbackPostTag),
  }),
);

export const feedbackVoteRelations = relations(feedbackVote, ({ one }) => ({
  workspace: one(workspace, {
    fields: [feedbackVote.workspaceId],
    references: [workspace.id],
  }),
  post: one(feedbackPost, {
    fields: [feedbackVote.postId],
    references: [feedbackPost.id],
  }),
  user: one(user, {
    fields: [feedbackVote.userId],
    references: [user.id],
  }),
}));

export const feedbackCommentRelations = relations(
  feedbackComment,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [feedbackComment.workspaceId],
      references: [workspace.id],
    }),
    post: one(feedbackPost, {
      fields: [feedbackComment.postId],
      references: [feedbackPost.id],
    }),
    author: one(user, {
      fields: [feedbackComment.authorUserId],
      references: [user.id],
    }),
  }),
);

export const feedbackTagRelations = relations(feedbackTag, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [feedbackTag.workspaceId],
    references: [workspace.id],
  }),
  posts: many(feedbackPostTag),
}));

export const feedbackPostTagRelations = relations(
  feedbackPostTag,
  ({ one }) => ({
    post: one(feedbackPost, {
      fields: [feedbackPostTag.postId],
      references: [feedbackPost.id],
    }),
    tag: one(feedbackTag, {
      fields: [feedbackPostTag.tagId],
      references: [feedbackTag.id],
    }),
  }),
);
