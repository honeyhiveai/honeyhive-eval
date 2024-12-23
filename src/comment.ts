// This code is partially derived from https://github.com/int128/comment-action/blob/main/src/comment.ts

import * as core from '@actions/core'
import * as github from '@actions/github'

type Octokit = ReturnType<typeof github.getOctokit>

type PullRequest = {
  owner: string
  repo: string
  issue_number: number
}

export async function upsertComment(text: string) {
  const githubToken = core.getInput('github_token')
  const octokit = github.getOctokit(githubToken)

  const prs = await inferPullRequestsFromContext(octokit)

  await Promise.all(prs.map(pr => createOrUpdateComment(octokit, pr, text)))
}

const createOrUpdateComment = async (
  octokit: Octokit,
  pullRequest: PullRequest,
  body: string
) => {
  const stepKey = core.getInput('step_key', { required: true })
  const commentKey = `<!-- braintrust_bot_comment ${stepKey} -->`
  const comment = await findComment(octokit, pullRequest, commentKey)
  if (!comment) {
    await octokit.rest.issues.createComment({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      issue_number: pullRequest.issue_number,
      body: `${body}\n${commentKey}`
    })
    return
  }

  const { data: updated } = await octokit.rest.issues.updateComment({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    comment_id: comment.id,
    body: `${body}\n${commentKey}`
  })
  core.info(`Updated the comment ${updated.html_url}`)
}

type Comment = {
  id: number
  body: string
  html_url: string
}

const findComment = async (
  octokit: Octokit,
  pullRequest: PullRequest,
  key: string
): Promise<Comment | undefined> => {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    issue_number: pullRequest.issue_number,
    sort: 'created',
    direction: 'desc',
    per_page: 100
  })
  core.debug(
    `Found ${comments.length} comment(s) of #${pullRequest.issue_number}`
  )
  for (const comment of comments) {
    if (comment.body?.includes(key)) {
      return { ...comment, body: comment.body }
    }
  }
}

const inferPullRequestsFromContext = async (
  octokit: Octokit
): Promise<PullRequest[]> => {
  const { context } = github
  if (Number.isSafeInteger(context.issue.number)) {
    core.debug(`Use #${context.issue.number} from the current context`)
    return [
      {
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number
      }
    ]
  }

  core.debug(`List pull requests associated with sha ${context.sha}`)
  const pulls = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    commit_sha: context.sha
  })
  for (const pull of pulls.data) {
    core.debug(`  #${pull.number}: ${pull.title}`)
  }
  return pulls.data.map(p => ({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: p.number
  }))
}
