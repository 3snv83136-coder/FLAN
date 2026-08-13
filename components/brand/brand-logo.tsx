import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  size = "md",
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? 120 : size === "sm" ? 40 : 52;

  const img = (
    <Image
      src="/logo-comptoir-du-flan.png"
      alt="Le Comptoir du Flan"
      width={dims}
      height={dims}
      priority
      className={cn("rounded-lg object-contain", className)}
    />
  );

  if (!href) return img;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="Le Comptoir du Flan">
      {img}
    </Link>
  );
}
