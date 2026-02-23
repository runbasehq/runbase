import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function WorkspaceInviteEmail({
  acceptUrl,
  inviterName,
  role,
  workspaceName,
}: {
  acceptUrl: string;
  inviterName: string;
  role: "admin" | "contributor";
  workspaceName: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${inviterName} invited you to join ${workspaceName}`}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f7fb",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e7e8ef",
            borderRadius: "12px",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "28px",
          }}
        >
          <Text
            style={{
              color: "#121316",
              fontSize: "22px",
              fontWeight: 700,
              lineHeight: "30px",
              margin: "0 0 14px",
            }}
          >
            You are invited to join {workspaceName}
          </Text>
          <Text
            style={{
              color: "#4a4d57",
              fontSize: "15px",
              lineHeight: "24px",
              margin: "0 0 14px",
            }}
          >
            {inviterName} invited you to collaborate as a <b>{role}</b>.
          </Text>
          <Section style={{ margin: "22px 0" }}>
            <Button
              href={acceptUrl}
              style={{
                backgroundColor: "#111216",
                borderRadius: "10px",
                color: "#ffffff",
                display: "inline-block",
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: "14px",
                padding: "13px 18px",
                textDecoration: "none",
              }}
            >
              Accept invitation
            </Button>
          </Section>
          <Text
            style={{
              color: "#737783",
              fontSize: "13px",
              lineHeight: "20px",
              margin: 0,
            }}
          >
            This invitation link expires in 7 days.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
