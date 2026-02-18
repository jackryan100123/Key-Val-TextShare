# Jenkins Setup Guide (Linux)

End-to-end setup on Linux: install Jenkins and SonarQube, configure Jenkins for the pipeline, then run the job. Includes what secrets you must configure.

---

## Overview

1. Install Jenkins (Linux)
2. Install Docker and SonarQube (Linux)
3. Configure Jenkins (plugins, tools, **secrets**)
4. Create and run the pipeline job
5. Verify the app

---

## 1. Install Jenkins (Ubuntu/Debian)

```bash
# Add Jenkins repo and key
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt-get update
sudo apt-get install -y jenkins

# Start and enable
sudo systemctl start jenkins
sudo systemctl enable jenkins
sudo systemctl status jenkins
```

**Unlock Jenkins**

- Open: `http://<your-server-ip>:8080`
- Get initial admin password:
  ```bash
  sudo cat /var/lib/jenkins/secrets/initialAdminPassword
  ```
- Paste in browser → **Install suggested plugins** → Create admin user.

---

## 2. Install Docker and SonarQube

Jenkins will run `docker build` and `docker run`, so Docker must be on the same machine. SonarQube is used by the “SonarQube Analysis” stage.

### 2.1 Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

**Let Jenkins run Docker (required for pipeline):**

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### 2.2 Run SonarQube with Docker

```bash
# PostgreSQL for SonarQube
docker run -d --name sonarqube-db \
  -e POSTGRES_USER=sonar \
  -e POSTGRES_PASSWORD=sonar \
  -e POSTGRES_DB=sonar \
  postgres:13

# SonarQube
docker run -d --name sonarqube -p 9000:9000 \
  --link sonarqube-db:postgres \
  -e SONAR_JDBC_URL=jdbc:postgresql://postgres:5432/sonar \
  -e SONAR_JDBC_USERNAME=sonar \
  -e SONAR_JDBC_PASSWORD=sonar \
  sonarqube:lts-community
```

- Open: `http://<your-server-ip>:9000`
- Login: `admin` / `admin` (change password when asked).

---

## 3. Configure Jenkins

Do this in order: plugins → SonarQube server (with secret) → tools → no extra secrets for OWASP/Docker for this pipeline.

### 3.1 Install plugins

1. **Manage Jenkins** → **Manage Plugins** → **Available**
2. Install:
   - **Pipeline**
   - **SonarQube Scanner**
   - **OWASP Dependency-Check**
3. **Install without restart** (or restart if prompted).

### 3.2 Create SonarQube token (for Jenkins)

1. In SonarQube: **My Account** (top right) → **Security**
2. **Generate Tokens**: name = `jenkins`, type = **User Token**
3. **Generate** → **Copy the token** (you use it in the next step).

### 3.3 Add SonarQube server and secret in Jenkins

1. **Manage Jenkins** → **Configure System**
2. **SonarQube servers** → **Add SonarQube**
3. Set:
   - **Name:** `SonarQube` (must match the Jenkinsfile)
   - **Server URL:** `http://localhost:9000` (or `http://<sonarqube-host>:9000` if different host)
4. **Server authentication token:**
   - **Add** → **Jenkins**
   - **Kind:** **Secret text**
   - **Secret:** paste the SonarQube token from step 3.2
   - **ID:** e.g. `sonarqube-token`
   - **Add**, then choose this credential in the dropdown
5. **Save**

### 3.4 SonarQube Scanner tool

1. **Manage Jenkins** → **Global Tool Configuration**
2. **SonarQube Scanner** → **Add SonarQube Scanner**
3. **Name:** `SonarQube`
4. **Install automatically** → pick a version (e.g. latest)
5. **Save**

### 3.5 OWASP Dependency-Check tool

1. **Manage Jenkins** → **Global Tool Configuration**
2. **OWASP Dependency-Check** → **Add OWASP Dependency-Check**
3. **Name:** `DC-LATEST`
4. **Install automatically** → pick a version
5. **Save**

---

## 4. Secrets you must configure

For this pipeline you **must** configure:

| Where | What | When |
|-------|------|------|
| **Manage Jenkins → Configure System → SonarQube servers** | **SonarQube token** (Secret text) | Required. Used in “SonarQube Analysis” stage. Create token in SonarQube (My Account → Security), then add as Jenkins credential and select it in “Server authentication token”. |

Optional (only if your Git repo is private):

| Where | What | When |
|-------|------|------|
| **Job → Configure → Pipeline → SCM (Git)** | **Git credentials** (username/password or SSH key / token) | Only if the repository is private. Add under **Credentials** in the job’s Pipeline section. |

You do **not** need to configure any extra secrets for:

- OWASP Dependency-Check (no credentials in the pipeline)
- Docker (pipeline uses `sh 'docker ...'`; Jenkins user must be in `docker` group, no Jenkins credential)

---

## 5. Create and run the pipeline job

### 5.1 New pipeline job

1. **New Item**
2. Name: `key-text-app-pipeline`
3. **Pipeline** → **OK**

### 5.2 Pipeline from SCM

1. **Pipeline** section:
   - **Definition:** **Pipeline script from SCM**
   - **SCM:** **Git**
   - **Repository URL:** your repo (e.g. `https://github.com/youruser/Key-Text-Application.git`)
   - **Credentials:** leave empty for public repo; for private repo add the Git credential here
   - **Branch:** `*/main` (or `*/master`)
   - **Script Path:** `Jenkinsfile`
2. **Save**

### 5.3 Trigger (optional)

- **Build Triggers** → **Poll SCM** → `H/5 * * * *` to poll every 5 minutes.

### 5.4 Run the pipeline

1. **Build Now**
2. Open **Console Output** and follow:
   - Checkout
   - SonarQube Analysis (uses the SonarQube token you configured)
   - OWASP Dependency Check
   - Build Docker
   - Run Application

---

## 6. Verify end-to-end

```bash
# Container running
docker ps | grep key-text-app

# Image present
docker images | grep key-text-app

# App responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000
# Expect 200

# Or in browser
# http://<your-server-ip>:5000
```

- **Jenkins:** `http://<your-server-ip>:8080`
- **SonarQube:** `http://<your-server-ip>:9000` → **Projects** → `key-text-app`
- **App:** `http://<your-server-ip>:5000`

---

## 7. Troubleshooting

**SonarQube stage fails (connection / auth)**  
- SonarQube up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:9000`
- In Jenkins: **Manage Jenkins → Configure System → SonarQube** → correct URL and the **Secret text** token selected.

**Docker stage fails**  
- Docker: `docker run hello-world`
- Jenkins in docker group: `groups jenkins` should list `docker`
- Restart Jenkins after adding to group: `sudo systemctl restart jenkins`

**OWASP stage fails**  
- **Manage Jenkins → Global Tool Configuration** → **OWASP Dependency-Check** → name must be exactly `DC-LATEST`.

**Run Application fails**  
- Port free: `ss -tlnp | grep 5000`
- Remove old container: `docker stop key-text-app; docker rm key-text-app` then run the job again.

---

## Quick reference

| Item | Value |
|------|--------|
| SonarQube server name in Jenkins | `SonarQube` |
| SonarQube Scanner tool name | `SonarQube` |
| OWASP tool name | `DC-LATEST` |
| Pipeline script | `Jenkinsfile` (repo root) |
| App port | 5000 |

**Secrets:** Configure **only** the SonarQube token in Jenkins (and Git credentials if the repo is private).
