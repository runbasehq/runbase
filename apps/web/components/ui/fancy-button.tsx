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
      "group relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium outline-none",
      "transition duration-200 ease-out",
      "focus-visible:ring-2 focus-visible:ring-ring/30",
      "disabled:pointer-events-none disabled:opacity-50",
    ],
    icon: "relative z-10 size-5 shrink-0",
  },
  variants: {
    variant: {
      neutral: {
        root: "border-transparent bg-(--text) text-white shadow-(--shadow-fancy-neutral)",
      },
      primary: {
        root: "border-transparent bg-primary text-primary-foreground shadow-(--shadow-fancy-neutral)",
      },
      destructive: {
        root: "border-transparent bg-destructive text-white shadow-(--shadow-fancy-neutral)",
      },
      basic: {
        root: [
          "border-(--border) bg-(--surface) text-(--muted) shadow-(--shadow-fancy-stroke)",
          "hover:bg-(--surface-2) hover:text-(--text) hover:shadow-none",
        ],
      },
    },
    size: {
      medium: {
        root: "h-10 gap-3 rounded-[10px] px-3.5",
        icon: "-mx-1",
      },
      small: {
        root: "h-9 gap-3 rounded-lg px-3",
        icon: "-mx-1",
      },
      xsmall: {
        root: "h-8 gap-3 rounded-lg px-2.5",
        icon: "-mx-1",
      },
    },
  },
  compoundVariants: [
    {
      variant: ["neutral", "primary", "destructive"],
      class: {
        root: [
          "before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit]",
          "before:bg-linear-to-b before:from-white/20 before:to-transparent before:p-px",
          "before:[mask-clip:content-box,border-box] before:[mask-composite:exclude] before:[mask-image:linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)]",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-linear-to-b after:from-white/80 after:to-transparent",
          "after:opacity-15 after:transition after:duration-200 after:ease-out",
          "hover:after:opacity-25",
        ],
      },
    },
  ],
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
