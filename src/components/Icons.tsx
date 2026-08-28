import { useRef, useState } from "react";

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

/* ---------- логотипы: сначала ищем PNG пользователя, иначе штатный SVG ---------- */
function LogoImg({ png, svg, size, alt }: { png: string; svg: string; size: number; alt: string }) {
  const baseurl = import.meta.env.BASE_URL ?? "/";
  const [src, setSrc] = useState(baseurl + png);
  const failed = useRef(false);
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className="shrink-0 select-none rounded-[9px]"
      style={{ backgroundColor: "#fff" }}
      onError={() => {
        if (!failed.current) {
          failed.current = true;
          // eslint-disable-next-line no-console
          console.warn(
            `[Стикер в 1С] не найден ${baseurl + png} — показан SVG-заменитель. ` +
              `Проверьте, что файл закоммичен в папку public/ репозитория.`
          );
          setSrc(baseurl + svg);
        }
      }}
    />
  );
}
export const DonorLogo = ({ size = 40 }: { size?: number }) => (
  <LogoImg png="logo.png" svg="logo.svg" size={size} alt="Логотип файла-донора" />
);
export const OneCLogo = ({ size = 40 }: { size?: number }) => (
  <LogoImg png="logo2.png" svg="logo2.svg" size={size} alt="Логотип файла 1С" />
);

/* ---------- иконки ---------- */
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

export const IconCheck = ({ size, className, strokeWidth = 2.4 }: P) => (
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

export const IconShield = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7.5 3v5.6c0 4.6-3.2 7.9-7.5 9.4-4.3-1.5-7.5-4.8-7.5-9.4V6z" />
    <path d="M8.7 11.9l2.3 2.3 4.3-4.6" />
  </svg>
);

export const IconSigma = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 7.5v-2h-11l6 6.5-6 6.5h11v-2" />
  </svg>
);

export const IconTree = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="7" height="5" rx="1" />
    <rect x="13.5" y="9.5" width="7" height="5" rx="1" />
    <rect x="13.5" y="15.5" width="7" height="5" rx="1" />
    <path d="M7 8.5v9.5h6.5M7 12h6.5" />
  </svg>
);

export const IconPaint = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="7" rx="1.5" />
    <path d="M12 11v3.5h5.5a1 1 0 0 1 1 1v1" />
    <rect x="16" y="16.5" width="5" height="4" rx="1" transform="translate(-2.5 0)" />
  </svg>
);

export const IconGroup = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16M4 9h10M4 13h10M4 17h16" />
    <path d="M19 8v6" />
    <path d="M17.5 9.5L19 8l1.5 1.5M17.5 12.5L19 14l1.5-1.5" />
  </svg>
);

export const IconRefresh = ({ size, className, strokeWidth = 1.9 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9" />
    <path d="M19.5 4.5V9H15" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15" />
    <path d="M4.5 19.5V15H9" />
  </svg>
);

export const IconCopy = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 5.5v-.3A1.7 1.7 0 0 0 13.8 3.5H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6a1.7 1.7 0 0 0 1.7 1.7h.3" />
  </svg>
);

export const IconLock = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    <circle cx="12" cy="15.2" r="0.5" fill="currentColor" />
  </svg>
);

export const IconExternal = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V14" />
    <path d="M14 4.5h5.5V10" />
    <path d="M19 5l-8 8" />
  </svg>
);

export const IconGlobe = ({ size, className, strokeWidth = 1.7 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.2 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.2-3.9-8.5s1.3-6.2 3.9-8.5z" />
  </svg>
);

export const IconEye = ({ size, className, strokeWidth = 1.8 }: P) => (
  <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
