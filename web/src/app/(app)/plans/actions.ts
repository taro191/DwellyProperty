"use server";

import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt } from "@/lib/action-utils";
import { createOrder } from "@/server/services/billing";
import type { ActionResult } from "@/lib/types";

const PENDING = "ส่งคำสั่งซื้อแล้ว ระบบชำระเงินออนไลน์กำลังเปิดให้บริการ ทีมงานจะติดต่อกลับเพื่อยืนยันการชำระเงินผ่าน LINE @dwelly";

export async function orderPlan(planId: string): Promise<ActionResult> {
  const viewer = await requireViewer("/plans");
  if (!z.string().min(1).max(40).safeParse(planId).success) return { ok: false, error: "invalid" };
  return attempt(() => createOrder(viewer, { kind: "subscription", plan_id: planId }), PENDING);
}

export async function orderBoost(boostId: string, propertyId: string): Promise<ActionResult> {
  const viewer = await requireViewer("/plans");
  if (!z.uuid().safeParse(propertyId).success) return { ok: false, error: "เลือกประกาศที่ต้องการดัน" };
  return attempt(() => createOrder(viewer, { kind: "boost", boost_product_id: boostId, property_id: propertyId }), PENDING);
}
