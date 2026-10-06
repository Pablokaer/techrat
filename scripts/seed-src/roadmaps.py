"""Source of truth for TechRat roadmap compositions (ADR-0012, docs/plans/roadmap-modules.md).

Run `python3 scripts/seed-src/modules.py` first, then `python3 scripts/seed-src/roadmaps.py` to regenerate
backend/TechRat.Infrastructure/Seed/Data/roadmaps.json. Check the result with validate_catalog.py.

A roadmap only composes catalog modules (modules.py); it owns no steps. Steps completed in a module count in every
roadmap that contains it.

Module syntax: "module-slug" (required) or "module-slug?" (optional: never blocks progress or completion).
Prerequisites: (roadmap-slug, minimum completion percent of that roadmap needed to unlock).
Types: Role (career paths), Language (programming languages), SkillTrack (tools, skills, frameworks), BestPractices.
`new` is False for the roadmaps that existed before the module catalog; new Role/Language roadmaps (new=True) must
include at least one Context module and exactly one Capstone (validate_catalog.py).
"""
import collections
import json
import os

from modules import MODULES

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "../../backend/TechRat.Infrastructure/Seed/Data")

R = []


def roadmap(slug, name, category, difficulty, icon, rtype, description, modules, prereqs=(), new=False):
    R.append(dict(slug=slug, name=name, category=category, difficulty=difficulty, icon=icon, type=rtype, new=new,
                  description=description, modules=modules, prerequisites=list(prereqs)))


# ---------------------------------------------------------------- foundations
roadmap("computer-science-fundamentals", "Computer Science Fundamentals", "Computer Science", "Beginner", "code", "SkillTrack",
        "The essential theory every developer builds on: programming basics, complexity, data representation and how computers work.",
        ["programming-basics", "problem-solving-and-complexity", "recursion-and-discrete-math", "how-computers-work",
         "processes-and-memory", "arrays-strings-hashing"])

roadmap("data-structures-and-algorithms", "Data Structures and Algorithms", "Computer Science", "Intermediate", "git-branch", "SkillTrack",
        "Build a strong DSA foundation and master the problem-solving patterns used in technical interviews.",
        ["arrays-strings-hashing", "linear-data-structures", "trees-and-heaps", "search-trees-and-tries", "graph-basics",
         "searching-and-sorting", "array-patterns", "matrices-and-prefix-sums", "recursive-algorithms", "greedy-and-intervals",
         "backtracking-and-dp", "advanced-graph-algorithms"],
        [("computer-science-fundamentals", 50)])

roadmap("operating-systems", "Operating Systems", "Computer Science", "Intermediate", "cpu", "SkillTrack",
        "Processes, threads, scheduling, memory, file systems and synchronization.",
        ["processes-and-memory", "os-scheduling-and-synchronization", "linux-and-shell", "csharp-async-and-concurrency"])

roadmap("computer-networking", "Computer Networking", "Computer Science", "Intermediate", "network", "SkillTrack",
        "How data travels: models, IP, TCP/UDP, DNS, HTTP, TLS and the infrastructure in between.",
        ["network-models", "dns-and-http", "tls-nat-and-firewalls", "network-infrastructure"])

roadmap("git-and-collaboration", "Git and Collaboration", "Tools", "Beginner", "git-merge", "SkillTrack",
        "Version control and team workflows: commits, branches, rebasing, undoing mistakes and code review.",
        ["git-essentials", "git-collaboration", "git-history-rewriting", "code-review-and-mentoring"])

# ---------------------------------------------------------------- languages
roadmap("csharp-developer", "C# Developer", "Languages", "Intermediate", "hash", "Language",
        "Master the C# language from syntax and OOP to async, concurrency, memory and performance.",
        ["csharp-fundamentals", "csharp-generics-and-linq", "csharp-language-features", "csharp-async-and-concurrency",
         "csharp-memory-and-performance"])

roadmap("python-developer", "Python Developer", "Languages", "Beginner", "terminal", "Language",
        "From Python basics to decorators, generators, typing, asyncio and testing.",
        ["python-core", "python-tooling-and-testing", "python-concurrency-and-performance"])

roadmap("java-developer", "Java Developer", "Languages", "Intermediate", "coffee", "Language",
        "JVM internals, collections, streams, concurrency and Spring fundamentals.",
        ["java-core", "java-platform"])

