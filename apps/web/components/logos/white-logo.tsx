import type { SVGProps } from "react";

export function WhiteLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 324 85"
      fill="none"
      {...props}
    >
      <path
        fill="#fff"
        d="M16.655 3.773h5.335v5.335l3.774 3.774-3.774 3.773v5.336h-5.336l-3.772 3.773-3.773-3.773H3.773v-5.336L0 12.882l3.773-3.774V3.773h5.335L12.882 0z"
      />
      <path
        fill="url(#white_logo_gradient_jsx)"
        d="M85 61H61v24H5C5 40.817 40.817 5 85 5z"
      />
      <defs>
        <linearGradient
          id="white_logo_gradient_jsx"
          x1={4.764}
          x2={88.264}
          y1={84.764}
          y2={4.764}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CDFF29" />
          <stop offset={0.701} stopColor="#FF45C7" />
          <stop offset={1} stopColor="#BF40FF" />
        </linearGradient>
      </defs>
      <text
        x={102}
        y={55}
        fill="#FFF"
        fontFamily="Inter, sans-serif"
        fontSize={44}
        fontWeight={500}
        letterSpacing={-1.5}
      >
        {"Runbase"}
      </text>
    </svg>
  );
}
