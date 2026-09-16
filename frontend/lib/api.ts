const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type LoginResponse = {
  access_token: string;
  token_type: string;
  role: "owner" | "supervisor";
  name: string;
  must_change_password: boolean;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Incorrect email or password");
  }

  return res.json();
}

export type Worker = {
  id: string;
  name: string;
  phone: string | null;
  role: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  activity_type: string;
  activity_type_other: string | null;
  crop: string;
  crop_other: string | null;
  block: string | null;
  quantity_kg: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  worker: Worker | null;
};

export type WorkerDetail = Worker & { activities: Activity[] };

export async function createWorker(
  token: string,
  data: { name: string; phone?: string; role?: string }
): Promise<Worker> {
  const res = await fetch(`${API_URL}/workers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not add worker");
  }

  return res.json();
}

export async function listWorkers(token: string): Promise<Worker[]> {
  const res = await fetch(`${API_URL}/workers`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load workers");
  }

  return res.json();
}

export async function getWorker(token: string, workerId: string): Promise<WorkerDetail> {
  const res = await fetch(`${API_URL}/workers/${workerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load worker");
  }

  return res.json();
}

export async function createActivity(
  token: string,
  data: {
    activity_type: string;
    activity_type_other?: string;
    crop: string;
    crop_other?: string;
    worker_id?: string;
    quantity_kg?: number;
    notes?: string;
    photo_url?: string;
  }
): Promise<Activity> {
  const res = await fetch(`${API_URL}/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not save entry");
  }

  return res.json();
}

export async function updateActivity(
  token: string,
  activityId: string,
  data: {
    activity_type: string;
    activity_type_other?: string;
    crop: string;
    crop_other?: string;
    worker_id?: string;
    quantity_kg?: number;
    notes?: string;
    photo_url?: string;
  }
): Promise<Activity> {
  const res = await fetch(`${API_URL}/activities/${activityId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not update entry");
  }

  return res.json();
}

export async function listActivities(token: string): Promise<Activity[]> {
  const res = await fetch(`${API_URL}/activities`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load activity feed");
  }

  return res.json();
}

export type Summary = {
  today_entries: number;
  active_alerts: number;
  pending_sync: number;
};

export async function getSummary(token: string): Promise<Summary> {
  const res = await fetch(`${API_URL}/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load summary");
  }

  return res.json();
}

export type Alert = {
  id: string;
  activity_id: string;
  status: "open" | "resolved";
  resolution_note: string | null;
  created_at: string;
  activity: Activity;
};

export async function listAlerts(token: string): Promise<Alert[]> {
  const res = await fetch(`${API_URL}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load alerts");
  }

  return res.json();
}

export async function resolveAlert(token: string, alertId: string): Promise<Alert> {
  const res = await fetch(`${API_URL}/alerts/${alertId}/resolve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not resolve alert");
  }

  return res.json();
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not change password");
  }
}

export type Buyer = {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  created_at: string;
};

export async function createBuyer(
  token: string,
  data: { name: string; phone?: string; category?: string }
): Promise<Buyer> {
  const res = await fetch(`${API_URL}/buyers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not add buyer");
  }

  return res.json();
}

export async function listBuyers(token: string): Promise<Buyer[]> {
  const res = await fetch(`${API_URL}/buyers`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load buyers");
  }

  return res.json();
}

export type BuyerDetail = Buyer & { orders: Order[] };

export async function getBuyer(token: string, buyerId: string): Promise<BuyerDetail> {
  const res = await fetch(`${API_URL}/buyers/${buyerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load buyer");
  }

  return res.json();
}

export type LiveStockItem = {
  crop: string;
  available_kg: string;
};

export async function getLiveStock(token: string): Promise<LiveStockItem[]> {
  const res = await fetch(`${API_URL}/live-stock`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load live stock");
  }

  return res.json();
}

export type Order = {
  id: string;
  crop: string;
  quantity_kg: string;
  price: string;
  logistics_fee: string;
  tax: string;
  total_amount: string;
  notify_sms: boolean;
  notify_email: boolean;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  buyer: Buyer;
};

export async function createOrder(
  token: string,
  data: {
    buyer_id: string;
    crop: string;
    quantity_kg: number;
    price: number;
    logistics_fee?: number;
    tax?: number;
    notify_sms?: boolean;
    notify_email?: boolean;
  }
): Promise<Order> {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not save order");
  }

  return res.json();
}

export async function listOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load orders");
  }

  return res.json();
}

export async function updateOrderStatus(
  token: string,
  orderId: string,
  newStatus: "pending" | "paid" | "cancelled"
): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not update order");
  }

  return res.json();
}

export type MonthlyLedger = {
  month: string;
  total_revenue: string;
  order_count: number;
  total_kg: string;
  avg_order_value: string;
  by_crop: { crop: string; quantity_kg: string; revenue: string }[];
};

export async function getMonthlyLedger(token: string, month?: string): Promise<MonthlyLedger> {
  const url = month
    ? `${API_URL}/reports/monthly?month=${month}`
    : `${API_URL}/reports/monthly`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load monthly report");
  }

  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Something went wrong");
  }

  return res.json();
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not reset password");
  }

  return res.json();
}

export type Vendor = {
  id: string;
  name: string;
  phone: string | null;
  category: string | null;
  created_at: string;
};

export async function createVendor(
  token: string,
  data: { name: string; phone?: string; category?: string }
): Promise<Vendor> {
  const res = await fetch(`${API_URL}/vendors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not add vendor");
  }

  return res.json();
}

export async function listVendors(token: string): Promise<Vendor[]> {
  const res = await fetch(`${API_URL}/vendors`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load vendors");
  }

  return res.json();
}

export type VendorDetail = Vendor & { purchases: Purchase[] };

export async function getVendor(token: string, vendorId: string): Promise<VendorDetail> {
  const res = await fetch(`${API_URL}/vendors/${vendorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load vendor");
  }

  return res.json();
}

export type Purchase = {
  id: string;
  item: string;
  quantity: string;
  unit: string | null;
  cost: string;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  vendor: Vendor;
};

export async function createPurchase(
  token: string,
  data: { vendor_id: string; item: string; quantity: number; unit?: string; cost: number }
): Promise<Purchase> {
  const res = await fetch(`${API_URL}/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not save purchase");
  }

  return res.json();
}

export async function listPurchases(token: string): Promise<Purchase[]> {
  const res = await fetch(`${API_URL}/purchases`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Could not load purchases");
  }

  return res.json();
}

export async function updatePurchaseStatus(
  token: string,
  purchaseId: string,
  newStatus: "pending" | "paid" | "cancelled"
): Promise<Purchase> {
  const res = await fetch(`${API_URL}/purchases/${purchaseId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Could not update purchase");
  }

  return res.json();
}
