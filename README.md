# Master Exploder (OpenAPI document to delimited data)

This utility takes an OpenAPI document as input, dereferences it and then writes a load of delimited data you can copy into a spreadsheet etc.

## Running it

Do this (using UK open banking Account Info as an example):

```bash
yarn run explode --input https://raw.githubusercontent.com/OpenBankingUK/read-write-api-specs/master/dist/openapi/account-info-openapi.json --output exploded.txt
```
