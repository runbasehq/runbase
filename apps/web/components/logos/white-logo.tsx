import type { SVGProps } from "react";

export function WhiteLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 114 103"
      fill="none"
      {...props}
    >
      <rect
        width={90}
        height={15}
        x={102}
        y={76}
        fill="url(#paint0_linear)"
        transform="matrix(-1 0 0 1 0 0)"
      />
      <rect width={90} height={16} x={12} y={54} fill="#000" />
      <rect width={54} height={15} x={48} y={33} fill="#000" />
      <rect width={36} height={15} x={12} y={12} fill="#000" />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1={0}
          x2={90}
          y1={7.5}
          y2={7.5}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CDFF29" />
          <stop offset={0.320517} stopColor="#BCFF7A" />
          <stop offset={0.745575} stopColor="#FF45C7" />
          <stop offset={1} stopColor="#BF40FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
