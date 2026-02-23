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
    ],
    icon: "relative z-10 shrink-0",
  },
  variants: {
    variant: {
      neutral: {
        root: [
          "border-foreground/15 bg-foreground text-background",
          "shadow-[0_2px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.34)_inset,0_8px_16px_-14px_rgba(0,0,0,0.42)]",
          "hover:bg-foreground/92",
        ],
      },
      primary: {
        root: [
          "border-[#a7e865] bg-primary text-primary-foreground",
          "shadow-[0_2px_0_0_rgba(255,255,255,0.3)_inset,0_-2px_0_0_rgba(90,130,42,0.22)_inset,0_8px_16px_-14px_rgba(82,132,35,0.55)]",
          "hover:bg-primary/90",
        ],
      },
      destructive: {
        root: [
          "border-destructive/65 bg-destructive text-white",
          "shadow-[0_2px_0_0_rgba(255,255,255,0.22)_inset,0_-2px_0_0_rgba(125,20,20,0.32)_inset,0_8px_16px_-14px_rgba(125,20,20,0.45)]",
          "hover:bg-destructive/92",
        ],
      },
      basic: {
        root: [
          "border-border bg-card text-foreground",
          "shadow-[0_2px_0_0_rgba(255,255,255,0.75)_inset,0_-2px_0_0_rgba(17,18,20,0.1)_inset,0_8px_14px_-14px_rgba(17,18,20,0.22)]",
          "hover:bg-muted/70",
        ],
      },
    },
    size: {
      medium: {
        root: "h-11 gap-2.5 rounded-[12px] px-5 text-[15px]",
        icon: "size-5 -mx-0.5",
      },
      small: {
        root: "h-10 gap-2 rounded-[12px] px-4 text-[14px]",
        icon: "size-[18px] -mx-0.5",
      },
      xsmall: {
        root: "h-9 gap-1.5 rounded-[11px] px-3 text-[13px]",
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
