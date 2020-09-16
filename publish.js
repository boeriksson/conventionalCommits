/*
    Manual publish script to publish stuff in a CI pipeline
    Should publish only packages that have changed - not packages dependent of those
*/
import {parseCommit} from 'parse-commit-message';
import gitCommitsSince from 'git-commits-since';
import detector from 'detect-next-version';

const REPO_NAME = 'test-repo'

function getNewVersion(currentVersion, type) {
    if (!currentVersion) return '1.0.0'

    if (!currentVersion.match(/\d+.\d+.\d+$/)) {
        throw new Error(`current version is in an invalid format: ${currentVersion}`)
    }
    const [major, minor, patch] = currentVersion.split('.')
    console.log('major: %o, minor: %o, patch: %o', major, minor, patch)
    return {
        'fix': () => `${major}.${minor}.${Number(patch) + 1}`,
        'feat': () => `${major}.${Number(minor) + 1}.${0}`,
        'BREAKING_CHANGE': () => `${Number(major) + 1}.${0}.${0}`
    }[type]()
}

function setVersionInConsul(REPO_NAME, name, newVersion) {
    return true
}

function publishPackage(lernaPackage, newVersion) {
    const {execSync} = require('child_process')

    let output

    try {
        output = execSync(`yarn publish ${lernaPackage.location} --new-version "${newVersion}"`)
    } catch (error) {
        console.info(`Yarn publish failed!`)
        process.exit(0)
    }
    console.log('output: ', output)

    return JSON.parse(output.toString())
}


async function getCommitType() {
    const {rawCommits} = await gitCommitsSince({cwd: '.'});
    console.log('gitcommitssince rawCommits: ', rawCommits)
    const lastCommit = rawCommits[0];
    if (!lastCommit.match(/^(fix|feat):.*/)) {
        throw new Error(`Last commit message do not follow the Conventional Commit convention of starting with "fix:" or "feat:"! Last commit message: ${lastCommit}`)
    }

    const commitObj = parseCommit(lastCommit)

    console.log('commitObj: ', commitObj)
    const {header: {type}} = commitObj;
    return type;
}

getCommitType()
    .then((type) => {
        console.log('type: ', type)

        // List which packages have changed
        const packagesToPublish = changedPackages()
        packagesToPublish.forEach(lernaPackage => {
            console.log('publishing package: ' + JSON.stringify(lernaPackage))

            // Fetch old version from consul
            const currentVersion = getVersionFromConsul(REPO_NAME, lernaPackage.name)
            console.log('currentVersion: ', currentVersion)

            // Decide new version
            const newVersion = getNewVersion(currentVersion, type)
            console.log('versionChange: %o -> %o ', currentVersion, newVersion)

            // Publish with new version
            //publishPackage(lernaPackage, newVersion);

            // Update Consul with new version
            //setVersionInConsul(REPO_NAME, lernaPackage.name, newVersion)
        })
    })
    .catch((error) => {
        console.log(error)
    })

function changedPackages() {
    const {execSync} = require('child_process')

    let output

    try {
        output = execSync(`npx lerna ls --since --exclude-dependents --json`)
    } catch (error) {
        console.info(`No local packages have changed since the last tagged releases.`)
        process.exit(0)
    }
    console.log('output: ', output)

    return JSON.parse(output.toString())

}

function getVersionFromConsul(repo, name) {
    return '1.0.0';
}