roadmap("javascript-developer", "JavaScript Developer", "Languages", "Beginner", "braces", "Language",
        "Understand JavaScript deeply: types, closures, prototypes, async and the event loop.",
        ["javascript-core", "javascript-async-and-browser", "javascript-in-depth"])

roadmap("typescript-developer", "TypeScript Developer", "Languages", "Intermediate", "file-type", "Language",
        "Type-safe JavaScript: generics, narrowing, utility and advanced types.",
        ["typescript-basics", "typescript-narrowing-and-generics", "typescript-advanced-types"],
        [("javascript-developer", 50)])

roadmap("cpp-developer", "C++ Developer", "Languages", "Intermediate", "cpu", "Language",
        "Modern C++ from syntax and pointers to RAII, move semantics, templates, the STL, concurrency and CMake.",
        ["cpp-foundations", "processes-and-memory?", "cpp-memory-and-raii", "cpp-modern-and-stl", "cpp-concurrency",
         "cpp-capstone"],
        new=True)

# ---------------------------------------------------------------- web & backend
roadmap("frontend-developer", "Frontend Developer", "Web Development", "Intermediate", "layout", "Role",
        "HTML, CSS, accessibility, JavaScript, React and frontend performance and security.",
        ["html-and-css", "accessibility-and-responsive-design", "javascript-async-and-browser", "browser-rendering-and-performance",
         "typescript-basics", "react-foundations", "react-data-and-forms", "frontend-architecture-and-security", "testing-essentials"])

roadmap("react-developer", "React Developer", "Web Development", "Intermediate", "atom", "SkillTrack",
        "Components, hooks, rendering, data fetching, error boundaries and testing in React.",
        ["react-foundations", "react-hooks-in-depth", "react-rendering-and-memoization", "react-data-and-forms", "react-in-production"],
        [("javascript-developer", 50)])

roadmap("backend-developer", "Backend Developer", "Web Development", "Intermediate", "server", "Role",
        "HTTP, API design, authentication, databases, caching, background jobs and observability.",
        ["dns-and-http", "http-and-apis", "sql-foundations", "sql-for-applications", "sql-performance", "security-foundations",
         "auth-fundamentals", "beyond-rest", "caching-and-queues", "observability-essentials", "dockerfile-and-compose",
         "testing-essentials", "api-security-best-practices?", "api-hardening-best-practices?",
         "backend-performance-best-practices?", "ai-assisted-development?"])

roadmap("dotnet-backend-developer", ".NET Backend Developer", "Web Development", "Intermediate", "layers", "Role",
        "Build production APIs with ASP.NET Core, EF Core, DI, configuration, hosting and testing.",
        ["dotnet-platform", "aspnet-core", "ef-core", "sql-for-applications", "dotnet-hosting-and-testing",
         "csharp-async-and-concurrency", "observability-essentials"],
        [("csharp-developer", 50)])

roadmap("full-stack-developer", "Full Stack Developer", "Web Development", "Intermediate", "layers", "Role",
        "End-to-end web development: frontend, backend, databases, deployment and testing.",
        ["html-and-css", "react-foundations", "http-and-apis", "auth-fundamentals", "sql-foundations", "sql-performance",
         "dockerfile-and-compose", "ci-cd", "testing-essentials", "api-security-best-practices?",
         "backend-performance-best-practices?", "ai-assisted-development?"],
        [("javascript-developer", 30)])

roadmap("database-engineering", "Database Engineering", "Data", "Intermediate", "database", "SkillTrack",
        "SQL mastery, transactions, isolation, indexing, modeling, scaling and NoSQL.",
        ["sql-foundations", "sql-for-analytics", "sql-for-applications", "sql-performance", "data-modeling-and-scaling"])

roadmap("sql", "SQL", "Data", "Beginner", "database", "SkillTrack",
        "Query, analyze and protect relational data, from SELECT and joins to window functions, transactions and query tuning.",
        ["sql-foundations", "sql-for-analytics", "sql-for-applications", "sql-performance"],
        new=True)

# ---------------------------------------------------------------- architecture
roadmap("system-design", "System Design", "Architecture", "Advanced", "server", "SkillTrack",
        "From client-server basics to scalable, resilient, multi-region systems and classic interview designs.",
        ["dns-and-http", "sql-foundations", "system-design-foundations", "scaling-systems", "data-modeling-and-scaling",
         "messaging-and-events", "api-gateway-and-rate-limiting", "distributed-systems", "high-availability-and-dr",
         "safe-releases-and-slos", "design-tradeoffs-and-interviews"],
        [("data-structures-and-algorithms", 30), ("backend-developer", 30)])

