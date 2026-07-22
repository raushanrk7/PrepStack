// Cloud & DevOps — Week 1: Cloud Fundamentals & AWS Core.
(function () {
  window.PrepStackRegister.notes("cloud", 0, {
    concepts: `# Cloud Fundamentals & AWS Core

## What is "the cloud"?
**TL;DR:** Renting compute/storage/network on demand, paying per use, instead of owning servers.

### Service models
- **IaaS** (EC2, Azure VMs): you get raw VMs — you manage OS, runtime, app.
- **PaaS** (Elastic Beanstalk, Azure App Service, Render): you push code — platform manages OS/runtime/scaling.
- **SaaS** (Gmail, Salesforce): you just use the software.
Rule of thumb: the further right (IaaS→SaaS), the less control and the less ops burden.

### Global infrastructure
- **Region**: a geographic cluster of data centers (e.g. ap-south-1 = Mumbai).
- **Availability Zone (AZ)**: an isolated data center within a region. Deploy across ≥2 AZs for HA — an AZ failure shouldn't kill you.
- **Edge locations**: CDN points of presence (CloudFront) — far more numerous than regions.

## EC2 — Elastic Compute Cloud
**TL;DR:** VMs on demand. The building block of IaaS.

### Key concepts
- **Instance types**: family + size, e.g. t3.micro (burstable), m5 (general), c5 (compute), r5 (memory). Interview: pick family by workload profile.
- **AMI** (Amazon Machine Image): the template (OS + preinstalled software) an instance boots from. Bake AMIs for fast, repeatable scaling.
- **Security group**: stateful virtual firewall at the instance level. Default: all inbound denied, all outbound allowed. Stateful = response traffic auto-allowed.
- **Key pair**: SSH public/private key for login. AWS stores public key only.
- **Instance metadata service** (169.254.169.254): how an instance learns its role credentials — also a classic SSRF target (use IMDSv2).

### Pricing models
- On-demand (default) > Reserved (1/3-yr commit, ~40-60% off) > Spot (spare capacity, ~90% off, can be reclaimed with 2-min notice — great for batch/CI).

## S3 — Simple Storage Service
**TL;DR:** Infinitely scalable object storage. Objects (up to 5TB) in flat buckets, addressed by key.

### Essentials
- **Not a filesystem**: no real directories (prefixes simulate them), no partial updates — you replace whole objects.
- **Durability 11 nines** (99.999999999%) — data replicated across ≥3 AZs. Availability is a separate, lower number.
- **Storage classes**: Standard → Infrequent Access → Glacier (archival, retrieval takes minutes-hours). Lifecycle rules auto-transition old objects.
- **Presigned URLs**: time-limited signed links letting clients upload/download directly to S3 — keeps large files off your servers. Standard interview pattern for file upload design.
- **Versioning + bucket policies + block-public-access** for safety.
- **Consistency**: S3 is now strongly consistent (read-after-write) — older material says eventual; know both.

## IAM — Identity & Access Management
**TL;DR:** Who (principal) can do what (action) on which resource, under what conditions.

### Model
- **User**: a person/long-lived credential. **Group**: users bundle. **Role**: an identity *assumed* temporarily — by EC2 instances, Lambdas, or humans. Prefer roles over keys.
- **Policy** (JSON): Effect (Allow/Deny) + Action (s3:GetObject) + Resource (ARN) + Condition. Explicit Deny always wins.
- **Least privilege**: grant the minimum actions on the minimum resources. Interview: never put access keys in code — attach a role.

## VPC — Virtual Private Cloud
**TL;DR:** Your private, software-defined network inside AWS.

### Layout (classic 3-tier)
- VPC = a CIDR block, e.g. 10.0.0.0/16.
- **Public subnet** (has route to Internet Gateway): load balancers, bastion.
- **Private subnet**: app servers — reach the internet outbound only via **NAT Gateway**.
- **DB subnet**: no internet route at all.
- **Route tables** decide where traffic goes; **NACLs** (stateless, subnet-level) vs **security groups** (stateful, instance-level).

\`\`\`
Internet → IGW → [public subnet: ALB] → [private subnet: app EC2s] → [db subnet: RDS]
                        ↑ NAT GW gives app servers outbound-only internet
\`\`\`
`,
    qa: [
      { q: "IaaS vs PaaS vs SaaS — one example each?", a: "IaaS: raw VMs, you manage OS+app (EC2). PaaS: push code, platform runs it (Beanstalk/Render). SaaS: finished software (Gmail). Control decreases, convenience increases left→right." },
      { q: "Region vs Availability Zone?", a: "Region = geographic area (Mumbai); AZ = isolated data center inside it. Deploy across ≥2 AZs so a single data-center failure doesn't take you down." },
      { q: "Security group vs NACL?", a: "SG: instance-level, stateful (return traffic auto-allowed), allow rules only. NACL: subnet-level, stateless (must allow both directions), supports deny rules. SGs are your primary tool." },
      { q: "Why prefer IAM roles over access keys on EC2?", a: "Roles issue short-lived, auto-rotated credentials via instance metadata. Keys are long-lived secrets that leak (git commits, AMIs). Least-privilege role per service is the standard pattern." },
      { q: "How do you let users upload 1GB files without loading your servers?", a: "S3 presigned URLs: server generates a time-limited signed PUT URL; client uploads directly to S3. Server never touches the bytes. Add multipart upload for reliability." },
      { q: "When would you use Spot instances?", a: "Interruptible workloads: batch jobs, CI runners, stateless workers behind a queue. ~90% cheaper but reclaimable with 2-min notice — never for stateful single-node services." },
      { q: "What lives in a public vs private subnet?", a: "Public (route to IGW): ALB, NAT gateway, bastion. Private: app servers (outbound via NAT), databases (often no internet route at all). Minimizes attack surface." },
      { q: "S3 durability vs availability?", a: "Durability (11 nines) = probability your data isn't lost — via replication across AZs. Availability (~99.9%) = can you reach it right now. Different SLAs, different failure modes." }
    ],
    mock: { easy: [], medium: [
      { q: "Design the AWS layout for a startup's 3-tier web app.", a: "VPC /16, two AZs. Public subnets: ALB + NAT GW. Private subnets: app EC2s in an Auto Scaling Group behind the ALB. DB subnets: RDS multi-AZ. S3+CloudFront for static assets. IAM roles per tier, SGs chained (ALB→app→DB). Route 53 for DNS." },
      { q: "Your EC2 app must read from a private S3 bucket. Walk through the secure setup.", a: "Create IAM role with s3:GetObject on that bucket ARN only; attach to instance profile. App uses SDK default credential chain (hits IMDSv2). Bucket policy: block public access, optionally restrict to the VPC endpoint. No keys anywhere." },
      { q: "A single AZ outage takes down your service. What was wrong and how do you fix it?", a: "Everything was in one AZ. Fix: ASG spanning ≥2 AZs, ALB health-checks and routes around dead AZ, RDS multi-AZ standby with automatic failover, stateless app servers (session in Redis/ElastiCache) so any node serves any user." }
    ], hard: [] }
  });
})();
