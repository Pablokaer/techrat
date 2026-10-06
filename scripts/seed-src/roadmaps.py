"""Source of truth for TechRat roadmaps.

Run `python3 scripts/seed-src/roadmaps.py` to regenerate
backend/TechRat.Infrastructure/Seed/Data/roadmaps.json.

Step syntax: "topic/subtopic" (title = subtopic name) or "topic/subtopic|Custom title" or "topic|Title" (whole topic).
Prerequisites: (roadmap-slug, minimum completion percent of that roadmap needed to unlock).
"""
import json, os

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "../../backend/TechRat.Infrastructure/Seed/Data")
topics = {t["slug"]: t for t in json.load(open(os.path.join(DATA, "topics.json")))}

R = []
def roadmap(slug, name, category, difficulty, icon, description, modules, prereqs=()):
    R.append(dict(slug=slug, name=name, category=category, difficulty=difficulty, icon=icon,
                  description=description, modules=modules, prerequisites=list(prereqs)))

def all_of(topic, exclude=()):
    return [f"{topic}/{s['slug']}" for s in topics[topic]["subtopics"] if s["slug"] not in exclude]

def chunk(topic, size, names=None, exclude=()):
    steps = all_of(topic, exclude)
    mods = [steps[i:i + size] for i in range(0, len(steps), size)]
    names = names or [f"{topics[topic]['name']} {i + 1}" for i in range(len(mods))]
    return [(names[i], m) for i, m in enumerate(mods)]

# ---------------------------------------------------------------- foundations
roadmap("computer-science-fundamentals", "Computer Science Fundamentals", "Computer Science", "Beginner", "code",
        "The essential theory every developer builds on: programming basics, complexity, data representation and how computers work.",
        [("Programming Basics", all_of("programming-fundamentals")[:5]),
         ("Thinking in Complexity", ["programming-fundamentals/complexity-big-o", "programming-fundamentals/problem-solving", "programming-fundamentals/discrete-math"]),
         ("Inside the Machine", ["programming-fundamentals/boolean-logic", "programming-fundamentals/number-systems", "programming-fundamentals/computer-architecture",
                                 "operating-systems/processes-threads", "operating-systems/memory-management"]),
         ("First Data Structures", ["data-structures/arrays", "data-structures/strings", "data-structures/hash-tables"])])

roadmap("data-structures-and-algorithms", "Data Structures and Algorithms", "Computer Science", "Intermediate", "git-branch",
        "Build a strong DSA foundation and master the problem-solving patterns used in technical interviews.",
        [("Linear Structures", ["data-structures/arrays", "data-structures/strings", "data-structures/linked-lists", "data-structures/stacks", "data-structures/queues"]),
         ("Hashing & Trees", ["data-structures/hash-tables", "data-structures/trees", "data-structures/binary-search-trees", "data-structures/heaps", "data-structures/tries"]),
         ("Graphs & Sets", ["data-structures/graphs", "data-structures/disjoint-set", "data-structures/matrices"]),
         ("Core Techniques", ["algorithms/sorting", "algorithms/binary-search", "algorithms/two-pointers", "algorithms/sliding-window", "algorithms/prefix-sum"]),
         ("Recursive Thinking", ["algorithms/backtracking", "algorithms/divide-and-conquer", "algorithms/tree-traversal", "algorithms/greedy"]),
         ("Advanced Algorithms", ["algorithms/dynamic-programming", "algorithms/graph-traversal", "algorithms/topological-sort", "algorithms/shortest-paths",
                                  "algorithms/union-find", "algorithms/intervals", "algorithms/string-algorithms"])],
        [("computer-science-fundamentals", 50)])

roadmap("operating-systems", "Operating Systems", "Computer Science", "Intermediate", "cpu",
        "Processes, threads, scheduling, memory, file systems and synchronization.",
        [("Processes & Scheduling", ["operating-systems/processes-threads", "operating-systems/scheduling", "operating-systems/system-calls-io"]),
         ("Memory & Storage", ["operating-systems/memory-management", "operating-systems/file-systems"]),
         ("Concurrency", ["operating-systems/synchronization", "csharp/concurrency|Concurrency in Practice"])])

roadmap("computer-networking", "Computer Networking", "Computer Science", "Intermediate", "network",
        "How data travels: models, IP, TCP/UDP, DNS, HTTP, TLS and the infrastructure in between.",
        chunk("networking", 3, ["Network Models & Transport", "Web Protocols & Security", "Network Infrastructure"]))

roadmap("git-and-collaboration", "Git and Collaboration", "Tools", "Beginner", "git-merge",
        "Version control and team workflows: commits, branches, rebasing, undoing mistakes and code review.",
        [("Git Essentials", ["git/basics", "git/branching-merging", "git/remotes"]),
         ("Rewriting & Recovering", ["git/rebase", "git/undoing", "git/advanced"]),
         ("Working in Teams", ["git/workflows", "engineering-leadership/code-review"])])

# ---------------------------------------------------------------- languages
roadmap("csharp-developer", "C# Developer", "Languages", "Intermediate", "hash",
        "Master the C# language from syntax and OOP to async, concurrency, memory and performance.",
        chunk("csharp", 4, ["Language Foundations", "Functional & Data Features", "Runtime & Concurrency"]))

roadmap("python-developer", "Python Developer", "Languages", "Beginner", "terminal",
        "From Python basics to decorators, generators, typing, asyncio and testing.",
        chunk("python", 5, ["Pythonic Foundations", "Professional Python"]))

roadmap("java-developer", "Java Developer", "Languages", "Intermediate", "coffee",
        "JVM internals, collections, streams, concurrency and Spring fundamentals.",
        chunk("java", 4, ["Java Core", "JVM, Concurrency & Spring"]))

roadmap("javascript-developer", "JavaScript Developer", "Languages", "Beginner", "braces",
        "Understand JavaScript deeply: types, closures, prototypes, async and the event loop.",
        chunk("javascript", 5, ["Language Core", "Async & the Browser"]))

roadmap("typescript-developer", "TypeScript Developer", "Languages", "Intermediate", "file-type",
        "Type-safe JavaScript: generics, narrowing, utility and advanced types.",
        chunk("typescript", 4, ["Type System Basics", "Advanced Typing"]),
        [("javascript-developer", 50)])

# ---------------------------------------------------------------- web & backend
roadmap("frontend-developer", "Frontend Developer", "Web Development", "Intermediate", "layout",
        "HTML, CSS, accessibility, JavaScript, React and frontend performance and security.",
        [("Web Foundations", ["frontend/html-semantics", "frontend/accessibility", "frontend/css-layout", "frontend/responsive-design"]),
         ("Programming the Browser", ["javascript/async", "javascript/dom-browser", "frontend/browser-fundamentals", "typescript/basic-types"]),
         ("React", ["react/components-jsx", "react/props-state", "react/hooks", "react/data-fetching"]),
         ("Production Frontend", ["frontend/web-performance", "frontend/frontend-architecture", "frontend/forms-validation", "frontend/web-security", "testing/integration-e2e"])])

roadmap("react-developer", "React Developer", "Web Development", "Intermediate", "atom",
        "Components, hooks, rendering, data fetching, error boundaries and testing in React.",
        chunk("react", 4, ["React Basics", "Hooks in Depth", "Production React"]),
        [("javascript-developer", 50)])

roadmap("backend-developer", "Backend Developer", "Web Development", "Intermediate", "server",
        "HTTP, API design, authentication, databases, caching, background jobs and observability.",
        [("HTTP & APIs", ["networking/http-https", "backend-engineering/http-rest", "backend-engineering/api-design", "backend-engineering/webhooks"]),
         ("Data", ["databases/sql-basics", "databases/joins", "databases/transactions", "databases/indexing"]),
         ("Security", ["backend-engineering/auth", "security/authorization", "security/injection"]),
         ("Beyond Request/Response", ["backend-engineering/realtime", "backend-engineering/grpc", "backend-engineering/background-jobs", "backend-engineering/backend-caching"]),
         ("Operating Services", ["observability/logging", "observability/tracing", "docker/dockerfile", "testing/integration-e2e"])])

roadmap("dotnet-backend-developer", ".NET Backend Developer", "Web Development", "Intermediate", "layers",
        "Build production APIs with ASP.NET Core, EF Core, DI, configuration, hosting and testing.",
        [("The Platform", ["dotnet/runtime", "dotnet/dependency-injection", "dotnet/configuration"]),
         ("ASP.NET Core", ["dotnet/aspnetcore", "dotnet/aspnetcore-security", "dotnet/hosting"]),
         ("Data Access", ["dotnet/ef-core", "dotnet/ef-core-performance", "databases/transactions"]),
         ("Quality", ["dotnet/testing-dotnet", "csharp/async-await", "observability/tracing"])],
        [("csharp-developer", 50)])

