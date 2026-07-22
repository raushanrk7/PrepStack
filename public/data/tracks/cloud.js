// Cloud & DevOps — AWS, Azure, containers, CI/CD track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "Cloud Fundamentals & AWS Core",
    days: [
      D("IaaS vs PaaS vs SaaS; regions, AZs, edge locations", "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html"),
      D("EC2: instance types, AMIs, security groups, key pairs", "https://docs.aws.amazon.com/ec2/"),
      D("S3: buckets, storage classes, lifecycle, presigned URLs", "https://docs.aws.amazon.com/s3/"),
      D("IAM: users, roles, policies, least privilege", "https://docs.aws.amazon.com/iam/"),
      D("VPC: subnets, route tables, IGW/NAT, security layers", "https://docs.aws.amazon.com/vpc/"),
      D("Design: static site + API on AWS (S3 + CloudFront + EC2/Lambda)", "https://docs.aws.amazon.com/whitepapers/", "design"),
      D("Design: 3-tier web app VPC layout", "https://docs.aws.amazon.com/whitepapers/", "design")
    ]
  };

  const week2 = {
    title: "Managed Services, Serverless & Azure",
    days: [
      D("RDS/Aurora vs DynamoDB; ElastiCache", "https://docs.aws.amazon.com/rds/"),
      D("Lambda & serverless patterns; API Gateway; SQS/SNS", "https://docs.aws.amazon.com/lambda/"),
      D("ELB/ALB/NLB & Auto Scaling Groups", "https://docs.aws.amazon.com/elasticloadbalancing/"),
      D("Azure equivalents: VMs, Blob Storage, AKS, Functions, AAD", "https://learn.microsoft.com/en-us/azure/architecture/aws-professional/"),
      D("Cost optimization: reserved/spot, rightsizing, budgets", "https://aws.amazon.com/pricing/cost-optimization/"),
      D("Design: event-driven image pipeline (S3→Lambda→SQS)", "https://docs.aws.amazon.com/lambda/", "design"),
      D("Design: multi-region active-passive failover", "https://aws.amazon.com/architecture/", "design")
    ]
  };

  const week3 = {
    title: "Containers: Docker & Kubernetes",
    days: [
      D("Docker: images, layers, Dockerfile best practices", "https://docs.docker.com/get-started/"),
      D("Docker networking, volumes, compose", "https://docs.docker.com/compose/"),
      D("Kubernetes: pods, deployments, services, ingress", "https://kubernetes.io/docs/concepts/"),
      D("K8s config: ConfigMaps, Secrets, probes, HPA", "https://kubernetes.io/docs/concepts/configuration/"),
      D("ECS/EKS/AKS managed offerings compared", "https://docs.aws.amazon.com/eks/"),
      D("Hands-on: containerize an app + write k8s manifests", "https://kubernetes.io/docs/tutorials/", "design"),
      D("Design: zero-downtime rolling deploy on k8s", "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/", "design")
    ]
  };

  const week4 = {
    title: "CI/CD: Jenkins, Actions, IaC & Observability",
    days: [
      D("CI/CD concepts: build→test→deploy, environments, gates", "https://www.atlassian.com/continuous-delivery/principles"),
      D("Jenkins: pipelines (Jenkinsfile), agents, plugins", "https://www.jenkins.io/doc/book/pipeline/"),
      D("GitHub Actions & GitLab CI compared", "https://docs.github.com/en/actions"),
      D("IaC: Terraform basics, state, modules; CloudFormation", "https://developer.hashicorp.com/terraform/docs"),
      D("Monitoring & logging: CloudWatch, Prometheus/Grafana, alerts", "https://prometheus.io/docs/introduction/overview/"),
      D("Hands-on: full pipeline — commit→build→test→deploy", "https://www.jenkins.io/doc/pipeline/tour/hello-world/", "design"),
      D("Design: blue-green vs canary deployment strategy", "https://martinfowler.com/bliki/BlueGreenDeployment.html", "design")
    ]
  };

  window.PrepStackRegister.track("cloud", {
    name: "Cloud & DevOps — AWS, Azure, CI/CD",
    icon: "☁️",
    blurb: "AWS/Azure core services, Docker & Kubernetes, Jenkins and CI/CD pipelines, Terraform, and production observability.",
    durations: {
      4: [week1, week2, week3, week4],
      6: [week1, week2, week3, week4,
        { ...week3, title: "Kubernetes Deep Dive & Practice" },
        { ...week4, title: "Pipeline Projects & Mock Review" }],
      8: [week1, week2, week3, week4,
        { ...week2, title: "Serverless & Event-Driven Patterns" },
        { ...week3, title: "Kubernetes Deep Dive & Practice" },
        { ...week4, title: "IaC & Observability Deep Dive" },
        { ...week4, title: "Pipeline Projects & Mock Review" }]
    }
  });
})();
