import * as React from "react";

export function recursiveCloneChildren(
  children: React.ReactNode,
  additionalProps: Record<string, unknown>,
  displayNames: string[],
  uniqueId: string,
  asChild?: boolean,
): React.ReactNode | React.ReactNode[] {
  const mappedChildren = React.Children.map(
    children,
    (child: React.ReactNode, index) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      const displayName =
        (child.type as React.ComponentType)?.displayName || "";
      const newProps = displayNames.includes(displayName)
        ? additionalProps
        : {};

      const childProps = (child as React.ReactElement<Record<string, unknown>>)
        .props;

      return React.cloneElement(
        child,
        { ...newProps, key: `${uniqueId}-${index}` },
        recursiveCloneChildren(
          childProps?.children as React.ReactNode,
          additionalProps,
          displayNames,
          uniqueId,
          childProps?.asChild as boolean | undefined,
        ),
      );
    },
  );

  return asChild ? mappedChildren?.[0] : mappedChildren;
}
