export type PublicResourceItem = {
  id: string;
  resource_id: string;
  name: string;
  price: number;
  price_unit?: string;
  unit_duration?: number;
  item_type?: string;
  is_default?: boolean;
};

export type PublicResourceDetail = {
  id: string;
  tenant_id: string;
  name: string;
  category?: string;
  operating_mode?: string;
  description?: string;
  image_url?: string;
  gallery?: string[];
  status?: string;
  dp_enabled?: boolean;
  dp_percentage?: number;
  items: PublicResourceItem[];
};

export type BusySlot = {
  id: string;
  start_time: string;
  end_time: string;
};
