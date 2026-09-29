import { 
  exportProductsToExcel, 
  downloadProductTemplateExcel, 
  parseProductsExcel,
  exportPartiesToExcel,
  downloadPartyTemplateExcel,
  parsePartiesExcel
} from '../lib/excelUtils';
import { exportInventoryToCSV } from '../lib/csvExport';
import { Medicine } from '../types';

/**
 * Export medicines list to formatted .xlsx report
 */
export const exportMedicinesToExcel = (medicines: Medicine[]) => {
  return exportProductsToExcel(medicines);
};

/**
 * Downloads standard sample import template for medicine catalogs
 */
export const downloadSampleExcelTemplate = () => {
  return downloadProductTemplateExcel();
};

export {
  exportProductsToExcel,
  downloadProductTemplateExcel,
  parseProductsExcel,
  exportPartiesToExcel,
  downloadPartyTemplateExcel,
  parsePartiesExcel,
  exportInventoryToCSV
};
