import * as React from 'react';
const Logo = (props) => (
  <svg
    width={100}
    height={100}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>{'FloorMates Logo'}</title>
    <rect width={100} height={100} rx={15} fill="#1b263b" />
    <circle cx={35} cy={40} r={12} fill="#e0e1dd" />
    <path d="M20 80 C 20 60, 50 60, 50 80 Z" fill="#e0e1dd" />
    <circle cx={65} cy={40} r={12} fill="#6b829e" />
    <path d="M50 80 C 50 60, 80 60, 80 80 Z" fill="#6b829e" />
    <path
      d="M45 65 Q 50 70, 55 65"
      stroke="#415a77"
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);
export default Logo;
