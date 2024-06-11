#! /usr/bin/env node

const fs = require('fs');
const YAML = require('js-yaml');

const DEFAULT_DELIMITER = 'ç';

const { argv } = require('yargs')
  .option('output', {
    describe: 'Delimited output file',
    alias: 'i',
    demandOption: true,
  })
  .option('request-content-type', {
    describe: 'Content type on which to filter request body objects',
    alias: 'req',
  })
  .option('response-content-type', {
    describe: 'Content type on which to filter response body objects',
    alias: 'resp',
  })
  .option('delimiter', {
    describe: 'Delimiter character (defaults to pipe)',
    alias: 'd',
    default: DEFAULT_DELIMITER,
  })
  .option('include-unreferenced-schema-objects', {
    describe: 'Include unreferenced Schema Objects in output',
    alias: 'u',
    type: 'boolean',
  });

const logging = require('./lib/logging');
const { explodeJsonSchema, explodeOpenApi } = require('./lib/specifications');
const { writeDelimitedFile, writeExcelFile } = require('./lib/output');

(async () => {
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

    if (!outputFn) {
      throw new Error(`Could not find writer function for output file extension: ${outputFileExtension}`);
    }

    if (argv.delimiter === DEFAULT_DELIMITER
      && delimitedFileExtensions.indexOf(outputFileExtension) !== -1) {
      logging.warn(`Using the default delimiter: ${DEFAULT_DELIMITER}. Expect the unexpected if this appears in the input data`);
    }

    // Read and expand all input files
    const data = await inputFiles
      .reduce(async (output, filename) => {
        const decoder = filename.match(/\.(yaml|yml)$/) ? YAML.load : JSON.parse;
        const input = decoder(fs.readFileSync(filename, 'utf-8'));
        let outputData;

        if (Object.keys(input)
          .filter((key) => key.match(/^(openapi|swagger)$/))
          .length > 0) {
          logging.info(`Extracting OpenAPI description properties from: ${filename}`);
          outputData = await explodeOpenApi(
            input,
            filename,
            argv.requestContentType,
            argv.responseContentType,
            argv.delimiter,
            argv.includeUnreferencedSchemaObjects,
          );
        }

        if (Object.keys(input)
          .filter((key) => key.match(/^\$schema$/))
          .length > 0) {
          logging.info(`Extracting JSON Schema properties from: ${filename}`);
          outputData = await explodeJsonSchema(input, filename);
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
