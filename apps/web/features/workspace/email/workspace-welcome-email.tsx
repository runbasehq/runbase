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

export function WorkspaceWelcomeEmail({
  recipientName,
  workspaceName,
  workspaceUrl,
}: {
  recipientName: string;
  workspaceName: string;
  workspaceUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`Welcome to ${workspaceName}`}</Preview>
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
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: "32px",
              margin: "0 0 20px",
            }}
          >
            Welcome to {workspaceName}
          </Text>

          <Text
            style={{
              color: "#4a4d57",
              fontSize: "15px",
              lineHeight: "24px",
              margin: "0 0 16px",
            }}
          >
            Hey {recipientName}, your workspace is ready. You can now collect
            feedback, collaborate with your team, and ship faster.
          </Text>

          <Section
            style={{
              backgroundColor: "#f9fafc",
              border: "1px solid #e7e8ef",
              borderRadius: "10px",
              margin: "0 0 20px",
              padding: "14px 16px",
            }}
          >
            <Text
              style={{
                color: "#121316",
                fontSize: "14px",
                fontWeight: 700,
                margin: "0 0 4px",
              }}
            >
              Your workspace
            </Text>
            <Text
              style={{
                color: "#4a4d57",
                fontSize: "13px",
                margin: 0,
              }}
            >
              {workspaceName}
            </Text>
            <Text
              style={{
                color: "#4a4d57",
                fontSize: "13px",
                margin: "4px 0 0",
              }}
            >
              {workspaceUrl}
            </Text>
          </Section>

          <Section style={{ margin: "0 0 20px" }}>
            <Button
              href={workspaceUrl}
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
              Go to your dashboard
            </Button>
          </Section>

          <Text
            style={{
              borderTop: "1px solid #e7e8ef",
              color: "#737783",
              fontSize: "12px",
              lineHeight: "20px",
              margin: 0,
              paddingTop: "16px",
            }}
          >
            This email was sent to confirm your workspace setup.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