roadmap("software-architecture", "Software Architecture", "Architecture", "Advanced", "building", "SkillTrack",
        "Clean code, design patterns and architectural styles from layered to microservices and DDD.",
        ["design-principles", "design-patterns", "layered-and-clean-architecture", "service-architecture",
         "advanced-architecture-styles"])

roadmap("testing-and-quality-engineering", "Testing and Quality Engineering", "Engineering", "Intermediate", "flask-conical", "SkillTrack",
        "Unit, integration and E2E testing, test doubles, TDD, test design and performance testing.",
        ["testing-essentials", "test-doubles-and-design", "testing-strategy", "performance-testing-and-profiling"])

roadmap("security-fundamentals", "Security Fundamentals", "Security", "Intermediate", "shield", "SkillTrack",
        "Authentication, authorization, the OWASP Top 10, secrets, threat modeling and secure coding.",
        ["identity-protocols", "security-foundations", "auth-fundamentals", "api-and-infrastructure-security", "secure-design"])

roadmap("cyber-security", "Cyber Security", "Security", "Intermediate", "shield", "Role",
        "Defend systems end to end: networks, Linux, security operations, incident response, vulnerabilities, and cloud and API security.",
        ["security-foundations", "network-models", "tls-nat-and-firewalls", "linux-and-shell", "security-operations",
         "threats-and-vulnerabilities", "cloud-security", "api-security-best-practices", "api-hardening-best-practices",
         "secure-design?", "cyber-security-capstone"],
        new=True)

# ---------------------------------------------------------------- cloud & devops
roadmap("docker", "Docker", "Cloud & DevOps", "Beginner", "container", "SkillTrack",
        "Images, containers, Dockerfiles, volumes, networks, Compose and container security.",
        ["docker-essentials", "dockerfile-and-compose", "docker-in-production"])

roadmap("kubernetes", "Kubernetes", "Cloud & DevOps", "Advanced", "ship-wheel", "SkillTrack",
        "Run containers at scale: workloads, services, configuration, storage, probes and autoscaling.",
        ["kubernetes-essentials", "kubernetes-networking-and-config", "kubernetes-in-production"],
        [("docker", 50)])

roadmap("devops-engineer", "DevOps Engineer", "Cloud & DevOps", "Intermediate", "infinity", "Role",
        "Linux, CI/CD, containers, infrastructure as code, deployment strategies and observability.",
        ["linux-and-shell", "git-collaboration", "ci-cd", "dockerfile-and-compose", "kubernetes-essentials",
         "infrastructure-as-code", "metrics-and-alerting", "safe-releases-and-slos", "aws-core-services?", "cloud-security?",
         "ai-assisted-development?"])

roadmap("cloud-engineering", "Cloud Engineering", "Cloud & DevOps", "Intermediate", "cloud", "Role",
        "Provider-agnostic cloud architecture: compute, storage, networking, identity, DR and monitoring.",
        ["cloud-foundations", "aws-foundations", "high-availability-and-dr", "cloud-operations", "aws-core-services?",
         "cloud-security?"])

roadmap("azure-developer", "Azure Developer", "Cloud & DevOps", "Intermediate", "cloud-cog", "SkillTrack",
        "Build on Azure: App Service, Container Apps, Functions, data, Key Vault, messaging and monitoring.",
        ["azure-compute-and-data", "azure-messaging-and-operations"],
        [("cloud-engineering", 30)])

roadmap("aws-fundamentals", "AWS Fundamentals", "Cloud & DevOps", "Beginner", "cloud", "SkillTrack",
        "Core cloud concepts mapped onto AWS services.",
        ["cloud-foundations", "aws-foundations", "high-availability-and-dr", "aws-core-services?"])

# ---------------------------------------------------------------- AI & data
roadmap("ai-engineering", "AI Engineering", "AI & Data", "Advanced", "brain-circuit", "Role",
        "Build reliable LLM applications: prompting, tool calling, embeddings, RAG, agents, evaluation and security.",
        ["ml-foundations", "llm-application-basics", "rag-and-retrieval", "ai-agents", "production-ai",
         "ai-assisted-development?"],
        [("python-developer", 30)])

