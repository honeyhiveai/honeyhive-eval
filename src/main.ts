import * as core from '@actions/core'
import * as httpClient from '@actions/http-client'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const runId: string = core.getInput('runId', { required: true })
    const projectId: string = core.getInput('projectId', { required: true })
    const aggregateFunction: string =
      core.getInput('aggregateFunction') || 'average'
    const apiUrl: string = core.getInput('apiUrl') || 'https://api.honeyhive.ai'
    const apiKey = core.getInput('apiKey', { required: true })

    // Construct the API URL for the request
    const url = `${apiUrl}/runs/${runId}/result`

    // Create an instance of the HTTP client
    const client = new httpClient.HttpClient()

    // Set up request headers, including the Bearer token
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }

    // Payload with query parameters
    const queryParams = {
      projectId,
      aggregateFunction
    }

    // Convert queryParams to a URL query string
    const queryString = new URLSearchParams(queryParams).toString()

    // Make the GET request to the API
    const response = await client.get(`${url}?${queryString}`, headers)

    // Check if the response is OK
    if (response.message.statusCode !== 200) {
      const errorMessage = `API request failed with status code ${response.message.statusCode}`
      core.setFailed(errorMessage)
      return
    }

    // Parse the API response
    const responseBody = await response.readBody()
    const result = JSON.parse(responseBody)

    // Set individual outputs from the API response
    core.setOutput('status', result.status)
    core.setOutput('success', result.success)
    core.setOutput('passed', result.passed)
    core.setOutput('failed', result.failed)
    core.setOutput('metrics', result.metrics)
    core.setOutput('datapoints', result.datapoints)

    // Log for debugging purposes
    core.info(`Status: ${result.status}`)
    core.info(`Success: ${result.success}`)
    core.info(`Passed: ${JSON.stringify(result.passed, null, 2)}`)
    core.info(`Failed: ${JSON.stringify(result.failed, null, 2)}`)
    core.info(`Metrics: ${JSON.stringify(result.metrics, null, 2)}`)
    core.info(`Datapoints: ${JSON.stringify(result.datapoints, null, 2)}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
