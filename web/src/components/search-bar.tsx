import { Search } from "lucide-react";
import { Select, buttonClass } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/constants";

/** Plain GET form — works without JS and produces shareable /search URLs. */
export function SearchBar({ defaults = {} }: { defaults?: { q?: string; type?: string; category?: string } }) {
  return (
    <form action="/search" className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-2 sm:flex-row">
      <div className="flex flex-1 items-center gap-2 px-3">
        <Search className="h-5 w-5 text-subtle" aria-hidden />
        <input
          name="q"
          defaultValue={defaults.q}
          placeholder="ทำเล, โครงการ, เขต เช่น ศาลายา, อโศก"
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle/70"
          aria-label="ค้นหา"
        />
      </div>
      <div className="flex gap-2">
        <Select name="type" defaultValue={defaults.type ?? ""} className="sm:w-32" aria-label="ประเภทประกาศ">
          <option value="">ซื้อ/เช่า</option>
          <option value="sale">ซื้อ</option>
          <option value="rent">เช่า</option>
        </Select>
        <Select name="category" defaultValue={defaults.category ?? ""} className="sm:w-40" aria-label="ประเภททรัพย์">
          <option value="">ทุกประเภท</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <button className={buttonClass("primary", "md", "px-6")}>ค้นหา</button>
      </div>
    </form>
  );
}
