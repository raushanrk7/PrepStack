// Cloud & DevOps — module structure (v3). Topics auto-derive from week notes via `from.week`.
(function () {
  window.PrepStackRegister.track("cloud", {
    name: "Cloud & DevOps — AWS, Azure, CI/CD",
    icon: "☁️",
    blurb: "AWS/Azure core services, Docker & Kubernetes, Jenkins and CI/CD pipelines, Terraform, and production observability.",
    modules: [
      { id: "aws-core", title: "Cloud Fundamentals & AWS Core", blurb: "IaaS/PaaS/SaaS, EC2, S3, IAM, VPC networking.", from: { week: 0 } },
      { id: "managed-serverless", title: "Managed Services, Serverless & Azure", blurb: "RDS/DynamoDB, Lambda, SQS/SNS, load balancing, Azure equivalents, cost.", from: { week: 1 } },
      { id: "containers", title: "Containers: Docker & Kubernetes", blurb: "Images, layers, pods, deployments, services, rolling updates.", from: { week: 2 } },
      { id: "cicd", title: "CI/CD, Jenkins, IaC & Observability", blurb: "Pipelines, Jenkins, GitHub Actions, Terraform, deployment strategies, monitoring.", from: { week: 3 } }
    ]
  });
})();
