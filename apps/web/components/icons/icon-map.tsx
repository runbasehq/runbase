import * as React from "react";
import type { SVGProps } from "react";

type IconMapProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

export function IconMap({ color = "currentColor", ...props }: IconMapProps) {
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
        d="M8.606 2.08a1 1 0 0 1 .949.088l5.549 3.7 6.502-2.787A1 1 0 0 1 23 4v14a1 1 0 0 1-.606.92l-7 3a1 1 0 0 1-.949-.088l-5.549-3.7-6.502 2.787A1 1 0 0 1 1 20V6a1 1 0 0 1 .606-.92zM8.5 5a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1m7 4a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0v-8a1 1 0 0 1 1-1"
        clipRule="evenodd"
      />
    </svg>
  );
}
