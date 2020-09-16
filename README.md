#Publish

Publish will be performed by the CI pipeline by executing: 

yarn run publishAll 

This will: 

1. Fetch the last commit message.
1. Abort if commit message is not in an appropriate format according to conventional commits.
1. Parse the commit message.
1. Use lerna to check if any packages has changed since the last tagged version! (Tagging is done at the end of the publish script, after a successful publish).
1. For each UPDATED package: 
    1. Fetch the current version of the package from Consul - if no previous package has been published, version is set to 1.0.0.
    1. Decide the new semantic version based on the parsed commit message.
    1. Publish the package with yarn publish.
    1. Set the new version in Consul.
1. Tag the last published version in git.   

