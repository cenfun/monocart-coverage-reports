# Any testing framework {#integration-with-any-testing-framework}
- API
    - Collecting coverage data when any stage of the test is completed, and adding the coverage data to the coverage reporter. `await mcr.add(coverageData)`
    - Generating the coverage reports after the completion of all tests. `await mcr.generate()`
    - see [Multiprocessing Support](/guide/multiprocessing#multiprocessing-support)
- CLI
    - Wrapping with any CLI. `mcr your-cli --your-arguments`
    - see [Command line](/reference/cli#command-line)
