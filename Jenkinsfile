static final String PR_COMMENT_MARKER = "[pr-server]\n"
podTemplate(
    label: 'discovery',
    containers: [
      containerTemplate(
        name: 'node',
        image: 'node:carbon',
        envVars: [
          envVar(key: 'CI', value: 'true'),
          envVar(key: 'NODE_PATH', value: 'src/'),
        ],
        resourceRequestCpu: '4000m',
        resourceRequestMemory: '4500Mi',
        resourceLimitCpu: '4000m',
        resourceLimitMemory: '4500Mi',
        ttyEnabled: true
      )
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
              secretVolume(secretName: 'preview-cli-jenkins-google-credentials',
                           mountPath: '/secrets/google-credentials',
                           readOnly: true),
              hostPathVolume(hostPath: '/var/run/docker.sock', mountPath: '/var/run/docker.sock')]) {
    properties([buildDiscarder(logRotator(daysToKeepStr: '30', numToKeepStr: '20'))])
    node('discovery') {
        def gitCommit
        stage("Checkout code") {
          checkout(scm)
          gitCommit = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
        }
        container('node') {
            if (env.CHANGE_ID) {
              stage('Remove GitHub comments') {
                pullRequest.comments.each({
                  if (it.user == "cognite-cicd" && it.body.startsWith(PR_COMMENT_MARKER)) {
                    pullRequest.deleteComment(it.id)
                  }
                })
              }
            }
            stage('Install dependencies') {
              sh('cp /npm-credentials/npm-public-credentials.txt ~/.npmrc')
              sh('yarn')
            }
            stage('Build and deploy PR') {
              sh('yarn build')
              sh('yarn global add @cognite/preview-cli')
              sh("GOOGLE_APPLICATION_CREDENTIALS=/secrets/google-credentials/key.json preview upload build admin/pr-${env.CHANGE_ID}")
            }
            stage('Comment on GitHub') {
              if (env.CHANGE_ID) {
                url = "https://pr-${env.CHANGE_ID}.discovery.preview.cogniteapp.com"
                pullRequest.comment("${PR_COMMENT_MARKER}View this change on [PR Server](${url})")
              }
            }
        }
    }
}