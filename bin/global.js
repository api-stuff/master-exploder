#! /usr/bin/env node

const fs = require('fs');
const SwaggerParser = require('@apidevtools/swagger-parser');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const YAML = require('js-yaml');

const { argv } = require('yargs')
  .option('output', {
    describe: 'Delimited output file',
    demandOption: true,
  })
  .option('request-content-type', {
    describe: 'Content type on which to filter request body objects',
  })
  .option('response-content-type', {
    describe: 'Content type on which to filter response body objects',
  })
  .option('delimiter', {
    describe: 'Delimiter character (defaults to pipe)',
    default: '|',
  });

const logging = require('../lib/logging');
const { getJsonPath } = require('../lib/util');
const SchemaObject = require('../lib/schema-object');

const explodeOpenApi = async (input, filename, requestContentType, responseContentType) => {
  // Derefence the OpenAPI document
  const api = await SwaggerParser.dereference(input);

  // Trash any example objects as they are not required for this exercise
  getJsonPath('$..example', api)
    .filter((result) => result.parent.type)
    .forEach((result) => {
      delete result.parent.example; // eslint-disable-line no-param-reassign
    });

  const requestBodies = getJsonPath(`paths.*.*.requestBody.content.['${requestContentType}'].schema`, api);
  const responseBodies = getJsonPath(`paths.*.*.responses.*.content.['${responseContentType}'].schema`, api);

  if (requestBodies.length === 0) {
    logging.warn(`Could not match Content-Type ${requestContentType} in request bodies from ${filename}`);
  }

  if (responseBodies.length === 0) {
    logging.warn(`warn: Could not match Content-Type ${responseContentType} in response bodies from ${filename}`);
  }

  // Return array of schema object definitions
  return requestBodies
    .map((result) => new SchemaObject(result, argv.delimiter)
      .getProperties())
    .reduce((output, result) => output.concat(result), [])
    .concat(
      responseBodies
        .filter((result) => result.path[5].match(/^2[0-9]+$/))
        .map((result) => new SchemaObject(result, argv.delimiter)
          .getProperties())
        .reduce((output, result) => output.concat(result), []),
    );
};

const explodeJsonSchema = async (input) => {
  const schema = await $RefParser.dereference(input);
  const allPaths = {
    path: Array.from(new Array(7), () => 'N/A'),
    value: schema,
  };

  return new SchemaObject(allPaths, argv.delimiter)
    .getProperties();
};

(async () => {
  if (argv._.length === 0) {
    logging.error('No files passed to explode!');
    process.exit(-1);
  }

  try {
    fs.statSync(argv.output);
    fs.unlinkSync(argv.output);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logging.error(err);
      process.exit(-1);
    }
  }

  try {
    // Write file heading
    fs
      .appendFileSync(argv.output, `${[
        'Path', 'Method', 'Return Code', 'Data Path', 'Dereferenced Schema Path', 'Type', 'Required', 'Min Length',
        'Max Length', 'Min Items', 'Max Items', 'Pattern', 'Format', 'Additional Properties', 'Enumeration Values', 'Description',
      ]
        .join(argv.delimiter)}\n`);

    // Collect data, looping over files
    const data = await argv._
      .reduce(async (output, filename) => {
        logging.info(`Processing ${filename}`);

        const decoder = filename.match(/\.(yaml|yml)$/) ? YAML.load : JSON.parse;
        const input = decoder(fs.readFileSync(filename, 'utf-8'));

        let fn = null;

        if (Object.keys(input)
          .filter((key) => key.match(/^(openapi|swagger)$/))
          .length > 0) {
          logging.info(`Found OpenAPI document for: ${filename}`);
          fn = explodeOpenApi;
        }

        if (Object.keys(input)
          .filter((key) => key.match(/^\$schema$/))
          .length > 0) {
          fn = explodeJsonSchema;
        }

        if (!fn) {
          throw new Error('Could not find matching function for file contents!');
        }

        return (await output)
          .concat(await fn(input, filename, argv['request-content-type'], argv['response-content-type'], filename));
      }, []);

    // Write output
    logging.info(`Writing output to ${argv.output}`);
    data
      .sort()
      .forEach((result) => fs.appendFileSync(argv.output, `${result}\n`));

    // fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
  } catch (err) {
    logging.error(err);
    process.exit(-1);
  }
})();
