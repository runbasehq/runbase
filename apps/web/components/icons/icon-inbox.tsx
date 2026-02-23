import * as React from "react";
import type { SVGProps } from "react";

type IconInboxProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

export function IconInbox({
  color = "currentColor",
  ...props
}: IconInboxProps) {
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
        d="M3.553 5.658A3 3 0 0 1 6.236 4h11.528a3 3 0 0 1 2.683 1.658l1.814 3.628a7 7 0 0 1 .739 3.13V17a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-4.584a7 7 0 0 1 .739-3.13zM20.795 11H16.15a1.65 1.65 0 0 0-1.65 1.65 1.6 1.6 0 0 1-1.6 1.6h-1.8a1.6 1.6 0 0 1-1.6-1.6A1.65 1.65 0 0 0 7.85 11H3.205q.124-.423.323-.82l1.814-3.627A1 1 0 0 1 6.236 6h11.528a1 1 0 0 1 .894.553l1.814 3.627q.198.397.323.82"
        clipRule="evenodd"
      />
    </svg>
  );
}
