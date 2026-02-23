import * as React from "react";
import type { SVGProps } from "react";

type IconSearchProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

export function IconSearch({
  color = "currentColor",
  ...props
}: IconSearchProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fill={color}
        fillRule="evenodd"
        d="M4 11a7 7 0 1 1 14 0 7 7 0 0 1-14 0m7-9a9 9 0 1 0 5.618 16.032l4.175 4.175a1 1 0 0 0 1.414-1.414l-4.175-4.175A9 9 0 0 0 11 2"
        clipRule="evenodd"
      />
    </svg>
  );
}
