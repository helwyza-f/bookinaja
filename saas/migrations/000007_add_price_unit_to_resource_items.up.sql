-- Tambahkan kolom price_unit ke tabel resource_items
ALTER TABLE resource_items 
ADD COLUMN price_unit VARCHAR(20) DEFAULT 'hour';

-- Update data lama (opsional) agar tidak kosong
UPDATE resource_items SET price_unit = 'hour' WHERE item_type = 'console_option';
UPDATE resource_items SET price_unit = 'pcs' WHERE item_type = 'add_on';