"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Photo } from "@/components/photo";
import { cn } from "@/components/ui";

export function Gallery({ images }: { images: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState<number | null>(null);
  if (images.length === 0) return <Photo src={null} alt="" className="aspect-[16/7] w-full rounded-3xl" />;

  const go = (d: number) => setIndex((i) => (i == null ? 0 : (i + d + images.length) % images.length));
  const [main, ...rest] = images;

  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-3xl sm:grid-cols-4 sm:grid-rows-2" style={{ maxHeight: 460 }}>
        <button onClick={() => setIndex(0)} className="relative aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[460px]">
          <Photo src={main.src} alt={main.alt} fill sizes="(max-width: 640px) 100vw, 50vw" priority />
        </button>
        {rest.slice(0, 4).map((img, i) => (
          <button key={img.src} onClick={() => setIndex(i + 1)} className="relative hidden sm:block">
            <Photo src={img.src} alt={img.alt} fill sizes="25vw" />
            {i === 3 && rest.length > 4 && (
              <span className="absolute inset-0 grid place-items-center bg-black/60 text-lg font-bold">+{rest.length - 4}</span>
            )}
          </button>
        ))}
      </div>

      {index != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" onClick={() => setIndex(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2" aria-label="ปิด" onClick={() => setIndex(null)}>
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <>
              <button className="absolute left-2 rounded-full bg-white/10 p-2 sm:left-6" aria-label="ก่อนหน้า" onClick={(e) => { e.stopPropagation(); go(-1); }}>
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button className="absolute right-2 rounded-full bg-white/10 p-2 sm:right-6" aria-label="ถัดไป" onClick={(e) => { e.stopPropagation(); go(1); }}>
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          <div className="relative h-[80vh] w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <Photo src={images[index].src} alt={images[index].alt} fill sizes="92vw" className="object-contain" />
          </div>
          <div className="absolute bottom-6 flex gap-1.5">
            {images.map((img, i) => (
              <span key={img.src} className={cn("h-1.5 w-6 rounded-full", i === index ? "bg-accent" : "bg-white/25")} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
