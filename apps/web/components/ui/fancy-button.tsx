"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { PolymorphicComponentProps } from "@/utils/polymorphic";
import { recursiveCloneChildren } from "@/utils/recursive-clone-children";
import { tv, type VariantProps } from "@/utils/tv";

const FANCY_BUTTON_ROOT_NAME = "FancyButtonRoot";
const FANCY_BUTTON_ICON_NAME = "FancyButtonIcon";

export const fancyButtonVariants = tv({
  slots: {
    root: [
      "group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap border font-semibold leading-none outline-none select-none",
      "transition-[transform,filter,box-shadow,background-color,color,border-color,opacity] duration-200 ease-out",
      "focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      "active:translate-y-px",
      "disabled:pointer-events-none disabled:opacity-55",
      "shadow-[0_1px_0_0_rgba(255,255,255,0.32)_inset,0_-2px_0_0_rgba(17,18,20,0.14)_inset,0_10px_16px_-14px_rgba(17,18,20,0.35)]",
    ],
    icon: "relative z-10 shrink-0",
  },
  variants: {
    variant: {
      neutral: {
        root: [
          "border-foreground/15 bg-foreground text-background",
          "hover:bg-foreground/92",
        ],
      },
      primary: {
        root: [
          "border-primary/70 bg-primary text-primary-foreground",
          "hover:bg-primary/90",
        ],
      },
      destructive: {
        root: [
          "border-destructive/65 bg-destructive text-white",
          "hover:bg-destructive/92",
        ],
      },
      basic: {
        root: ["border-border bg-card text-foreground", "hover:bg-muted/70"],
      },
    },
    size: {
      medium: {
        root: "h-11 gap-2.5 rounded-[11px] px-5 text-[15px]",
        icon: "size-5 -mx-0.5",
      },
      small: {
        root: "h-10 gap-2 rounded-[10px] px-4 text-[14px]",
        icon: "size-[18px] -mx-0.5",
      },
      xsmall: {
        root: "h-9 gap-1.5 rounded-[9px] px-3 text-[13px]",
        icon: "size-4 -mx-0.5",
      },
    },
  },
  defaultVariants: {
    variant: "neutral",
    size: "medium",
  },
});

type FancyButtonSharedProps = VariantProps<typeof fancyButtonVariants>;

type FancyButtonProps = VariantProps<typeof fancyButtonVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

const FancyButtonRoot = React.forwardRef<HTMLButtonElement, FancyButtonProps>(
  ({ asChild, children, variant, size, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : "button";
    const { root } = fancyButtonVariants({ variant, size });

    const sharedProps: FancyButtonSharedProps = {
      variant,
      size,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [FANCY_BUTTON_ICON_NAME],
      uniqueId,
      asChild,
    );

    return (
      <Component
        ref={forwardedRef}
        data-slot="fancy-button"
        className={root({ class: className })}
        {...rest}
      >
        {extendedChildren}
      </Component>
    );
  },
);
FancyButtonRoot.displayName = FANCY_BUTTON_ROOT_NAME;

function FancyButtonIcon<T extends React.ElementType>({
  className,
  variant,
  size,
  as,
  ...rest
}: PolymorphicComponentProps<T, FancyButtonSharedProps>) {
  const Component = as || "div";
  const { icon } = fancyButtonVariants({ variant, size });

  return <Component className={icon({ class: className })} {...rest} />;
}
FancyButtonIcon.displayName = FANCY_BUTTON_ICON_NAME;

const FancyButton = {
  Root: FancyButtonRoot,
  Icon: FancyButtonIcon,
};

export { FancyButton, FancyButtonIcon, FancyButtonRoot };
