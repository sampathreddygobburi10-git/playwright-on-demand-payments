import { type Page } from '@playwright/test';
import { urlPatterns } from '../network/odc-mocks';
import { NetworkInterceptor } from './network-interceptor';

type PrinterInfo = {
  nextCheckNo: string | null;
  dmsPrinterNo: string | null;
  cloudPrinterId: string;
  printerId: string;
  isDefaultPrinter: boolean;
  isAccountingPrinter: boolean;
  printerDetails: {
    printerName: string;
    checkTray: string;
    overFlowTray: string;
    isMICRPrinter: boolean;
  };
};

const CLOUD_PRINTER_ID = '103e361c-7049-41c1-9043-6f4873f04277';

const printer = (
  dmsPrinterNo: string | null,
  nextCheckNo: string | null,
  printerId: string,
  overrides: Partial<PrinterInfo> = {},
): PrinterInfo => ({
  nextCheckNo,
  dmsPrinterNo,
  cloudPrinterId: CLOUD_PRINTER_ID,
  printerId,
  isDefaultPrinter: true,
  isAccountingPrinter: false,
  printerDetails: {
    printerName: 'Virtual_Printer',
    checkTray: 'Tray4',
    overFlowTray: 'Tray4',
    isMICRPrinter: true,
  },
  ...overrides,
});

const accountingPrinter = printer(null, null, 'accounting-printer-id', {
  isDefaultPrinter: false,
  isAccountingPrinter: true,
  printerDetails: {
    printerName: 'Virtual_Printer',
    checkTray: 'Tray4',
    overFlowTray: 'Tray4',
    isMICRPrinter: false,
  },
});

export const MULTI_SEQUENCE_PRINTERS = {
  formProvisions: [
    { aliasName: 'CHECKS', formProvisionId: '3503' },
    { aliasName: 'CHECKS-OVERFLOW', formProvisionId: '8231' },
  ],
  provisionPrinterInfo: {
    printerInfo: [
      printer('2', '60117', 'printer-seq-2'),
      printer('10', '80223', 'printer-seq-10'),
      printer('1', '70118', 'printer-seq-1'),
      accountingPrinter,
    ],
    formProvisionInfo: { aliasName: 'CHECKS', formProvisionId: '3503' },
  },
};

export const SINGLE_SEQUENCE_PRINTERS = {
  formProvisions: [{ aliasName: 'CHECKS', formProvisionId: '3503' }],
  provisionPrinterInfo: {
    printerInfo: [printer('2', '60117', 'printer-seq-2'), accountingPrinter],
    formProvisionInfo: { aliasName: 'CHECKS', formProvisionId: '3503' },
  },
};

export const OTHER_FORM_PRINTERS = [
  printer('4', '90111', 'printer-seq-4'),
  printer('3', '90222', 'printer-seq-3'),
  accountingPrinter,
];

export const SEQUENCE_OPTIONS_ASCENDING = ['1', '2', '10'];
export const DEFAULT_SEQUENCE = '2';
export const DEFAULT_SEQUENCE_CHECK_NO = '60117';
export const DEFAULT_SEQUENCE_PRINTER_ID = 'printer-seq-2';

export class CheckSequenceMock {
  static async withMultipleSequences(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(
      page,
      urlPatterns.multiFormsDefaultPrinter,
      MULTI_SEQUENCE_PRINTERS,
    );
    await NetworkInterceptor.mockApiResponse(
      page,
      urlPatterns.formPrinterWithNextCheckNumber,
      OTHER_FORM_PRINTERS,
    );
    await NetworkInterceptor.mockApiResponse(
      page,
      urlPatterns.printersWithCheckNumber,
      MULTI_SEQUENCE_PRINTERS.provisionPrinterInfo.printerInfo,
    );
  }

  static async stubPrintCheck(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(page, urlPatterns.printCheck, {
      printerNumber: '10',
      checkNumber: '80223',
    });
  }

  static async withSingleSequence(page: Page): Promise<void> {
    await NetworkInterceptor.mockApiResponse(
      page,
      urlPatterns.multiFormsDefaultPrinter,
      SINGLE_SEQUENCE_PRINTERS,
    );
  }
}
