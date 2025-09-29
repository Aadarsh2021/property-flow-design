/**
 * Simple SVG Icons - NO lucide-react dependencies
 * This completely eliminates any forwardRef issues
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// Simple SVG wrapper with no forwardRef
const createSimpleSVGIcon = (path: string, viewBox = "0 0 24 24") => {
  return ({ className = "", size = 16, style, ...props }: IconProps) => (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...props}
    >
      <path d={path} />
    </svg>
  );
};

// Multi-path icons
const createMultiPathIcon = (paths: string[], viewBox = "0 0 24 24") => {
  return ({ className = "", size = 16, style, ...props }: IconProps) => (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...props}
    >
      {paths.map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
};

// Essential icons for the app
export const Shield = createSimpleSVGIcon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
export const LogOut = createMultiPathIcon(["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "l7 7-7 7", "M16 12H3"]);
export const Settings = createSimpleSVGIcon("M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z");

export const Eye = createMultiPathIcon(["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"], "0 0 24 24");
export const EyeOff = createMultiPathIcon([
  "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94",
  "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19",
  "M1 1l22 22"
]);

export const Lock = createMultiPathIcon([
  "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z",
  "M7 11V7a5 5 0 0 1 10 0v4"
]);

export const User = createMultiPathIcon([
  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
  "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
]);

export const Search = createMultiPathIcon([
  "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  "M21 21l-4.35-4.35"
]);

export const Plus = createMultiPathIcon(["M12 5v14", "M5 12h14"]);
export const X = createMultiPathIcon(["M18 6L6 18", "M6 6l12 12"]);
export const ChevronDown = createSimpleSVGIcon("M6 9l6 6 6-6");
export const ChevronUp = createSimpleSVGIcon("M18 15l-6-6-6 6");
export const ChevronLeft = createSimpleSVGIcon("M15 18l-6-6 6-6");
export const ChevronRight = createSimpleSVGIcon("M9 18l6-6-6-6");

export const Mail = createMultiPathIcon([
  "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
  "M22 6l-10 7L2 6"
]);

export const Phone = createSimpleSVGIcon("M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z");

export const Home = createMultiPathIcon([
  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "M9 22V12h6v10"
]);

export const Loader2 = ({ className = "", size = 16, style, ...props }: IconProps) => (
  <svg
    className={`animate-spin ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export const FileText = createMultiPathIcon([
  "M14 3v4a1 1 0 0 0 1 1h4",
  "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z",
  "M9 9h1",
  "M9 13h6",
  "M9 17h6"
]);

export const BarChart3 = createMultiPathIcon([
  "M3 3v18h18",
  "M18.7 8l-5.1 5.1-2.8-2.8L7 14l-1.9-1.9"
]);

export const Users = createMultiPathIcon([
  "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
  "M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  "M22 21v-2a4 4 0 0 0-3-3.87",
  "M16 3.13a4 4 0 0 1 0 7.75"
]);

export const Check = createSimpleSVGIcon("M20 6L9 17l-5-5");
export const Circle = createSimpleSVGIcon("M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z");
export const Dot = createSimpleSVGIcon("M12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z");

// Fallback icon for missing ones
export const FallbackIcon = ({ className = "", size = 16, style, ...props }: IconProps) => (
  <div
    className={`inline-block ${className}`}
    style={{
      width: size,
      height: size,
      backgroundColor: '#ccc',
      borderRadius: '2px',
      ...style
    }}
    {...props}
  />
);

// Export commonly used icons as fallbacks for missing ones
export const Building2 = FallbackIcon;
export const Wifi = FallbackIcon;
export const WifiOff = FallbackIcon;
export const CheckCircle = Check;
export const XCircle = X;
export const RefreshCw = FallbackIcon;
export const Filter = FallbackIcon;
export const Download = FallbackIcon;
export const Printer = FallbackIcon;
export const Edit = FallbackIcon;
export const Trash2 = FallbackIcon;
export const ArrowLeft = ChevronLeft;
export const ArrowRight = ChevronRight;
export const TrendingUp = FallbackIcon;
export const DollarSign = FallbackIcon;
export const LogIn = FallbackIcon;
export const UserPlus = FallbackIcon;
export const Calculator = FallbackIcon;
export const Database = FallbackIcon;
export const Clock = FallbackIcon;
export const Chrome = FallbackIcon;
export const Timer = FallbackIcon;
export const Calendar = FallbackIcon;
export const CreditCard = FallbackIcon;
export const PieChart = FallbackIcon;
export const TrendingDown = FallbackIcon;
export const Activity = FallbackIcon;
export const AlertTriangle = FallbackIcon;
export const MoreHorizontal = Dot;
export const PanelLeft = FallbackIcon;
export const GripVertical = FallbackIcon;
