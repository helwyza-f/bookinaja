export type ReceiptSettings = {
  name?: string;
  plan?: string;
  subscription_status?: string;
  receipt_title?: string;
  receipt_subtitle?: string;
  receipt_footer?: string;
  receipt_whatsapp_text?: string;
  receipt_template?: string;
  receipt_channel?: string;
  printer_enabled?: boolean;
  printer_auto_print?: boolean;
};

type BluetoothRemoteGATTCharacteristicLike = {
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
};

type BluetoothRemoteGATTServiceLike = {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicLike[]>;
};

type BluetoothRemoteGATTServerLike = {
  connect: () => Promise<BluetoothRemoteGATTServerLike>;
  getPrimaryService: (service: string) => Promise<BluetoothRemoteGATTServiceLike>;
};

type BluetoothDeviceLike = {
  gatt?: BluetoothRemoteGATTServerLike;
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices: boolean;
      optionalServices: string[];
    }) => Promise<BluetoothDeviceLike>;
  };
};

export type ReceiptBooking = {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  resource_name?: string;
  start_time?: string;
  end_time?: string;
  grand_total?: number;
  deposit_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_status?: string;
};

export const defaultReceiptTemplate = [
  "=== {receipt_title} ===",
  "{receipt_subtitle}",
  "",
  "Pelanggan : {customer_name}",
  "Booking   : {booking_id}",
  "Unit      : {resource_name}",
  "Waktu     : {booking_time}",
  "",
  "Total     : {grand_total}",
  "DP        : {deposit_amount}",
  "Dibayar   : {paid_amount}",
  "Sisa      : {balance_due}",
  "",
  "{receipt_footer}",
].join("\n");

export const isReceiptProEnabled = (settings?: ReceiptSettings | null) => {
  const plan = String(settings?.plan || "").toLowerCase();
  const status = String(settings?.subscription_status || "").toLowerCase();
  return plan === "pro" && status === "active";
};

export const formatReceiptIDR = (value?: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

export const renderReceiptText = (
  settings: ReceiptSettings | null | undefined,
  booking: ReceiptBooking,
) => {
  const start = booking.start_time ? new Date(booking.start_time) : null;
  const end = booking.end_time ? new Date(booking.end_time) : null;
  const bookingTime =
    start && end
      ? `${start.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} ${start.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}-${end.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "-";

  const values: Record<string, string> = {
    receipt_title: settings?.receipt_title || "Struk Bookinaja",
    receipt_subtitle: settings?.receipt_subtitle || "Bukti transaksi resmi",
    receipt_footer: settings?.receipt_footer || "Terima kasih sudah berkunjung",
    tenant_name: settings?.name || "Bookinaja",
    customer_name: booking.customer_name || "Customer",
    customer_phone: booking.customer_phone || "-",
    booking_id: booking.id.slice(0, 8).toUpperCase(),
    resource_name: booking.resource_name || "Unit",
    booking_time: bookingTime,
    grand_total: formatReceiptIDR(booking.grand_total),
    deposit_amount: formatReceiptIDR(booking.deposit_amount),
    paid_amount: formatReceiptIDR(booking.paid_amount),
    balance_due: formatReceiptIDR(booking.balance_due),
    payment_status: booking.payment_status || "-",
  };

  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    settings?.receipt_template || defaultReceiptTemplate,
  );
};

const PRINTER_SERVICE_IDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

export const printReceiptBluetooth = async (
  settings: ReceiptSettings | null | undefined,
  booking: ReceiptBooking,
) => {
  const nav = navigator as BluetoothNavigator;
  if (!window.isSecureContext || !nav.bluetooth) {
    throw new Error("Bluetooth printer hanya tersedia di Chrome/Edge lewat HTTPS atau localhost.");
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_IDS,
  });
  if (!device.gatt) {
    throw new Error("Printer tidak menyediakan koneksi GATT.");
  }

  const server = await device.gatt.connect();
  const characteristic = await findWritablePrinterCharacteristic(server);
  if (!characteristic) {
    throw new Error("Printer Bluetooth tidak expose channel tulis yang didukung.");
  }

  const text = renderReceiptText(settings, booking);
  const payload = buildEscPosPayload(text);
  await writeInChunks(characteristic, payload);
};

const findWritablePrinterCharacteristic = async (server: BluetoothRemoteGATTServerLike) => {
  for (const serviceId of PRINTER_SERVICE_IDS) {
    try {
      const service = await server.getPrimaryService(serviceId);
      const characteristics = await service.getCharacteristics();
      const writable = characteristics.find(
        (item) => item.properties?.write || item.properties?.writeWithoutResponse,
      );
      if (writable) return writable;
    } catch {
      // Coba service berikutnya. Printer thermal BLE tidak punya UUID yang benar-benar seragam.
    }
  }
  return null;
};

const buildEscPosPayload = (text: string) => {
  const encoder = new TextEncoder();
  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r]/g, "");
  const body = encoder.encode(`${normalized}\n\n\n`);
  const init = new Uint8Array([0x1b, 0x40]);
  const cut = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);
  const payload = new Uint8Array(init.length + body.length + cut.length);
  payload.set(init, 0);
  payload.set(body, init.length);
  payload.set(cut, init.length + body.length);
  return payload;
};

const writeInChunks = async (
  characteristic: BluetoothRemoteGATTCharacteristicLike,
  payload: Uint8Array,
) => {
  const chunkSize = 180;
  for (let offset = 0; offset < payload.length; offset += chunkSize) {
    const chunk = payload.slice(offset, offset + chunkSize);
    if (characteristic.writeValueWithoutResponse && characteristic.properties?.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
