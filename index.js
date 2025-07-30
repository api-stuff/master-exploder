#! /usr/bin/env node

const fs = require('fs');
const YAML = require('js-yaml');

const DEFAULT_DELIMITER = 'ç';

const { argv } = require('yargs')
  .option('output', {
    describe: 'Delimited output file',
    alias: 'o',
    demandOption: true,
  })
  .option('request-content-type', {
    describe: 'Content type on which to filter request body objects',
    alias: 'req',
    default: 'application/json',
  })
  .option('response-content-type', {
    describe: 'Content type on which to filter response body objects',
    alias: 'resp',
    default: 'application/json',
  })
  .option('delimiter', {
    describe: 'Delimiter character (defaults to cedilla). Only applies to delimited files',
    alias: 'd',
    default: DEFAULT_DELIMITER,
  })
  .option('include-unreferenced-schema-objects', {
    describe: 'Include unreferenced Schema Objects in output',
    alias: 'u',
    type: 'boolean',
    default: false,
  });

const logging = require('./lib/logging');
const { explodeJsonSchema, explodeOpenApi } = require('./lib/specifications');
const { writeDelimitedFile, writeExcelFile } = require('./lib/output');

(async () => {
  if (!argv.requestContentType
    && !argv.responseContentType
    && !argv.includeUnreferencedSchemaObjects) {
    logging.error('No work to do as no request or response content types and unreferenced schema objects are not included');
    process.exit(-1);
  }

  const inputFiles = argv._;

  // Check there are actually input files
  if (inputFiles.length === 0) {
    logging.error('No files passed to explode!');
    process.exit(-1);
  }

  // Check output file directory
  try {
    fs.statSync(argv.output);
    fs.unlinkSync(argv.output);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logging.error(err);
      process.exit(-1);
    }
  }

  // Supported file extensions for delimited files
  const delimitedFileExtensions = ['csv', 'txt'];
  const [csv, txt] = delimitedFileExtensions;

  try {
    const outputFileExtension = argv.output.split('.').pop();
    const outputFn = {
      [csv]: writeDelimitedFile,
      [txt]: writeDelimitedFile,
      xlsx: writeExcelFile,
    }[outputFileExtension];
    const delimiter = delimitedFileExtensions.indexOf(outputFileExtension) !== -1
      ? argv.delimiter
      : null;

    if (!outputFn) {
      throw new Error(`Could not find writer function for output file extension: ${outputFileExtension}`);
    }

    if (delimiter === DEFAULT_DELIMITER) {
      logging.warn(`Using the default delimiter: ${DEFAULT_DELIMITER}. Expect the unexpected if this appears in the input data`);
    }

    // Read and expand all input files
    const data = await inputFiles
      .reduce(async (output, filename) => {
        const decoder = filename.match(/\.(yaml|yml)$/) ? YAML.load : JSON.parse;
        const input = decoder(fs.readFileSync(filename, 'utf-8'));
        const { includeUnreferencedSchemaObjects, requestContentType, responseContentType } = argv;
        let outputData;

        if (Object.keys(input)
          .filter((key) => key.match(/^(openapi|swagger)$/))
          .length > 0) {
          logging.info(`Extracting OpenAPI description properties from: ${filename}`);
          outputData = await explodeOpenApi(
            input,
            filename,
            includeUnreferencedSchemaObjects,
            delimiter,
            requestContentType,
            responseContentType,
          );
        }

        if (Object.keys(input)
          .filter((key) => key.match(/^\$schema$/))
          .length > 0) {
          logging.info(`Extracting JSON Schema properties from: ${filename}`);
          outputData = await explodeJsonSchema(input, delimiter);
        }

        if (!outputData) {
          throw new Error(`Could not find function to match description language for file: ${filename}`);
        }

        return (await output)
          .concat(outputData);
      }, []);

    // Write output file
    outputFn(argv.output, data, argv.delimiter);
  } catch (err) {
    // console.error(err);
    logging.error(err);
    process.exit(-1);
  }
})();