roadmap("machine-learning", "Machine Learning", "AI & Data", "Advanced", "chart-scatter", "SkillTrack",
        "Supervised and unsupervised learning, validation, metrics, models and neural networks.",
        ["ml-foundations", "supervised-models", "advanced-ml"])

roadmap("data-engineering", "Data Engineering", "AI & Data", "Intermediate", "workflow", "Role",
        "Pipelines, batch and streaming, storage architectures, Kafka, data quality and orchestration.",
        ["data-pipelines", "data-storage-and-formats", "sql-for-analytics", "streaming-and-data-quality",
         "python-data-analysis?", "bi-modeling-and-tools?", "ai-assisted-development?"])

roadmap("data-analyst", "Data Analyst", "AI & Data", "Beginner", "chart-scatter", "Role",
        "Turn raw data into decisions with spreadsheets, statistics, SQL, Python and pandas, visualization, BI and storytelling.",
        ["spreadsheets-for-analysis", "statistics-foundations", "statistics-inference", "sql-foundations", "sql-for-analytics",
         "python-core", "python-data-analysis", "data-visualization", "bi-modeling-and-tools",
         "business-questions-and-storytelling", "data-analyst-capstone"],
        new=True)

roadmap("python-for-data-analysis", "Python for Data Analysis", "AI & Data", "Beginner", "terminal", "SkillTrack",
        "Use Python, NumPy and pandas to clean, combine, summarize and visualize data, with the statistics to read it correctly.",
        ["python-core", "python-data-analysis", "data-visualization", "statistics-foundations"],
        new=True)

roadmap("ai-and-data-scientist", "AI & Data Scientist", "AI & Data", "Advanced", "brain-circuit", "Role",
        "From statistics and data wrangling to machine learning models and LLMs, ending with an applied capstone.",
        ["statistics-foundations", "statistics-inference", "python-data-analysis", "time-series-and-notebooks",
         "data-visualization?", "sql-foundations?", "sql-for-analytics?", "ml-foundations", "supervised-models", "advanced-ml",
         "llm-application-basics", "rag-and-retrieval?", "ai-data-scientist-capstone"],
        [("python-for-data-analysis", 30)], new=True)

roadmap("ai-assisted-development", "AI-Assisted Development (Claude Code)", "AI & Data", "Intermediate", "sparkles", "SkillTrack",
        "Ship real work with coding agents like Claude Code: context, prompting, tools, subagents, hooks, security, CI and reviewing AI-generated code.",
        ["ai-assisted-development", "claude-code-workflows", "code-review-best-practices", "ai-assisted-development-capstone"],
        new=True)

# ---------------------------------------------------------------- careers
roadmap("junior-software-engineer", "Junior Software Engineer", "Career", "Beginner", "rocket", "Role",
        "Everything you need for your first developer job: fundamentals, Git, OOP, SQL, HTTP, testing and interviews.",
        ["programming-basics", "problem-solving-and-complexity", "git-essentials", "arrays-strings-hashing",
         "searching-and-sorting", "csharp-fundamentals", "sql-foundations", "dns-and-http", "http-and-apis",
         "testing-essentials", "incident-response", "security-foundations", "docker-essentials", "ci-cd", "array-patterns"])

roadmap("senior-software-engineer", "Senior Software Engineer", "Career", "Expert", "crown", "Role",
        "Beyond technology: architecture, distributed systems, reliability, technical decisions and leadership.",
        ["service-architecture", "distributed-systems", "sql-for-applications", "sql-performance",
         "performance-testing-and-profiling", "backend-performance-best-practices", "secure-design",
         "api-security-best-practices", "api-hardening-best-practices", "testing-strategy", "observability-essentials",
         "safe-releases-and-slos", "high-availability-and-dr", "code-review-and-mentoring", "code-review-best-practices",
         "design-tradeoffs-and-interviews", "incident-response", "ai-assisted-development?"],
        [("system-design", 30)])

roadmap("technical-interview-preparation", "Technical Interview Preparation", "Career", "Advanced", "target", "SkillTrack",
        "A focused path through the patterns, data structures and design questions most common in interviews.",
        ["arrays-strings-hashing", "trees-and-heaps", "graph-basics", "searching-and-sorting", "array-patterns",
         "backtracking-and-dp", "greedy-and-intervals", "system-design-foundations", "design-tradeoffs-and-interviews"])

