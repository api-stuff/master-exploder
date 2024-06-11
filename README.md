# Master Exploder (OpenAPI document to "stuff")

This utility takes an OpenAPI document as input and dereferences it, and then writes a load of data to another format.

Right now the only supported format is delimited data you can copy into a spreadsheet etc, but it'll get better :wink:.

## Install

This is a public NPM package on the GitHub registry. You'll need a nice setting in your home `.npmrc` file as follows:

```bash
@api-stuff:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_NPM_TOKEN}
```

With that in hand you can do:

```bash
npm install -g @api-stuff/master-exploder@1.1.0
```

and Bob is your mother's brother.

## Execution

The script takes a list of OpenAPI description documents and loops over the contents, generating one output for the script:

```bash
master-exploder \
--output exploded.txt \
--request-content-type "application/json" \
--response-content-type "application/json" \
~/Downloads/account-info-openapi.json
```

The logging is `pino` formatting, so if want it prettier then pipe to `pino-pretty` i.e. `| npx pino-pretty`.

:thumbsup:
