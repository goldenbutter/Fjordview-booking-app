import { addDays, eachDayOfInterval, format, isAfter, isBefore, parseISO, subDays } from "date-fns";
import type { PriceBreakdown, PricingRule } from "@/types";

function dayOfWeekMondayZero(date: Date) {
  return (date.getDay() + 6) % 7;
}

function matchesDate(rule: PricingRule, date: Date) {
  if (!rule.startDate && !rule.endDate) return true;
  const start = rule.startDate ? parseISO(rule.startDate) : undefined;
  const end = rule.endDate ? parseISO(rule.endDate) : undefined;
  if (start && isBefore(date, start)) return false;
  if (end && isAfter(date, end)) return false;
  return true;
}

function matchesDayOfWeek(rule: PricingRule, date: Date) {
  if (!rule.daysOfWeek?.length) return true;
  return rule.daysOfWeek.includes(dayOfWeekMondayZero(date));
}

export function calculateNightlyPrice(
  basePrice: number,
  date: Date,
  rules: PricingRule[],
) {
  let price = basePrice;
  let appliedRule: string | undefined;
  const applicable = rules
    .filter((rule) => rule.active && matchesDate(rule, date) && matchesDayOfWeek(rule, date))
    .sort((a, b) => b.priority - a.priority);

  for (const rule of applicable) {
    if (typeof rule.priceOverride === "number") {
      return { price: rule.priceOverride, appliedRule: rule.name };
    }
    if (typeof rule.modifierPct === "number") {
      price = Math.round(price * (1 + rule.modifierPct / 100));
      appliedRule = rule.name;
    }
  }

  return { price, appliedRule };
}

export function calculateStayPrice(
  basePrice: number,
  checkIn: string,
  checkOut: string,
  rules: PricingRule[],
  currency = "NOK",
): PriceBreakdown {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);

  if (!isAfter(end, start)) {
    return { nights: [], subtotal: 0, currency };
  }

  const nights = eachDayOfInterval({ start, end: subDays(end, 1) });
  const breakdown = nights.map((date) => {
    const { price, appliedRule } = calculateNightlyPrice(basePrice, date, rules);
    return { date: format(date, "yyyy-MM-dd"), price, appliedRule };
  });

  return {
    nights: breakdown,
    subtotal: breakdown.reduce((sum, night) => sum + night.price, 0),
    currency,
  };
}

export function defaultDateRange() {
  const checkIn = addDays(new Date(), 7);
  const checkOut = addDays(checkIn, 2);
  return {
    checkIn: format(checkIn, "yyyy-MM-dd"),
    checkOut: format(checkOut, "yyyy-MM-dd"),
  };
}
