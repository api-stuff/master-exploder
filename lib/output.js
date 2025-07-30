const fs = require('fs');
const { resolve } = require('path');
const XLSX = require('xlsx');

const logging = require('./logging');

const COLUMN_HEADINGS = [
  'Path / Schema Object Name', 'Method', 'Return Code', 'Data Path', 'Dereferenced Schema Path', 'Type', 'Required', 'Min Length',
  'Max Length', 'Min Items', 'Max Items', 'Pattern', 'Format', 'Additional Properties', 'Enumeration Values', 'Description',
];

const sortData = (data, delimiter = 'ç') => data.sort((a, b) => {
  // Convert to arrays if needed for consistent comparison
  const getRowArray = (row) => {
    if (Array.isArray(row)) return row;
    if (typeof row === 'string') return row.split(delimiter);
    return Object.values(row);
  };

  const rowA = getRowArray(a);
  const rowB = getRowArray(b);

  // Sort by: Path/Schema Object Name (0), Method (1), Return Code (2),
  // Dereferenced Schema Path (4)

  // 1. Path / Schema Object Name
  const pathCompare = rowA[0].localeCompare(rowB[0]);
  if (pathCompare !== 0) return pathCompare;

  // 2. Method
  const methodCompare = rowA[1].localeCompare(rowB[1]);
  if (methodCompare !== 0) return methodCompare;

  // 3. Return Code (with Request Body preceding numeric values within same path/method)
  const returnCodeA = rowA[2];
  const returnCodeB = rowB[2];

  // Handle Request Body vs numeric values only when comparing different types
  const isRequestBodyA = returnCodeA === 'Request Body';
  const isRequestBodyB = returnCodeB === 'Request Body';
  const isNumericA = /^\d+$/.test(returnCodeA);
  const isNumericB = /^\d+$/.test(returnCodeB);

  if (isRequestBodyA && isNumericB) return -1;
  if (isNumericA && isRequestBodyB) return 1;

  // For same types or other combinations, use normal string comparison
  const returnCodeCompare = returnCodeA.localeCompare(returnCodeB);
  if (returnCodeCompare !== 0) return returnCodeCompare;

  // 4. Dereferenced Schema Path
  return rowA[4].localeCompare(rowB[4]);
});

const writeDelimitedFile = (filename, data, delimiter) => {
  const resolvedFileName = resolve(filename);
  fs.appendFileSync(resolvedFileName, `${COLUMN_HEADINGS.join(delimiter)}\n`);

  // Write output with custom sort order
  sortData(data, delimiter)
    .forEach((row) => fs.appendFileSync(resolvedFileName, `${row}\n`));
  logging.info(`Successfully created delimited file: ${resolvedFileName}`);
};

const writeExcelFile = (filename, data) => {
  const filePath = resolve(filename);

  // Sort data using shared logic
  const sortedData = sortData(data);

  // Convert data rows to arrays if they aren't already
  const dataRows = sortedData.map((row) => {
    if (Array.isArray(row)) {
      return row;
    }
    // If row is a string with delimiter, split it (using the default delimiter)
    if (typeof row === 'string') {
      return row.split('ç');
    }
    // If it's an object, convert to array based on column order
    return Object.values(row);
  });

  // Create worksheet data with headers
  const worksheetData = [COLUMN_HEADINGS, ...dataRows];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Calculate optimal column widths based on content
  const columnWidths = COLUMN_HEADINGS.map((header, colIndex) => {
    // Start with header length as minimum
    let maxWidth = header.length;

    // Check all data rows for this column to find the longest content
    dataRows.forEach((row) => {
      if (row[colIndex] != null) {
        const cellLength = row[colIndex].toString().length;
        if (cellLength > maxWidth) {
          maxWidth = cellLength;
        }
      }
    });

    // Add padding and cap at reasonable limits for readability
    // Minimum width: 10 chars, Maximum width: 50 chars, Padding: +2 chars
    return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) };
  });

  // Apply column widths (Note: may not work in SheetJS community edition)
  worksheet['!cols'] = columnWidths;

  // Add Auto Filter to make data filterable (works in community edition)
  if (worksheet['!ref']) {
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  }

  // Create workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Write file with all available options for best compatibility
  XLSX.writeFile(workbook, filePath, {
    bookType: 'xlsx',
    cellStyles: true,
    sheetStubs: false,
  });

  logging.info(`Successfully created Excel file: ${filePath}`);
};

module.exports = { writeDelimitedFile, writeExcelFile };
