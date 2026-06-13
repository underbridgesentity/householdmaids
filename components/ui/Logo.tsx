import Image from "next/image";

// Tight-cropped wordmarks (transparent padding removed) so the logo fills the
// given height instead of being letterboxed. Ratios are the trimmed dimensions.
const SRC = {
  full: "/brand/logo-tight.png",
  white: "/brand/logo-white-tight.png",
  mark: "/brand/logo-mark.png",
} as const;
const RATIO = { full: 5.349, white: 5.361, mark: 1 } as const;

export function Logo({ variant = "full", height = 30 }: { variant?: "full" | "mark" | "white"; height?: number }) {
  const width = Math.round(height * RATIO[variant]);
  return (
    <Image
      src={SRC[variant]}
      alt="Household Maids"
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
