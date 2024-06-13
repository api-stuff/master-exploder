const fs = require('fs');
const { resolve } = require('path');
const wefn = require('write-excel-file/node');

const logging = require('./logging');

const COLUMN_HEADINGS = [
  'Path / Schema Object Name', 'Method', 'Return Code', 'Data Path', 'Dereferenced Schema Path', 'Type', 'Required', 'Min Length',
  'Max Length', 'Min Items', 'Max Items', 'Pattern', 'Format', 'Additional Properties', 'Enumeration Values', 'Description',
];

const writeDelimitedFile = (filename, data, delimiter) => {
  const resolvedFileName = resolve(filename);
  fs.appendFileSync(resolvedFileName, `${COLUMN_HEADINGS.join(delimiter)}\n`);

  // Write output
  data
    .sort()
    .forEach((row) => fs.appendFileSync(resolvedFileName, `${row}\n`));
  logging.info(`Successfully created delimited file: ${resolvedFileName}`);
};

const writeExcelFile = async (filename, data) => {
  const filePath = resolve(filename);
  const schema = COLUMN_HEADINGS.map((headingValue, index) => ({
    column: headingValue,
    width: 50,
    alignVertical: 'center',
    value: (row) => row[index],
  }));

  await wefn(data, { schema, filePath });

  logging.info(`Successfully created Excel file: ${filePath}`);
};

module.exports = { writeDelimitedFile, writeExcelFile };
