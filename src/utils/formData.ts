// src/utils/formData.ts

export interface Verkaufsdaten {
  title: string;
  brand: string;
  category: string;
  surface: string;
  gloss: string;
  effect: string;
  quality: string;
  itemCondition: string;
  shippingTime: string;
  amount: string;
  price: string;
  minAmount: string;
  shippingCost: string;
  description: string;
  selectedColorSystem: string;
  checkboxOptions: Record<string, boolean>;
}

export const buildVerkaufsdaten = (input: Partial<Verkaufsdaten>): Verkaufsdaten => {
  return {
    title: input.title || "",
    brand: input.brand || "",
    category: input.category || "",
    surface: input.surface || "",
    gloss: input.gloss || "",
    effect: input.effect || "",
    quality: input.quality || "",
    itemCondition: input.itemCondition || "",
    shippingTime: input.shippingTime || "",
    amount: input.amount || "",
    price: input.price || "",
    minAmount: input.minAmount || "",
    shippingCost: input.shippingCost || "",
    description: input.description || "",
    selectedColorSystem: input.selectedColorSystem || "",
    checkboxOptions: input.checkboxOptions || {},
  };
};
