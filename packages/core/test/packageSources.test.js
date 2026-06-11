import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  trustedPublishers,
  isTrustedPublisher,
  githubCloneUrl,
  buildSourceOptions,
  formatSourceBadges,
} from '../bin/lib/packageSources.js'
import { resolveInstallPlan, sourceChoiceToGitUrl } from '../bin/lib/install.js'

describe('packageSources', () => {
  const settings = { githubOrgs: ['owdproject'], githubUser: 'dxlliv' }

  it('trustedPublishers merges orgs and user', () => {
    assert.deepEqual(trustedPublishers(['owdproject'], 'dxlliv'), ['owdproject', 'dxlliv'])
  })

  it('isTrustedPublisher accepts owdproject and github user', () => {
    assert.equal(isTrustedPublisher({ org: 'owdproject' }, settings), true)
    assert.equal(isTrustedPublisher({ org: 'dxlliv' }, settings), true)
    assert.equal(isTrustedPublisher({ org: 'evil-user' }, settings), false)
    assert.equal(isTrustedPublisher({ org: 'workspace' }, settings), true)
  })

  it('githubCloneUrl builds https and ssh URLs', () => {
    assert.equal(
      githubCloneUrl('owdproject', 'app-about', 'https'),
      'https://github.com/owdproject/app-about.git',
    )
    assert.equal(
      githubCloneUrl('owdproject', 'app-about', 'ssh'),
      'git@github.com:owdproject/app-about.git',
    )
  })

  it('buildSourceOptions includes npm and git when metadata available', () => {
    const metadata = {
      shortName: 'app-about',
      pkgName: '@owdproject/app-about',
      npm: { version: '^0.1.3' },
      github: {
        official: { owner: 'owdproject', htmlUrl: 'https://github.com/owdproject/app-about' },
        fork: { owner: 'dxlliv', exists: true, htmlUrl: 'https://github.com/dxlliv/app-about' },
      },
      local: false,
    }
    const options = buildSourceOptions(metadata, settings, { available: true })
    assert.ok(options.some((o) => o.id === 'npm'))
    assert.ok(options.some((o) => o.id === 'git-https-official'))
    assert.ok(options.some((o) => o.id === 'git-ssh-fork'))
  })

  it('buildSourceOptions omits ssh when unavailable', () => {
    const metadata = {
      shortName: 'app-about',
      pkgName: '@owdproject/app-about',
      npm: null,
      github: {
        official: { owner: 'owdproject', htmlUrl: 'https://github.com/owdproject/app-about' },
        fork: null,
      },
      local: false,
    }
    const options = buildSourceOptions(metadata, settings, { available: false })
    assert.ok(options.every((o) => o.protocol !== 'ssh'))
    assert.ok(options.some((o) => o.id === 'git-https-official'))
  })

  it('formatSourceBadges renders npm git local and untrusted markers', () => {
    const badges = formatSourceBadges({
      localSource: true,
      sourcesMeta: { npm: { version: '^1.0.0' } },
      htmlUrl: 'https://github.com/owdproject/app-x',
      trusted: false,
    })
    assert.match(badges, /l/)
    assert.match(badges, /n/)
    assert.match(badges, /g/)
    assert.match(badges, /!/)
  })
})

describe('resolveInstallPlan with sourceChoice', () => {
  it('returns npm plan for explicit npm choice', async () => {
    const plan = await resolveInstallPlan(
      '@owdproject/app-about',
      {},
      '/tmp/workspace',
      { type: 'npm' },
    )
    assert.equal(plan.mode, 'npm')
    assert.equal(plan.shortName, 'app-about')
  })

  it('returns workspace plan with ssh git URL', async () => {
    const plan = await resolveInstallPlan(
      '@owdproject/app-about',
      {},
      '/tmp/workspace',
      { type: 'git', protocol: 'ssh', owner: 'owdproject' },
    )
    assert.equal(plan.mode, 'workspace')
    assert.equal(plan.source.gitUrl, 'git@github.com:owdproject/app-about.git')
    assert.equal(
      sourceChoiceToGitUrl({ type: 'git', protocol: 'ssh', owner: 'owdproject' }, 'app-about'),
      'git@github.com:owdproject/app-about.git',
    )
  })
})
