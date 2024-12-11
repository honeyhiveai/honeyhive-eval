# HoneyHive Evaluation GitHub Action

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This GitHub Action integrates with HoneyHive to run evaluations for LLM applications and aggregate metric results.

## Overview

This action connects to the HoneyHive API, retrieves evaluation data, and sets output variables based on the success of the evaluation run. It supports aggregating evaluation metrics using various aggregation functions (e.g., `average`, `min`, `max`) and provides detailed outputs such as `status`, `success`, `passed`, `failed`, `metrics`, and `datapoints`.

## Inputs

- **runId**: The ID of the evaluation run (required).
- **project**: The project associated with the evaluation (required).
- **apiKey**: The API key for the HoneyHive API (required).
- **aggregateFunction**: The aggregation function to be used (default: `"average"`).
- **apiUrl**: The base URL of the HoneyHive API (default: `"https://api.honeyhive.ai"`).

## Outputs

- **status**: The status of the evaluation run (e.g., `pending` or `completed`).
- **success**: Boolean indicating whether all datapoints passed.
- **passed**: A list of passed `datapoint_ids` or `session_ids`.
- **failed**: A list of failed `datapoint_ids` or `session_ids`.
- **metrics**: Aggregated metrics and the detailed pass/fail status for each metric.
- **datapoints**: Detailed datapoint-level results with associated session IDs and pass/fail statuses.

## Initial Setup

After cloning this repository or using it as a template, follow the steps below to configure the action:

> **Note**: Ensure you have [Node.js](https://nodejs.org) (version 20.x or later) installed.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Bundle the TypeScript for distribution:

   ```bash
   npm run bundle
   ```

3. Run tests:

   ```bash
   npm test
   ```

## Update the Action Metadata

The [`action.yml`](action.yml) file defines the metadata for this action, including inputs and outputs. Ensure you update this file when modifying the action to reflect new inputs or outputs.

## Update the Action Code

The [`src/`](./src/) directory contains the action's core code. You can modify the behavior by editing `src/main.ts`. This action uses `@actions/http-client` to communicate with the HoneyHive API and fetch evaluation results.

- Inputs are retrieved using `core.getInput()`.
- Outputs are set using `core.setOutput()` to make evaluation data accessible to later steps in a workflow.

## Example Usage

Here is an example of how you can use this action in a workflow to evaluate an LLM model run and access its results:

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Run HoneyHive Evaluation
    id: evaluate
    uses: honeyhiveai/honeyhive-eval@main
    with:
      runId: 'your-run-id'
      project: 'your-project'
      aggregateFunction: 'average'
      apiUrl: 'https://api.honeyhive.ai'
      apiKey: ${{ secrets.HH_API_KEY }}

  - name: Display Evaluation Results
    run: |
      echo "Evaluation Status: ${{ steps.evaluate.outputs.status }}"
      echo "Success: ${{ steps.evaluate.outputs.success }}"
      echo "Passed Datapoints: ${{ steps.evaluate.outputs.passed }}"
      echo "Failed Datapoints: ${{ steps.evaluate.outputs.failed }}"
      echo "Metrics: ${{ steps.evaluate.outputs.metrics }}"
      echo "Datapoints: ${{ steps.evaluate.outputs.datapoints }}"
```

## Publishing a New Release

To publish a new release, follow these steps:

1. **Update the code**: Make necessary changes to your action.
2. **Run tests**: Ensure everything works by running tests (`npm test`).
3. **Commit and push changes**: After testing, commit your changes and push them to the repository.
4. **Tag a new release**: Use GitHub’s tagging mechanism to create a new release, or use the provided helper script to automate the process.

For information about versioning your action, see [Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md).
This updated `README.md` reflects the key changes related to the HoneyHive API integration and provides more context on how to use the action for evaluation purposes.
   commits, tags and branches to the remote repository. From here, you will need
   to create a new release in GitHub so users can easily reference the new tags
   in their workflows.