roadmap("full-stack-developer", "Full Stack Developer", "Web Development", "Intermediate", "layers",
        "End-to-end web development: frontend, backend, databases, deployment and testing.",
        [("Frontend", ["frontend/html-semantics", "frontend/css-layout", "react/components-jsx", "react/hooks"]),
         ("Backend", ["backend-engineering/http-rest", "backend-engineering/api-design", "backend-engineering/auth"]),
         ("Data", ["databases/sql-basics", "databases/joins", "databases/indexing"]),
         ("Ship It", ["docker/dockerfile", "devops/ci-cd", "testing/integration-e2e", "security/xss-csrf"])],
        [("javascript-developer", 30)])

roadmap("database-engineering", "Database Engineering", "Data", "Intermediate", "database",
        "SQL mastery, transactions, isolation, indexing, modeling, scaling and NoSQL.",
        [("SQL", ["databases/sql-basics", "databases/joins", "databases/aggregation", "databases/advanced-sql"]),
         ("Correctness", ["databases/transactions", "databases/concurrency", "databases/data-modeling"]),
         ("Performance & Scale", ["databases/indexing", "performance/database-performance", "databases/scaling-databases", "databases/nosql"])])

# ---------------------------------------------------------------- architecture
roadmap("system-design", "System Design", "Architecture", "Advanced", "server",
        "From client-server basics to scalable, resilient, multi-region systems and classic interview designs.",
        [("Foundations", ["system-design/fundamentals", "networking/dns", "networking/http-https", "databases/sql-basics"]),
         ("Scaling the Basics", ["system-design/scaling", "system-design/load-balancing", "system-design/caching", "system-design/cdn"]),
         ("Data at Scale", ["system-design/replication-partitioning", "databases/scaling-databases", "databases/nosql"]),
         ("Asynchronous Systems", ["system-design/messaging", "system-design/event-driven", "system-design/rate-limiting", "system-design/api-gateway"]),
         ("Distributed Systems", ["system-design/resilience", "system-design/idempotency", "system-design/consistency", "system-design/distributed-transactions"]),
         ("Reliability", ["system-design/high-availability", "observability/slo"]),
         ("Interview Designs", ["system-design/interview-scenarios|Classic Interview Designs"])],
        [("data-structures-and-algorithms", 30), ("backend-developer", 30)])

roadmap("software-architecture", "Software Architecture", "Architecture", "Advanced", "building",
        "Clean code, design patterns and architectural styles from layered to microservices and DDD.",
        [("Design Principles", ["clean-code/solid", "clean-code/coupling-cohesion", "clean-code/principles"]),
         ("Patterns", ["design-patterns/creational", "design-patterns/structural", "design-patterns/behavioral", "design-patterns/data-access"]),
         ("Architectural Styles", ["software-architecture/layered", "software-architecture/clean-hexagonal", "software-architecture/modular-monolith", "software-architecture/microservices"]),
         ("Advanced Styles", ["software-architecture/event-driven-architecture", "software-architecture/ddd", "software-architecture/api-gateway-bff",
                              "software-architecture/cqrs-event-sourcing", "software-architecture/serverless"])])

roadmap("testing-and-quality-engineering", "Testing and Quality Engineering", "Engineering", "Intermediate", "flask-conical",
        "Unit, integration and E2E testing, test doubles, TDD, test design and performance testing.",
        chunk("testing", 4, ["Testing Foundations", "Advanced Testing"]))

roadmap("security-fundamentals", "Security Fundamentals", "Security", "Intermediate", "shield",
        "Authentication, authorization, the OWASP Top 10, secrets, threat modeling and secure coding.",
        chunk("security", 5, ["Identity & Access", "Attacks & Defenses"]))

# ---------------------------------------------------------------- cloud & devops
roadmap("docker", "Docker", "Cloud & DevOps", "Beginner", "container",
        "Images, containers, Dockerfiles, volumes, networks, Compose and container security.",
        chunk("docker", 4, ["Docker Basics", "Docker in Practice"]))

