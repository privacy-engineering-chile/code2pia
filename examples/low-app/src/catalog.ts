export interface ProductCatalogItem {
  sku: string;
  title: string;
  inventoryCount: number;
  priceCents: number;
}

export function formatCatalogItem(item: ProductCatalogItem): string {
  return `${item.sku}: ${item.title} (${item.inventoryCount})`;
}
