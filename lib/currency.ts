import { prisma } from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

const CURRENCIES: Record<string, string> = {
  '$': '$',
  '₹': '₹',
  '€': '€',
  '£': '£',
};

export const CURRENCY_OPTIONS = Object.keys(CURRENCIES);

export async function getCurrencySymbol(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: 'currency' } });
  return row?.value ?? '$';
}

export function formatMoney(value: Decimal | number, symbol: string): string {
  const num = typeof value === 'number' ? value : Number(value);
  return `${symbol}${num.toFixed(2)}`;
}