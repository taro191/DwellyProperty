import Image, { type ImageProps } from "next/image";
import { Building2 } from "lucide-react";
import { cn } from "@/components/ui";

/** next/image with a placeholder for missing photos; skips optimisation for local (http) hosts. */
export function Photo({ src, alt, className, ...rest }: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  if (!src) {
    return (
      <div className={cn("grid place-items-center bg-surface-2 text-subtle", className)}>
        <Building2 className="h-8 w-8" aria-hidden />
      </div>
    );
  }
  return <Image src={src} alt={alt} className={cn(!className?.includes("object-") && "object-cover", className)} unoptimized={src.startsWith("http://")} {...rest} />;
}
