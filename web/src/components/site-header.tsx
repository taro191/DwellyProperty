import Link from "next/link";

/** Wordmark used by the admin sidebar. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-[#04130d] text-sm font-black">D</span>
      <span>Dwelly</span>
    </Link>
  );
}
