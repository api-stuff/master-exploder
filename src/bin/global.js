#! /usr/bin/env node

const fs = require('fs');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { argv } = require('yargs')
  .option('input', {
    describe: 'OpenAPI  document',
    demandOption: true,
  })
  .option('output', {
    describe: 'Delimited output file',
    demandOption: true,
  })
  .option('request-content-type', {
    describe: 'Content type on which to filter request body objects',
    demandOption: true,
  })
  .option('response-content-type', {
    describe: 'Content type on which to filter response body objects',
    demandOption: true,
  })
  .option('delimiter', {
    describe: 'Delimiter character (defaults to pipe)',
    default: '|',
  });

const { getJsonPath } = require('../lib/util');
const SchemaObject = require('../lib/schema-object');

(async () => {
  try {
    // Derefence the OpenAPI document
    const api = await SwaggerParser.dereference(argv.input);

    try {
      fs.statSync(argv.output);
      fs.unlinkSync(argv.output);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Trash any example objects as they are not required for this exercise
    getJsonPath('$..example', api)
      .filter((result) => result.parent.type)
      .forEach((result) => {
        delete result.parent.example; // eslint-disable-line no-param-reassign
      });

    // Write file heading
    fs.appendFileSync(argv.output, `${[
      'Path', 'Method', 'Return Code', 'Data Path', 'Dereferenced Schema Path', 'Type', 'Required', 'Min Length',
      'Max Length', 'Min Items', 'Max Items', 'Pattern', 'Format', 'Additional Properties', 'Enumeration Values', 'Description',
    ].join(argv.delimiter)}\n`);

    const requestBodies = getJsonPath(`paths.*.*.requestBody.content.${argv['request-content-type']}.schema`, api);
    const responseBodies = getJsonPath(`paths.*.*.responses.*.content.['${argv['response-content-type']}'].schema`, api);

    if (requestBodies.length === 0 || responseBodies.length === 0) {
      throw new Error(`Could not match Content-Type ${argv['content-type']} in request/response bodies`);
    }

    // Write request data
    requestBodies
      .map((result) => new SchemaObject(result, argv.delimiter)
        .getTests(argv.delimiter))
      .reduce((output, result) => output.concat(result), [])
      .concat(
        responseBodies
          .filter((result) => result.path[5].match(/^2[0-9]+$/))
          .map((result) => new SchemaObject(result, argv.delimiter)
            .getTests())
          .reduce((output, result) => output.concat(result), []),
      )
      .sort()
      .forEach((result) => fs.appendFileSync(argv.output, `${result}\n`));

    // fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
})();
