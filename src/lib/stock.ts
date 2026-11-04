/** Below this many units an item counts as low stock (the manager view lists these). */
export const LOW_STOCK = 5;

export type StockStatus = "out" | "low" | "in";

export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock < LOW_STOCK) return "low";
  return "in";
}

export function stockLabel(stock: number): string {
  const status = stockStatus(stock);
  if (status === "out") return "Out of stock";
  if (status === "low") return `Only ${stock} left`;
  return `${stock} in stock`;
}
