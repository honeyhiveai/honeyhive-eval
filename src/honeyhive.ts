import path from 'path'
import * as core from '@actions/core'
import { exec as execSync } from 'child_process'

// import upsertcomment
import { upsertComment } from './comment'
import { Params } from './main'

export interface ExperimentFailure {
  evaluatorName: string
  errors: string[]
}

function snakeToCamelCase(str: string) {
  return str.replace(/([-_][a-z])/g, group => group.charAt(1).toUpperCase())
}

async function runCommand(command: string, onSummary: any) {
  return new Promise((resolve, reject) => {
    const process = execSync(command)

    process.stdout?.on('data', async (text: string) => {
      await onSummary(text)
      //   onSummary(
      //     text
      //       .split("\n")
      //       .map(line => line.trim())
      //       .filter(line => line.length > 0)
      //       .flatMap(line => {
      //         try {
      //           const parsedLine = JSON.parse(line);
      //           const camelCaseLine = Object.fromEntries(
      //             Object.entries(parsedLine).map(([key, value]) => [
      //               snakeToCamelCase(key),
      //               value,
      //             ]),
      //           );
      //           // TODO: This is hacky and we should be parsing what comes off the wire
      //           return [camelCaseLine as unknown];
      //         } catch (e) {
      //           core.error(`Failed to parse jsonl data: ${e}`);
      //           return [];
      //         }
      //       }),
      //   );
    })

    process.stderr?.on('data', data => {
      core.info(data) // Outputs the stderr of the command
    })

    process.on('close', code => {
      if (code === 0) {
        resolve(null)
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
  })
}

export async function runEval(args: Params) {
  const paths = ''

  // Add the API key to the environment
  core.exportVariable('HH_API_KEY', args.apiKey)
  core.exportVariable('HH_PROJECT', args.project)

  if (!process.env.OPENAI_API_KEY) {
    core.exportVariable('OPENAI_API_KEY', args.openaiApiKey)
  }

  // Change working directory
  process.chdir(path.resolve(args.root))

  let command: string
  switch (args.runtime) {
    case 'node':
      command = `npx honeyhive eval ${paths}`
      break
    case 'python':
      command = `honeyhive eval ${paths}`
      break
    default:
      throw new Error(`Unsupported runtime: ${args.runtime}`)
  }
  await runCommand(command, upsertComment)
}
