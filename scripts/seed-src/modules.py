"""Source of truth for the TechRat module catalog (ADR-0012, docs/plans/roadmap-modules.md).

Run `python3 scripts/seed-src/modules.py` to regenerate
backend/TechRat.Infrastructure/Seed/Data/modules.json and the "modules" section of Seed/Data/i18n/pt-BR.json.
Then run roadmaps.py (it reads MODULES from this file) and validate_catalog.py.

A module is a small, reusable unit (2-6 steps, one or two sittings). A step is a topic/subtopic scope proven by answering
questions; every scope belongs to exactly one module, so a learner completes it once and it counts in every roadmap that
contains the module.

Step syntax: "topic/subtopic" (title = subtopic name) or "topic/subtopic|Custom title".
Kind: "Core" when the module is reused by 2+ roadmaps, "Context" otherwise (roadmaps.py checks this); "BestPractices"
and "Capstone" are reserved for modules with their own subtopics.
pt-BR: (name, description) plus optional step-title overrides; by default a step title is the subtopic translation
from i18n/pt-BR.json.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "../../backend/TechRat.Infrastructure/Seed/Data")
PT_PATH = os.path.join(DATA, "i18n", "pt-BR.json")

MODULES = []


def module(slug, name, category, level, icon, description, steps, kind="Context", requires=(), pt=None, pt_steps=None, standalone=False):
    MODULES.append(dict(slug=slug, name=name, category=category, level=level, icon=icon, description=description,
                        steps=steps, kind=kind, requires=list(requires), pt=pt, pt_steps=pt_steps or {}, standalone=standalone))


CS, DATA_CAT, ARCH, ENG, LANG, FW, WEB, TOOLS, SEC, OPS, AI, CAREER = (
    "Computer Science", "Data", "Architecture", "Engineering", "Languages", "Frameworks", "Web Development", "Tools",
    "Security", "Cloud & DevOps", "AI & Data", "Career")

# ---------------------------------------------------------------- computer science foundations
module("programming-basics", "Programming Basics", CS, "Beginner", "code",
       "Variables, types, control flow and functions: the building blocks of every program.",
       ["programming-fundamentals/variables-types", "programming-fundamentals/control-flow", "programming-fundamentals/functions"],
       kind="Core",
       pt=("Fundamentos de Programação", "Variáveis, tipos, fluxo de controle e funções: os blocos de construção de todo programa."))

module("problem-solving-and-complexity", "Problem Solving & Complexity", CS, "Beginner", "target",
       "Break problems into steps and reason about how code scales with Big O.",
       ["programming-fundamentals/problem-solving", "programming-fundamentals/complexity-big-o"],
       kind="Core", requires=["programming-basics"],
       pt=("Resolução de Problemas e Complexidade", "Divida problemas em passos e raciocine sobre como o código escala com Big O."))

module("recursion-and-discrete-math", "Recursion & Discrete Math", CS, "Intermediate", "code",
       "Think recursively and learn the discrete math behind algorithms.",
       ["programming-fundamentals/recursion", "programming-fundamentals/discrete-math"],
       requires=["programming-basics"],
       pt=("Recursão e Matemática Discreta", "Pense de forma recursiva e aprenda a matemática discreta por trás dos algoritmos."))

module("how-computers-work", "How Computers Work", CS, "Beginner", "cpu",
       "Boolean logic, binary and hexadecimal, computer architecture and how memory and pointers work.",
       ["programming-fundamentals/boolean-logic", "programming-fundamentals/number-systems",
        "programming-fundamentals/computer-architecture", "programming-fundamentals/memory-pointers"],
       pt=("Como os Computadores Funcionam", "Lógica booleana, binário e hexadecimal, arquitetura de computadores e como funcionam memória e ponteiros."))

module("processes-and-memory", "Processes & Memory", CS, "Intermediate", "cpu",
       "How the operating system runs processes and threads and manages virtual memory, the stack and the heap.",
       ["operating-systems/processes-threads", "operating-systems/memory-management"],
       kind="Core",
       pt=("Processos e Memória", "Como o sistema operacional executa processos e threads e gerencia memória virtual, stack e heap."))

module("os-scheduling-and-synchronization", "Scheduling, System Calls & Synchronization", CS, "Advanced", "cpu",
       "How the kernel schedules work and serves system calls and I/O, and how locks and semaphores prevent races and deadlocks.",
       ["operating-systems/scheduling", "operating-systems/system-calls-io", "operating-systems/synchronization"],
       requires=["processes-and-memory"],
       pt=("Escalonamento, Chamadas de Sistema e Sincronização",
           "Como o kernel escalona o trabalho e atende chamadas de sistema e I/O, e como locks e semáforos evitam condições de corrida e deadlocks."))

module("linux-and-shell", "Linux & Shell", OPS, "Beginner", "terminal",
       "Work comfortably in a Linux shell and understand how file systems organize data.",
       ["devops/linux-shell", "operating-systems/file-systems"],
       kind="Core",
       pt=("Linux e Shell", "Trabalhe com conforto no shell do Linux e entenda como os sistemas de arquivos organizam os dados."))

# ---------------------------------------------------------------- data structures & algorithms
module("arrays-strings-hashing", "Arrays, Strings & Hashing", CS, "Beginner", "boxes",
       "The everyday data structures: arrays, strings, hash tables and sets.",
       ["data-structures/arrays", "data-structures/strings", "data-structures/hash-tables"],
       kind="Core",
       pt=("Arrays, Strings e Hashing", "As estruturas de dados do dia a dia: arrays, strings, tabelas hash e conjuntos."))

module("linear-data-structures", "Linked Lists, Stacks & Queues", CS, "Beginner", "boxes",
       "Linear structures and when to reach for a linked list, a stack or a queue.",
       ["data-structures/linked-lists", "data-structures/stacks", "data-structures/queues"],
       pt=("Listas Encadeadas, Pilhas e Filas", "Estruturas lineares e quando usar uma lista encadeada, uma pilha ou uma fila."))

module("trees-and-heaps", "Trees & Heaps", CS, "Intermediate", "boxes",
       "Binary trees and heaps, the structures behind hierarchies and priority queues.",
       ["data-structures/trees", "data-structures/heaps"],
       kind="Core",
       pt=("Árvores e Heaps", "Árvores binárias e heaps, as estruturas por trás de hierarquias e filas de prioridade."))

module("search-trees-and-tries", "Search Trees, Tries & String Algorithms", CS, "Advanced", "boxes",
       "Ordered lookups with binary search trees, prefix search with tries and classic string algorithms.",
       ["data-structures/binary-search-trees", "data-structures/tries", "algorithms/string-algorithms"],
       requires=["trees-and-heaps"],
       pt=("Árvores de Busca, Tries e Algoritmos de Strings",
           "Buscas ordenadas com árvores binárias de busca, busca por prefixo com tries e algoritmos clássicos de strings."))

module("graph-basics", "Graphs & Traversal", CS, "Intermediate", "git-branch",
       "Model relationships as graphs and explore them with BFS and DFS.",
       ["data-structures/graphs", "algorithms/graph-traversal"],
       kind="Core",
       pt=("Grafos e Travessia", "Modele relações como grafos e explore-os com BFS e DFS."))

module("searching-and-sorting", "Searching & Sorting", CS, "Beginner", "git-branch",
       "Sorting algorithms and binary search, and the trade-offs between them.",
       ["algorithms/sorting", "algorithms/binary-search"],
       kind="Core",
       pt=("Busca e Ordenação", "Algoritmos de ordenação e busca binária, e os trade-offs entre eles."))

module("array-patterns", "Two Pointers & Sliding Window", CS, "Intermediate", "git-branch",
       "Two classic patterns that turn quadratic scans over arrays and strings into linear ones.",
       ["algorithms/two-pointers", "algorithms/sliding-window"],
       kind="Core", requires=["arrays-strings-hashing"],
       pt=("Dois Ponteiros e Janela Deslizante", "Dois padrões clássicos que transformam varreduras quadráticas em arrays e strings em lineares."))

module("matrices-and-prefix-sums", "Matrices & Prefix Sums", CS, "Intermediate", "boxes",
       "Work with grids and matrices and answer range queries fast with prefix sums.",
       ["data-structures/matrices", "algorithms/prefix-sum"],
       pt=("Matrizes e Soma de Prefixos", "Trabalhe com grades e matrizes e responda consultas de intervalo rapidamente com soma de prefixos."))

module("recursive-algorithms", "Tree Traversal & Divide and Conquer", CS, "Intermediate", "git-branch",
       "Recursive algorithms that split a problem into smaller ones: tree traversals and divide and conquer.",
       ["algorithms/tree-traversal", "algorithms/divide-and-conquer"],
       requires=["trees-and-heaps"],
       pt=("Percurso em Árvores e Dividir para Conquistar",
           "Algoritmos recursivos que quebram um problema em partes menores: percursos em árvores e dividir para conquistar."))

module("greedy-and-intervals", "Greedy & Intervals", CS, "Intermediate", "git-branch",
       "Greedy choices and the interval problems, like merging and scheduling, where they shine.",
       ["algorithms/greedy", "algorithms/intervals"],
       kind="Core",
       pt=("Algoritmos Gulosos e Intervalos", "Escolhas gulosas e os problemas de intervalos, como mesclar e agendar, em que elas brilham."))

module("backtracking-and-dp", "Backtracking & Dynamic Programming", CS, "Advanced", "git-branch",
       "Search solution spaces with backtracking and avoid repeated work with dynamic programming.",
       ["algorithms/backtracking", "algorithms/dynamic-programming"],
       kind="Core",
       pt=("Backtracking e Programação Dinâmica", "Explore espaços de solução com backtracking e evite trabalho repetido com programação dinâmica."))

module("advanced-graph-algorithms", "Advanced Graph Algorithms", CS, "Advanced", "git-branch",
       "Topological sort, shortest paths and union-find for dependency, routing and connectivity problems.",
       ["algorithms/topological-sort", "algorithms/shortest-paths", "data-structures/disjoint-set", "algorithms/union-find"],
       requires=["graph-basics"],
       pt=("Algoritmos Avançados de Grafos",
           "Ordenação topológica, caminhos mínimos e union-find para problemas de dependência, rotas e conectividade."))

# ---------------------------------------------------------------- networking
module("network-models", "Network Models & Transport", CS, "Intermediate", "network",
       "The OSI and TCP/IP models, IP addressing and subnetting, and TCP versus UDP.",
       ["networking/models", "networking/ip-subnetting", "networking/tcp-udp"],
       pt=("Modelos de Rede e Transporte", "Os modelos OSI e TCP/IP, endereçamento IP e sub-redes, e TCP versus UDP."))

module("dns-and-http", "DNS & HTTP", CS, "Beginner", "network",
       "How names resolve to addresses and how HTTP and HTTPS carry the web.",
       ["networking/dns", "networking/http-https"],
       kind="Core",
       pt=("DNS e HTTP", "Como nomes viram endereços e como HTTP e HTTPS transportam a web."))

module("tls-nat-and-firewalls", "TLS, NAT & Firewalls", CS, "Intermediate", "network",
       "Encrypt traffic with TLS and certificates, and control it with NAT and firewalls.",
       ["networking/tls", "networking/nat-firewall"],
       pt=("TLS, NAT e Firewalls", "Criptografe o tráfego com TLS e certificados e controle-o com NAT e firewalls."))

module("network-infrastructure", "Proxies, CDNs & WebSockets", CS, "Intermediate", "network",
       "Proxies and load balancers, CDNs and long-lived WebSocket connections.",
       ["networking/proxies-load-balancing", "networking/cdn-websocket"],
       pt=("Proxies, CDNs e WebSockets", "Proxies e balanceadores de carga, CDNs e conexões WebSocket de longa duração."))

# ---------------------------------------------------------------- backend & security
module("http-and-apis", "HTTP & APIs", WEB, "Beginner", "server",
       "Build REST APIs over HTTP and design them well: resources, status codes, pagination and versioning.",
       ["backend-engineering/http-rest", "backend-engineering/api-design"],
       kind="Core",
       pt=("HTTP e APIs", "Construa APIs REST sobre HTTP e projete-as bem: recursos, status codes, paginação e versionamento."))

module("beyond-rest", "Webhooks, Real-Time & gRPC", WEB, "Intermediate", "server",
       "Integration styles beyond request/response: webhooks, WebSockets and SSE, and gRPC.",
       ["backend-engineering/webhooks", "backend-engineering/realtime", "backend-engineering/grpc"],
       requires=["http-and-apis"],
       pt=("Webhooks, Tempo Real e gRPC", "Estilos de integração além de request/response: webhooks, WebSockets e SSE, e gRPC."))

module("caching-and-queues", "Caching & Queues", WEB, "Intermediate", "database-zap",
       "Speed up services with caching and idempotent APIs, and move slow work to background jobs and queues.",
       ["backend-engineering/backend-caching", "backend-engineering/background-jobs"],
       requires=["http-and-apis"],
       pt=("Cache e Filas", "Acelere serviços com cache e APIs idempotentes, e mova trabalho lento para jobs em background e filas."))

module("security-foundations", "Security Foundations", SEC, "Beginner", "shield",
       "The two most exploited web weaknesses: injection and broken access control.",
       ["security/injection", "security/authorization"],
       kind="Core",
       pt=("Fundamentos de Segurança", "As duas falhas web mais exploradas: injeção e controle de acesso quebrado."))

module("auth-fundamentals", "Authentication Fundamentals", SEC, "Intermediate", "shield",
       "How web apps keep users signed in with sessions, cookies and tokens, and how XSS and CSRF attacks abuse them.",
       ["backend-engineering/auth", "security/xss-csrf"],
       kind="Core",
       pt=("Fundamentos de Autenticação",
           "Como aplicações web mantêm usuários autenticados com sessões, cookies e tokens, e como ataques XSS e CSRF exploram isso."))

module("identity-protocols", "Passwords, OAuth & OIDC", SEC, "Intermediate", "shield",
       "Store passwords safely, add MFA, and delegate identity with OAuth, OpenID Connect and JWT.",
       ["security/passwords-authentication", "security/oauth-oidc-jwt"],
       pt=("Senhas, OAuth e OIDC", "Armazene senhas com segurança, adicione MFA e delegue identidade com OAuth, OpenID Connect e JWT."))

module("api-and-infrastructure-security", "API & Infrastructure Security", SEC, "Advanced", "shield",
       "Defend services against SSRF, configure CORS, security headers and TLS, and manage secrets with least privilege.",
       ["security/ssrf", "security/cors-headers-tls", "security/secrets"],
       pt=("Segurança de APIs e Infraestrutura",
           "Proteja serviços contra SSRF, configure CORS, headers de segurança e TLS, e gerencie secrets com menor privilégio."))

module("secure-design", "Threat Modeling & Secure Coding", SEC, "Advanced", "shield",
       "Use the OWASP Top 10 and threat modeling to find risks early, and write code that resists them.",
       ["security/owasp-threat-modeling", "security/secure-coding"],
       kind="Core",
       pt=("Modelagem de Ameaças e Programação Segura",
           "Use o OWASP Top 10 e a modelagem de ameaças para encontrar riscos cedo e escreva código que resista a eles."))

# ---------------------------------------------------------------- databases
module("sql-foundations", "SQL Foundations", DATA_CAT, "Beginner", "database",
       "Query relational data with SELECT, filtering, sorting and joins.",
       ["databases/sql-basics", "databases/joins"],
       kind="Core",
       pt=("Fundamentos de SQL", "Consulte dados relacionais com SELECT, filtros, ordenação e joins."))

module("sql-for-analytics", "SQL for Analytics", DATA_CAT, "Intermediate", "database",
       "Summarize data with GROUP BY and HAVING, and answer harder questions with subqueries, CTEs and window functions.",
       ["databases/aggregation", "databases/advanced-sql"],
       kind="Core", requires=["sql-foundations"],
       pt=("SQL para Análise de Dados",
           "Resuma dados com GROUP BY e HAVING e responda perguntas mais difíceis com subqueries, CTEs e window functions."))

module("sql-for-applications", "SQL for Applications", DATA_CAT, "Intermediate", "database",
       "Keep application data correct with transactions, ACID, isolation levels, locking and MVCC.",
       ["databases/transactions", "databases/concurrency"],
       kind="Core", requires=["sql-foundations"],
       pt=("SQL para Aplicações", "Mantenha os dados da aplicação corretos com transações, ACID, níveis de isolamento, locks e MVCC."))

module("sql-performance", "SQL Performance", DATA_CAT, "Advanced", "gauge",
       "Read query plans, choose the right indexes and fix N+1 queries and connection pool problems.",
       ["databases/indexing", "performance/database-performance"],
       kind="Core", requires=["sql-foundations"],
       pt=("Performance de SQL", "Leia planos de execução, escolha os índices certos e corrija consultas N+1 e problemas de connection pool."))

module("data-modeling-and-scaling", "Data Modeling & Scaling", DATA_CAT, "Advanced", "database",
       "Model data with normalization and constraints, then scale it with replication, sharding, pooling and NoSQL stores.",
       ["databases/data-modeling", "databases/scaling-databases", "databases/nosql"],
       kind="Core", requires=["sql-foundations"],
       pt=("Modelagem e Escala de Dados",
           "Modele dados com normalização e constraints e escale-os com replicação, sharding, pooling e bancos NoSQL."))

# ---------------------------------------------------------------- system design
module("system-design-foundations", "System Design Foundations", ARCH, "Intermediate", "server",
       "Client-server basics, caching with Redis and CDNs: the first tools for building fast systems.",
       ["system-design/fundamentals", "system-design/caching", "system-design/cdn"],
       kind="Core",
       pt=("Fundamentos de System Design", "Básico de cliente-servidor, cache com Redis e CDNs: as primeiras ferramentas para construir sistemas rápidos."))

module("scaling-systems", "Scaling Systems", ARCH, "Advanced", "server",
       "Scale vertically and horizontally, balance load and partition data across machines.",
       ["system-design/scaling", "system-design/load-balancing", "system-design/replication-partitioning"],
       requires=["system-design-foundations"],
       pt=("Escalando Sistemas", "Escale vertical e horizontalmente, balanceie carga e particione dados entre máquinas."))

module("messaging-and-events", "Messaging & Events", ARCH, "Advanced", "workflow",
       "Decouple services with queues, message brokers and events, and make consumers idempotent.",
       ["system-design/messaging", "system-design/event-driven", "system-design/idempotency"],
       pt=("Mensageria e Eventos", "Desacople serviços com filas, message brokers e eventos, e torne os consumidores idempotentes."))

module("api-gateway-and-rate-limiting", "Rate Limiting & API Gateways", ARCH, "Advanced", "server",
       "Protect and route traffic with rate limiting, API gateways and service discovery.",
       ["system-design/rate-limiting", "system-design/api-gateway"],
       pt=("Rate Limiting e API Gateways", "Proteja e roteie o tráfego com rate limiting, API gateways e service discovery."))

module("distributed-systems", "Distributed Systems", ARCH, "Expert", "network",
       "Resilience patterns, consistency and consensus, and sagas with the outbox pattern for work that spans services.",
       ["system-design/resilience", "system-design/consistency", "system-design/distributed-transactions"],
       kind="Core",
       pt=("Sistemas Distribuídos",
           "Padrões de resiliência, consistência e consenso, e sagas com o padrão outbox para operações que atravessam serviços."))

module("high-availability-and-dr", "High Availability & Disaster Recovery", ARCH, "Advanced", "cloud",
       "Design for failure with redundancy across regions and availability zones, and plan disaster recovery.",
       ["system-design/high-availability", "cloud/regions-dr"],
       kind="Core",
       pt=("Alta Disponibilidade e Recuperação de Desastres",
           "Projete para falhas com redundância entre regiões e zonas de disponibilidade, e planeje a recuperação de desastres."))

module("safe-releases-and-slos", "Safe Releases & SLOs", OPS, "Advanced", "activity",
       "Release with blue/green, canary and feature flags, and decide how much risk to take with SLOs and error budgets.",
       ["devops/deployment-strategies", "observability/slo"],
       kind="Core",
       pt=("Releases Seguros e SLOs",
           "Faça releases com blue/green, canary e feature flags, e decida quanto risco assumir com SLOs e error budgets."))

module("design-tradeoffs-and-interviews", "Design Trade-offs & Interviews", CAREER, "Advanced", "target",
       "Make and explain technical decisions, communicate architecture and work through classic system design interviews.",
       ["engineering-leadership/technical-decisions", "engineering-leadership/communication",
        "system-design/interview-scenarios|Classic Interview Designs"],
       kind="Core",
       pt=("Trade-offs de Design e Entrevistas",
           "Tome e explique decisões técnicas, comunique arquitetura e resolva entrevistas clássicas de system design."),
       pt_steps={"system-design/interview-scenarios": "Designs Clássicos de Entrevista"})

# ---------------------------------------------------------------- languages
module("csharp-fundamentals", "C# Fundamentals", LANG, "Beginner", "hash",
       "C# syntax, types, structs and records, and object-oriented programming with classes and interfaces.",
       ["csharp/language-basics", "csharp/oop"],
       kind="Core",
       pt=("Fundamentos de C#", "Sintaxe, tipos, structs e records do C#, e orientação a objetos com classes e interfaces."))

module("csharp-generics-and-linq", "Generics, Collections & LINQ", LANG, "Intermediate", "hash",
       "Write reusable typed code with generics, pick the right collection and query it with LINQ.",
       ["csharp/generics", "csharp/collections", "csharp/linq"],
       requires=["csharp-fundamentals"],
       pt=("Generics, Coleções e LINQ", "Escreva código tipado e reutilizável com generics, escolha a coleção certa e consulte-a com LINQ."))

module("csharp-language-features", "C# Language Features", LANG, "Intermediate", "hash",
       "Exceptions and nullable references, delegates and events, and reflection with attributes.",
       ["csharp/exceptions-nullability", "csharp/delegates-events", "csharp/reflection-attributes"],
       requires=["csharp-fundamentals"],
       pt=("Recursos da Linguagem C#", "Exceções e nullable references, delegates e eventos, e reflection com atributos."))

module("csharp-async-and-concurrency", "Async & Concurrency in C#", LANG, "Advanced", "hash",
       "async/await and tasks, threads, locks and concurrent collections.",
       ["csharp/async-await", "csharp/concurrency"],
       kind="Core",
       pt=("Async e Concorrência em C#", "async/await e tasks, threads, locks e coleções concorrentes."))

module("csharp-memory-and-performance", "Memory & Performance in C#", LANG, "Advanced", "hash",
       "The garbage collector and IDisposable, Span<T> and allocation-friendly code.",
       ["csharp/memory-gc", "csharp/performance"],
       requires=["csharp-fundamentals"],
       pt=("Memória e Performance em C#", "O garbage collector e IDisposable, Span<T> e código com poucas alocações."))

module("python-core", "Python Core", LANG, "Beginner", "terminal",
       "Pythonic syntax and collections, functions and decorators, iterators and generators, classes and exceptions.",
       ["python/syntax-collections", "python/functions-decorators", "python/iterators-generators", "python/classes",
        "python/exceptions-context"],
       pt=("Python Essencial", "Sintaxe e coleções pythônicas, funções e decoradores, iteradores e geradores, classes e exceções."))

module("python-tooling-and-testing", "Python Tooling & Testing", LANG, "Intermediate", "terminal",
       "Modules and virtual environments, type hints and automated testing.",
       ["python/modules-venv", "python/typing", "python/testing-python"],
       requires=["python-core"],
       pt=("Ferramentas e Testes em Python", "Módulos e ambientes virtuais, type hints e testes automatizados."))

module("python-concurrency-and-performance", "Python Concurrency & Performance", LANG, "Advanced", "terminal",
       "asyncio, threads and processes, and making Python code faster.",
       ["python/asyncio-concurrency", "python/performance-python"],
       requires=["python-core"],
       pt=("Concorrência e Performance em Python", "asyncio, threads e processos, e como deixar código Python mais rápido."))

module("java-core", "Java Core", LANG, "Intermediate", "coffee",
       "Classes and interfaces, exceptions, generics, collections and streams.",
       ["java/oop-java", "java/exceptions-java", "java/generics-collections", "java/streams"],
       pt=("Java Essencial", "Classes e interfaces, exceções, generics, coleções e streams."))

module("java-platform", "JVM, Concurrency & Spring", LANG, "Advanced", "coffee",
       "How the JVM and its garbage collector work, threads and concurrency, and Spring fundamentals.",
       ["java/jvm", "java/gc-java", "java/concurrency-java", "java/spring"],
       requires=["java-core"],
       pt=("JVM, Concorrência e Spring", "Como a JVM e seu garbage collector funcionam, threads e concorrência, e os fundamentos de Spring."))

module("javascript-core", "JavaScript Core", LANG, "Beginner", "braces",
       "Types and coercion, scope and closures, functions and this, objects, prototypes and classes.",
       ["javascript/types", "javascript/scope-closures", "javascript/functions-this", "javascript/objects-prototypes"],
       pt=("JavaScript Essencial", "Tipos e coerção, escopo e closures, funções e this, objetos, protótipos e classes."))

module("javascript-async-and-browser", "Async JavaScript & the DOM", LANG, "Intermediate", "braces",
       "Promises, async/await and the event loop, plus the DOM and fetch.",
       ["javascript/async", "javascript/dom-browser"],
       kind="Core",
       pt=("JavaScript Assíncrono e DOM", "Promises, async/await e o event loop, além do DOM e do fetch."))

module("javascript-in-depth", "Modules, Errors & Performance", LANG, "Intermediate", "braces",
       "Organize code with modules, handle errors well and avoid memory and performance pitfalls.",
       ["javascript/modules", "javascript/errors", "javascript/performance-memory"],
       requires=["javascript-core"],
       pt=("Módulos, Erros e Performance", "Organize o código com módulos, trate erros bem e evite armadilhas de memória e performance."))

module("typescript-basics", "TypeScript Basics", LANG, "Beginner", "file-type",
       "Primitive types and inference, and when to use interfaces or type aliases.",
       ["typescript/basic-types", "typescript/interfaces-types"],
       kind="Core",
       pt=("Fundamentos de TypeScript", "Tipos primitivos e inferência, e quando usar interfaces ou type aliases."))

module("typescript-narrowing-and-generics", "Unions, Generics & Modules", LANG, "Intermediate", "file-type",
       "Model data with unions and narrowing, write generic code and organize it with enums and modules.",
       ["typescript/unions-narrowing", "typescript/generics", "typescript/enums-modules"],
       requires=["typescript-basics"],
       pt=("Unions, Generics e Módulos", "Modele dados com unions e narrowing, escreva código genérico e organize-o com enums e módulos."))

module("typescript-advanced-types", "Advanced TypeScript Types", LANG, "Advanced", "file-type",
       "Utility types and advanced type-level programming.",
       ["typescript/utility-types", "typescript/advanced-types"],
       requires=["typescript-narrowing-and-generics"],
       pt=("Tipos Avançados de TypeScript", "Utility types e programação avançada no nível de tipos."))

# ---------------------------------------------------------------- frontend
module("html-and-css", "HTML & CSS", WEB, "Beginner", "layout",
       "Semantic HTML and modern CSS layout with Flexbox and Grid.",
       ["frontend/html-semantics", "frontend/css-layout"],
       kind="Core",
       pt=("HTML e CSS", "HTML semântico e layout moderno com CSS, Flexbox e Grid."))

module("accessibility-and-responsive-design", "Accessibility & Responsive Design", WEB, "Beginner", "layout",
       "Build interfaces everyone can use, on every screen size.",
       ["frontend/accessibility", "frontend/responsive-design"],
       requires=["html-and-css"],
       pt=("Acessibilidade e Design Responsivo", "Construa interfaces que todos conseguem usar, em qualquer tamanho de tela."))

module("browser-rendering-and-performance", "Browser Rendering & Web Performance", WEB, "Intermediate", "gauge",
       "How browsers render pages and how to make them load and respond fast.",
       ["frontend/browser-fundamentals", "frontend/web-performance"],
       pt=("Renderização no Navegador e Performance Web", "Como os navegadores renderizam páginas e como fazê-las carregar e responder rápido."))

module("frontend-architecture-and-security", "Frontend Architecture & Security", WEB, "Advanced", "layout",
       "Structure frontends and their state, and protect them from client-side attacks.",
       ["frontend/frontend-architecture", "frontend/web-security"],
       pt=("Arquitetura e Segurança no Frontend", "Estruture frontends e seu estado, e proteja-os de ataques no lado do cliente."))

module("react-foundations", "React Foundations", FW, "Beginner", "atom",
       "Components and JSX, props, state and events, and the useState and useEffect hooks.",
       ["react/components-jsx", "react/props-state", "react/hooks"],
       kind="Core",
       pt=("Fundamentos de React", "Componentes e JSX, props, estado e eventos, e os hooks useState e useEffect."))

module("react-hooks-in-depth", "Refs, Context & Custom Hooks", FW, "Intermediate", "atom",
       "Reach the DOM with refs, share state with context and extract logic into custom hooks.",
       ["react/refs-context", "react/custom-hooks"],
       requires=["react-foundations"],
       pt=("Refs, Context e Hooks Customizados", "Acesse o DOM com refs, compartilhe estado com context e extraia lógica em hooks customizados."))

module("react-rendering-and-memoization", "Rendering & Memoization", FW, "Advanced", "atom",
       "How React renders and reconciles, and when useMemo, useCallback and memo actually help.",
       ["react/rendering", "react/memoization"],
       requires=["react-foundations"],
       pt=("Renderização e Memoização", "Como o React renderiza e reconcilia, e quando useMemo, useCallback e memo realmente ajudam."))

module("react-data-and-forms", "Data Fetching & Forms", FW, "Intermediate", "atom",
       "Fetch and cache server data with React Query and build forms with solid validation.",
       ["react/data-fetching", "frontend/forms-validation"],
       kind="Core", requires=["react-foundations"],
       pt=("Busca de Dados e Formulários", "Busque e faça cache de dados do servidor com React Query e construa formulários com validação sólida."))

module("react-in-production", "React in Production", FW, "Intermediate", "atom",
       "Routing, error boundaries and testing React components.",
       ["react/routing-forms", "react/error-boundaries", "react/testing-react"],
       requires=["react-foundations"],
       pt=("React em Produção", "Roteamento, error boundaries e testes de componentes React."))

# ---------------------------------------------------------------- .NET
module("dotnet-platform", "The .NET Platform", FW, "Intermediate", "layers",
       "The CLR, JIT and GC, dependency injection, and configuration, options and logging.",
       ["dotnet/runtime", "dotnet/dependency-injection", "dotnet/configuration"],
       pt=("A Plataforma .NET", "O CLR, JIT e GC, injeção de dependência, e configuração, options e logging."))

module("aspnet-core", "ASP.NET Core", FW, "Intermediate", "layers",
       "Middleware, routing and endpoints, with authentication and authorization.",
       ["dotnet/aspnetcore", "dotnet/aspnetcore-security"],
       requires=["dotnet-platform"],
       pt=("ASP.NET Core", "Middleware, roteamento e endpoints, com autenticação e autorização."))

module("ef-core", "EF Core", FW, "Intermediate", "database",
       "Map and query data with Entity Framework Core and keep it fast and safe under concurrency.",
       ["dotnet/ef-core", "dotnet/ef-core-performance"],
       requires=["dotnet-platform"],
       pt=("EF Core", "Mapeie e consulte dados com Entity Framework Core e mantenha o acesso rápido e seguro sob concorrência."))

module("dotnet-hosting-and-testing", "Hosting & Testing .NET", FW, "Intermediate", "layers",
       "Background services and health checks, and testing .NET applications.",
       ["dotnet/hosting", "dotnet/testing-dotnet"],
       requires=["aspnet-core"],
       pt=("Hospedagem e Testes em .NET", "Background services e health checks, e testes de aplicações .NET."))

# ---------------------------------------------------------------- testing & quality
module("testing-essentials", "Testing Essentials", ENG, "Beginner", "flask-conical",
       "Unit tests with Arrange-Act-Assert, then integration and end-to-end tests.",
       ["testing/unit-testing", "testing/integration-e2e"],
       kind="Core",
       pt=("Fundamentos de Testes", "Testes unitários com Arrange-Act-Assert, e depois testes de integração e end-to-end."))

module("test-doubles-and-design", "Test Doubles & Test Design", ENG, "Intermediate", "flask-conical",
       "Isolate code with mocks, stubs and fakes, and design boundary, negative and regression tests.",
       ["testing/test-doubles", "testing/test-design"],
       requires=["testing-essentials"],
       pt=("Dublês de Teste e Design de Testes", "Isole código com mocks, stubs e fakes, e projete testes de limite, negativos e de regressão."))

module("testing-strategy", "Testing Strategy", ENG, "Advanced", "flask-conical",
       "TDD and the test pyramid, plus property-based, mutation and contract testing.",
       ["testing/tdd-pyramid", "testing/advanced-testing"],
       kind="Core",
       pt=("Estratégia de Testes", "TDD e a pirâmide de testes, além de testes de propriedade, mutação e contrato."))

module("performance-testing-and-profiling", "Performance Testing & Profiling", ENG, "Advanced", "gauge",
       "Load and stress test systems, then profile and benchmark code to find the bottleneck.",
       ["testing/performance-testing", "performance/profiling-benchmarking"],
       kind="Core",
       pt=("Testes de Performance e Profiling", "Faça testes de carga e estresse e depois use profiling e benchmarks para achar o gargalo."))

# ---------------------------------------------------------------- devops, containers, observability
module("ci-cd", "CI/CD", OPS, "Beginner", "infinity",
       "Turn code into versioned build artifacts and ship them through continuous integration and delivery pipelines.",
       ["devops/build-artifacts", "devops/ci-cd"],
       kind="Core",
       pt=("CI/CD", "Transforme código em artefatos de build versionados e entregue-os com pipelines de integração e entrega contínuas."))

module("infrastructure-as-code", "Infrastructure as Code", OPS, "Intermediate", "infinity",
       "Manage configuration and secrets per environment and provision infrastructure as code with Terraform.",
       ["devops/configuration-secrets", "devops/iac"],
       pt=("Infraestrutura como Código", "Gerencie configuração e secrets por ambiente e provisione infraestrutura como código com Terraform."))

module("observability-essentials", "Observability Essentials", OPS, "Intermediate", "activity",
       "Structured logging and distributed tracing with OpenTelemetry.",
       ["observability/logging", "observability/tracing"],
       kind="Core",
       pt=("Fundamentos de Observabilidade", "Logs estruturados e tracing distribuído com OpenTelemetry."))

module("metrics-and-alerting", "Metrics & Alerting", OPS, "Intermediate", "activity",
       "Measure services with metrics and the golden signals, and turn them into dashboards, alerts and incident response.",
       ["observability/metrics", "observability/alerting-incidents"],
       pt=("Métricas e Alertas", "Meça serviços com métricas e golden signals, e transforme-as em dashboards, alertas e resposta a incidentes."))

module("docker-essentials", "Docker Essentials", OPS, "Beginner", "container",
       "What containers are and how images, layers and the build cache work.",
       ["docker/containers", "docker/images-layers"],
       kind="Core",
       pt=("Fundamentos de Docker", "O que são containers e como funcionam imagens, camadas e o cache de build."))

module("dockerfile-and-compose", "Dockerfile & Compose", OPS, "Intermediate", "container",
       "Write efficient multi-stage Dockerfiles and run multi-container apps with Docker Compose.",
       ["docker/dockerfile", "docker/compose"],
       kind="Core", requires=["docker-essentials"],
       pt=("Dockerfile e Compose", "Escreva Dockerfiles multi-stage eficientes e rode aplicações com vários containers usando Docker Compose."))

module("docker-in-production", "Docker in Production", OPS, "Intermediate", "container",
       "Volumes, networks and ports, image registries, and container security and resource limits.",
       ["docker/volumes-networks", "docker/registries", "docker/docker-security"],
       requires=["dockerfile-and-compose"],
       pt=("Docker em Produção", "Volumes, redes e portas, registries de imagens, e segurança e limites de recursos de containers."))

module("kubernetes-essentials", "Kubernetes Essentials", OPS, "Intermediate", "ship-wheel",
       "Clusters, nodes and namespaces, and running pods with deployments and ReplicaSets.",
       ["kubernetes/architecture", "kubernetes/workloads"],
       kind="Core",
       pt=("Fundamentos de Kubernetes", "Clusters, nodes e namespaces, e como rodar pods com deployments e ReplicaSets."))

module("kubernetes-networking-and-config", "Kubernetes Networking, Config & Storage", OPS, "Advanced", "ship-wheel",
       "Expose workloads with services and ingress, configure them with ConfigMaps and Secrets, and persist data with volumes.",
       ["kubernetes/services-networking", "kubernetes/config-secrets", "kubernetes/storage"],
       requires=["kubernetes-essentials"],
       pt=("Redes, Configuração e Armazenamento no Kubernetes",
           "Exponha workloads com services e ingress, configure-os com ConfigMaps e Secrets, e persista dados com volumes."))

module("kubernetes-in-production", "Kubernetes in Production", OPS, "Advanced", "ship-wheel",
       "Health probes, requests, limits and autoscaling, and rolling updates.",
       ["kubernetes/probes", "kubernetes/resources-autoscaling", "kubernetes/rollouts"],
       requires=["kubernetes-essentials"],
       pt=("Kubernetes em Produção", "Probes de saúde, requests, limits e autoscaling, e rolling updates."))

# ---------------------------------------------------------------- cloud
module("cloud-foundations", "Cloud Foundations", OPS, "Beginner", "cloud",
       "IaaS, PaaS and SaaS, compute options from VMs to serverless, and managed storage and databases.",
       ["cloud/service-models", "cloud/compute", "cloud/storage-databases"],
       kind="Core",
       pt=("Fundamentos de Cloud", "IaaS, PaaS e SaaS, opções de computação de VMs a serverless, e armazenamento e bancos de dados gerenciados."))

module("aws-foundations", "AWS Foundations", OPS, "Beginner", "cloud",
       "The core AWS services, and how cloud identity and secrets keep access under control.",
       ["cloud/aws|AWS Core Services", "cloud/identity-secrets"],
       kind="Core", requires=["cloud-foundations"],
       pt=("Fundamentos de AWS", "Os serviços essenciais da AWS, e como identidade e secrets na cloud mantêm o acesso sob controle."),
       pt_steps={"cloud/aws": "Serviços Essenciais da AWS"})

module("cloud-operations", "Cloud Operations", OPS, "Intermediate", "cloud",
       "Cloud networking, load balancing and autoscaling, monitoring, and how the same concepts map to Google Cloud.",
       ["cloud/cloud-networking", "cloud/monitoring", "cloud/gcp"],
       requires=["cloud-foundations"],
       pt=("Operações em Cloud", "Redes, balanceamento de carga e autoscaling na cloud, monitoramento, e como os mesmos conceitos se aplicam ao Google Cloud."))

module("azure-compute-and-data", "Azure Compute, Data & Identity", OPS, "Intermediate", "cloud-cog",
       "App Service, Container Apps, Functions and AKS, Azure SQL, PostgreSQL and Blob Storage, and Key Vault with managed identity.",
       ["azure/compute", "azure/data", "azure/identity-security"],
       pt=("Computação, Dados e Identidade no Azure",
           "App Service, Container Apps, Functions e AKS, Azure SQL, PostgreSQL e Blob Storage, e Key Vault com managed identity."))

module("azure-messaging-and-operations", "Azure Messaging, Networking & Monitoring", OPS, "Intermediate", "cloud-cog",
       "Service Bus and Event Grid, virtual networks and gateways, and Azure Monitor with Application Insights.",
       ["azure/messaging", "azure/networking", "azure/monitoring"],
       requires=["azure-compute-and-data"],
       pt=("Mensageria, Redes e Monitoramento no Azure",
           "Service Bus e Event Grid, redes virtuais e gateways, e Azure Monitor com Application Insights."))

# ---------------------------------------------------------------- AI, ML & data
module("ml-foundations", "ML Foundations", AI, "Intermediate", "chart-scatter",
       "Supervised and unsupervised learning, training and validation, and the metrics used to judge models.",
       ["machine-learning/ml-fundamentals", "machine-learning/validation", "machine-learning/metrics"],
       kind="Core",
       pt=("Fundamentos de Machine Learning",
           "Aprendizado supervisionado e não supervisionado, treino e validação, e as métricas usadas para avaliar modelos."))

module("supervised-models", "Supervised Models", AI, "Advanced", "chart-scatter",
       "Regression and classification, the bias-variance trade-off and regularization, and tree ensembles.",
       ["machine-learning/regression-classification", "machine-learning/bias-variance", "machine-learning/trees-ensembles"],
       requires=["ml-foundations"],
       pt=("Modelos Supervisionados", "Regressão e classificação, o trade-off entre viés e variância e regularização, e ensembles de árvores."))

module("advanced-ml", "Features, Clustering & Neural Networks", AI, "Advanced", "chart-scatter",
       "Engineer better features, find structure with clustering and PCA, and train neural networks.",
       ["machine-learning/feature-engineering", "machine-learning/clustering-pca", "machine-learning/neural-networks"],
       requires=["ml-foundations"],
       pt=("Features, Clusterização e Redes Neurais", "Crie features melhores, encontre estrutura com clusterização e PCA, e treine redes neurais."))

module("llm-application-basics", "LLM Application Basics", AI, "Intermediate", "brain-circuit",
       "How neural networks, transformers and LLMs work, tokens and context windows, and prompting for structured outputs.",
       ["ai-engineering/ai-fundamentals", "ai-engineering/llm-fundamentals", "ai-engineering/prompt-engineering"],
       pt=("Fundamentos de Aplicações com LLMs",
           "Como funcionam redes neurais, transformers e LLMs, tokens e janelas de contexto, e prompts com saídas estruturadas."))

module("rag-and-retrieval", "RAG & Retrieval", AI, "Advanced", "brain-circuit",
       "Embeddings and vector search, and retrieval-augmented generation with chunking and reranking.",
       ["ai-engineering/embeddings-vector-search", "ai-engineering/rag"],
       requires=["llm-application-basics"],
       pt=("RAG e Recuperação de Informação", "Embeddings e busca vetorial, e geração aumentada por recuperação com chunking e reranking."))

module("ai-agents", "Tool Calling & Agents", AI, "Advanced", "brain-circuit",
       "Let models call functions and tools, and build agents with memory and MCP.",
       ["ai-engineering/tool-calling", "ai-engineering/agents"],
       requires=["llm-application-basics"],
       pt=("Tool Calling e Agentes", "Permita que modelos chamem funções e ferramentas, e construa agentes com memória e MCP."))

module("production-ai", "Production AI", AI, "Expert", "brain-circuit",
       "Evaluate quality and hallucinations, defend against prompt injection, and manage latency, cost and routing.",
       ["ai-engineering/evaluation", "ai-engineering/ai-security", "ai-engineering/llm-ops"],
       requires=["llm-application-basics"],
       pt=("IA em Produção", "Avalie qualidade e alucinações, defenda-se de prompt injection e gerencie latência, custo e roteamento."))

module("data-pipelines", "Data Pipelines", AI, "Intermediate", "workflow",
       "ETL and ELT, batch versus streaming, and orchestrating pipelines.",
       ["data-engineering/etl-elt", "data-engineering/batch-streaming", "data-engineering/orchestration"],
       pt=("Pipelines de Dados", "ETL e ELT, batch versus streaming, e orquestração de pipelines."))

module("data-storage-and-formats", "Data Storage & Formats", AI, "Intermediate", "workflow",
       "Warehouses, lakes and lakehouses, and storing data efficiently with Parquet and partitioning.",
       ["data-engineering/storage-architectures", "data-engineering/formats-partitioning"],
       pt=("Armazenamento e Formatos de Dados", "Warehouses, lakes e lakehouses, e armazenamento eficiente com Parquet e particionamento."))

module("streaming-and-data-quality", "Kafka & Data Quality", AI, "Advanced", "workflow",
       "Stream events with Kafka and keep data trustworthy with schema evolution and quality checks.",
       ["data-engineering/kafka", "data-engineering/schema-quality"],
       requires=["data-pipelines"],
       pt=("Kafka e Qualidade de Dados", "Transmita eventos com Kafka e mantenha os dados confiáveis com evolução de schema e checagens de qualidade."))

# ---------------------------------------------------------------- software design & architecture
module("design-principles", "Design Principles", ENG, "Intermediate", "sparkles",
       "SOLID, coupling and cohesion, and DRY, KISS and YAGNI.",
       ["clean-code/solid", "clean-code/coupling-cohesion", "clean-code/principles"],
       pt=("Princípios de Design", "SOLID, acoplamento e coesão, e DRY, KISS e YAGNI."))

module("design-patterns", "Design Patterns", ENG, "Intermediate", "puzzle",
       "Creational, structural and behavioral patterns, plus repository and unit of work for data access.",
       ["design-patterns/creational", "design-patterns/structural", "design-patterns/behavioral", "design-patterns/data-access"],
       requires=["design-principles"],
       pt=("Padrões de Projeto", "Padrões criacionais, estruturais e comportamentais, além de repository e unit of work para acesso a dados."))

module("layered-and-clean-architecture", "Layered & Clean Architecture", ARCH, "Advanced", "building",
       "Layered, clean, hexagonal and onion architectures, and how they keep the domain independent.",
       ["software-architecture/layered", "software-architecture/clean-hexagonal"],
       pt=("Arquitetura em Camadas e Clean Architecture", "Arquiteturas em camadas, clean, hexagonal e onion, e como elas mantêm o domínio independente."))

module("service-architecture", "Monoliths, Microservices & DDD", ARCH, "Advanced", "building",
       "Choose between a modular monolith and microservices, and draw the boundaries with domain-driven design.",
       ["software-architecture/modular-monolith", "software-architecture/microservices", "software-architecture/ddd"],
       kind="Core",
       pt=("Monolitos, Microsserviços e DDD", "Escolha entre um monolito modular e microsserviços, e defina as fronteiras com domain-driven design."))

module("advanced-architecture-styles", "Event-Driven, CQRS & Serverless", ARCH, "Expert", "building",
       "Event-driven architecture, CQRS and event sourcing, API gateways and BFFs, and serverless.",
       ["software-architecture/event-driven-architecture", "software-architecture/cqrs-event-sourcing",
        "software-architecture/api-gateway-bff", "software-architecture/serverless"],
       pt=("Orientação a Eventos, CQRS e Serverless", "Arquitetura orientada a eventos, CQRS e event sourcing, API gateways e BFFs, e serverless."))

# ---------------------------------------------------------------- git & collaboration
module("git-essentials", "Git Essentials", TOOLS, "Beginner", "git-merge",
       "Repositories and commits, branches, merges and resolving conflicts.",
       ["git/basics", "git/branching-merging"],
       kind="Core",
       pt=("Fundamentos de Git", "Repositórios e commits, branches, merges e resolução de conflitos."))

module("git-collaboration", "Git Collaboration", TOOLS, "Beginner", "git-merge",
       "Fetch, pull and push with remotes, and team workflows built on pull requests.",
       ["git/remotes", "git/workflows"],
       kind="Core", requires=["git-essentials"],
       pt=("Colaboração com Git", "Fetch, pull e push com remotos, e fluxos de trabalho em equipe baseados em pull requests."))

module("git-history-rewriting", "Rewriting & Recovering History", TOOLS, "Intermediate", "git-merge",
       "Rebase, reset and revert, and power tools like cherry-pick, stash and tags.",
       ["git/rebase", "git/undoing", "git/advanced"],
       requires=["git-essentials"],
       pt=("Reescrevendo e Recuperando o Histórico", "Rebase, reset e revert, e ferramentas como cherry-pick, stash e tags."))

module("code-review-and-mentoring", "Code Review & Mentoring", CAREER, "Intermediate", "users",
       "Give and receive useful code reviews and help teammates grow.",
       ["engineering-leadership/code-review", "engineering-leadership/mentoring"],
       kind="Core",
       pt=("Code Review e Mentoria", "Dê e receba code reviews úteis e ajude colegas de equipe a crescer."))

module("incident-response", "Incidents & Reliability", CAREER, "Intermediate", "users",
       "Handle incidents calmly, learn from them and build reliability practices into the team.",
       ["engineering-leadership/incident-handling", "engineering-leadership/reliability"],
       kind="Core",
       pt=("Incidentes e Confiabilidade", "Lide com incidentes com calma, aprenda com eles e incorpore práticas de confiabilidade à equipe."))


# ---------------------------------------------------------------- emit
def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _dump(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def build(topics):
    """Returns the modules.json list; asserts slugs, scopes and step counts."""
    names = {t["slug"]: {s["slug"]: s["name"] for s in t["subtopics"]} for t in topics}
    out, seen, owner = [], set(), {}
    for m in MODULES:
        assert m["slug"] not in seen, f"duplicate module {m['slug']}"
        seen.add(m["slug"])
        assert 2 <= len(m["steps"]) <= 6, f"{m['slug']}: modules have 2-6 steps"
        steps = []
        for s in m["steps"]:
            ref, _, title = s.partition("|")
            topic, _, sub = ref.partition("/")
            assert topic in names and sub in names[topic], f"{m['slug']}: unknown scope {ref}"
            assert ref not in owner, f"scope {ref} is in {owner[ref]} and {m['slug']}"
            owner[ref] = m["slug"]
            steps.append({"topic": topic, "subtopic": sub, "title": title or names[topic][sub]})
        out.append({"slug": m["slug"], "name": m["name"], "description": m["description"], "kind": m["kind"],
                    "category": m["category"], "level": m["level"], "icon": m["icon"], "standalone": m["standalone"],
                    "requires": m["requires"], "steps": steps})
    for m in MODULES:
        for dep in m["requires"]:
            assert dep in seen, f"{m['slug']} requires unknown module {dep}"
    return out


def build_pt(pt_topics):
    """Returns the pt-BR "modules" section: name, description and step titles keyed by topic/subtopic."""
    out = {}
    for m in MODULES:
        assert m["pt"], f"{m['slug']}: missing pt-BR name/description"
        steps = {}
        for s in m["steps"]:
            ref = s.partition("|")[0]
            topic, _, sub = ref.partition("/")
            title = m["pt_steps"].get(ref) or pt_topics[topic]["subtopics"][sub]
            steps[ref] = title
        out[m["slug"]] = {"name": m["pt"][0], "description": m["pt"][1], "steps": steps}
    return out


if __name__ == "__main__":
    modules = build(_load(os.path.join(DATA, "topics.json")))
    _dump(os.path.join(DATA, "modules.json"), modules)

    pt = _load(PT_PATH)
    pt["modules"] = build_pt(pt["topics"])
    _dump(PT_PATH, pt)
    print(len(modules), "modules,", sum(len(m["steps"]) for m in modules), "steps")
