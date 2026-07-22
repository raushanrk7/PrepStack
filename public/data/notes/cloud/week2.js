// Cloud & DevOps — Week 3: Docker & Kubernetes.
(function () {
  window.PrepStackRegister.notes("cloud", 2, {
    concepts: `# Containers: Docker & Kubernetes

## Docker
**TL;DR:** Package app + dependencies into an immutable image; run it anywhere as an isolated process.

### Containers vs VMs
- VM: full guest OS per instance, minutes to boot, GBs.
- Container: shares host kernel, isolated via namespaces + cgroups, milliseconds to start, MBs. Not a security boundary as strong as a VM.

### Images & layers
- An image = stack of read-only layers; each Dockerfile instruction creates one. Layers are cached and shared between images.
- **Order matters for cache**: put rarely-changing steps (install deps) before frequently-changing ones (copy source).

\`\`\`
FROM node:20-slim            # base layer
WORKDIR /app
COPY package*.json ./        # deps manifest first…
RUN npm ci --omit=dev        # …so this layer caches until deps change
COPY . .                     # source changes don't bust the npm layer
USER node                    # don't run as root
CMD ["node", "server.js"]
\`\`\`

### Best practices interviewers listen for
- Small base images (slim/alpine/distroless), multi-stage builds (build stage → copy artifact into tiny runtime stage), .dockerignore, one process per container, non-root user, pin versions.

### Networking & data
- Containers on the same user-defined bridge network reach each other by name.
- **Volumes** persist data beyond container lifetime; bind mounts map host dirs (dev only).
- **docker compose**: declare multi-container dev stacks (app + db + cache) in one YAML.

## Kubernetes
**TL;DR:** Declarative orchestration: you state desired state (5 replicas, this image); controllers reconcile reality toward it.

### Core objects
- **Pod**: smallest unit — one or more containers sharing network/storage. Ephemeral; never create bare pods in prod.
- **Deployment**: manages ReplicaSets → pods; handles rolling updates & rollback.
- **Service**: stable virtual IP/DNS in front of ephemeral pods. Types: ClusterIP (internal), NodePort, LoadBalancer (cloud LB).
- **Ingress**: L7 routing (host/path → service) through one entry point; needs an ingress controller (nginx, ALB).

### Config & health
- **ConfigMap** (non-secret config) and **Secret** (base64, mount or env) decouple config from images — 12-factor.
- **Liveness probe**: restart the container if it hangs. **Readiness probe**: remove from Service endpoints until ready — this is what makes rolling deploys zero-downtime.
- **Requests/limits**: requests drive scheduling; limits cap usage. **HPA** scales replicas on CPU/memory/custom metrics.

### Rolling update flow (zero downtime)
\`\`\`
Deployment image: v2
  → new ReplicaSet scales up 1 pod
  → readiness probe passes → pod added to Service
  → old pod drained & terminated
  → repeat until all replaced (maxSurge / maxUnavailable control pace)
Rollback: kubectl rollout undo deployment/app
\`\`\`

### Architecture (know the words)
- **Control plane**: API server (front door), etcd (state store), scheduler (places pods), controller manager (reconciliation loops).
- **Nodes**: kubelet (runs pods), kube-proxy (service routing), container runtime.

## Managed offerings
- **ECS**: AWS-proprietary, simpler than k8s; **Fargate** = serverless containers (no nodes to manage) for ECS/EKS.
- **EKS / AKS / GKE**: managed Kubernetes control planes — you still own node config, upgrades, add-ons.
- Choose ECS/Fargate for simplicity on AWS-only; k8s for portability, ecosystem, and complex workloads.
`,
    qa: [
      { q: "Container vs VM?", a: "Container shares the host kernel (namespaces+cgroups): ms startup, MB footprint, weaker isolation. VM virtualizes hardware with its own OS: minutes, GBs, stronger isolation. Containers for density/speed; VMs for hard multi-tenancy." },
      { q: "Why copy package.json before source in a Dockerfile?", a: "Layer caching: the npm-install layer is rebuilt only when the dependency manifest changes, not on every source edit. Cuts CI build time dramatically." },
      { q: "What is a multi-stage build?", a: "Build in a heavy image (compilers, dev deps), then COPY --from only the artifact into a minimal runtime image. Result: small attack surface + image size, no build tools shipped to prod." },
      { q: "Pod vs Deployment vs Service?", a: "Pod: running container(s), ephemeral. Deployment: keeps N pod replicas alive, handles rolling updates/rollbacks. Service: stable DNS/IP that load-balances across the current healthy pods." },
      { q: "Liveness vs readiness probe?", a: "Liveness: 'is it alive?' — fail restarts the container. Readiness: 'can it serve?' — fail removes it from Service endpoints without restarting. Readiness gates zero-downtime rollouts; confusing them causes restart loops or dropped traffic." },
      { q: "How does a rolling update achieve zero downtime?", a: "New ReplicaSet scales up while old scales down; a new pod only receives traffic after readiness passes; maxSurge/maxUnavailable bound the pace; rollback = revert to previous ReplicaSet. Requires the app to run 2 versions side by side briefly." },
      { q: "What are requests and limits?", a: "Request = guaranteed resources used for scheduling decisions; limit = hard cap (CPU throttled, memory OOM-killed). Setting requests ≪ usage causes noisy-neighbor evictions; no limits risks one pod starving the node." },
      { q: "ECS vs EKS — how do you choose?", a: "ECS: simpler, AWS-native, less to operate (esp. with Fargate) — great for AWS-only teams. EKS: real Kubernetes — portability, huge ecosystem (helm, operators), but more operational surface. Default to the simplest thing that meets needs." }
    ],
    mock: { easy: [], medium: [
      { q: "Containerize a Node.js API and deploy it on Kubernetes with zero-downtime releases. Walk through everything.", a: "Multi-stage Dockerfile (deps→runtime slim, non-root), push to registry with immutable tag. Deployment (3 replicas, requests/limits, readiness /healthz + liveness), ClusterIP Service, Ingress for TLS/host routing, ConfigMap+Secret for config, HPA on CPU. Release = update image tag → rolling update; rollback = rollout undo." },
      { q: "A pod is CrashLoopBackOff. Debug it.", a: "kubectl describe pod (events: OOMKilled? image pull? probe failures) → kubectl logs --previous (crash output) → check liveness probe too aggressive, missing config/secret, or memory limit too low. Reproduce locally with docker run. Fix cause, not the probe." },
      { q: "Your team of 4 wants containers on AWS with minimal ops. Recommend a platform and justify.", a: "ECS on Fargate: no nodes, no control plane, per-task billing, ALB integration, IAM-native. Kubernetes (EKS) adds cluster upgrades, node pools, add-on management — unjustified ops for 4 people unless they need k8s portability or its ecosystem. Revisit at scale." }
    ], hard: [] }
  });
})();
