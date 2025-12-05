import sarSymbolPath from "@assets/image_1764975755726.png";

interface SarSymbolProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4", 
  lg: "h-5 w-5",
  xl: "h-6 w-6",
};

export function SarSymbol({ size = "md", className = "" }: SarSymbolProps) {
  return (
    <img 
      src={sarSymbolPath} 
      alt="SAR" 
      className={`inline-block ${sizeMap[size]} ${className} dark:invert`}
    />
  );
}
