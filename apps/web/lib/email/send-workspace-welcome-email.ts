import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import { WorkspaceWelcomeEmail } from "~/workspace/email/workspace-welcome-email";

export type WorkspaceEmailSenderFounder = "fran" | "jere";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

function getSenderEmail(founder: WorkspaceEmailSenderFounder) {
  if (founder === "jere") {
    return requireEnv("RESEND_WELCOME_FROM_EMAIL_JERE");
  }

  return requireEnv("RESEND_WELCOME_FROM_EMAIL_FRAN");
}

export async function sendWorkspaceWelcomeEmail({
  founder,
  recipientEmail,
  recipientName,
  workspaceId,
  workspaceName,
  workspaceUrl,
}: {
  founder: WorkspaceEmailSenderFounder;
  recipientEmail: string;
  recipientName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceUrl: string;
}) {
  const resend = getResendClient();
  const from = getSenderEmail(founder);

  const html = await render(
    WorkspaceWelcomeEmail({
      recipientName,
      workspaceName,
      workspaceUrl,
    }),
  );
  const text = `Welcome to ${workspaceName}! Your workspace is ready: ${workspaceUrl}`;

  const { data, error } = await resend.emails.send(
    {
      from,
      to: [recipientEmail],
      subject: `Welcome to ${workspaceName}`,
      html,
      text,
    },
    {
      idempotencyKey: `workspace-welcome/${workspaceId}`,
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send workspace welcome email");
  }

  return data?.id ?? null;
}
