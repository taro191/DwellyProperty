"use client";

import { useState, type ReactNode } from "react";
import { ActionForm, FieldError, SubmitButton, type FormAction } from "@/components/ui/form";
import { Card, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { LocationPicker } from "@/components/map";
import { AMENITIES, CATEGORY_LABEL, DIRECTION_LABEL, FURNISHING_LABEL, LISTING_TYPE_LABEL, PROVINCES } from "@/lib/constants";
import type { ListingType, Property, PropertyCategory, Zone } from "@/lib/types";

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <Card className="p-5 sm:p-6" id={id}>
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function ErrField(props: Parameters<typeof Field>[0] & { name: string }) {
  const { name, children, ...rest } = props;
  return (
    <Field {...rest}>
      {children}
      <FieldError name={name} />
    </Field>
  );
}

export function ListingForm({
  action, zones, initial, submitLabel,
}: { action: FormAction; zones: Zone[]; initial?: Partial<Property>; submitLabel: string }) {
  const [listingType, setListingType] = useState<ListingType>(initial?.listing_type ?? "sale");
  const [category, setCategory] = useState<PropertyCategory>(initial?.category ?? "condo");
  const isLand = category === "land";
  const rentable = listingType !== "sale";
  const sellable = listingType !== "rent";
  const ld = initial?.land_details ?? {};
  const v = (x: unknown) => (x == null ? undefined : String(x));

  return (
    <ActionForm action={action} className="space-y-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Section title="ประเภทประกาศ">
        <fieldset className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LISTING_TYPE_LABEL) as ListingType[]).map((t) => (
              <label key={t} className={cn("cursor-pointer rounded-2xl border px-3 py-3 text-center text-sm font-semibold",
                listingType === t ? "border-accent bg-accent/10 text-fg" : "border-line bg-surface-2 text-muted")}>
                <input type="radio" name="listing_type" value={t} checked={listingType === t} onChange={() => setListingType(t)} className="sr-only" />
                {LISTING_TYPE_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <ErrField label="ประเภททรัพย์" name="category" required className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABEL) as PropertyCategory[]).map((c) => (
              <label key={c} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm",
                category === c ? "border-accent bg-accent/10 text-fg" : "border-line bg-surface-2 text-muted")}>
                <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                {CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        </ErrField>
      </Section>

      <Section title="ข้อมูลประกาศ">
        <ErrField label="หัวข้อประกาศ" name="title" required className="sm:col-span-2" hint="เช่น คอนโด 1 ห้องนอน ใกล้ ม.มหิดล ศาลายา พร้อมอยู่">
          <Input name="title" defaultValue={initial?.title} required minLength={10} maxLength={150} />
        </ErrField>
        <ErrField label="รายละเอียด" name="description" className="sm:col-span-2">
          <Textarea name="description" defaultValue={v(initial?.description)} className="min-h-40" maxLength={10000}
            placeholder="จุดเด่น การเดินทาง สถานที่ใกล้เคียง สภาพห้อง เงื่อนไขพิเศษ" />
        </ErrField>
        {!isLand && (
          <ErrField label="ชื่อโครงการ / หมู่บ้าน" name="project_name">
            <Input name="project_name" defaultValue={v(initial?.project_name)} />
          </ErrField>
        )}
        <ErrField label="โซน Dwelly" name="zone_id">
          <Select name="zone_id" defaultValue={v(initial?.zone_id) ?? ""}>
            <option value="">ไม่ระบุ</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.icon} {z.name_th}</option>)}
          </Select>
        </ErrField>
      </Section>

      <Section title="ราคา">
        {sellable && (
          <ErrField label="ราคาขาย (บาท)" name="sale_price" required>
            <Input name="sale_price" type="number" min={1} step={1000} inputMode="numeric" defaultValue={v(initial?.sale_price)} />
          </ErrField>
        )}
        {rentable && (
          <ErrField label="ค่าเช่าต่อเดือน (บาท)" name="rent_price" required>
            <Input name="rent_price" type="number" min={1} step={100} inputMode="numeric" defaultValue={v(initial?.rent_price)} />
          </ErrField>
        )}
        <ErrField label="ค่าส่วนกลาง (บาท/เดือน)" name="maintenance_fee">
          <Input name="maintenance_fee" type="number" min={0} inputMode="numeric" defaultValue={v(initial?.maintenance_fee)} />
        </ErrField>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-muted">
          <input type="checkbox" name="price_negotiable" defaultChecked={initial?.price_negotiable ?? true} className="accent-emerald-500" />
          ราคาต่อรองได้
        </label>
      </Section>

      <Section title={isLand ? "ข้อมูลที่ดิน" : "ขนาดและรายละเอียดห้อง"}>
        {isLand ? (
          <>
            <ErrField label="ขนาดที่ดิน (ตารางวา)" name="land_area_sqwa" required hint="1 ไร่ = 400 ตร.ว. · 1 งาน = 100 ตร.ว.">
              <Input name="land_area_sqwa" type="number" min={1} step="0.1" defaultValue={v(initial?.land_area_sqwa)} />
            </ErrField>
            <ErrField label="เอกสารสิทธิ์" name="deed_type">
              <Select name="deed_type" defaultValue={ld.deed_type ?? ""}>
                <option value="">ไม่ระบุ</option>
                {["โฉนดที่ดิน (น.ส.4 จ.)", "น.ส.3 ก.", "น.ส.3", "ส.ป.ก.", "อื่นๆ"].map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </ErrField>
            <ErrField label="ผังเมือง (สี)" name="zoning">
              <Input name="zoning" defaultValue={ld.zoning} placeholder="เช่น ผังสีส้ม" />
            </ErrField>
            <ErrField label="หน้ากว้างติดถนน (เมตร)" name="road_frontage_m">
              <Input name="road_frontage_m" type="number" min={0} defaultValue={v(ld.road_frontage_m)} />
            </ErrField>
          </>
        ) : (
          <>
            <ErrField label="พื้นที่ใช้สอย (ตร.ม.)" name="usable_area_sqm" required>
              <Input name="usable_area_sqm" type="number" min={1} step="0.1" defaultValue={v(initial?.usable_area_sqm)} />
            </ErrField>
            {category !== "condo" && category !== "apartment" && (
              <ErrField label="ขนาดที่ดิน (ตร.ว.)" name="land_area_sqwa">
                <Input name="land_area_sqwa" type="number" min={1} step="0.1" defaultValue={v(initial?.land_area_sqwa)} />
              </ErrField>
            )}
            <ErrField label="ห้องนอน (0 = สตูดิโอ)" name="bedrooms">
              <Input name="bedrooms" type="number" min={0} max={50} defaultValue={v(initial?.bedrooms)} />
            </ErrField>
            <ErrField label="ห้องน้ำ" name="bathrooms">
              <Input name="bathrooms" type="number" min={0} max={50} defaultValue={v(initial?.bathrooms)} />
            </ErrField>
            <ErrField label="ชั้นที่" name="floor">
              <Input name="floor" type="number" defaultValue={v(initial?.floor)} />
            </ErrField>
            <ErrField label="จำนวนชั้นทั้งหมด" name="total_floors">
              <Input name="total_floors" type="number" min={1} defaultValue={v(initial?.total_floors)} />
            </ErrField>
            <ErrField label="เฟอร์นิเจอร์" name="furnishing">
              <Select name="furnishing" defaultValue={v(initial?.furnishing) ?? ""}>
                <option value="">ไม่ระบุ</option>
                {Object.entries(FURNISHING_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </ErrField>
            <ErrField label="ปีที่สร้างเสร็จ (ค.ศ.)" name="year_built">
              <Input name="year_built" type="number" min={1900} max={2100} defaultValue={v(initial?.year_built)} />
            </ErrField>
          </>
        )}
        <ErrField label="ทิศ" name="direction">
          <Select name="direction" defaultValue={v(initial?.direction) ?? ""}>
            <option value="">ไม่ระบุ</option>
            {Object.entries(DIRECTION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </ErrField>
        <ErrField label="พร้อมเข้าอยู่/โอนได้ตั้งแต่" name="available_from">
          <Input name="available_from" type="date" defaultValue={v(initial?.available_from)} />
        </ErrField>
      </Section>

      {rentable && (
        <Section title="เงื่อนไขการเช่า">
          <ErrField label="เงินประกัน (เดือน)" name="deposit_months">
            <Input name="deposit_months" type="number" min={0} max={24} step="0.5" defaultValue={v(initial?.deposit_months) ?? "2"} />
          </ErrField>
          <ErrField label="จ่ายล่วงหน้า (เดือน)" name="advance_months">
            <Input name="advance_months" type="number" min={0} max={24} step="0.5" defaultValue={v(initial?.advance_months) ?? "1"} />
          </ErrField>
          <ErrField label="สัญญาขั้นต่ำ (เดือน)" name="min_lease_months">
            <Input name="min_lease_months" type="number" min={1} max={120} defaultValue={v(initial?.min_lease_months) ?? "12"} />
          </ErrField>
          <ErrField label="สัตว์เลี้ยง" name="pets_allowed">
            <Select name="pets_allowed" defaultValue={initial?.pets_allowed == null ? "" : initial.pets_allowed ? "yes" : "no"}>
              <option value="">ไม่ระบุ</option>
              <option value="yes">เลี้ยงสัตว์ได้</option>
              <option value="no">ไม่อนุญาต</option>
            </Select>
          </ErrField>
        </Section>
      )}

      <Section title="สิ่งอำนวยความสะดวกและแท็ก">
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm">
              <input type="checkbox" name="amenities[]" value={a} defaultChecked={initial?.amenities?.includes(a)} className="accent-emerald-500" />
              {a}
            </label>
          ))}
        </div>
        <ErrField label="แท็กเพิ่มเติม (คั่นด้วย ,)" name="tags" className="sm:col-span-2">
          <Input name="tags" defaultValue={initial?.tags?.join(", ")} placeholder="เช่น พร้อมอยู่, วิวสวน, ใกล้ตลาด" />
        </ErrField>
      </Section>

      <Section title="ที่ตั้ง">
        <ErrField label="จังหวัด" name="province" required>
          <Select name="province" defaultValue={initial?.province ?? ""} required>
            <option value="" disabled>เลือกจังหวัด</option>
            {[...new Set([...(initial?.province ? [initial.province] : []), ...PROVINCES])].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </ErrField>
        <ErrField label="เขต / อำเภอ" name="district">
          <Input name="district" defaultValue={v(initial?.district)} />
        </ErrField>
        <ErrField label="แขวง / ตำบล" name="subdistrict">
          <Input name="subdistrict" defaultValue={v(initial?.subdistrict)} />
        </ErrField>
        <ErrField label="รหัสไปรษณีย์" name="postal_code">
          <Input name="postal_code" inputMode="numeric" maxLength={5} defaultValue={v(initial?.postal_code)} />
        </ErrField>
        <ErrField label="ที่อยู่ / ซอย / ถนน" name="address_line" className="sm:col-span-2">
          <Input name="address_line" defaultValue={v(initial?.address_line)} />
        </ErrField>
        <div className="sm:col-span-2">
          <LocationPicker lat={initial?.lat} lng={initial?.lng} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
          <input type="checkbox" name="show_exact_location" defaultChecked={initial?.show_exact_location} className="accent-emerald-500" />
          แสดงตำแหน่งที่แน่นอนบนแผนที่ (ถ้าไม่เลือก จะแสดงเป็นรัศมีประมาณ 500 ม.)
        </label>
      </Section>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <SubmitButton size="lg" className="shadow-2xl">{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
