export interface InventoryItem {
  id: number;
  profile_id: string;
  type: "offering" | "seeking";
  item_type: "item" | "service";
  title: string;
  description: string;
  quantity?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  business_name?: string;
  is_store: boolean;
  latitude: number;
  longitude: number;
  inventory: InventoryItem[];
}
