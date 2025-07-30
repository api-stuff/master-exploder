# AGENT.md - Master Exploder Project Guide

## Project Overview
**Master Exploder** is a Node.js CLI utility that processes OpenAPI/Swagger documents and JSON schemas, converting them into various output formats (CSV, TXT, Excel). It dereferences API specifications and extracts structured data for spreadsheet analysis.

## Commands

### Development & Testing
```bash
# Install dependencies
yarn install

# Run tests
yarn test
# OR
mocha

# Lint code
npx eslint .

# Build/Check (no explicit build step needed for Node.js)
node index.js --help
```

### Usage
```bash
# Basic execution
./index.js --output exploded.txt --request-content-type "application/json" --response-content-type "application/json" ~/path/to/openapi.json

# With custom delimiter
./index.js -o output.csv -d "," input.yaml

# Include unreferenced schema objects
./index.js -o output.xlsx --include-unreferenced-schema-objects input.json

# Via npm script
yarn explode --output exploded.txt input.json
```

## Project Structure

### Core Files
- `index.js` - Main CLI entry point with argument parsing
- `lib/` - Core functionality modules
  - `specifications.js` - OpenAPI/JSON Schema processing
  - `output.js` - File output writers (delimited, Excel)
  - `logging.js` - Winston-based logging
  - `util.js` - Utility functions
  - `schema-object/` - Schema processing helpers

### Configuration
- `.eslintrc.yml` - ESLint config (Airbnb base with Node.js/Mocha)
- `babel.config.js` - Babel configuration for ES modules
- `.yarnrc.yml` - Yarn 4.2.2 configuration
- `package.json` - NPM package with GitHub registry publishing

### Testing
- `test/` - Mocha test suite
- `test/data/` - Test fixtures (JSON schemas)

## Dependencies & Tech Stack

### Runtime Dependencies
- **OpenAPI Processing**: `@apidevtools/swagger-parser`, `@apidevtools/json-schema-ref-parser`
- **Data Processing**: `jsonpath`, `jsonpath-plus`, `js-yaml`
- **Output**: `xlsx` (Excel export)
- **CLI**: `yargs` (argument parsing)
- **Logging**: `winston`
- **Testing**: `chai`

### Dev Dependencies
- **Linting**: ESLint with Airbnb config
- **Transpilation**: Babel with ES2021 preset
- **Testing**: Mocha

## Code Style & Conventions

### ESLint Rules
- Extends Airbnb base configuration
- Node.js and Mocha environments enabled
- `radix` and `no-console` rules disabled
- ES2021 syntax with Babel parser

### CLI Argument Standards
- **REQUIRED**: All scripts must use named arguments, not positional arguments
- Use kebab-case for CLI options (`--request-content-type`, `--input-file`, `--output-file`)
- Provide clear help text with `--help` flag
- Include proper validation and error messages for missing required arguments

### File Naming
- Kebab-case for CLI options (`--request-content-type`)
- CamelCase for internal variables
- `.spec.js` suffix for test files

### Output Formats
- **Delimited files**: CSV, TXT with configurable delimiter (default: ç)
- **Excel**: XLSX format
- Default delimiter is cedilla (ç) to avoid conflicts with common data

## Repository Information
- **GitHub**: `api-stuff/master-exploder`
- **NPM**: Published to GitHub Package Registry as `@api-stuff/master-exploder`
- **License**: MIT
- **Version**: 1.6.0

## Development Notes

### Package Management
- Uses Yarn 4.2.2 (defined in packageManager field)
- Requires `NPM_TOKEN` environment variable for GitHub registry access
- Global installation supported via `preferGlobal: true`

### Input Formats
- OpenAPI 2.x/3.x (JSON/YAML)
- JSON Schema documents
- Auto-detects format based on file content (`openapi`/`swagger` vs `$schema` keys)

### Logging
- Uses Winston with structured logging
- Supports pino-pretty formatting for readable output
- Log levels: info, warn, error
