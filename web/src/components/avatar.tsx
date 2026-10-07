/* eslint-disable @next/next/no-img-element -- avatars come from arbitrary OAuth hosts */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover border border-line"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      className="grid place-items-center rounded-full bg-surface-2 border border-line font-bold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {initial}
    </span>
  );
}
