ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS receipt_title TEXT DEFAULT 'Struk Bookinaja',
ADD COLUMN IF NOT EXISTS receipt_subtitle TEXT DEFAULT 'Bukti transaksi resmi',
ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Terima kasih sudah berkunjung',
ADD COLUMN IF NOT EXISTS receipt_whatsapp_text TEXT DEFAULT 'Berikut struk transaksi Anda dari Bookinaja.',
ADD COLUMN IF NOT EXISTS receipt_template TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS receipt_channel TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS printer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS printer_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS printer_mode TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS printer_endpoint TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS printer_auto_print BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS printer_status TEXT DEFAULT 'disconnected';
