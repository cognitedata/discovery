static final String PR_COMMENT_MARKER = "[pr-server]\n"
podTemplate(
    label: 'discovery',
    containers: [containerTemplate(name: 'jnlp',
                                   image: 'eu.gcr.io/cognitedata/build-client-docker:9cfb7a6',
                                   args: '${computer.jnlpmac} ${computer.name}',
                                   resourceRequestCpu: '500m',
                                   resourceRequestMemory: '500Mi',
                                   resourceLimitCpu: '500m',
                                   resourceLimitMemory: '500Mi'),
                 containerTemplate(name: 'node',
                                   image: 'node:carbon',
                                   envVars: [
                                       envVar(key: 'CI', value: 'true'),
                                       envVar(key: 'NODE_PATH', value: 'src/'),
                                       secretEnvVar(
                                            key: 'PR_CLIENT_ID',
                                            secretName: 'pr-server-api-tokens',
                                            secretKey: 'client_id'
                                        ),
                                        secretEnvVar(
                                            key: 'PR_CLIENT_SECRET',
                                            secretName: 'pr-server-api-tokens',
                                            secretKey: 'client_secret'
                                        ),
                                    ],
                                   resourceRequestCpu: '2000m',
                                   resourceRequestMemory: '2500Mi',
                                   resourceLimitCpu: '2000m',
                                   resourceLimitMemory: '2500Mi',
                                   ttyEnabled: true),
    ],
    envVars: [
        envVar(key: 'CHANGE_ID', value: env.CHANGE_ID)
    ],
    volumes: [secretVolume(secretName: 'jenkins-docker-builder',
                           mountPath: '/jenkins-docker-builder',
                           readOnly: true),
              secretVolume(secretName: 'npm-credentials',
                           mountPath: '/npm-credentials',
                           readOnly: true),
              hostPathVolume(hostPath: '/var/run/docker.sock', mountPath: '/var/run/docker.sock')]) {
   properties([buildDiscarder(logRotator(daysToKeepStr: '30', numToKeepStr: '20'))])
   node('discovery') {
        container('jnlp') {
            def gitCommit
            stage("Checkout code") {
                checkout(scm)
                gitCommit = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
            }
        }
        container('node') {
            stage('Install dependencies') {
                sh('cp /npm-credentials/npm-public-credentials.txt ~/.npmrc')
                sh('echo always-auth=true >> ~/.npmrc')
                sh('yarn')
            }
            stage('Build') {
              sh('yarn build')
            }
            stage('Autodeploy') {
                sh('yarn autodeploy')
            }
            // If the autodeploy dropped a pr.md file, then it should be posted
            // as a comment on GitHub.
            if (fileExists('pr.md')) {
                stage('Comment on GitHub (PR Server)') {
                    markdown = readFile('pr.md')
                    pullRequest.comment("${PR_COMMENT_MARKER}${markdown}")
                }
            }
            // If the autodeploy dropped a comment.md file, then it should be posted
            // as a comment on GitHub.
            if (fileExists('comment.md')) {
                stage('Comment on GitHub') {
                    markdown = readFile('comment.md')
                    pullRequest.comment("${PR_COMMENT_MARKER}${markdown}")
                }
            }
        }
    }
}