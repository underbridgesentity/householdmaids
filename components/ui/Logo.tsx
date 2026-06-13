import Image from "next/image";

// Intrinsic aspect ratios of the source files (logo wordmarks are 16:9, the
// mark is square). Using the true ratio avoids the horizontal stretch.
const RATIO = { full: 16 / 9, white: 16 / 9, mark: 1 } as const;

export function Logo({ variant = "full", height = 44 }: { variant?: "full" | "mark" | "white"; height?: number }) {
  const src =
    variant === "mark" ? "/brand/logo-mark.png" : variant === "white" ? "/brand/logo-white.png" : "/brand/logo.png";
  const width = Math.round(height * RATIO[variant]);
  return (
    <Image
      src={src}
      alt="Household Maids"
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
