import type { Page, Request, Response } from '@playwright/test';

export type CapturedCall = {
  request: Request;
  response: Response;
};

export function waitForResponse(page: Page, pattern: RegExp | string, timeout = 60000) {
  return page.waitForResponse(pattern, { timeout });
}

export function waitForRequest(page: Page, pattern: RegExp | string, timeout = 60000) {
  return page.waitForRequest(pattern, { timeout });
}

export const endpoints = {
  onDemandCheckInitialization: /\/odc\/initialization\b/,
  glCOACall: /\/gl-coa(\b|\/)/,
  getUserDetails: /\/user\/details/,
  controlSearchVendors: /\/odc\/control-search\/vendors/,
  controlSearchCustomers: /\/odc\/control-search\/customers/,
  controlSearchEmployees: /\/odc\/control-search\/employees/,
  controlSearchMiscellaneous: /\/odc\/control-search\/miscellaneous/,
  controlDescription: /\/control\/description/,
  vendorControlSearchBff: /\/common-bff\/control-search\/vendor/,
  customersControlSearchBff: /\/common-bff\/control-search\/customers/,
  printODCCheck: /\/print-check\b/,
  voidODCCheck: /\/odc\/.+\/void/,
  fetchPrintersWithCheckNumber: /\/getPrintersWithCheckNumber/,
  fetchMultiFormsWithPrinters: /\/multi-forms-default-printer/,
  fetchFormPrinterWithNextCheckNumber: /\/form-printer-with-next-check-number/,
};

export const urlPatterns = {
  multiFormsDefaultPrinter: '**/multi-forms-default-printer/**',
  formPrinterWithNextCheckNumber: '**/form-printer-with-next-check-number/**',
  printersWithCheckNumber: '**/getPrintersWithCheckNumber/**',
  harnessEvaluations: '**/api/1.0/client/env/**/evaluations**',
  harnessStream: '**/api/1.0/stream**',
  printCheck: '**/print-check',
};
