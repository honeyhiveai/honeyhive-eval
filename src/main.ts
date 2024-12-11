import * as core from '@actions/core'
import * as httpClient from '@actions/http-client'
import { upsertComment } from './comment'
import { runEval } from './honeyhive'
import { z } from 'zod'

const TITLE = '## HoneyHive Evaluation Report\n'

const paramsSchema = z.strictObject({
  apiKey: z.string(),
  root: z.string(),
  runId: z.string(),
  project: z.string(),
  runtime: z.enum(['node', 'python']),
  aggregateFunction: z.string(),
  openaiApiKey: z.string(),
  apiUrl: z.string()
})
export type Params = z.infer<typeof paramsSchema>

/**
 * Formats the evaluation outputs into a readable string
 * @param outputs Object containing the evaluation outputs
 * @returns Formatted string representation of the outputs
 */
function formatOutputs(outputs: {
  status?: string
  success?: boolean
  passed?: string[]
  failed?: string[]
  metrics?: Record<string, any>
  datapoints?: Record<string, any>
}): string {
  const sections: string[] = []

  if (outputs.status) {
    sections.push(`**Status:** ${outputs.status}`)
  }

  if (outputs.success !== undefined) {
    sections.push(`**Overall Success:** ${outputs.success}`)
  }

  if (outputs.passed?.length) {
    sections.push(
      '**Passed Datapoints:**\n' +
        outputs.passed.map(id => `- ${id}`).join('\n')
    )
  }

  if (outputs.failed?.length) {
    sections.push(
      '**Failed Datapoints:**\n' +
        outputs.failed.map(id => `- ${id}`).join('\n')
    )
  }

  if (outputs.metrics) {
    sections.push(
      '**Metrics:**\n```json\n' +
        JSON.stringify(outputs.metrics, null, 2) +
        '\n```'
    )
  }

  if (outputs.datapoints) {
    sections.push(
      '**Detailed Results:**\n```json\n' +
        JSON.stringify(outputs.datapoints, null, 2) +
        '\n```'
    )
  }

  return sections.join('\n\n')
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await upsertComment(`${TITLE}Evals in progress... ⌛`)

    const parsed = paramsSchema.safeParse({
      runId: core.getInput('runId'),
      project: core.getInput('project'),
      apiKey: core.getInput('apiKey'),
      runtime: core.getInput('runtime'),
      aggregateFunction: core.getInput('aggregateFunction'),
      openaiApiKey: core.getInput('openaiApiKey'),
      apiUrl: core.getInput('apiUrl'),
      root: core.getInput('root')
    })

    if (!parsed.success) {
      throw new Error(`Invalid parameters: ${parsed.error.message}`)
    }

    const args = parsed.data
    console.log(JSON.stringify(args, null, 2))

    await runEval(args)
    // console.log(JSON.stringify(args, null, 2))

    // Construct the API URL for the request
    const url = `${args.apiUrl}/runs/${args.runId}/result`
    console.log(url)

    // Create an instance of the HTTP client
    const client = new httpClient.HttpClient()

    // Set up request headers, including the Bearer token
    const headers = {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json'
    }

    // Payload with query parameters
    const queryParams = {
      project: args.project,
      aggregateFunction: args.aggregateFunction
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

    // await upsertComment(
    //   `${TITLE}Evaluation complete! 🎉\n${formatOutputs(result)}`
    // )

    // Log for debugging purposes
    core.info(`Status: ${result.status}`)
    core.info(`Success: ${result.success}`)
    core.info(`Passed: ${JSON.stringify(result.passed, null, 2)}`)
    core.info(`Failed: ${JSON.stringify(result.failed, null, 2)}`)
    core.info(`Metrics: ${JSON.stringify(result.metrics, null, 2)}`)
    core.info(`Datapoints: ${JSON.stringify(result.datapoints, null, 2)}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
      await upsertComment(`${TITLE} Error Encountered: ${error.message}`)
    }
  }
}
