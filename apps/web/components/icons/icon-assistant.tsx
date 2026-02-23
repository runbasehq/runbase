import * as React from "react";
import type { SVGProps } from "react";

type IconAssistantProps = SVGProps<SVGSVGElement> & {
  color?: string;
};

export function IconAssistant({
  color = "currentColor",
  ...props
}: IconAssistantProps) {
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
        d="M12.5 1.5C6.97715 1.5 2.5 5.97715 2.5 11.5C2.5 17.0228 6.97715 21.5 12.5 21.5C18.0228 21.5 22.5 17.0228 22.5 11.5C22.5 5.97715 18.0228 1.5 12.5 1.5ZM17.4965 5.58302C16.4999 5.66608 16.583 6.66263 16.583 6.66263L17.0814 12.6419C17.0814 12.6419 17.1645 13.6384 18.161 13.5554C19.1576 13.4723 19.0745 12.4758 19.0745 12.4758L18.5761 6.49649C18.5761 6.49649 18.493 5.49995 17.4965 5.58302ZM13.6965 5.58302C12.6999 5.66608 12.783 6.66263 12.783 6.66263L13.2814 12.6419C13.2814 12.6419 13.3645 13.6384 14.361 13.5554C15.3576 13.4723 15.2745 12.4758 15.2745 12.4758L14.7761 6.49649C14.7761 6.49649 14.693 5.49995 13.6965 5.58302Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
