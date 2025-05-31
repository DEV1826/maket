export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  purchased: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
