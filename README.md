# TechRat — Learn › Practice › Level Up

TechRat is a gamified platform for studying technology and preparing for tech jobs. Learners answer questions, follow roadmaps, earn XP, level up globally and per topic, keep streaks, unlock badges and climb leaderboards. The content runs from programming fundamentals to system design, AI engineering, cloud and DevOps.

This repository holds a working MVP: an ASP.NET Core 10 API, a responsive Next.js web app, an Expo mobile app and a Tauri desktop app. All the clients share one API and one set of generated contracts.

| | |
|---|---|
| Knowledge tree | Topics and subtopics from programming fundamentals to AI, cloud and leadership (see [Catalog](#catalog)) |
| Question bank | Multiple-choice questions in four difficulties (counts in [Catalog](#catalog)). Every subtopic used by a roadmap has at least 6 questions. Every question has 4 options, exactly 1 correct answer, an explanation and an official reference URL. |
| Practice & Learn | **Practice** (Practice, Challenge, Random, Adaptive) draws from the whole question bank, every question the roadmaps use, or from one topic/subtopic and difficulty: Every session shows each question's answer options in its own random order, stable for that session and its review (ADR-0019). Practice, Challenge and Random draw new random questions in random order every session (never-shown questions first, then older ones, the last 3 sessions only when the pool runs out). **Learn** lists a topic's questions with the learner's result on each (new / right / wrong), filters them by difficulty and subtopic, and answers exactly the ones picked. |
| Roadmap structure | The structured path: modules go from easier to harder levels with the capstone last (`validate_catalog.py` enforces it), steps inside a module ramp up one difficulty (e.g. Easy → Medium in a Beginner module), and step sessions present questions easiest first while retrying wrong answers (ADR-0014). |
| Roadmaps | Career, language, skill and best-practice paths composed from a shared module catalog: a step proven once counts in every roadmap (full list in [Catalog](#catalog)). A **Recommended for juniors** filter shows the platform's top 6 roadmaps for a junior developer, most recommended first, and their cards carry a "#N for juniors" badge (ADR-0015). |
| Profile photo | Pick a JPG, PNG, WEBP or HEIC photo (up to 5 MB) from the device, or take one with the camera on mobile, adjust it inside a circle (drag, pinch/wheel/slider zoom, live preview) and save it. The client exports a compressed 512×512 square; the API stores it in PostgreSQL and serves it from a versioned, cacheable URL. Replacing or removing the photo updates every avatar without a reload (ADR-0017). |
| Password | Change the password from Settings (web, desktop) or the profile (mobile): the current password is checked on the server, the sign-up rules apply, other sessions are signed out while this one continues, and the owner gets an email. Accounts without a password (external sign-in, when enabled) set one instead (ADR-0018). |
| Account deletion | Delete the account from Settings (web), from Profile (mobile) or from the public page `/account/delete`, which works without the app (Google Play requires both). The owner re-authenticates with the password (or types the username when the account has none); the profile, photo, progress, XP, achievements and sessions are removed in one step, every token stops working at once (also access tokens), leaderboards stop showing the learner, and an email confirms it. The last administrator cannot delete itself (ADR-0023). |
| Privacy policy and terms | Public pages `/privacy` and `/terms` (English and Portuguese), linked from the landing page, the sign-in pages, the app footer, the register page and the mobile profile. They are **drafts pending legal review** with visible `TODO` markers; the company name and contact email are set in `apps/web/src/lib/legal.ts`. |
| Android app | The Expo app is ready for **EAS Build** and Google Play (package `io.techrat.app`, build profiles in `apps/mobile/eas.json`, release-safe API URL, minimal permissions, adaptive and themed icons). The steps that need a person are in [docs/android-release.md](docs/android-release.md) (ADR-0024); the Play Console Data safety answers are in [docs/play-store/data-safety.md](docs/play-store/data-safety.md). |
| Study resources | Each roadmap has overview reading and each module lists the topics to master with sources to learn them from (official docs, specs, books, courses, articles), each tagged with its type and language and opened in a new tab. Curated and bilingual in `resources.json`, link-checked by `validate_resources.py --check-urls` (ADR-0020). |
| Leaderboard privacy | A checkbox in Settings ("Show me on the leaderboards") removes the learner from the global, weekly, monthly and topic leaderboards at once; progress, XP and achievements are kept, and the rank shows as "—". Opting back in returns them (within the 30 s page cache). Set in the web app; the mobile app only shows the state. |
| Gamification | XP ledger, progressive levels (global + per topic), streaks, 24 achievements/badges, daily challenge, Global/Weekly/Monthly/Topic leaderboards |
| Languages | English and Brazilian Portuguese (web + desktop): the whole UI, every question (text, options, explanation), topic, module, roadmap and achievement names, server messages and emails. The mobile app is translated only on its newest screens (see [Known limitations](#known-limitations)). |

<!-- catalog:start -->
## Catalog

_Generated from the seed data by `python3 scripts/seed-src/readme_catalog.py`. Do not edit by hand; CI fails when it is out of date._

### Questions

**2,636** multiple-choice questions: Easy 731 · Medium 941 · Hard 696 · Expert 268.

<details><summary>Questions per topic</summary>

| Topic | Category | Subtopics | Questions |
|---|---|---:|---:|
| Programming Fundamentals | Computer Science | 11 | 82 |
| Data Structures | Computer Science | 13 | 87 |
| Algorithms | Computer Science | 16 | 100 |
| System Design | Architecture | 16 | 104 |
| Backend Engineering | Engineering | 8 | 53 |
| Databases | Data | 10 | 74 |
| C# | Languages | 12 | 79 |
| .NET | Frameworks | 9 | 55 |
| JavaScript | Languages | 9 | 72 |
| TypeScript | Languages | 7 | 42 |
| Frontend Engineering | Engineering | 9 | 54 |
| React | Frameworks | 11 | 66 |
| Python | Languages | 10 | 74 |
| Java | Languages | 9 | 67 |
| Git | Tools | 7 | 54 |
| Operating Systems | Computer Science | 6 | 45 |
| Computer Networking | Computer Science | 9 | 57 |
| Security | Security | 10 | 65 |
| Testing & Quality | Engineering | 14 | 102 |
| Clean Code & Software Design | Engineering | 10 | 69 |
| Design Patterns | Engineering | 5 | 35 |
| Software Architecture | Architecture | 9 | 54 |
| DevOps | Cloud & DevOps | 6 | 45 |
| Docker | Cloud & DevOps | 7 | 42 |
| Kubernetes | Cloud & DevOps | 8 | 50 |
| Cloud Engineering | Cloud & DevOps | 9 | 54 |
| Azure | Cloud & DevOps | 6 | 36 |
| AI Engineering | AI & Data | 10 | 60 |
| Machine Learning | AI & Data | 9 | 54 |
| Data Engineering | AI & Data | 7 | 42 |
| Observability | Cloud & DevOps | 5 | 31 |
| Performance Engineering | Engineering | 11 | 61 |
| Engineering Leadership | Career | 6 | 36 |
| Statistics | AI & Data | 9 | 45 |
| Data Analysis with Python | AI & Data | 8 | 48 |
| Data Visualization & BI | AI & Data | 6 | 30 |
| Spreadsheets | AI & Data | 6 | 30 |
| AI-Assisted Development | AI & Data | 10 | 50 |
| C++ | Languages | 12 | 61 |
| AWS | Cloud & DevOps | 10 | 62 |
| Offensive & Defensive Security | Security | 10 | 50 |
| API Security | Security | 7 | 35 |
| Code Review | Engineering | 6 | 37 |
| Junior Career & Interviews | Career | 14 | 112 |
| Capstones | Career | 5 | 75 |

</details>

### Roadmaps

**45** roadmaps built from **147** modules (77 shared by 2+ roadmaps) · 399 module steps.

**Recommended for juniors** (top 6): 1. Junior Software Engineer · 2. Computer Science Fundamentals · 3. Git and Collaboration · 4. JavaScript Developer · 5. SQL · 6. Data Structures and Algorithms

| # | Roadmap | Português | Type | Category | Difficulty | Modules | Steps | Estimate | Questions | Prerequisites |
|---:|---|---|---|---|---|---:|---:|---:|---:|---|
| 1 | Computer Science Fundamentals | Fundamentos de Ciência da Computação | SkillTrack | Computer Science | Beginner | 6 | 16 | 9 h | 119 | — |
| 2 | Data Structures and Algorithms | Estruturas de Dados e Algoritmos | SkillTrack | Computer Science | Intermediate | 12 | 29 | 22 h | 187 | Computer Science Fundamentals (50%) |
| 3 | Operating Systems | Sistemas Operacionais | SkillTrack | Computer Science | Intermediate | 4 | 9 | 8 h | 64 | — |
| 4 | Computer Networking | Redes de Computadores | SkillTrack | Computer Science | Intermediate | 4 | 9 | 6 h | 57 | — |
| 5 | Git and Collaboration | Git e Colaboração | SkillTrack | Tools | Beginner | 4 | 9 | 6 h | 66 | — |
| 6 | C# Developer | Desenvolvedor C# | Language | Languages | Intermediate | 5 | 12 | 10 h | 79 | — |
| 7 | Python Developer | Desenvolvedor Python | Language | Languages | Beginner | 3 | 10 | 7 h | 74 | — |
| 8 | Java Developer | Desenvolvedor Java | Language | Languages | Intermediate | 2 | 9 | 8 h | 67 | — |
| 9 | JavaScript Developer | Desenvolvedor JavaScript | Language | Languages | Beginner | 3 | 9 | 6 h | 72 | — |
| 10 | TypeScript Developer | Desenvolvedor TypeScript | Language | Languages | Intermediate | 3 | 7 | 5 h | 42 | JavaScript Developer (50%) |
| 11 | C++ Developer | Desenvolvedor C++ | Language | Languages | Intermediate | 6 (1 optional) | 13 | 10 h | 91 | — |
| 12 | Frontend Developer | Desenvolvedor Frontend | Role | Web Development | Intermediate | 9 | 19 | 12 h | 121 | — |
| 13 | React Developer | Desenvolvedor React | SkillTrack | Web Development | Intermediate | 5 | 12 | 9 h | 72 | JavaScript Developer (50%) |
| 14 | Backend Developer | Desenvolvedor Backend | Role | Web Development | Intermediate | 16 (4 optional) | 25 | 17 h | 269 | — |
| 15 | .NET Backend Developer | Desenvolvedor Backend .NET | Role | Web Development | Intermediate | 7 | 15 | 12 h | 93 | C# Developer (50%) |
| 16 | Full Stack Developer | Desenvolvedor Full Stack | Role | Web Development | Intermediate | 12 (3 optional) | 19 | 12 h | 214 | JavaScript Developer (30%) |
| 17 | Database Engineering | Engenharia de Bancos de Dados | SkillTrack | Data | Intermediate | 5 | 11 | 9 h | 80 | — |
| 18 | SQL | SQL | SkillTrack | Data | Beginner | 4 | 8 | 6 h | 62 | — |
| 19 | System Design | System Design | SkillTrack | Architecture | Advanced | 11 | 28 | 26 h | 186 | Data Structures and Algorithms (30%), Backend Developer (30%) |
| 20 | Software Architecture | Arquitetura de Software | SkillTrack | Architecture | Advanced | 5 | 16 | 15 h | 104 | — |
| 21 | Testing and Quality Engineering | Engenharia de Testes e Qualidade | SkillTrack | Engineering | Intermediate | 4 | 8 | 6 h | 52 | — |
| 22 | Security Fundamentals | Fundamentos de Segurança | SkillTrack | Security | Intermediate | 5 | 11 | 9 h | 71 | — |
| 23 | Cyber Security | Cibersegurança | Role | Security | Intermediate | 11 (1 optional) | 27 | 23 h | 170 | — |
| 24 | Docker | Docker | SkillTrack | Cloud & DevOps | Beginner | 3 | 7 | 5 h | 42 | — |
| 25 | Kubernetes | Kubernetes | SkillTrack | Cloud & DevOps | Advanced | 3 | 8 | 8 h | 50 | Docker (50%) |
| 26 | DevOps Engineer | Engenheiro DevOps | Role | Cloud & DevOps | Intermediate | 11 (3 optional) | 16 | 11 h | 186 | — |
| 27 | Cloud Engineering | Engenharia de Cloud | Role | Cloud & DevOps | Intermediate | 6 (2 optional) | 10 | 7 h | 110 | — |
| 28 | Azure Developer | Desenvolvedor Azure | SkillTrack | Cloud & DevOps | Intermediate | 2 | 6 | 4 h | 36 | Cloud Engineering (30%) |
| 29 | AWS Fundamentals | Fundamentos de AWS | SkillTrack | Cloud & DevOps | Beginner | 4 (1 optional) | 7 | 4 h | 72 | — |
| 30 | AI Engineering | Engenharia de IA | Role | AI & Data | Advanced | 6 (1 optional) | 13 | 12 h | 103 | Python Developer (30%) |
| 31 | Machine Learning | Machine Learning | SkillTrack | AI & Data | Advanced | 3 | 9 | 8 h | 54 | — |
| 32 | Data Engineering | Engenharia de Dados | Role | AI & Data | Intermediate | 7 (3 optional) | 9 | 7 h | 123 | — |
| 33 | Data Analyst | Analista de Dados | Role | AI & Data | Beginner | 11 | 37 | 24 h | 231 | — |
| 34 | Python for Data Analysis | Python para Análise de Dados | SkillTrack | AI & Data | Beginner | 4 | 17 | 10 h | 107 | — |
| 35 | AI & Data Scientist | Cientista de Dados e IA | Role | AI & Data | Advanced | 13 (4 optional) | 29 | 23 h | 236 | Python for Data Analysis (30%) |
| 36 | AI-Assisted Development (Claude Code) | Desenvolvimento Assistido por IA (Claude Code) | SkillTrack | AI & Data | Intermediate | 4 | 17 | 16 h | 102 | — |
| 37 | Junior Software Engineer | Engenheiro de Software Júnior | Role | Career | Beginner | 19 (4 optional) | 32 | 17 h | 345 | — |
| 38 | Senior Software Engineer | Engenheiro de Software Sênior | Role | Career | Expert | 18 (1 optional) | 47 | 46 h | 318 | System Design (30%) |
| 39 | Technical Interview Preparation | Preparação para Entrevistas Técnicas | SkillTrack | Career | Advanced | 9 | 21 | 16 h | 142 | — |
| 40 | Junior Interview Preparation | Preparação para Entrevistas Júnior | SkillTrack | Career | Intermediate | 12 (4 optional) | 25 | 15 h | 270 | — |
| 41 | Your First 90 Days | Seus Primeiros 90 Dias | SkillTrack | Career | Intermediate | 11 (4 optional) | 22 | 13 h | 231 | — |
| 42 | API Security Best Practices | Boas Práticas de Segurança de APIs | BestPractices | Security | Advanced | 3 (1 optional) | 7 | 7 h | 48 | — |
| 43 | Backend Performance Best Practices | Boas Práticas de Performance no Backend | BestPractices | Engineering | Advanced | 4 (1 optional) | 9 | 8 h | 73 | — |
| 44 | Code Review Best Practices | Boas Práticas de Code Review | BestPractices | Engineering | Intermediate | 2 (1 optional) | 6 | 6 h | 49 | — |
| 45 | AWS Best Practices | Boas Práticas na AWS | BestPractices | Cloud & DevOps | Advanced | 4 (1 optional) | 12 | 10 h | 94 | — |

<details><summary>Module catalog</summary>

| Module | Kind | Steps | Used by |
|---|---|---:|---|
| Programming Basics | Core | 3 | Computer Science Fundamentals, Junior Software Engineer |
| Problem Solving & Complexity | Core | 2 | Computer Science Fundamentals, Junior Software Engineer |
| Recursion & Discrete Math | Context | 2 | Computer Science Fundamentals |
| How Computers Work | Core | 4 | Computer Science Fundamentals, Junior Software Engineer |
| Processes & Memory | Core | 2 | Computer Science Fundamentals, Operating Systems, C++ Developer |
| Scheduling, System Calls & Synchronization | Context | 3 | Operating Systems |
| Linux & Shell | Core | 2 | Operating Systems, Cyber Security, DevOps Engineer |
| Arrays, Strings & Hashing | Core | 3 | Computer Science Fundamentals, Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation, Junior Interview Preparation |
| Linked Lists, Stacks & Queues | Core | 3 | Data Structures and Algorithms, Junior Software Engineer, Junior Interview Preparation |
| Trees & Heaps | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Search Trees, Tries & String Algorithms | Context | 3 | Data Structures and Algorithms |
| Graphs & Traversal | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Searching & Sorting | Core | 2 | Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation, Junior Interview Preparation |
| Two Pointers & Sliding Window | Core | 2 | Data Structures and Algorithms, Junior Software Engineer, Technical Interview Preparation, Junior Interview Preparation |
| Matrices & Prefix Sums | Context | 2 | Data Structures and Algorithms |
| Tree Traversal & Divide and Conquer | Context | 2 | Data Structures and Algorithms |
| Greedy & Intervals | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Backtracking & Dynamic Programming | Core | 2 | Data Structures and Algorithms, Technical Interview Preparation |
| Advanced Graph Algorithms | Context | 4 | Data Structures and Algorithms |
| Network Models & Transport | Core | 3 | Computer Networking, Cyber Security |
| DNS & HTTP | Core | 2 | Computer Networking, Backend Developer, System Design, Junior Software Engineer |
| TLS, NAT & Firewalls | Core | 2 | Computer Networking, Cyber Security |
| Proxies, CDNs & WebSockets | Context | 2 | Computer Networking |
| HTTP & APIs | Core | 2 | Backend Developer, Full Stack Developer, Junior Software Engineer |
| Webhooks, Real-Time & gRPC | Context | 3 | Backend Developer |
| Caching & Queues | Core | 2 | Backend Developer, Backend Performance Best Practices |
| Security Foundations | Core | 2 | Backend Developer, Security Fundamentals, Cyber Security, Junior Software Engineer |
| Authentication Fundamentals | Core | 2 | Backend Developer, Full Stack Developer, Security Fundamentals, API Security Best Practices |
| Passwords, OAuth & OIDC | Context | 2 | Security Fundamentals |
| API & Infrastructure Security | Context | 3 | Security Fundamentals |
| Threat Modeling & Secure Coding | Core | 2 | Security Fundamentals, Cyber Security, Senior Software Engineer |
| SQL Foundations | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, SQL, System Design, Data Analyst, AI & Data Scientist, Junior Software Engineer, Junior Interview Preparation |
| SQL for Analytics | Core | 2 | Database Engineering, SQL, Data Engineering, Data Analyst, AI & Data Scientist |
| SQL for Applications | Core | 2 | Backend Developer, .NET Backend Developer, Database Engineering, SQL, Senior Software Engineer |
| SQL Performance | Core | 2 | Backend Developer, Full Stack Developer, Database Engineering, SQL, Senior Software Engineer, Backend Performance Best Practices |
| Data Modeling & Scaling | Core | 3 | Database Engineering, System Design |
| System Design Foundations | Core | 3 | System Design, Technical Interview Preparation |
| Scaling Systems | Context | 3 | System Design |
| Messaging & Events | Context | 3 | System Design |
| Rate Limiting & API Gateways | Context | 2 | System Design |
| Distributed Systems | Core | 3 | System Design, Senior Software Engineer |
| High Availability & Disaster Recovery | Core | 2 | System Design, Cloud Engineering, AWS Fundamentals, Senior Software Engineer |
| Safe Releases & SLOs | Core | 2 | System Design, DevOps Engineer, Senior Software Engineer |
| Design Trade-offs & Interviews | Core | 3 | System Design, Senior Software Engineer, Technical Interview Preparation |
| C# Fundamentals | Core | 2 | C# Developer, Junior Software Engineer |
| Generics, Collections & LINQ | Context | 3 | C# Developer |
| C# Language Features | Context | 3 | C# Developer |
| Async & Concurrency in C# | Core | 2 | Operating Systems, C# Developer, .NET Backend Developer |
| Memory & Performance in C# | Context | 2 | C# Developer |
| Python Core | Core | 5 | Python Developer, Data Analyst, Python for Data Analysis |
| Python Tooling & Testing | Context | 3 | Python Developer |
| Python Concurrency & Performance | Context | 2 | Python Developer |
| Java Core | Context | 5 | Java Developer |
| JVM, Concurrency & Spring | Context | 4 | Java Developer |
| JavaScript Core | Core | 4 | JavaScript Developer, Junior Software Engineer |
| Async JavaScript & the DOM | Core | 2 | JavaScript Developer, Frontend Developer |
| Modules, Errors & Performance | Context | 3 | JavaScript Developer |
| TypeScript Basics | Core | 2 | TypeScript Developer, Frontend Developer |
| Unions, Generics & Modules | Context | 3 | TypeScript Developer |
| Advanced TypeScript Types | Context | 2 | TypeScript Developer |
| HTML & CSS | Core | 2 | Frontend Developer, Full Stack Developer |
| Accessibility & Responsive Design | Context | 2 | Frontend Developer |
| Browser Rendering & Web Performance | Context | 2 | Frontend Developer |
| Frontend Architecture & Security | Context | 2 | Frontend Developer |
| React Foundations | Core | 3 | Frontend Developer, React Developer, Full Stack Developer |
| Refs, Context & Custom Hooks | Context | 2 | React Developer |
| Rendering & Memoization | Context | 2 | React Developer |
| Data Fetching & Forms | Core | 2 | Frontend Developer, React Developer |
| React in Production | Context | 3 | React Developer |
| The .NET Platform | Context | 3 | .NET Backend Developer |
| ASP.NET Core | Context | 2 | .NET Backend Developer |
| EF Core | Context | 2 | .NET Backend Developer |
| Hosting & Testing .NET | Context | 2 | .NET Backend Developer |
| Testing Essentials | Core | 2 | Frontend Developer, Backend Developer, Full Stack Developer, Testing and Quality Engineering, Junior Software Engineer, Junior Interview Preparation, Your First 90 Days |
| Test Doubles & Test Design | Core | 2 | Testing and Quality Engineering, Your First 90 Days |
| Testing Strategy | Core | 2 | Testing and Quality Engineering, Senior Software Engineer |
| TDD Fundamentals | Core | 3 | Junior Interview Preparation, Your First 90 Days |
| TDD in Practice | Core | 4 | Junior Interview Preparation, Your First 90 Days |
| Performance Testing & Profiling | Core | 2 | Testing and Quality Engineering, Senior Software Engineer, Backend Performance Best Practices |
| CI/CD | Core | 2 | Full Stack Developer, DevOps Engineer, Junior Software Engineer |
| Infrastructure as Code | Context | 2 | DevOps Engineer |
| Observability Essentials | Core | 2 | Backend Developer, .NET Backend Developer, Senior Software Engineer |
| Metrics & Alerting | Context | 2 | DevOps Engineer |
| Docker Essentials | Core | 2 | Docker, Junior Software Engineer |
| Dockerfile & Compose | Core | 2 | Backend Developer, Full Stack Developer, Docker, DevOps Engineer |
| Docker in Production | Context | 3 | Docker |
| Kubernetes Essentials | Core | 2 | Kubernetes, DevOps Engineer |
| Kubernetes Networking, Config & Storage | Context | 3 | Kubernetes |
| Kubernetes in Production | Context | 3 | Kubernetes |
| Cloud Foundations | Core | 3 | Cloud Engineering, AWS Fundamentals |
| AWS Foundations | Core | 2 | Cloud Engineering, AWS Fundamentals, AWS Best Practices |
| Cloud Operations | Context | 3 | Cloud Engineering |
| Azure Compute, Data & Identity | Context | 3 | Azure Developer |
| Azure Messaging, Networking & Monitoring | Context | 3 | Azure Developer |
| ML Foundations | Core | 3 | AI Engineering, Machine Learning, AI & Data Scientist |
| Supervised Models | Core | 3 | Machine Learning, AI & Data Scientist |
| Features, Clustering & Neural Networks | Core | 3 | Machine Learning, AI & Data Scientist |
| LLM Application Basics | Core | 3 | AI Engineering, AI & Data Scientist |
| RAG & Retrieval | Core | 2 | AI Engineering, AI & Data Scientist |
| Tool Calling & Agents | Context | 2 | AI Engineering |
| Production AI | Context | 3 | AI Engineering |
| Data Pipelines | Context | 3 | Data Engineering |
| Data Storage & Formats | Context | 2 | Data Engineering |
| Kafka & Data Quality | Context | 2 | Data Engineering |
| Design Principles | Core | 3 | Software Architecture, Junior Interview Preparation, Your First 90 Days |
| SOLID in Practice | Core | 4 | Junior Interview Preparation, Your First 90 Days |
| Design Patterns | Context | 4 | Software Architecture |
| Layered & Clean Architecture | Context | 2 | Software Architecture |
| Monoliths, Microservices & DDD | Core | 3 | Software Architecture, Senior Software Engineer |
| Event-Driven, CQRS & Serverless | Context | 4 | Software Architecture |
| Git Essentials | Core | 2 | Git and Collaboration, Junior Software Engineer |
| Git Collaboration | Core | 2 | Git and Collaboration, DevOps Engineer, Junior Software Engineer, Your First 90 Days |
| Rewriting & Recovering History | Context | 3 | Git and Collaboration |
| Code Review & Mentoring | Core | 2 | Git and Collaboration, Senior Software Engineer, Your First 90 Days, Code Review Best Practices |
| Behavioral Interview | Context | 4 | Junior Interview Preparation |
| Junior Technical Interview | Context | 3 | Junior Interview Preparation |
| Onboarding & Your First 90 Days | Context | 4 | Your First 90 Days |
| Pull Requests for Juniors | Context | 3 | Your First 90 Days |
| Incidents & Reliability | Core | 2 | Junior Software Engineer, Senior Software Engineer, Your First 90 Days |
| Statistics Foundations | Core | 4 | Data Analyst, Python for Data Analysis, AI & Data Scientist |
| Statistical Inference & Experiments | Core | 5 | Data Analyst, AI & Data Scientist |
| Spreadsheets for Analysis | Context | 6 | Data Analyst |
| Data Analysis with NumPy & pandas | Core | 5 | Data Engineering, Data Analyst, Python for Data Analysis, AI & Data Scientist |
| Time Series & Reproducible Notebooks | Context | 2 | AI & Data Scientist |
| Data Visualization | Core | 3 | Data Analyst, Python for Data Analysis, AI & Data Scientist |
| BI Modeling & Tools | Core | 2 | Data Engineering, Data Analyst |
| Business Questions & Storytelling | Context | 2 | Data Analyst |
| AI-Assisted Development | Core | 5 | Backend Developer, Full Stack Developer, DevOps Engineer, AI Engineering, Data Engineering, AI-Assisted Development (Claude Code), Senior Software Engineer |
| Claude Code Workflows | Context | 5 | AI-Assisted Development (Claude Code) |
| AWS Core Services in Depth | Core | 6 | DevOps Engineer, Cloud Engineering, AWS Fundamentals, AWS Best Practices |
| C++ Foundations | Context | 3 | C++ Developer |
| Memory, RAII & Move Semantics | Context | 3 | C++ Developer |
| Templates, STL & Modern C++ | Context | 4 | C++ Developer |
| Concurrency & Undefined Behavior | Context | 2 | C++ Developer |
| Security Operations & Incident Response | Context | 3 | Cyber Security |
| Threats, Vulnerabilities & Pentesting | Context | 3 | Cyber Security |
| Cryptography, Zero Trust & Cloud Security | Core | 4 | Cyber Security, DevOps Engineer, Cloud Engineering, AWS Best Practices |
| API Security Best Practices | BestPractices | 4 | Backend Developer, Full Stack Developer, Cyber Security, Senior Software Engineer, API Security Best Practices |
| API Hardening & Monitoring | BestPractices | 3 | Backend Developer, Cyber Security, Senior Software Engineer, API Security Best Practices |
| Backend Performance Best Practices | BestPractices | 5 | Backend Developer, Full Stack Developer, Senior Software Engineer, Backend Performance Best Practices |
| Code Review Best Practices | BestPractices | 6 | AI-Assisted Development (Claude Code), Senior Software Engineer, Code Review Best Practices |
| AWS Best Practices | BestPractices | 4 | AWS Best Practices |
| Data Analyst Capstone | Capstone | 1 | Data Analyst |
| AI & Data Scientist Capstone | Capstone | 1 | AI & Data Scientist |
| AI-Assisted Development Capstone | Capstone | 1 | AI-Assisted Development (Claude Code) |
| Cyber Security Capstone | Capstone | 1 | Cyber Security |
| C++ Capstone | Capstone | 1 | C++ Developer |

</details>
<!-- catalog:end -->

---

## Tech stack

| Layer | Technology | Why (ADR) |
|---|---|---|
| API | ASP.NET Core 10, EF Core 10 (Npgsql, snake_case naming), ASP.NET Core Identity, SignalR, OpenAPI + Scalar docs | Modular monolith (0001), business rules on the server (0007) |
| Data | PostgreSQL 17 as the source of truth (including profile photos and Data Protection keys); Redis 7 as a cache only | 0002, 0003, 0017 |
| Background work | Transactional outbox processed by a `BackgroundService`; email via MailKit (Mailpit in development) | 0009 |
| Observability | OpenTelemetry (ASP.NET Core, HTTP, runtime, Npgsql) over OTLP, health checks, rate limiting | |
| Web | Next.js 16, React 19, Tailwind CSS 4, TanStack Query, Recharts | 0004 |
| Mobile | Expo SDK 57 / React Native 0.86 (expo-router, SecureStore), built with EAS | 0005 |
| Desktop | Tauri 2 around the web static export | 0006 |
| Shared packages | `@techrat/types` (generated from OpenAPI), `api` (openapi-fetch), `auth`, `validation` (zod), `theme`, `ui` | |
| Auth | Cookie (web) and bearer + refresh tokens (mobile, desktop) | 0008 |
| i18n | English and Brazilian Portuguese across UI, content and server messages | 0011 |
| Tests | xUnit + Testcontainers (backend), Vitest + Testing Library (web, packages, mobile), Playwright (end to end) | |
| Delivery | Docker Compose, GitHub Actions CI, continuous deployment to a VPS behind Apache, `dev` → `main` promotion gate | 0013, 0021 |

## Architecture

```
            ┌───────────── Next.js web (cookie auth, /api proxy) ─────────────┐
            │            Tauri desktop (static export, bearer tokens)         │
 Clients ───┤            Expo mobile (bearer tokens, SecureStore)             │
            └───────────── generated OpenAPI types (@techrat/types) ──────────┘
                                         │ HTTPS / JSON · SignalR
┌────────────────────────── TechRat.Api (ASP.NET Core 10) ──────────────────────────┐
│ Identity · Users · Topics · Questions · Practice/Answers · Roadmaps · Progress ·   │
│ Gamification (XP, Levels, Achievements, Streaks) · Leaderboards · Analytics ·      │
│ Notifications · Administration          — modular monolith (ADR-0001)             │
│ Outbox dispatcher (BackgroundService) · OpenTelemetry · Health checks · Rate limit │
└───────────────┬───────────────────────────────────────┬──────────────────────────┘
          PostgreSQL 17 (source of truth)          Redis 7 (cache only)
```

* **Backend:** a modular monolith. `Domain` holds the entities and pure rules, `Application` the use cases, `Infrastructure` EF Core, Redis, the outbox, email and seed, `Modules` the HTTP endpoints and `Api` the host. All business rules live in the backend (ADR-0007). Dependencies point inwards: `Domain` knows nothing, `Application` depends on `Domain` and on abstractions (`IAppDbContext`, `ICacheService`, `ICurrentUser`) that `Infrastructure` and `Modules` implement. Each feature area is an `IEndpointModule` mapped under `/api/v1`.
* **Clients:** web, mobile and desktop hold no business rules. They render what the API returns (unlock state, step status, XP) and call it through the typed client generated from the OpenAPI document (`npm run generate:api`), so a contract change fails the type check in every client.
* **Data and caching:** PostgreSQL is the only store of truth; Redis only caches (the catalog, leaderboards) and the API works without it. Content (topics, questions, roadmaps, achievements and their pt-BR translations) is seeded from JSON at startup and is idempotent.
* **Delivery:** CI builds with warnings as errors and runs every suite; merges to `main` deploy to the VPS over a restricted SSH key, and `dev` is promoted to `main` through a gate (ADR-0013, ADR-0021).
* **Answer flow:** grading, the attempt, the XP ledger, user and topic progress, the streak and roadmap steps are written in **one transaction**. Achievements, the rank snapshot and realtime notifications go through a **transactional outbox** (ADR-0009).
* **Auth:** ASP.NET Core Identity. The web app uses an HttpOnly cookie. Mobile and desktop use bearer and refresh tokens (ADR-0008).
* **Roadmaps and modules (ADR-0012):** roadmaps are ordered compositions of reusable catalog modules. Progress is stored per module step, so knowledge proven in one roadmap counts in every roadmap containing the same module, and XP is paid once. **Administrators bypass the gates:** every roadmap is unlocked (prerequisites are not required to start one) and every uncompleted module and step is open, so content can be reviewed without completing what comes before it. Learners are unaffected.

```
Topic ─┬─ Subtopic (scope) ◄── ModuleStep ──┐            each scope belongs to exactly one module
       └─ Question (EN + pt-BR)              │
                                   LearningModule (Core · Context · BestPractices · Capstone)
                                             ▲
Roadmap ── RoadmapModuleLink (order, required/optional) ──┘     RoadmapDependency (prerequisite %)

Learner: UserModuleStepCompletion (global, permanent) → UserModuleProgress → UserRoadmapProgress
```

Architecture decisions are documented in [`docs/adr`](docs/adr).

## Repository structure

```
apps/
  web/        Next.js 16 + Tailwind 4 + React Query + Recharts (also the desktop UI)
  mobile/     Expo SDK 57 / React Native (expo-router)
  desktop/    Tauri 2 shell around the web static export
packages/
  types/      generated OpenAPI contracts (schema.d.ts) + friendly aliases
  api/        typed API client (openapi-fetch) + ApiError
  auth/       BearerSession (login, single-flight refresh, logout) + TokenStorage
  validation/ zod schemas mirroring server rules
  theme/      design tokens (colors, difficulty/tier colors, radii, fonts)
  ui/         small shared web primitives (ProgressBar, DifficultyBadge, …)
backend/
  TechRat.Domain · TechRat.Application · TechRat.Infrastructure · TechRat.Modules · TechRat.Api · TechRat.Tests
  TechRat.Infrastructure/Seed/Data   topics.json · roadmaps.json · achievements.json · questions/*.json
e2e/          Playwright end-to-end tests
scripts/      seed sources and validator, OpenAPI client generation, dev helpers
docs/adr/     architecture decision records
docs/android-release.md   releasing the Android app (EAS, Google Play)
docs/play-store/          Play Console answers (Data safety)
```

## Prerequisites

* Docker with Compose v2. This is enough to run everything.
* For local development: .NET SDK 10, Node 22 and npm 10. Rust and the Tauri prerequisites are only needed for desktop builds.

## Quick start (Docker)

```bash
cp .env.example .env          # optional: set ADMIN_EMAIL / ADMIN_PASSWORD to bootstrap an admin
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API + OpenAPI UI | http://localhost:5080/docs (spec: `/openapi/v1.json`) |
| Health | http://localhost:5080/health/live · `/health/ready` |
| Mailpit (password-reset emails) | http://localhost:8025 |

On first start the API applies the migrations and runs the seed. The seed is idempotent and runs under a PostgreSQL advisory lock.

If you build behind a TLS-inspecting corporate proxy, set `EXTRA_CA_CERT=/path/to/ca.crt`. It is passed to the image builds as a BuildKit secret.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `ConnectionStrings__Postgres` | API | PostgreSQL connection (required) |
| `ConnectionStrings__Redis` | API | Redis. If empty, an in-memory cache is used |
| `Database__MigrateOnStartup` / `Database__SeedOnStartup` | API | Apply migrations and seed at startup |
| `Seed__AdminEmail` / `Seed__AdminPassword` | API | Optional bootstrap admin (Compose: `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `Cors__AllowedOrigins__N` | API | Allowed origins (web, Tauri, Expo web) |
| `Smtp__Host`, `Smtp__Port`, `Smtp__Security`, `Smtp__Username`, `Smtp__Password`, `Smtp__From`, `Smtp__ReplyTo` | API | Email delivery (Compose: `SMTP_*`; Mailpit locally). TLS is required unless `Security=None`. Setup per provider, DNS and testing: [docs/email.md](docs/email.md) |
| `App__PublicWebUrl` | API | Base URL for password-reset links |
| `Gamification__*` | API | XP values, level curve, step criteria, daily challenge (see `appsettings.json`) |
| `RateLimiting__AuthPerMinute` / `RateLimiting__AnswersPerMinute` / `RateLimiting__UploadsPerMinute` | API | Rate limits per user or IP (uploads default to 10/min; Compose: `AUTH_RATE_LIMIT_PER_MINUTE`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | API | Enables OTLP export of traces and metrics |
| `PUBLIC_WEB_URL` | web (runtime), API | Public origin (e.g. `https://techrat.io`). The web app uses it as `metadataBase` so link previews (Open Graph / Twitter card, image `app/opengraph-image.png`) carry absolute URLs; defaults to `https://techrat.io` |
| `API_INTERNAL_URL` | web (build) | Backend URL the Next.js proxy forwards to |
| `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_API_URL` | desktop build | `bearer` mode and API URL for the static export |
| `EXPO_PUBLIC_API_URL` | mobile (build) | API URL for the Expo app. **Required and `https://` in release builds** (they refuse to start otherwise); set by the `preview` and `production` EAS profiles to `https://techrat.io`. Development defaults to the emulator/localhost |
| `EXPO_PUBLIC_WEB_URL` | mobile (build) | Website the app opens for the privacy policy, terms and account deletion. Optional: defaults to the API URL (same origin in production); in development use the web dev server (`http://localhost:3000`) |

No secrets are committed. `.env.example` contains placeholders only, and the development defaults are limited to `docker-compose.yml` and `appsettings.Development.json`.

## Local development

```bash
# 1. infrastructure
docker compose up -d postgres redis mailpit
# 2. API (Development profile: migrates + seeds automatically) → http://localhost:5080
cd backend && dotnet run --project TechRat.Api --urls http://localhost:5080
# 3. web → http://localhost:3000
npm install && npm run dev:web
```

### Database and migrations

```bash
cd backend
dotnet tool restore
dotnet ef migrations add <Name> -p TechRat.Infrastructure -s TechRat.Infrastructure -o Persistence/Migrations
dotnet ef database update -p TechRat.Infrastructure -s TechRat.Infrastructure   # or rely on MigrateOnStartup
```

### Seed content

The seed sources live in `scripts/seed-src`: `topics.py` (knowledge tree), `modules.py` (module catalog) and `roadmaps.py` (roadmap compositions) generate the JSON files. `QUESTION_AUTHORING.md` has the question rules and `CATALOG_AUTHORING.md` explains how to design modules and roadmaps.

```bash
python3 scripts/seed-src/topics.py
python3 scripts/seed-src/modules.py
python3 scripts/seed-src/roadmaps.py
python3 scripts/seed-src/validate_questions.py   # schema, 4 options, 1 correct, unique ids/text, https refs, pt-BR translations, answer-length bias (≤ 35% per file)
python3 scripts/seed-src/validate_catalog.py     # modules exist, one module per scope, ≥ 5 questions per step, Core reuse, Context/Capstone rules, no cycles + reuse report
python3 scripts/seed-src/readme_catalog.py       # regenerates the README "Catalog" section
```

**Adding a module or roadmap:** add the subtopics (and at least 5 bilingual questions each) first, then the module in `modules.py` (kind, steps over the new scopes), then compose it into roadmaps in `roadmaps.py`, add the Portuguese names to `Seed/Data/i18n/pt-BR.json`, regenerate and run the validators.

The seed inserts missing records (matched by slug, external key, code or scope) and never duplicates data. Content it owns (seeded questions never edited by an admin, including their topic and subtopic, seed-managed modules and roadmap compositions, seed-managed translations) follows the seed files; anything edited in the admin area is kept. Moving a question to another topic in the seed file therefore moves it in existing databases too.

### Regenerating API contracts

```bash
npm run generate:api      # builds the API, downloads /openapi/v1.json, runs openapi-typescript
```

### Mobile and desktop

* Mobile: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://<your-ip>:5080 npx expo start`. See [`apps/mobile/README.md`](apps/mobile/README.md). To build and publish the Android app (EAS profiles, versions, Play Console): [docs/android-release.md](docs/android-release.md).
* Desktop: `npm run build -w @techrat/desktop` builds the installers. See [`apps/desktop/README.md`](apps/desktop/README.md).

## Languages (i18n)

The web and desktop apps support English (`en`) and Brazilian Portuguese (`pt-BR`).

* **Choosing the language:** the first visit follows the browser language (any Portuguese variant → `pt-BR`, anything else → English). The EN/PT toggle in the header, on the sign-in pages and in Settings saves the choice in the `techrat-locale` cookie (read by the web server for SSR) and in `localStorage` (desktop).
* **UI strings:** `apps/web/src/i18n/messages/<locale>/<namespace>.ts`, one namespace per area. The pt-BR files are typed against the English ones, so a missing key fails `npm run typecheck`. Components use `const t = useT()` and `useFormat()` for numbers, dates and durations.
* **API:** every request sends `Accept-Language`. The API (request localization) answers in that language: catalog names, validation and error messages (`TechRat.Application/Common/Localization.cs`, plus a localized Identity error describer), recommendation reasons, achievement notifications and emails. Unsupported languages fall back to English.
* **Content translations:** stored in `content.content_translations`. Catalog texts are seeded from `backend/TechRat.Infrastructure/Seed/Data/i18n/pt-BR.json` (topics/subtopics by slug, modules with step titles keyed by `topic/subtopic`, roadmaps by slug, achievements by code); questions from `Seed/Data/i18n/questions/<group>.pt-BR.json` (by question id) and served per practice session. Seed-managed rows follow the files; rows customised by an admin are kept. The base (English) text lives on the entities; missing translations fall back to it.
* **Mobile:** `apps/mobile/src/lib/i18n.ts` (device language, English and Portuguese) serves only the screens written for the Android release (version label, delete account, legal rows, register consent); its test fails when the two languages differ. Every API request from the app sends `Accept-Language`.
* **Design:** see [ADR-0011](docs/adr/0011-internationalization.md).
* **Adding a language:** add the code to `LOCALES` (web) and `AppLocales.Supported` (API), add a `messages/<locale>` folder, the server texts in `Localization.cs` and a `Seed/Data/i18n/<locale>.json`.

## Testing

| Suite | Command | What it covers |
|---|---|---|
| Backend unit + integration (xUnit, Testcontainers PostgreSQL) | `cd backend && dotnet test` | Level curve, XP, grading, XP once per question, topic progression, roadmap criteria/unlocking/prerequisites, achievements (outbox, idempotent), streaks, leaderboard ranking/periods, difficulty analytics, adaptive selection, daily challenge, auth boundaries (401/403/admin), cookies, refresh/logout, validation, seed integrity and idempotency, module catalog (composition rules, shared credit across roadmaps, XP once, optional modules, versioning, data migration, module/admin composition API), localization (catalog/messages/Identity errors/notifications in pt-BR, fallback to English, translation coverage, text parity) |
| Web component tests (Vitest + Testing Library) | `npm test -w @techrat/web` | Question flow (correct/incorrect feedback, locking, Learn more, next, summary, keyboard), auth form validation, accessibility primitives, i18n (locale detection, EN/PT switch and persistence, message parity, Accept-Language, formatting, translated validation), shared modules on roadmaps (Shared/Also in, completed elsewhere, optional/capstone, "already have N of M"), module page, admin module catalog and roadmap composition |
| Shared packages | `npm test -w @techrat/auth -w @techrat/validation` | Token refresh (single flight), validation rules |
| Mobile (jest-expo) | `npm test -w @techrat/mobile` | Answer flow with mocked API, helpers, roadmap module states (shared, completed elsewhere, optional, capstone, new steps), release-safe API URL, the store-facing `app.json`/`eas.json` settings, launcher icon geometry, account deletion and legal rows, the production-config check |
| Mobile release checks | `cd apps/mobile && npx expo-doctor` and `npm run check:production-config -w @techrat/mobile` | SDK-compatible dependencies without duplicates, and the production Expo config (package, version, https API URL); both also run in CI |
| Seed scripts (unittest) | `python3 -m unittest discover -s scripts/seed-src -p "test_*.py"` | Question validator (translations, answer-length bias), catalog validator (scope ownership, reuse, cycles, capstones, easier-to-harder module order), roadmap module ordering, README catalog generator, and that the README catalog matches the seed |
| Deploy script and promotion gate (unittest) | `python3 -m unittest discover -s deploy -p "test_*.py"` | `deploy/deploy.sh` against a throwaway git repo with fake docker/curl: deploys the CI-tested commit, keeps `.env`, rejects non-sha input, skips commits that are no longer the tip of main, rolls back when unhealthy; promotion gate accepts only `dev` of this repository into `main` |
| E2E (Playwright) | `docker compose up -d` and then `npx playwright test` | Register → logout/login → Learn → Data Structures → practice → answer → XP → topic progress → profile XP; Portuguese browser → app in Portuguese → EN/PT switch persists; mobile bottom navigation; account deletion (dialog, wrong password, public `/account/delete`, policy and terms links); bearer login, refresh and authenticated calls through the web `/api` proxy (the path the Android app uses) |

To reuse a running PostgreSQL instead of Testcontainers, set `TECHRAT_TEST_POSTGRES="Host=…;Username=…;Password=…"`.

CI (`.github/workflows/ci.yml`) runs the backend build (warnings as errors) and tests, seed validation, the seed script tests and the README catalog check, lint, typecheck, unit tests, `expo-doctor` and the production Expo config check, the web and desktop builds, Docker image builds, and the Compose + Playwright E2E. Work flows `feature branch → PR → dev → PR → main`: `main` and `dev` are protected (PRs only, CI required) and a PR into `main` must come from `dev` (`.github/workflows/promotion-gate.yml`, [ADR-0021](docs/adr/0021-dev-to-main-promotion-gate.md)). When CI passes on `main`, `.github/workflows/deploy.yml` deploys that commit to the production VPS (https://techrat.io) — see [docs/deploy.md](docs/deploy.md).

## Security

* Identity password hashing, account lockout, security-stamp validation and persisted Data Protection keys.
* The web app uses an HttpOnly, SameSite=Strict cookie, so tokens are never readable by JavaScript.
* Endpoints are rate limited: auth per IP, answers per user.
* CORS uses an explicit origin list.
* Security headers are set on both the API and the web app. A strict CSP is set on the API and in Tauri.
* All queries go through EF Core and are parameterized.
* Inputs are validated server-side and errors are returned as RFC 9457 problem details.
* Logs never contain passwords, tokens or reset codes.
* Users only ever see their own sessions. Emails are not exposed on public profiles.

## Observability

* Every request produces one structured log line with TraceId, UserId, Endpoint, StatusCode and Duration. Outside development the logs are JSON.
* OpenTelemetry traces and metrics cover ASP.NET Core, HttpClient, Npgsql and the runtime. They are exported over OTLP, so an OTel collector can forward them to Azure Monitor or Application Insights.
* `/health/live` is a liveness check. `/health/ready` checks PostgreSQL and Redis; a Redis failure is reported as *Degraded*.

## Known limitations

* **Shared modules change a few roadmap sizes:** re-composing the existing roadmaps from shared modules added steps to some of them (394 → 449 steps), so learners' percentages there can be slightly lower than before; completions are never lost (ADR-0012).
* **OAuth providers** are prepared but not wired. GitHub is featured in the UI as "coming soon".
* **Analytics** group the selected period (up to 365 days) in memory per user. This is fine at MVP scale; move to SQL or materialized aggregates when it grows.
* **Rate limiting** is in-process per instance. Move it to Redis or the gateway when scaling out.
* **Desktop tokens** are stored in the webview's app-private storage; moving them to the OS keychain is planned (ADR-0006). The desktop `.deb` was built in CI-like conditions but not exercised interactively.
* **Mobile** was verified by typecheck, unit tests, `expo-doctor` and an Android bundle export. It has not been run on a device in this environment, and no EAS build has been made yet: the first one needs the Expo and Play Console steps in [docs/android-release.md](docs/android-release.md) (store screenshots, a reviewer test account, the signing key EAS creates).
* **Privacy policy and terms are drafts.** They carry visible `TODO(owner)` and `TODO(legal)` markers (company name and contact email, minimum age, hosting and email provider and country, backup and log retention, governing law) and a draft banner; `LEGAL.draft` in `apps/web/src/lib/legal.ts` must stay true until a lawyer has reviewed them. Google Play rejects placeholder policies.
* **Account deletion** is immediate and irreversible, with no grace period. Backups made earlier, if any, and server logs (which keep the random account id) outlive it; the policy says so. People who cannot sign in are asked to write to the contact email, which needs a monitored mailbox.
* **Leaderboard opt-out** removes the learner from the rankings but does not hide the public profile page that other signed-in users can open, and the profile photo URL is anonymous and cached. The policy discloses both.
* **Apache access logs** (deployment) record query strings, so password-reset links (email and code) and `/profile?u=…` land in them. Consider logging without query strings.
* **Question types:** only MultipleChoice is playable. The other types are modeled for future use.
* On the very first startup, EF logs one expected `fail:` line while it probes for the migrations history table.
* Social features (duels, friends, teams, community) and AI recommendations are P2 and not implemented. The Community page says so.
* **Profile photos:** HEIC can be picked on iOS and in Safari; other browsers cannot decode it and ask for a JPG or PNG. Leaderboards cache rows for a few minutes, so other learners may see a new photo with that delay. The mobile photo screens are English-only, like the rest of the mobile app.
* **Study resources** cover every roadmap and module, but links rot: re-run `python3 scripts/seed-src/validate_resources.py --check-urls` before releases. Microsoft Learn rate-limits scripts (HTTP 429), so check it slowly. The mobile app does not show them yet.
* **Junior recommendations** are curated in `scripts/seed-src/roadmaps.py` (`JUNIOR_TOP`) and have no admin screen. The mobile app receives `juniorRank` but has no "Recommended for juniors" filter yet (ADR-0015).
* **Portuguese coverage:** the mobile app is translated only on its newest screens (version label, delete account, legal rows, register consent), and translations of questions and catalog texts can only be changed through the seed files (the admin area edits the English text).

## Next steps

Operations, delivery and scaling work that is still open (rollback on demand, backups, a staged plan for more traffic) is tracked in [docs/future-work.md](docs/future-work.md).

1. Content: add CodeOutput and Debugging question types; let admins edit Portuguese translations.
2. Wire OAuth starting with GitHub, then Google, Microsoft and Apple.
3. Azure deployment: Container Apps for the API and web, PostgreSQL Flexible Server, Azure Cache for Redis, Key Vault with Managed Identity, and Application Insights via OTLP. Add a deploy workflow with environment approvals.
4. Move the outbox relay to Azure Service Bus when there are multiple consumers.
5. Spaced repetition for questions answered incorrectly, and smarter adaptive selection.
6. P2 social features: duels over SignalR, friends and teams.
