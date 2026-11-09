"use server";

import { recordSale, SaleError } from '@/lib/sales';
import { requireUser } from '@/lib/session';
import { saleSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export async function createSale(_prev: string | null, formData: FormData) {
  const user = await requireUser();
  const rawItems = formData.get('items');

  let items: unknown = [];
  try {
    items = typeof rawItems === 'string' ? JSON.parse(rawItems) : [];
  } catch {
    return 'Please add at least one line item.';
  }

  const parsed = saleSchema.safeParse({
    customer: formData.get('customer'),
    taxRate: formData.get('taxRate'),
    items
  });

  if (!parsed.success) return 'Please add at least one line item.';

  try {
    await recordSale(user.id, parsed.data);
  } catch (err) {
    if (err instanceof SaleError) return err.message;
    throw err;
  }

  revalidatePath('/sales');
  revalidatePath('/stock');
  return null;
}
