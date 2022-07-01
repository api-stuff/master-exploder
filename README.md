# Master Exploder (OpenAPI document to "stuff")

This utility takes an OpenAPI document as input, dereferences it and then writes a load of data to another format.

Right now the only supported format is delimited data you can copy into a spreadsheet etc, but it'll get better :wink:.

## Running it

Do this (using UK open banking Account Info as an example):

```bash
yarn run explode \
--input https://raw.githubusercontent.com/OpenBankingUK/read-write-api-specs/master/dist/openapi/account-info-openapi.json \
--output exploded.txt \
--request-content-type "application/json" \
--response-content-type "application/json"
```
