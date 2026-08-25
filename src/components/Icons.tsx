interface P {
  size?: number;
  className?: string;
  strokeWidth?: number;
}
const base = (size?: number) => ({
  width: size ?? 20,
  height: size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="1.5" y="1.5" width="37" height="37" rx="8" fill="#14263A" />
      <rect x="1.5" y="1.5" width="37" height="37" rx="8" stroke="#FFD84D" strokeWidth="1.6" />
      <path d="M9 12h22" stroke="#FFD84D" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9 20h14" stroke="#F4F7F9" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9 28h18" stroke="#FFD84D" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="30" cy="20" r="3.4" stroke="#F4F7F9" strokeWidth="2" />
    </svg>
  );
}

export const IconSheet = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2.8h8.2L19 7.6V21.2H6z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 12h6M8.5 15.2h6M8.5 18.4h3.6" />
  </svg>
);

export const IconUpload = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15V4.5" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </svg>
);

export const IconDownload = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v10.5" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </svg>
);

export const IconCheck = ({ size, className, strokeWidth = 2.2 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12.8l4.6 4.7L19.5 6.6" />
  </svg>
);

export const IconWarn = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.6L21.4 20H2.6z" />
    <path d="M12 9.8v4.4" />
    <circle cx="12" cy="17.2" r="0.4" fill="currentColor" />
  </svg>
);

export const IconX = ({ size, className, strokeWidth = 2 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconArrow = ({ size, className, strokeWidth = 2 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h15" />
    <path d="M13.5 6l6 6-6 6" />
  </svg>
);

export const IconTree = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="7" height="5" rx="1" />
    <rect x="13.5" y="9.5" width="7" height="5" rx="1" />
    <rect x="13.5" y="15.5" width="7" height="5" rx="1" />
    <path d="M7 8.5v9a1.5 1.5 0 0 0 1.5 1.5h5" />
    <path d="M10.5 12h3" />
  </svg>
);

export const IconSigma = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 6.5V4.8H6.2L12.4 12l-6.2 7.2h11.3v-1.7" />
  </svg>
);

export const IconPaint = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="13" height="6" rx="1.2" />
    <path d="M17 6h2.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-6.5v2" />
    <rect x="10" y="14" width="3" height="6.5" rx="1" />
  </svg>
);

export const IconGroup = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H8" />
    <path d="M9.5 7.5h10M9.5 12h10M9.5 16.5h6" />
  </svg>
);

export const IconShield = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.2l7 2.6v5.4c0 4.6-3 8-7 9.6-4-1.6-7-5-7-9.6V5.8z" />
    <path d="M8.8 11.9l2.3 2.3 4.2-4.6" />
  </svg>
);

export const IconRefresh = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.8 3.8v3.4h-3.4" />
  </svg>
);

export const IconStamp = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 10.5c.9-1.4.6-2.6.2-3.9a2.6 2.6 0 1 1 4.6 0c-.4 1.3-.7 2.5.2 3.9" />
    <path d="M5.5 14.5a1.5 1.5 0 0 1 1.5-1.5h10a1.5 1.5 0 0 1 1.5 1.5v2.5h-13z" />
    <path d="M5.5 20h13" />
  </svg>
);

export const IconGlobe = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.2" />
    <path d="M3.8 12h16.4M12 3.8c-2.5 2.3-3.8 5-3.8 8.2s1.3 5.9 3.8 8.2c2.5-2.3 3.8-5 3.8-8.2s-1.3-5.9-3.8-8.2z" />
  </svg>
);

export const IconSpark = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6-5.6-1.9 5.6-1.9z" />
    <path d="M18.8 16.8l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" strokeWidth={1.3} />
  </svg>
);
