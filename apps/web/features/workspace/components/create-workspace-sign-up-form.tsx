"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  createWorkspaceAction,
  type CreateWorkspaceState,
} from "@/app/onboarding/actions";
import { FancyButton } from "@/components/ui/fancy-button";
import { Input } from "@/components/ui/input";
import { rootDomain } from "@/lib/utils";
import {
  normalizeCompanyName,
  validateCreateWorkspaceInput,
} from "~/workspace/schemas/create-workspace";
import { sanitizeWorkspaceSlug } from "~/workspace/schemas/workspace-slug";

const initialState: CreateWorkspaceState = {};
const primaryGoal = "capture_manage_feedback" as const;

type FeedbackAccess = "public" | "private";
type SignUpStep = "goal" | "access" | "company";
type GoalOptionId = (typeof mainGoalOptions)[number]["id"];

const mainGoalOptions = [
  {
    id: primaryGoal,
    label: "Capture & manage feedback",
    disabled: false,
  },
  {
    id: "manage_customer_support",
    label: "Manage customer support",
    disabled: true,
  },
  {
    id: "publish_product_updates",
    label: "Publish product updates",
    disabled: true,
  },
  {
    id: "run_surveys",
    label: "Run surveys",
    disabled: true,
  },
  {
    id: "create_help_center",
    label: "Create your help center",
    disabled: true,
  },
] as const;

export function CreateWorkspaceSignUpForm({
  initialCompanyName = "",
}: {
  initialCompanyName?: string;
}) {
  const [signUpStep, setSignUpStep] = useState<SignUpStep>("goal");
  const [feedbackAccess, setFeedbackAccess] =
    useState<FeedbackAccess>("public");
  const [selectedGoal, setSelectedGoal] = useState<GoalOptionId>(primaryGoal);
  const [companyName, setCompanyName] = useState(() =>
    normalizeCompanyName(initialCompanyName),
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, isPending] = useActionState(
    createWorkspaceAction,
    initialState,
  );

  useEffect(() => {
    if (typeof state.companyName === "string") {
      setCompanyName(state.companyName);
    }
  }, [state.companyName]);

  const previewSlug = useMemo(
    () => sanitizeWorkspaceSlug(companyName),
    [companyName],
  );

  const resolvedPrimaryGoal =
    selectedGoal === primaryGoal ? selectedGoal : primaryGoal;

  if (signUpStep === "goal") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
            What&apos;s your main goal today?
          </h1>
          <p className="text-sm text-zinc-500">
            Select what you&apos;d like to set up first.
          </p>
        </div>

        <div className="space-y-2">
          {mainGoalOptions.map((option) =>
            (() => {
              const isSelected = selectedGoal === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (!option.disabled) {
                      setSelectedGoal(option.id);
                    }
                  }}
                  disabled={option.disabled}
                  className={`flex h-12 w-full items-center justify-between rounded-[14px] border px-4 text-sm font-medium ${
                    option.disabled
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                      : isSelected
                        ? "cursor-pointer border-zinc-950 bg-zinc-950 text-white shadow-[0_2px_0_0_rgba(255,255,255,0.12)_inset,0_-4px_0_0_rgba(0,0,0,0.35)_inset]"
                        : "cursor-pointer border-zinc-300 bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2.4}
                      className="size-5 text-white"
                    />
                  ) : null}
                </button>
              );
            })(),
          )}
        </div>

        <FancyButton.Root
          type="button"
          variant="neutral"
          size="medium"
          onClick={() => {
            setClientError(null);
            setSignUpStep("access");
          }}
          className="w-full"
        >
          Continue
        </FancyButton.Root>
      </div>
    );
  }

  if (signUpStep === "access") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
            Who should have access to your feedback module?
          </h1>
          <p className="text-sm text-zinc-500">
            You can always change this later in settings.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFeedbackAccess("public")}
            className={`w-full rounded-[14px] border p-4 text-left transition-colors ${
              feedbackAccess === "public"
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <p className="text-base font-medium text-zinc-900">
              Publicly accessible
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Everyone can access your feedback portal page and widgets.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFeedbackAccess("private")}
            className={`w-full rounded-[14px] border p-4 text-left transition-colors ${
              feedbackAccess === "private"
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <p className="text-base font-medium text-zinc-900">
              Manage access privately
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Only selected groups can access the portal and widgets.
            </p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <FancyButton.Root
            type="button"
            variant="basic"
            size="medium"
            onClick={() => {
              setClientError(null);
              setSignUpStep("goal");
            }}
            className="w-full"
          >
            Back
          </FancyButton.Root>

          <FancyButton.Root
            type="button"
            variant="neutral"
            size="medium"
            onClick={() => {
              setClientError(null);
              setSignUpStep("company");
            }}
            className="w-full"
          >
            Continue
          </FancyButton.Root>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" action={action}>
      <div className="space-y-1">
        <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-zinc-950">
          What&apos;s your company name?
        </h1>
        <p className="text-sm text-zinc-500">
          We&apos;ll create a new workspace and then continue to billing setup.
        </p>
      </div>

      <input type="hidden" name="allowExistingMembership" value="1" />
      <input type="hidden" name="redirectToPaywall" value="1" />
      <input type="hidden" name="feedbackAccess" value={feedbackAccess} />
      <input type="hidden" name="primaryGoal" value={resolvedPrimaryGoal} />

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700">Company name</span>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          required
          className="h-11 rounded-xl border-zinc-300 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500"
          placeholder="Acme"
        />
        <p className="text-xs text-zinc-500">
          Workspace URL:{" "}
          <span className="font-medium text-zinc-700">
            {(previewSlug || "subdomain") + "." + rootDomain}
          </span>
        </p>
      </label>

      {clientError ? (
        <p className="text-sm text-red-600">{clientError}</p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <FancyButton.Root
          type="button"
          variant="basic"
          size="medium"
          onClick={() => {
            setClientError(null);
            setSignUpStep("access");
          }}
          className="w-full"
        >
          Back
        </FancyButton.Root>

        <FancyButton.Root
          type="submit"
          variant="neutral"
          size="medium"
          disabled={isPending}
          className="w-full"
          onClick={(event) => {
            const inputError = validateCreateWorkspaceInput({ companyName });
            if (inputError) {
              event.preventDefault();
              setClientError(inputError);
              return;
            }
            setClientError(null);
          }}
        >
          {isPending ? "Creating..." : "Continue"}
        </FancyButton.Root>
      </div>
    </form>
  );
}
