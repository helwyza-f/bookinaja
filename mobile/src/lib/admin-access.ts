type AdminLikeUser = {
  role?: string;
  permission_keys?: string[];
};

const PERMISSION_IMPLICATIONS: Record<string, string[]> = {
  "bookings.write": [
    "bookings.read",
    "bookings.create",
    "bookings.update",
    "bookings.confirm",
    "bookings.cancel",
    "sessions.start",
    "sessions.extend",
    "sessions.complete",
    "pos.read",
    "pos.checkout",
    "pos.cash.settle",
    "receipts.send",
    "receipts.print",
  ],
  "pos.manage": [
    "pos.read",
    "pos.order.add",
    "pos.checkout",
    "pos.cash.settle",
    "sessions.extend",
    "receipts.send",
    "receipts.print",
  ],
  "resources.manage": [
    "resources.read",
    "resources.create",
    "resources.update",
    "resources.delete",
    "devices.read",
    "devices.claim",
    "devices.assign",
    "devices.control",
    "devices.manage",
  ],
  "fnb.manage": ["fnb.read", "fnb.create", "fnb.update", "fnb.delete"],
  "expenses.manage": [
    "expenses.read",
    "expenses.create",
    "expenses.update",
    "expenses.delete",
  ],
  "bookings.create": ["bookings.read"],
  "bookings.update": ["bookings.read"],
  "bookings.confirm": ["bookings.read", "bookings.update"],
  "bookings.cancel": ["bookings.read", "bookings.update"],
  "sessions.start": ["bookings.read", "bookings.update", "pos.read"],
  "sessions.extend": ["bookings.read", "pos.read"],
  "sessions.complete": ["bookings.read", "bookings.update", "pos.read"],
  "pos.order.add": ["pos.read", "bookings.read"],
  "pos.checkout": ["pos.read", "bookings.read"],
  "pos.cash.settle": ["pos.read", "bookings.read", "pos.checkout"],
  "resources.create": ["resources.read"],
  "resources.update": ["resources.read"],
  "resources.delete": ["resources.read"],
  "devices.claim": ["devices.read"],
  "devices.assign": ["devices.read", "resources.read"],
  "devices.control": ["devices.read"],
  "devices.manage": [
    "devices.read",
    "devices.claim",
    "devices.assign",
    "devices.control",
    "resources.read",
  ],
  "fnb.create": ["fnb.read"],
  "fnb.update": ["fnb.read"],
  "fnb.delete": ["fnb.read"],
  "expenses.create": ["expenses.read"],
  "expenses.update": ["expenses.read"],
  "expenses.delete": ["expenses.read"],
  "receipts.send": ["bookings.read", "pos.read"],
  "receipts.print": ["bookings.read", "pos.read"],
  "analytics.read": [
    "bookings.read",
    "resources.read",
    "customers.read",
    "expenses.read",
  ],
};

export function isOwner(user: AdminLikeUser | null | undefined) {
  return String(user?.role || "").toLowerCase() === "owner";
}

export function expandPermissionKeys(permissionKeys?: string[] | null) {
  const result = new Set<string>();
  const queue = [...(permissionKeys || [])];

  while (queue.length > 0) {
    const current = String(queue.shift() || "").trim();
    if (!current || result.has(current)) continue;
    result.add(current);
    for (const implied of PERMISSION_IMPLICATIONS[current] || []) {
      if (!result.has(implied)) {
        queue.push(implied);
      }
    }
  }

  return [...result];
}

export function hasAdminPermission(
  user: AdminLikeUser | null | undefined,
  required: string | string[],
) {
  if (isOwner(user)) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  const expanded = new Set(expandPermissionKeys(user?.permission_keys));
  return requiredList.some((permission) => expanded.has(permission));
}
