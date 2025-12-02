export const VITAMINS = [
  "Vitamin A (Retinol)",
  "Beta-Carotene",
  "Vitamin B1 (Thiamine)",
  "Vitamin B2 (Riboflavin)",
  "Vitamin B3 (Niacin)",
  "Niacinamide",
  "Vitamin B4",
  "Vitamin B5 (Pantothenic Acid)",
  "Vitamin B6 (Pyridoxine)",
  "Vitamin B7 (Biotin)",
  "Vitamin B8 (Inositol)",
  "Vitamin B9 (Folate / Folic Acid)",
  "Vitamin B10 (PABA)",
  "Vitamin B11",
  "Vitamin B12 (Cobalamin)",
  "Vitamin B13 (Orotic Acid)",
  "Vitamin B14",
  "Vitamin B15",
  "Vitamin B16",
  "Vitamin B17",
  "Vitamin C (Ascorbic Acid)",
  "Vitamin D1",
  "Vitamin D2",
  "Vitamin D3",
  "Vitamin D4",
  "Vitamin D5",
  "Vitamin E (Alpha Tocopherol)",
  "Vitamin E (Beta Tocopherol)",
  "Vitamin E (Gamma Tocopherol)",
  "Vitamin E (Delta Tocopherol)",
  "Vitamin K1",
  "Vitamin K2",
  "Vitamin K3",
];

// case-insensitive validator for convenience
export function isValidVitamin(name: string) {
  if (!name || typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  return VITAMINS.some(v => v.toLowerCase() === normalized);
}

export function findInvalidVitamins(list: any[]) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s && !isValidVitamin(s));
}
