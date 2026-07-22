// Cloud & DevOps — Week 4: CI/CD, Jenkins, IaC & Observability.
(function () {
  window.PrepStackRegister.notes("cloud", 3, {
    concepts: `# CI/CD: Jenkins, Actions, IaC & Observability

## CI/CD concepts
**TL;DR:** Automate the path from commit to production so releases are boring.

- **CI (Continuous Integration)**: every push → build + tests automatically. Catches integration breakage in minutes, not at release time.
- **CD — Continuous Delivery**: every green build is *deployable* (one manual click). **Continuous Deployment**: green builds ship to prod automatically.
- **Pipeline stages**: checkout → build → unit tests → static analysis → package (Docker image) → deploy to staging → integration/e2e tests → gate → prod.
- **Environments**: dev → staging (prod-like) → prod, with promotion gates. Same artifact promoted through all — never rebuild per environment.

## Jenkins
**TL;DR:** The self-hosted automation server; pipelines as code in a Jenkinsfile.

### Architecture
- **Controller** (schedules, UI) + **agents** (run jobs — VMs, containers, k8s pods). Never run builds on the controller.
- Plugins provide everything (git, docker, credentials, slack) — also Jenkins's maintenance burden.

### Declarative Jenkinsfile
\`\`\`groovy
pipeline {
  agent { docker { image 'node:20' } }
  stages {
    stage('Build') { steps { sh 'npm ci' } }
    stage('Test')  { steps { sh 'npm test' } }
    stage('Image') { steps { sh 'docker build -t app:\${GIT_COMMIT} .' } }
    stage('Deploy') {
      when { branch 'main' }
      steps { sh './deploy.sh staging' }
    }
  }
  post { failure { slackSend channel: '#ci', message: "Build failed" } }
}
\`\`\`
- Credentials in the Jenkins credentials store, injected as env vars — never hardcoded.
- Webhooks (GitHub → Jenkins) trigger on push; avoid polling.

## GitHub Actions (and how it compares)
- Workflow YAML in .github/workflows/; jobs run on GitHub-hosted or self-hosted runners; marketplace of reusable actions; secrets per repo/org.
- **Actions vs Jenkins**: Actions = zero-maintenance, tight GitHub integration, pay-per-minute. Jenkins = self-hosted control, any SCM, plugin flexibility, but you patch/scale it. GitLab CI similar to Actions but built into GitLab.

## Deployment strategies
- **Rolling**: replace instances gradually (k8s default). Cheap; both versions live briefly.
- **Blue-green**: two full environments; flip the router. Instant rollback (flip back); doubles infra during deploy.
- **Canary**: send 1→5→25→100% of traffic to the new version, watching error/latency metrics; auto-rollback on regression. Safest, most tooling required.
- Decouple deploy from release with **feature flags**.

## Infrastructure as Code
**TL;DR:** Infra defined in versioned files; changes go through review, apply is reproducible.

### Terraform
- Declarative HCL; provider plugins for AWS/Azure/GCP — one language for all clouds.
- **State file** maps config→real resources. Team setup: remote state (S3 + DynamoDB lock) — never commit state to git (contains secrets, race conditions).
- Workflow: terraform plan (diff, review it in PR) → apply. **Modules** package reusable infra (a "vpc" module used by all envs).
- vs **CloudFormation/Bicep**: cloud-native, no state to manage, but single-cloud and more verbose.

## Monitoring & observability
- **Three pillars**: metrics (numeric time series), logs (events), traces (request path across services).
- **CloudWatch**: AWS-native metrics/logs/alarms. **Prometheus**: pull-based metrics scraping + PromQL; **Grafana** dashboards on top; **Alertmanager** for paging.
- Alert on **symptoms** (error rate, p99 latency — what users feel), not causes (CPU%). Define SLOs; page only when the SLO is threatened. Everything else is a dashboard, not a page.
- Structured logs (JSON) with a correlation/request ID → grep one request across services.
`,
    qa: [
      { q: "Continuous delivery vs continuous deployment?", a: "Delivery: every green build CAN ship — a human clicks. Deployment: it DOES ship automatically. The difference is one manual gate before prod." },
      { q: "Why promote the same artifact instead of rebuilding per environment?", a: "A rebuild can differ (new transitive deps, different flags) — you'd test one binary and ship another. Build once, tag immutably, promote that exact image through staging→prod." },
      { q: "What is a Jenkinsfile and why keep it in the repo?", a: "Pipeline-as-code (declarative Groovy). In-repo: versioned with the app, reviewed in PRs, branches can evolve their own pipeline, and a new Jenkins can rebuild jobs from source." },
      { q: "Blue-green vs canary?", a: "Blue-green: two full stacks, instant flip + instant rollback, but 2x infra and all-or-nothing exposure. Canary: gradual % shift with metric gates — limits blast radius, needs traffic-splitting + automated analysis." },
      { q: "Why is Terraform state a big deal?", a: "State is the source of truth mapping config to real resource IDs. Lose it → Terraform wants to recreate everything; two engineers applying concurrently → corruption. Hence remote state (S3) + locking (DynamoDB) + no state in git." },
      { q: "terraform plan vs apply?", a: "plan computes the diff (create/change/destroy) without touching anything — review it like a code diff, in PRs. apply executes the plan. Culture: nobody applies what wasn't planned and reviewed." },
      { q: "Metrics vs logs vs traces?", a: "Metrics: cheap aggregates for dashboards/alerts (p99, error rate). Logs: detailed per-event records for forensics. Traces: one request's journey across services with per-hop latency — finds the slow service. You need all three." },
      { q: "What should page an on-call engineer at 3am?", a: "Symptom-based, SLO-threatening alerts only: user-facing error rate, p99 latency breach, service down. CPU high or disk 70% are dashboard/ticket material. Paging on causes creates alert fatigue and missed real incidents." }
    ],
    mock: { easy: [], medium: [
      { q: "Design a full CI/CD pipeline for a containerized web app, commit to production.", a: "PR: lint+unit tests required to merge. Merge to main → build image tagged with SHA → push registry → deploy staging (k8s rolling) → automated integration tests → manual gate (or auto) → canary 5%→100% in prod with error-rate gates → auto-rollback on regression. Secrets from vault, pipeline-as-code in repo, notifications to Slack." },
      { q: "Jenkins vs GitHub Actions for a 10-person startup on GitHub — recommend.", a: "Actions: zero servers to maintain, native GitHub triggers/secrets, marketplace, free tier likely sufficient. Jenkins only if: self-hosted compliance need, non-GitHub SCM, or heavy custom plugin workflows. A startup's scarcest resource is ops attention — don't spend it babysitting Jenkins." },
      { q: "Prod latency spiked after a deploy but staging was clean. What do you do and what was missing?", a: "Now: rollback first (rollout undo / flip blue-green), investigate after. Missing: canary with automated metric analysis would have caught it at 5% traffic; staging lacked prod-like data volume/traffic; add p99 latency to deploy gates and load tests with realistic data." }
    ], hard: [] }
  });
})();
