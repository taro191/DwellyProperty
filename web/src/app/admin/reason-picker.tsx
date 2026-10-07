"use client";

import { useState } from "react";
import { Select, Textarea } from "@/components/ui";

/** Canned reasons that fill an editable textarea named `name`. */
export function ReasonPicker({ templates, name = "reason", placeholder }: { templates: string[]; name?: string; placeholder?: string }) {
  const [text, setText] = useState("");
  return (
    <>
      <Select value="" onChange={(e) => e.target.value && setText(e.target.value)} aria-label="เหตุผลสำเร็จรูป">
        <option value="">— เลือกเหตุผลสำเร็จรูป —</option>
        {templates.map((t) => <option key={t} value={t}>{t}</option>)}
      </Select>
      <Textarea name={name} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="min-h-24" />
    </>
  );
}
