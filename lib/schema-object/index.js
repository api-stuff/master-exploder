const {
  getParentArrayPath,
  getTypeFunction,
} = require('./type-functions');
const { getJsonPath } = require('../util');

const keywords = ['items', 'type', 'properties', 'required', 'additionalProperties', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'enum', 'format', 'title', 'pattern', 'allOf', 'oneOf', 'anyOf', 'not'];

const isSchemaCompositionObject = (path) => /(allOf|anyOf|not|oneOf)\.[0-9]+$/.test(path.join('.'));

const isKeywordExtensionOrIndex = (fragment) => keywords
  .indexOf(fragment) !== -1 || Number.isInteger(parseInt(fragment)) || fragment.match(/x-.*/);

const getSerialisationPath = (path) => path
  .filter((fragment) => !isKeywordExtensionOrIndex(fragment));

class SchemaObject {
  constructor(schemaObject, delimiter) {
    if (!schemaObject) {
      throw new Error('Missing arguments: [schemaObject]');
    }

    this.arrays = [];
    this.schemaObject = schemaObject;

    // Override for unreferenced objects
    this.schemaObjectName = schemaObject.schemaObjectName;
    this.delimiter = delimiter;
  }

  getOutputValues(responseSignature, mappings) {
    const columnLayout = [
      'type',
      'required',
      'minLength',
      'maxLength',
      'minItems',
      'maxItems',
      'pattern',
      'format',
      'additionalProperties',
      'enum',
      'description',
    ];

    const result = responseSignature
      .concat(columnLayout
        .map((column) => {
          const fn = mappings[column];

          if (fn) {
            return fn();
          }

          return '';
        }));

    // If the delimiter is set then concatenate all values into a string
    if (this.delimiter) {
      return result.join(this.delimiter);
    }

    // If the delimiter is not set then return the values as an Array
    return result;
  }

  getProperties() {
    // Get the required properties for the response

    const required = getJsonPath('$..required', this.schemaObject.value)
      .reduce((output, child) => output.concat(child.value.map((p) => getSerialisationPath(child.path).concat(p).join('.'))), []);

    // Get all the important children i.e. those that can be serialised
    const children = getJsonPath('$..*', this.schemaObject.value)
      .filter((child) => child.value && ['description', 'required'].indexOf(child.path.slice(-1)[0]) === -1);

    return children
      .reduce((output, child) => {
        // Only process items that can actually be serialised i.e a named schema object
        // In this content the type property must exist and:
        //
        // * The property is nested in a Schema Composition object
        // * This is not a keyword or index (this is belt and braces and could possibly be removed)
        //
        if (child.value.type
          && (isSchemaCompositionObject(child.path)
            || !isKeywordExtensionOrIndex(child.path.slice(-1).pop()))) {
          const { path } = this.schemaObject;
          const [, , url, method, , contentPath] = path || [];
          const pathOrSchemaObjectName = url || this.schemaObjectName;
          // eslint-disable-next-line no-nested-ternary
          const returnCode = !contentPath ? '' : (contentPath === 'content' ? 'Request Body' : contentPath);
          const dataPath = getSerialisationPath(child.path).join('.');
          const parentArray = getParentArrayPath(dataPath, this.arrays);
          const isRequired = required.indexOf(dataPath) !== -1;
          const fn = getTypeFunction(child.value.type, child.value, 'core');
          const requirement = fn(dataPath, isRequired, child, this.arrays);
          const dereferencedSchemaPath = child.path.join('.');
          const coreRequirementResponseSignature = [
            pathOrSchemaObjectName,
            method,
            returnCode,
            dataPath,
            dereferencedSchemaPath,
          ];

          // additionalRequirement caters for arrays of items as these are described
          // using their own schema object under the "items" property. If additional
          // requirement is not set then concatenate now and exit
          if (!requirement.additionalRequirement) {
            const delimitedData = this.getOutputValues(
              coreRequirementResponseSignature,
              requirement.coreRequirement || requirement,
            );

            if (parentArray && this.delimiter) {
              return output.concat([
                delimitedData
                  .replace(
                    parentArray.source,
                    parentArray.replacement,
                  ),
              ]);
            }

            if (parentArray) {
              delimitedData[3] = delimitedData[3]
                .replace(
                  parentArray.source,
                  parentArray.replacement,
                );
              return output.concat([delimitedData]);
            }

            return output.concat([delimitedData]);
          }

          const { additionalDataPath, value } = requirement.additionalRequirement;

          // An additional requirement can of course be more than one schema object, if described
          // using schema composition (allOf, oneOf, etc). Check for this upfront, fail if type or
          // composition keyword is missing
          if (!value.type && !('allOf' in value || 'oneOf' in value || 'anyOf' in value)) {
            throw new Error('Type not found on additional requirement and missing a valid schema composition keyword');
          }

          const additionalRequirementResponseSignature = [
            pathOrSchemaObjectName,
            method,
            returnCode,
            additionalDataPath,
            `${dereferencedSchemaPath}.items`,
          ];

          const schemaComposition = value.oneOf || value.allOf || value.anyOf;
          const { discriminator } = value;

          if (!schemaComposition && !value.type) {
            console.error(value);
            throw new Error('Not implemented');
          }

          // Catch-all loop over additional requirements
          const additionalRequirements = (
            value.type
              ? [value] // Has a type set
              : schemaComposition) // Has a composition keyword set
            .map((additionalPropertyValue) => {
              const additionalRequirementFn = getTypeFunction(additionalPropertyValue.type, additionalPropertyValue, 'additional');

              return this.getOutputValues(
                additionalRequirementResponseSignature,
                additionalRequirementFn(
                  additionalDataPath,
                  isRequired,
                  { value: additionalPropertyValue },
                  this.arrays,
                ),
              );
            });

          if (parentArray && this.delimiter) {
            return output.concat(
              [
                this.getOutputValues(
                  coreRequirementResponseSignature,
                  requirement.coreRequirement,
                )
                  .replace(parentArray.source, parentArray.replacement),
              ].concat(additionalRequirements),
            );
          }

          if (parentArray) {
            const outputData = this.getOutputValues(
              coreRequirementResponseSignature,
              requirement.coreRequirement,
            );

            outputData[3] = outputData[3]
              .replace(
                parentArray.source,
                parentArray.replacement,
              );

            return output.concat(
              [outputData]
                .concat(additionalRequirements),
            );
          }

          return output.concat(
            [
              this.getOutputValues(
                coreRequirementResponseSignature,
                requirement.coreRequirement,
              ),
            ].concat(additionalRequirements),
          );
        }

        return output;
      }, [])
      .map((output) => (this.delimiter ? output.replace(/ +/g, ' ').trim() : output))
      .sort();
  }
}

module.exports = SchemaObject;
