// Agentic AI track curriculum.
(function () {
  const D = (name, link, type) => (type ? { name, link, type } : { name, link });

  const week1 = {
    title: "Agent Foundations",
    days: [
      D("What makes an LLM app 'agentic'", "https://www.anthropic.com/research/building-effective-agents"),
      D("Tool use & function calling", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview"),
      D("ReAct pattern (reason + act loops)", "https://www.anthropic.com/research/building-effective-agents"),
      D("Planning & task decomposition", "https://www.anthropic.com/research/building-effective-agents"),
      D("Memory: short-term vs long-term", "https://www.anthropic.com/research/building-effective-agents"),
      D("Practice: build a single-tool agent", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview", "design"),
      D("Practice: build a multi-step ReAct agent", "https://www.anthropic.com/research/building-effective-agents", "design")
    ]
  };
  const week2 = {
    title: "Multi-Agent Systems",
    days: [
      D("Orchestrator-worker patterns", "https://www.anthropic.com/research/building-effective-agents"),
      D("Multi-agent communication & handoffs", "https://www.anthropic.com/research/building-effective-agents"),
      D("Evaluator-optimizer loops", "https://www.anthropic.com/research/building-effective-agents"),
      D("Guardrails & safety for agentic systems", "https://www.anthropic.com/research/building-effective-agents"),
      D("Cost/latency tradeoffs in agent design", "https://www.anthropic.com/research/building-effective-agents"),
      D("Design: Research/browsing agent", "https://www.anthropic.com/research/building-effective-agents", "design"),
      D("Design: Coding agent (plan → code → test loop)", "https://www.anthropic.com/research/building-effective-agents", "design")
    ]
  };
  const week3 = {
    title: "MCP & Tool Ecosystems",
    days: [
      D("Model Context Protocol (MCP) overview", "https://modelcontextprotocol.io/introduction"),
      D("Building an MCP server", "https://modelcontextprotocol.io/quickstart/server"),
      D("Building an MCP client", "https://modelcontextprotocol.io/quickstart/client"),
      D("Tool schema design & error handling", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview"),
      D("Permissions & sandboxing for agent tools", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview"),
      D("Design: MCP-based data connector", "https://modelcontextprotocol.io/introduction", "design"),
      D("Design: Agent permission/approval system", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview", "design")
    ]
  };
  const week4 = {
    title: "Production Agent Systems & Mock",
    days: [
      D("Observability & tracing for agents", "https://www.anthropic.com/research/building-effective-agents"),
      D("Evaluating agent quality (task success rate)", "https://www.anthropic.com/research/building-effective-agents"),
      D("Failure recovery & retries in agent loops", "https://www.anthropic.com/research/building-effective-agents"),
      D("Human-in-the-loop patterns", "https://www.anthropic.com/research/building-effective-agents"),
      D("Scaling agent systems (parallel subagents)", "https://www.anthropic.com/research/building-effective-agents"),
      D("Design: Customer-support agent system", "https://www.anthropic.com/research/building-effective-agents", "design"),
      D("Full mock: design an agentic system end-to-end", "https://www.anthropic.com/research/building-effective-agents", "design")
    ]
  };

  window.PrepStackRegister.track("agents", {
    name: "Agentic AI",
    icon: "🤖",
    blurb: "Agent design patterns, multi-agent orchestration, MCP/tool ecosystems, and production agent systems.",
    durations: {
      4: [week1, week2, week3, week4],
      6: [week1, week2, week3, { ...week3, title: "Advanced MCP Patterns" }, week4, { ...week4, title: "Mock Review" }],
      8: [week1, { ...week1, title: "Agent Foundations: Advanced" }, week2, week3, { ...week3, title: "Advanced MCP Patterns" }, week4, { ...week4, title: "Mock Review" }, { ...week4, title: "Final Mock Round" }]
    }
  });
})();