roadmap("kubernetes", "Kubernetes", "Cloud & DevOps", "Advanced", "ship-wheel",
        "Run containers at scale: workloads, services, configuration, storage, probes and autoscaling.",
        chunk("kubernetes", 4, ["Kubernetes Core", "Operating Workloads"]),
        [("docker", 50)])

roadmap("devops-engineer", "DevOps Engineer", "Cloud & DevOps", "Intermediate", "infinity",
        "Linux, CI/CD, containers, infrastructure as code, deployment strategies and observability.",
        [("Foundations", ["devops/linux-shell", "git/workflows", "devops/build-artifacts"]),
         ("Delivery", ["devops/ci-cd", "devops/configuration-secrets", "devops/deployment-strategies"]),
         ("Containers & Infra", ["docker/dockerfile", "docker/compose", "kubernetes/workloads", "devops/iac"]),
         ("Operate", ["observability/metrics", "observability/alerting-incidents", "observability/slo"])])

roadmap("cloud-engineering", "Cloud Engineering", "Cloud & DevOps", "Intermediate", "cloud",
        "Provider-agnostic cloud architecture: compute, storage, networking, identity, DR and monitoring.",
        chunk("cloud", 4, ["Cloud Building Blocks", "Operating in the Cloud", "Providers"], exclude=()))

roadmap("azure-developer", "Azure Developer", "Cloud & DevOps", "Intermediate", "cloud-cog",
        "Build on Azure: App Service, Container Apps, Functions, data, Key Vault, messaging and monitoring.",
        chunk("azure", 3, ["Compute & Data", "Security, Messaging & Operations"]),
        [("cloud-engineering", 30)])

roadmap("aws-fundamentals", "AWS Fundamentals", "Cloud & DevOps", "Beginner", "cloud",
        "Core cloud concepts mapped onto AWS services.",
        [("Cloud Concepts", ["cloud/service-models", "cloud/compute", "cloud/storage-databases"]),
         ("AWS", ["cloud/aws|AWS Core Services", "cloud/identity-secrets", "cloud/regions-dr"])])

# ---------------------------------------------------------------- AI & data
roadmap("ai-engineering", "AI Engineering", "AI & Data", "Advanced", "brain-circuit",
        "Build reliable LLM applications: prompting, tool calling, embeddings, RAG, agents, evaluation and security.",
        [("Foundations", ["ai-engineering/ai-fundamentals", "ai-engineering/llm-fundamentals", "machine-learning/ml-fundamentals"]),
         ("Talking to Models", ["ai-engineering/prompt-engineering", "ai-engineering/tool-calling"]),
         ("Knowledge & Retrieval", ["ai-engineering/embeddings-vector-search", "ai-engineering/rag"]),
         ("Agents", ["ai-engineering/agents"]),
         ("Production AI", ["ai-engineering/evaluation", "ai-engineering/ai-security", "ai-engineering/llm-ops"])],
        [("python-developer", 30)])

roadmap("machine-learning", "Machine Learning", "AI & Data", "Advanced", "chart-scatter",
        "Supervised and unsupervised learning, validation, metrics, models and neural networks.",
        chunk("machine-learning", 3, ["ML Foundations", "Models", "Going Deeper"]))

roadmap("data-engineering", "Data Engineering", "AI & Data", "Intermediate", "workflow",
        "Pipelines, batch and streaming, storage architectures, Kafka, data quality and orchestration.",
        [("Pipelines", ["data-engineering/etl-elt", "data-engineering/batch-streaming", "data-engineering/orchestration"]),
         ("Storage", ["data-engineering/storage-architectures", "data-engineering/formats-partitioning", "databases/advanced-sql"]),
         ("Streaming & Quality", ["data-engineering/kafka", "data-engineering/schema-quality"])])

