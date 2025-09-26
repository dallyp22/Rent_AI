/**
 * Currency formatting utilities for consistent monetary display throughout the application.
 * Fixes floating-point precision issues and ensures consistent formatting.
 */

/**
 * Format standard currency amounts to exactly 2 decimal places
 * Handles edge cases gracefully and defaults to "$0.00" for invalid inputs
 * 
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(value: any): string {
  // Handle edge cases
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }

  // Convert to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    return '$0.00';
  }

  // Handle NaN or invalid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '$0.00';
  }

  // Use toFixed(2) for exact decimal control to avoid floating-point precision issues
  const fixedValue = numValue.toFixed(2);
  const formattedNumber = parseFloat(fixedValue).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `$${formattedNumber}`;
}

/**
 * Format large currency amounts with proper internationalization
 * Uses Intl.NumberFormat for better handling of very large numbers
 * 
 * @param value - The numeric value to format
 * @returns Formatted currency string with proper internationalization
 */
export function formatLargeCurrency(value: any): string {
  // Handle edge cases
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }

  // Convert to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    return '$0.00';
  }

  // Handle NaN or invalid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '$0.00';
  }

  // Use Intl.NumberFormat for large amounts with proper currency formatting
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(numValue);
}

/**
 * Format currency change amounts with proper sign indicators
 * Used for showing increases/decreases in rent or revenue
 * 
 * @param value - The numeric change value
 * @param showSign - Whether to show the + sign for positive values (default: true)
 * @returns Formatted currency change string
 */
export function formatCurrencyChange(value: any, showSign: boolean = true): string {
  // Handle edge cases
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }

  // Convert to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    return '$0.00';
  }

  // Handle NaN or invalid numbers
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '$0.00';
  }

  // Use absolute value for formatting, then add sign
  const absValue = Math.abs(numValue);
  const formatted = formatCurrency(absValue);
  
  // Remove the $ sign to add our own with proper sign handling
  const withoutDollar = formatted.substring(1);

  if (numValue > 0) {
    return showSign ? `+$${withoutDollar}` : `$${withoutDollar}`;
  } else if (numValue < 0) {
    return `-$${withoutDollar}`;
  } else {
    return '$0.00';
  }
}

/**
 * Format currency for display in tables and lists
 * Handles special cases like "Contact for pricing" for zero or invalid values
 * 
 * @param value - The numeric value to format
 * @param fallbackText - Text to show for invalid values (default: "Contact for pricing")
 * @returns Formatted currency string or fallback text
 */
export function formatCurrencyWithFallback(value: any, fallbackText: string = 'Contact for pricing'): string {
  // Handle edge cases
  if (value === null || value === undefined || value === '') {
    return fallbackText;
  }

  // Convert to number if it's a string
  let numValue: number;
  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    return fallbackText;
  }

  // Handle NaN, invalid numbers, or zero values
  if (isNaN(numValue) || !isFinite(numValue) || numValue === 0) {
    return fallbackText;
  }

  return formatCurrency(numValue);
}