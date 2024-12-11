/**
 * Unit tests for the action's main functionality, src/main.ts
 */

import * as core from '@actions/core'
import { run } from '../src/main'

// Mocking the @actions/core module
jest.mock('@actions/core')
jest.mock('@actions/github')

const mockGet = jest.fn()

jest.mock('@actions/http-client', () => {
  return {
    HttpClient: jest.fn().mockImplementation(() => {
      return { get: mockGet }
    })
  }
})
jest.mock('@actions/github', () => {
  return {
    context: {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      issue: {
        number: 1
      },
      sha: 'test-sha'
    },
    getOctokit: jest.fn().mockImplementation(() => {
      return {
        rest: {
          issues: {
            createComment: jest.fn(),
            updateComment: jest.fn(),
            listComments: jest.fn().mockResolvedValue({
              data: []
            })
          },
          repos: {
            listPullRequestsAssociatedWithCommit: jest.fn().mockResolvedValue({
              data: []
            })
          }
        }
      }
    })
  }
})

describe('GitHub Actions Script', () => {
  let getInputMock: jest.Mock
  let setOutputMock: jest.Mock
  let setFailedMock: jest.Mock

  const mockApiResponse = {
    status: 'completed',
    success: true,
    passed: ['datapoint1', 'datapoint2'],
    failed: [],
    metrics: {
      aggregation_function: 'average',
      details: []
    },
    datapoints: []
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock core.getInput to return test values
    getInputMock = core.getInput as jest.Mock
    getInputMock.mockImplementation((name: string) => {
      switch (name) {
        case 'runId':
          return 'mockRunId'
        case 'projectId':
          return 'mockProjectId'
        case 'aggregateFunction':
          return 'average'
        case 'apiUrl':
          return 'https://api.example.com'
        case 'apiKey':
          return 'mockApiKey'
        default:
          return ''
      }
    })

    // Mock core.setOutput and core.setFailed
    setOutputMock = core.setOutput as jest.Mock
    setFailedMock = core.setFailed as jest.Mock

    // Mock the HttpClient's get method
    mockGet.mockResolvedValue({
      message: { statusCode: 200 },
      readBody: jest.fn().mockResolvedValue(JSON.stringify(mockApiResponse))
    })
  })

  it('should set outputs correctly on a successful API call', async () => {
    await run()

    // Ensure core.getInput was called with expected arguments
    expect(getInputMock).toHaveBeenCalledWith('runId', { required: true })
    expect(getInputMock).toHaveBeenCalledWith('projectId', { required: true })
    expect(getInputMock).toHaveBeenCalledWith('apiKey', { required: true })
    expect(getInputMock).toHaveBeenCalledWith('aggregateFunction')
    expect(getInputMock).toHaveBeenCalledWith('apiUrl')

    // Ensure the HTTP request was made with the correct URL and headers
    expect(mockGet).toHaveBeenCalledWith(
      'https://api.example.com/runs/mockRunId/result?projectId=mockProjectId&aggregateFunction=average',
      {
        Authorization: 'Bearer mockApiKey',
        'Content-Type': 'application/json'
      }
    )

    // Ensure core.setOutput was called with the correct values from the mock response
    expect(setOutputMock).toHaveBeenCalledWith('status', 'completed')
    expect(setOutputMock).toHaveBeenCalledWith('success', true)
    expect(setOutputMock).toHaveBeenCalledWith('passed', [
      'datapoint1',
      'datapoint2'
    ])
    expect(setOutputMock).toHaveBeenCalledWith('failed', [])
    expect(setOutputMock).toHaveBeenCalledWith(
      'metrics',
      mockApiResponse.metrics
    )
    expect(setOutputMock).toHaveBeenCalledWith(
      'datapoints',
      mockApiResponse.datapoints
    )
  })

  it('should fail the workflow if the API request returns a non-200 status', async () => {
    // Mock the HTTP client to return a non-200 status
    mockGet.mockResolvedValue({
      message: { statusCode: 500 },
      readBody: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ error: 'Server error' }))
    })

    await run()

    // Ensure core.setFailed was called with the appropriate error message
    expect(setFailedMock).toHaveBeenCalledWith(
      'API request failed with status code 500'
    )
  })

  it('should handle and report an error from the API response', async () => {
    // Mock the HTTP client to return invalid JSON
    mockGet.mockResolvedValue({
      message: { statusCode: 200 },
      readBody: jest.fn().mockResolvedValue('Invalid JSON')
    })

    await run()

    // Ensure core.setFailed was called due to JSON parsing error
    expect(setFailedMock).toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected token')
    )
  })
})
