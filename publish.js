/*
    Manual publish script to publish stuff in a CI pipeline
    Should publish only packages that have changed - not packages dependent of those
*/
import { applyPlugins, plugins, parse, check } from 'parse-commit-message';
import gitCommitsSince from 'git-commits-since';
import detector from 'detect-next-version';

const REPO_NAME = 'test-repo'

const promise = getVersion();

/*
// List which packages have changed
const packagesToPublish = changedPackages()

// For each package
packagesToPublish.forEach(lernaPackage => {

    console.log('publishing package: ' + lernaPackage.name)
    // Fetch old version from consul
    const currentVersion = getVersionFromConsul(REPO_NAME, lernaPackage.name)

    // Decide new version

    // Publish with new version

    // Update Consul with new version
    setVersionInConsul(REPO_NAME, lernaPackage.name, newVersion)
})

 */

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
    return undefined;
}

async function getVersion() {
    const { rawCommits } = await gitCommitsSince({ cwd: 'https://github.com/boeriksson/conventionalCommits.git' });
    const commits = applyPlugins(plugins, check(parse(rawCommits)));
    const cwd = process.cwd();
    const packages = ['@my-scope/usage', '@my-scope/beta'];

    // detect-next-version, also can accept rawCommits (array of strings) directly,
    // but that is that way just for demo purposes.
    const result = await detector(commits, { packages, cwd });

    console.log(result);
    console.log(result.pkg);
    console.log(result.patch);
    console.log(result.increment); // => 'patch'
    console.log(result.isBreaking); // => false
    console.log(result.lastVersion); // => 0.1.0
    console.log(result.nextVersion); // => 0.1.1
}
