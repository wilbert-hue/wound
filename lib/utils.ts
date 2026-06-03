import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

export function formatCurrency(value: number, currency: string = 'USD', unit: string = 'Mn'): string {
  return `${currency} ${value.toFixed(2)} ${unit}`
}

export function getMarketValueUnitLabel(currency: string, valueUnit: string): string {
  if (currency === 'INR') {
    return `INR ${valueUnit}`
  }
  return `${currency} ${valueUnit}`
}

export function getMarketValueAxisLabel(currency: string, valueUnit: string): string {
  return `Market Value (${getMarketValueUnitLabel(currency, valueUnit)})`
}

export function formatMarketValue(
  value: number,
  currency: string = 'INR',
  valueUnit: string = 'Cr.',
  decimals: number = 2
): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  if (currency === 'INR') {
    return `₹ ${formatted} ${valueUnit}`
  }

  return `$ ${formatted} ${valueUnit}`
}

// Get currency symbol based on currency preference
export function getCurrencySymbol(currency: 'USD' | 'INR'): string {
  return currency === 'INR' ? '₹' : '$'
}

// Format unit based on currency preference
export function formatUnit(unit: string, currency: 'USD' | 'INR'): string {
  if (currency === 'INR') {
    return unit.replace('USD Million', '').replace('USD', '').replace('Million', '').trim()
  }
  return unit
}

// Format number according to Indian number system (lakhs, crores)
export function formatIndianNumber(value: number, decimals: number = 2): string {
  const absValue = Math.abs(value)
  let formatted: string
  
  if (absValue >= 10000000) {
    // Crores (1 crore = 10 million)
    formatted = (value / 10000000).toFixed(decimals) + ' Cr'
  } else if (absValue >= 100000) {
    // Lakhs (1 lakh = 100,000)
    formatted = (value / 100000).toFixed(decimals) + ' L'
  } else {
    formatted = value.toFixed(decimals)
  }
  
  return formatted
}

// Format number with Indian comma system (first 3 digits, then groups of 2)
export function formatIndianNumberWithCommas(value: number, decimals: number = 2): string {
  const parts = value.toFixed(decimals).split('.')
  const integerPart = parts[0]
  const decimalPart = parts[1]
  
  // Indian numbering: first 3 digits, then groups of 2
  let formatted = integerPart
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3)
    const remaining = integerPart.slice(0, -3)
    const groups = remaining.match(/.{1,2}/g) || []
    formatted = groups.join(',') + ',' + lastThree
  }
  
  return decimalPart ? `${formatted}.${decimalPart}` : formatted
}

// Format currency value based on currency preference
export function formatCurrencyValue(value: number, currency: 'USD' | 'INR', showUnit: boolean = true): string {
  if (currency === 'INR') {
    const symbol = '₹'
    // For INR, use Indian number system without "Million"
    if (value >= 10000000) {
      return `${symbol} ${formatIndianNumber(value)}${showUnit ? '' : ''}`
    } else if (value >= 100000) {
      return `${symbol} ${formatIndianNumber(value)}${showUnit ? '' : ''}`
    } else {
      return `${symbol} ${formatIndianNumberWithCommas(value)}`
    }
  } else {
    // USD: use standard formatting with Million
    const symbol = '$'
    if (value >= 1000000) {
      return `${symbol} ${(value / 1000000).toFixed(2)} Million`
    }
    return `${symbol} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function calculateGrowth(startValue: number, endValue: number): number {
  if (startValue === 0) return 0
  return ((endValue - startValue) / startValue) * 100
}

