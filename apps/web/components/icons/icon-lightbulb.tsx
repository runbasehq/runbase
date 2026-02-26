import * as React from "react";
import type { SVGProps } from "react";

type IconLightbulbProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

export function IconLightbulb({
  color = "currentColor",
  ...props
}: IconLightbulbProps) {
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
        clipRule="evenodd"
        d="M12 3a6.5 6.5 0 0 0-4.15 11.5c.56.46.9 1.12.9 1.85V17a1 1 0 0 0 1 1h4.5a1 1 0 0 0 1-1v-.65c0-.73.34-1.4.9-1.86A6.5 6.5 0 0 0 12 3Zm-1.75 16.5a.75.75 0 0 0 .75.75h2a.75.75 0 0 0 .75-.75v-.25h-3.5v.25Zm1.75 2a1.25 1.25 0 0 1-1.2-.9h2.4a1.25 1.25 0 0 1-1.2.9Z"
      />
    </svg>
  );
}
