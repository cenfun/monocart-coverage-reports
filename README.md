# Monocart Coverage Reports



## Usage

```js
const CoverageReport = require('monocart-coverage-reports');

const coverageOptions = {
    name: "My Coverage Report 2023-11-24",
    outputFile: "coverage-reports/2023-11-24/index.html"
}

const coverageReport = new CoverageReport(coverageOptions);

await coverageReport.add(coverageData1);
await coverageReport.add(coverageData2);

const results = await coverageReport.generate();

```