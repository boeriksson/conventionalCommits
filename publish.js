/*
    Manual publish script to publish stuff in a CI pipeline
    Should publish only packages that have changed - not packages dependent of those
*/
import {parseCommit} from 'parse-commit-message'
import gitCommitsSince from 'git-commits-since'

const REPO_NAME = 'test-repo'

function getNewVersion(currentVersion, type) {
    if (!currentVersion) return '1.0.0'

    if (!currentVersion.match(/\d+.\d+.\d+$/)) {
        throw new Error(`current version is in an invalid format: ${currentVersion}`)
    }
    const [major, minor, patch] = currentVersion.split('.')
    return {
        'fix': () => `${major}.${minor}.${Number(patch) + 1}`,
        'feat': () => `${major}.${Number(minor) + 1}.${0}`,
        'BREAKING_CHANGE': () => `${Number(major) + 1}.${0}.${0}`
    }[type]()
}

function osCommand(cmd) {
    console.log('osCommand: ', cmd)
    const {execSync} = require('child_process')
    let output

    try {
        output = execSync(cmd)
    } catch (error) {
        console.info(`os command ${cmd} failed`)
        process.exit(0)
    }
    return output
}

function getGitTags() {
    const output = osCommand('git tag')
    const tagArray = output.toString('utf-8').split("\n")
    if (tagArray.length > 1) {
        tagArray.pop()
        return tagArray.reverse()
    }
    return []
}

function getRepoVersionFromGit() {
    let version = '1.0.0'
    const tags = getGitTags()
    tags.some((tag) => {
        if (tag.match(/^v\d+.\d+.\d+$/)) {
            version = tag.substring(1)
            return true
        }
        return false
    })
    return version
}

function publishPackage(lernaPackage, newVersion) {
    osCommand(`yarn publish ${lernaPackage.location} --new-version "${newVersion}" --no-git-tag-version`)
}

function changedPackages() {
    const output = osCommand(`npx lerna ls --since --exclude-dependents --json`)
    return JSON.parse(output.toString())
}

function getVersionFromConsul(repo, name) {
    return '14.0.0';
}

function setVersionInConsul(REPO_NAME, name, newVersion) {
    return true
}

async function getCommitType() {
    const {rawCommits} = await gitCommitsSince({cwd: '.'});
    const lastCommit = rawCommits[0];
    if (!lastCommit.match(/^(fix|feat):.*/)) {
        throw new Error(`Last commit message do not follow the Conventional Commit convention of starting with "fix:" or "feat:"! Last commit message: ${lastCommit}`)
    }

    const commitObj = parseCommit(lastCommit)
    const {header: {type}} = commitObj;
    return type;
}

function tagGitRepoWithNewVersion(type) {
    const gitRepoVersion = getRepoVersionFromGit()
    const newGitRepoVersion = getNewVersion(gitRepoVersion, type)
    console.log(`Updating repo version from ${gitRepoVersion} to ${newGitRepoVersion}`)
    osCommand(`git tag -a "v${newGitRepoVersion}" -m "new version"`)
    osCommand(`git push origin "v${newGitRepoVersion}"`)
}

getCommitType()
    .then((type) => {
        // List which packages have changed
        const packagesToPublish = changedPackages()
        packagesToPublish.forEach(lernaPackage => {

            // Fetch old version from consul
            const currentVersion = getVersionFromConsul(REPO_NAME, lernaPackage.name)

            // Decide new version
            const newVersion = getNewVersion(currentVersion, type)
            console.log('versionChange: %o -> %o ', currentVersion, newVersion)

            // Publish with new version
            publishPackage(lernaPackage, newVersion);

            // Update Consul with new version
            setVersionInConsul(REPO_NAME, lernaPackage.name, newVersion)
        })

        tagGitRepoWithNewVersion(type)
    })
    .catch((error) => {
            console.log(error)
        }
    )