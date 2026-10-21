import type { Messages } from "../en";
import { clip } from "../en/catalog";

// Versão em português de en/catalog.ts.
export const catalog: Messages["catalog"] = {
  nav: {
    label: "Conta",
    home: "Início do TechRat",
    signIn: "Entrar",
    startFree: "Comece grátis",
    otherLanguage: "View in English",
    breadcrumb: "Navegação estrutural",
    catalog: "Catálogo",
  },
  index: {
    title: "Roadmaps para devs e temas de entrevista de tecnologia",
    description: "Todos os roadmaps do TechRat, do júnior ao sênior, e todos os temas com suas questões de entrevista. Leitura grátis; crie uma conta para praticar.",
    heading: "Roadmaps e temas",
    intro: "Todas as trilhas de aprendizado e todos os bancos de questões do TechRat. Abra um para ver o que ele cobre e crie uma conta grátis para praticar.",
    roadmaps: "Roadmaps",
    topics: "Temas",
    questions: (n) => `${n} questões`,
    modules: (n) => `${n} módulos`,
  },
  roadmap: {
    title: (name) => `Roadmap ${name}`,
    hours: (h) => `cerca de ${h} horas`,
    modules: (n) => `${n} módulos`,
    steps: (n) => `${n} etapas`,
    facts: "Sobre este roadmap",
    prerequisites: "Antes de começar",
    content: "O que você vai aprender",
    optional: "Opcional",
    cta: "Comece este roadmap grátis",
    ctaText: "Cada etapa é liberada quando você responde bem às suas questões, e um módulo concluído conta em todos os roadmaps que o compartilham.",
  },
  topic: {
    title: (name) => `Questões de entrevista de ${name}`,
    description: (total, name, about) =>
      clip(`${total} questões de ${name}, do fácil ao expert, cada uma com explicação e link para a documentação oficial. ${about}`),
    questions: (n) => `${n} questões`,
    byDifficulty: "Questões por dificuldade",
    subtopics: "Subtemas",
    cta: "Pratique estas questões grátis",
    ctaText: "A prática se adapta à sua taxa de acerto, e cada resposta rende XP no seu nível deste tema.",
  },
};
