import "server-only";

import { render } from "@react-email/render";
import { Resend } from "resend";

import { WorkspaceWelcomeEmail } from "~/workspace/email/workspace-welcome-email";

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function getSenderEmail() {
  return (
    process.env.RESEND_WELCOME_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "Runbase <fran@runbase.so>"
  );
}

export async function sendWorkspaceWelcomeEmail({
  recipientEmail,
  recipientName,
  workspaceId,
  workspaceName,
  workspaceUrl,
}: {
  recipientEmail: string;
  recipientName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceUrl: string;
}) {
  const resend = getResendClient();
  const from = getSenderEmail();

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