# ---------------------------------------------------------------- best practices
roadmap("api-security-best-practices", "API Security Best Practices", "Security", "Advanced", "shield", "BestPractices",
        "Secure APIs against the OWASP API Security Top 10: authentication, authorization, input, abuse, transport and monitoring.",
        ["auth-fundamentals?", "api-security-best-practices", "api-hardening-best-practices"],
        new=True)

roadmap("backend-performance-best-practices", "Backend Performance Best Practices", "Engineering", "Advanced", "gauge", "BestPractices",
        "Make services fast under load: latency budgets, data access, caching, async I/O, payloads, SQL tuning and queues.",
        ["backend-performance-best-practices", "sql-performance", "caching-and-queues", "performance-testing-and-profiling?"],
        new=True)

roadmap("code-review-best-practices", "Code Review Best Practices", "Engineering", "Intermediate", "git-merge", "BestPractices",
        "Review code that ships safely: clear goals, small PRs, correctness, design, tests, security, useful feedback and automation.",
        ["code-review-and-mentoring?", "code-review-best-practices"],
        new=True)

roadmap("aws-best-practices", "AWS Best Practices", "Cloud & DevOps", "Advanced", "cloud", "BestPractices",
        "Run AWS the Well-Architected way: core services, cost optimization, security, and reliability with backup and DR.",
        ["aws-foundations", "aws-core-services", "aws-best-practices", "cloud-security?"],
        new=True)

# ---------------------------------------------------------------- emit
LEVEL_RANK = {"Beginner": 0, "Intermediate": 1, "Advanced": 2, "Expert": 3}


def order_modules(refs, mods):
    """Roadmaps are the structured path: modules go from easier to harder levels (stable within a level, so the
    authored order still decides between peers), a module comes after the modules it `requires`, and the Capstone
    closes the path. `refs` keep their optional marker ("slug?")."""
    slug = lambda ref: ref.rstrip("?")
    pending = sorted(refs, key=lambda ref: (mods[slug(ref)]["kind"] == "Capstone", LEVEL_RANK[mods[slug(ref)]["level"]]))
    ordered = []
    while pending:
        placed = {slug(r) for r in ordered}
        in_path = {slug(r) for r in pending}
        # First module (in level order) whose in-path requirements are already placed.
        nxt = next(r for r in pending if all(d in placed or d not in in_path for d in mods[slug(r)]["requires"]))
        pending.remove(nxt)
        ordered.append(nxt)
    return ordered


MINUTES = {"Beginner": 30, "Intermediate": 45, "Advanced": 60, "Expert": 75}
COMPOSABLE_KINDS = {"Core", "Context"}  # kind follows reuse; Capstone/BestPractices are authored explicitly


def build():
    mods = {m["slug"]: m for m in MODULES}
    slugs = {r["slug"] for r in R}
    assert len(slugs) == len(R), "duplicate roadmap slug"
    used_by = collections.defaultdict(list)
    out = []
    for r in R:
        for p, _ in r["prerequisites"]:
            assert p in slugs, f"{r['slug']}: unknown prerequisite {p}"
        refs, minutes = [], 0
        for ref in order_modules(r["modules"], mods):
            slug, required = ref.rstrip("?"), not ref.endswith("?")
            assert slug in mods, f"{r['slug']}: unknown module {slug}"
            assert slug not in [x["slug"] for x in refs], f"{r['slug']}: module {slug} appears twice"
            refs.append({"slug": slug, "required": required})
            used_by[slug].append(r["slug"])
            if required:
                minutes += len(mods[slug]["steps"]) * MINUTES[mods[slug]["level"]]
        out.append({**{k: r[k] for k in ("slug", "name", "category", "difficulty", "icon", "type", "new", "description")},
                    "estimatedHours": max(1, round(minutes / 60)),
                    "prerequisites": [{"slug": p, "minimumPercent": pct} for p, pct in r["prerequisites"]],
                    "modules": refs})
    for slug, m in mods.items():
        if m["kind"] in COMPOSABLE_KINDS:
            expected = "Core" if len(used_by[slug]) >= 2 else "Context"
            assert m["kind"] == expected, f"{slug}: kind is {m['kind']} but it is used by {len(used_by[slug])} roadmap(s) -> {expected}"
        assert used_by[slug] or m["standalone"], f"{slug}: not used by any roadmap and not standalone"
    return out


if __name__ == "__main__":
    out = build()
    with open(os.path.join(DATA, "roadmaps.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(len(out), "roadmaps,", sum(len(r["modules"]) for r in out), "module links")
