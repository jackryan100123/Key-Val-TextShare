pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv(installationName: 'SonarQube') {
          sh 'sonar-scanner'
        }
      }
    }

    stage('OWASP Dependency Check') {
      steps {
        dependencyCheck odcInstallation: 'DC-LATEST'
      }
    }

    stage('Build Docker') {
      steps {
        sh 'docker build -t key-text-app:latest .'
      }
    }

    stage('Run Application') {
      steps {
        sh 'docker stop key-text-app || true'
        sh 'docker rm key-text-app || true'
        sh 'docker run -d --name key-text-app -p 5000:5000 -v key-text-data:/app/data key-text-app:latest'
      }
    }
  }
}