# ---------------------------------------------------------------- careers
roadmap("junior-software-engineer", "Junior Software Engineer", "Career", "Beginner", "rocket",
        "Everything you need for your first developer job: fundamentals, Git, OOP, SQL, HTTP, testing and interviews.",
        [("Programming", ["programming-fundamentals/variables-types", "programming-fundamentals/control-flow", "programming-fundamentals/functions", "programming-fundamentals/problem-solving"]),
         ("Tools", ["git/basics", "git/branching-merging"]),
         ("Data Structures & Algorithms", ["data-structures/arrays", "data-structures/hash-tables", "programming-fundamentals/complexity-big-o", "algorithms/sorting", "algorithms/binary-search"]),
         ("Building Software", ["csharp/oop|Object-Oriented Programming", "databases/sql-basics", "networking/http-https", "backend-engineering/http-rest"]),
         ("Quality & Safety", ["testing/unit-testing", "engineering-leadership/incident-handling|Debugging & Incidents", "security/injection|Basic Security"]),
         ("Shipping", ["docker/containers|Docker Fundamentals", "devops/ci-cd|CI Fundamentals"]),
         ("Interview Preparation", ["algorithms/two-pointers", "algorithms/sliding-window", "data-structures/strings"])])

roadmap("senior-software-engineer", "Senior Software Engineer", "Career", "Expert", "crown",
        "Beyond technology: architecture, distributed systems, reliability, technical decisions and leadership.",
        [("Architecture", ["software-architecture/modular-monolith", "software-architecture/microservices", "software-architecture/ddd"]),
         ("System Design & Distributed Systems", ["system-design/consistency", "system-design/distributed-transactions", "system-design/resilience", "system-design/interview-scenarios"]),
         ("Data & Performance", ["databases/concurrency", "performance/database-performance", "performance/profiling-benchmarking"]),
         ("Security & Testing", ["security/owasp-threat-modeling", "testing/tdd-pyramid", "testing/advanced-testing"]),
         ("Operations", ["observability/tracing", "observability/slo", "devops/deployment-strategies", "cloud/regions-dr"]),
         ("Leadership", ["engineering-leadership/code-review", "engineering-leadership/technical-decisions", "engineering-leadership/incident-handling",
                         "engineering-leadership/reliability", "engineering-leadership/mentoring", "engineering-leadership/communication"])],
        [("system-design", 30)])

roadmap("technical-interview-preparation", "Technical Interview Preparation", "Career", "Advanced", "target",
        "A focused path through the patterns, data structures and design questions most common in interviews.",
        [("Must-Know Structures", ["data-structures/arrays", "data-structures/hash-tables", "data-structures/trees", "data-structures/heaps", "data-structures/graphs"]),
         ("Coding Patterns", ["algorithms/two-pointers", "algorithms/sliding-window", "algorithms/binary-search", "algorithms/backtracking",
                              "algorithms/dynamic-programming", "algorithms/graph-traversal", "algorithms/intervals"]),
         ("System Design Round", ["system-design/fundamentals", "system-design/caching", "system-design/interview-scenarios"]),
         ("Behavioral & Senior Signals", ["engineering-leadership/technical-decisions", "engineering-leadership/communication"])])

# ---------------------------------------------------------------- emit
def parse(step):
    ref, _, title = step.partition("|")
    topic, _, sub = ref.partition("/")
    assert topic in topics, step
    subs = {s["slug"]: s["name"] for s in topics[topic]["subtopics"]}
    if sub: assert sub in subs, step
    return {"topic": topic, "subtopic": sub or None, "title": title or (subs[sub] if sub else topics[topic]["name"])}

MINUTES = {"Beginner": 30, "Intermediate": 45, "Advanced": 60, "Expert": 75}
out, slugs = [], {r["slug"] for r in R}
for r in R:
    for p, _ in r["prerequisites"]: assert p in slugs, p
    mods, n = [], 0
    for mi, (mname, steps) in enumerate(r["modules"]):
        st = []
        for s in steps:
            n += 1
            p = parse(s); p.update(order=n, estimatedMinutes=MINUTES[r["difficulty"]]); st.append(p)
        mods.append({"title": mname, "order": mi + 1, "steps": st})
    out.append({**{k: r[k] for k in ("slug", "name", "category", "difficulty", "icon", "description")},
                "estimatedHours": max(1, round(n * MINUTES[r["difficulty"]] / 60)),
                "prerequisites": [{"slug": p, "minimumPercent": pct} for p, pct in r["prerequisites"]],
                "modules": mods})

json.dump(out, open(os.path.join(DATA, "roadmaps.json"), "w"), indent=2)
print(len(out), "roadmaps,", sum(len(m["steps"]) for r in out for m in r["modules"]), "steps")
