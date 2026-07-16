export type CompanyStatus = "pending" | "active";
export type Role = "owner" | "employee";
export type MemberStatus = "pending" | "approved" | "rejected";

export interface Company {
  id: string;
  company_code: string;
  name: string;
  status: CompanyStatus;
  industry: string | null;
  employee_count: number | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  plan_status: "free" | "trial" | "paid" | "suspended";
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  created_at: string;
}

export interface PendingMember {
  id: string;
  name: string;
  email: string;
  status: MemberStatus;
  created_at: string;
}

export interface QuoteLineItem {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export type QuoteStatus = "作成中" | "未確定" | "確定";

export interface Quote {
  id: string;
  company_id: string;
  owner_id: string | null;
  quote_no: string;
  project_name: string;
  customer_name: string;
  customer_email: string | null;
  items: QuoteLineItem[];
  notes: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  status: QuoteStatus;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteItemPattern {
  id: string;
  company_id: string;
  category: string;
  name: string;
  unit: string;
  unit_price: number;
  usage_count: number;
  source: "manual" | "ai_import";
  created_at: string;
  updated_at: string;
}

export const CATEGORY_NAMES = [
  "空調機据付工事",
  "冷媒配管工事",
  "ダクト工事",
  "電気工事",
  "計装工事",
  "ドレン工事",
  "試運転調整",
  "経費・その他",
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];
