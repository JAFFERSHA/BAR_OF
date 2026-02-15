import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6)
});

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  unit: z.string().min(1),
  costPrice: z.coerce.number().positive(),
  salePrice: z.coerce.number().positive(),
  quantity: z.coerce.number().int().nonnegative(),
  reorderLevel: z.coerce.number().int().min(1)
});

export const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional()
});

export const purchaseSchema = z.object({
  supplierId: z.string().cuid(),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().int().min(1),
        costPrice: z.coerce.number().positive()
      })
    )
    .min(1)
});

export const saleSchema = z.object({
  customer: z.string().min(1),
  taxRate: z.coerce.number().min(0).max(1),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().positive()
      })
    )
    .min(1)
});
