import type { Messages } from "../en";

/*
 * Versão em português de en/legal.ts: mesmo significado, mesma ordem. Trechos {{TODO(legal): …}} / {{TODO(owner): …}}
 * marcam fatos que o código não consegue provar e ficam visíveis de propósito (veja o arquivo em inglês).
 */
export const legal: Messages["legal"] = {
  footer: {
    label: "Legal",
    privacy: "Política de Privacidade",
    terms: "Termos de Uso",
    deleteAccount: "Excluir conta",
  },
  page: {
    home: "Início do TechRat",
    signIn: "Entrar",
    updated: (date) => `Última atualização: ${date}`,
    contactLabel: "Contato",
  },
  draft: {
    title: "Rascunho: aguardando revisão jurídica",
    text: "Este texto foi preparado a partir do funcionamento atual do produto e ainda não foi revisado por um advogado. Os itens marcados com TODO precisam ser confirmados antes de esta página ser publicada como definitiva.",
  },
  consent: {
    before: "Ao criar uma conta, você concorda com os ",
    terms: "Termos de Uso",
    and: " e com a ",
    privacy: "Política de Privacidade",
    after: ".",
  },
  meta: {
    privacy: { title: "Política de Privacidade", description: "Quais dados pessoais o TechRat coleta, por quê, quem pode vê-los, por quanto tempo são mantidos e como excluí-los." },
    terms: { title: "Termos de Uso", description: "As regras para usar o TechRat: contas, uso aceitável, conteúdo, disponibilidade e encerramento." },
    accountDelete: { title: "Excluir sua conta", description: "Como excluir definitivamente sua conta e seus dados do TechRat pelo app ou pela web, o que é excluído e o que não é mantido." },
  },
  accountDelete: {
    title: "Excluir sua conta do TechRat",
    lead: "Você pode excluir sua conta do TechRat e os dados dela a qualquer momento, pelo app Android ou por esta página. Não é preciso ter o app.",
    howHeading: "Como excluir sua conta",
    steps: [
      "Entre na sua conta.",
      "Toque em “Excluir minha conta” e leia o que será excluído.",
      "Confirme com sua senha. Se a sua conta não tem senha, digite seu nome de usuário.",
    ],
    inApp: "No app Android: abra Perfil e depois Excluir conta.",
    deletedHeading: "O que é excluído",
    deletedIntro: "Tudo o que está ligado à sua conta é apagado do nosso banco de dados:",
    keptHeading: "O que não é mantido",
    kept: [
      "Nada sobre você permanece na aplicação: a conta é removida, não apenas ocultada.",
      "O conteúdo de aprendizado (questões, tópicos e roadmaps) não é dado pessoal e não é afetado.",
      "Os logs do servidor podem guardar um identificador interno aleatório da conta (sem nome e sem e-mail) até os logs expirarem. Os logs de acesso do servidor web são apagados após no máximo 40 dias; os logs da aplicação são sobrescritos conforme os arquivos, de tamanho limitado, são rotacionados.",
    ],
    timingHeading: "Quanto tempo leva",
    timing: [
      "A exclusão é imediata e irreversível. Todas as sessões terminam na hora e enviamos uma confirmação para o e-mail da conta.",
      "Backups do banco de dados feitos antes da exclusão ainda podem conter seus dados até expirarem: os backups são feitos diariamente e apagados automaticamente após 14 dias.",
    ],
    signedOutHeading: "Entre para continuar",
    signedOutText: "Você precisa estar conectado para que somente você possa excluir a sua conta.",
    signInToDelete: "Entrar para excluir sua conta",
    cannotSignIn: (email) => `Não consegue mais entrar? Escreva para ${email} a partir do e-mail da conta e peça a exclusão.`,
    checking: "Verificando sua sessão…",
  },
  privacyPage: (l) => ({
    intro: [
      `${l.companyName} (“TechRat”, “nós”) opera a plataforma de aprendizado TechRat: o site techrat.io e o app TechRat para Android. Esta política explica quais dados pessoais coletamos, por quê, quem pode vê-los, por quanto tempo os mantemos e o que você pode fazer a respeito. O controlador dos seus dados pessoais é ${l.companyName}, pessoa física residente na Irlanda, que pode ser contatada em ${l.contactEmail}.`,
    ],
    sections: [
      {
        heading: "1. Dados que coletamos",
        paragraphs: ["Dados da conta que você nos fornece:"],
        items: [
          "Endereço de e-mail, nome de usuário e nome de exibição (opcional: por padrão é o seu nome de usuário).",
          "Senha. Nunca a guardamos em texto puro: apenas um hash com salt gerado pelo ASP.NET Core Identity.",
          "Uma bio curta (até 280 caracteres) e uma foto de perfil, ambas opcionais. A foto é recortada e redimensionada no seu dispositivo antes do envio.",
          "Quando a conta foi criada e quando você entrou pela última vez.",
        ],
        closing: [
          "Dados de aprendizado gerados pelo uso do app: suas respostas e tentativas (a opção escolhida, se estava correta, tempo gasto), sessões de prática, desafios diários, XP, níveis, sequências, conquistas, progresso por tópico, roadmap e módulo, e as notificações exibidas dentro do app.",
          "Dados técnicos: sua escolha de idioma (guardada no seu dispositivo) e o endereço IP e a identificação do navegador que qualquer servidor web enxerga. O IP é usado para limitar requisições abusivas e aparece nos logs de acesso do nosso servidor web. Os logs da aplicação guardam método, rota, código de status, duração e seu identificador interno de usuário, nunca corpos de mensagens, senhas, tokens ou e-mails.",
          "Não coletamos sua localização, contatos, identificadores de publicidade ou de dispositivo, data de nascimento nem dados de pagamento, e o app não usa SDKs de analytics, publicidade ou rastreamento.",
        ],
      },
      {
        heading: "2. Como usamos os dados",
        items: [
          "Para manter sua conta e fazer você entrar com segurança.",
          "Para salvar seu progresso, conceder XP e conquistas, adaptar a dificuldade da prática à sua taxa de acerto e exibir rankings.",
          "Para enviar os e-mails de serviço descritos abaixo.",
          "Para proteger o serviço: limite de requisições, bloqueio da conta após várias senhas erradas e correção de erros.",
        ],
        closing: [
          "Não vendemos seus dados, não exibimos publicidade e não usamos seus dados para criar perfis publicitários. Nossas bases legais no GDPR são o contrato com você (sua conta, seu progresso e os e-mails que os fazem funcionar) e o nosso legítimo interesse em manter o serviço seguro (limites de requisições, bloqueios e logs). Não dependemos do seu consentimento para isso.",
        ],
      },
      {
        heading: "3. O que outros alunos podem ver",
        items: [
          "Os rankings (visíveis apenas para usuários conectados) mostram seu nome de usuário, nome de exibição, foto de perfil, nível, XP, questões respondidas e taxa de acerto.",
          "Em Configurações, Privacidade, você pode desligar “Mostrar-me nos rankings” para ficar fora de todos os rankings. Seu progresso e XP são mantidos.",
          "Um aluno conectado que abre a sua página de perfil vê seu nome de exibição, nome de usuário, foto, bio, data de entrada, nível, XP, sequências, taxa de acerto, progresso por tópico e roadmap, conquistas e atividade diária recente. Desligar os rankings não oculta, hoje, essa página de perfil.",
          "Seu endereço de e-mail nunca é mostrado a outros alunos.",
          "Sua foto de perfil é servida a partir de um endereço web que não exige login. O endereço contém um identificador interno aleatório e não é listado em lugar nenhum, mas qualquer pessoa que tenha o link consegue abri-lo.",
        ],
        closing: ["Os administradores do TechRat veem seu e-mail, nome de usuário, nome de exibição, nível, XP, número de respostas, taxa de acerto, data de criação e data do último acesso para operar e dar suporte ao serviço."],
      },
      {
        heading: "4. E-mails",
        paragraphs: [
          "Enviamos apenas e-mails de serviço: um link para confirmar seu endereço de e-mail quando você se cadastra, um aviso se alguém tentar se cadastrar com um endereço que já tem conta, um link de redefinição de senha quando você pede, um aviso de que sua senha foi alterada e uma confirmação de que sua conta foi excluída. Não enviamos e-mails de marketing.",
          "Os e-mails são entregues pela Resend, que processa a mensagem por nós na sua região europeia, na Irlanda. A Resend é uma empresa dos Estados Unidos, então qualquer transferência para ela se apoia nas salvaguardas do seu acordo de processamento de dados.",
        ],
      },
      {
        heading: "5. Cookies e armazenamento local",
        items: [
          "techrat.auth: o cookie de sessão do site. É HttpOnly (o JavaScript não consegue lê-lo), Secure e SameSite=Strict, e dura até 14 dias, renovado enquanto você usa o site. É estritamente necessário.",
          "techrat-locale: lembra seu idioma por um ano.",
          "Chave techrat.locale do localStorage: também lembra seu idioma.",
          "O app Android guarda seus tokens de acesso no armazenamento seguro do dispositivo (Android Keystore).",
        ],
        closing: ["Não usamos cookies de publicidade ou de analytics e não carregamos scripts ou fontes de terceiros."],
      },
      {
        heading: "6. Com quem compartilhamos dados",
        paragraphs: ["Não vendemos nem compartilhamos seus dados para publicidade. Usamos prestadores de serviço que apenas processam dados em nosso nome:"],
        items: [
          "Hospedagem: o TechRat roda em um servidor privado virtual da Hostinger que guarda o banco de dados (veja a seção 7 para saber onde ele fica).",
          "Envio de e-mails, como descrito acima.",
        ],
        closing: [
          "Podemos divulgar dados quando a lei exigir. Os links de estudo dentro do app abrem sites de terceiros que você escolhe visitar; lá valem as políticas deles.",
        ],
      },
      {
        heading: "7. Transferências internacionais",
        paragraphs: ["Seus dados ficam armazenados no servidor da Hostinger descrito acima, em um data center em Manchester, Reino Unido. O Reino Unido está fora do Espaço Econômico Europeu, mas a Comissão Europeia o reconhece como detentor de um nível adequado de proteção de dados (decisão de adequação), então essa transferência não exige outra salvaguarda. Os e-mails são processados na Irlanda pela Resend, como descrito na seção 4. Quando outro provedor estiver fora do Espaço Econômico Europeu, as transferências se apoiam em uma decisão de adequação ou nas cláusulas contratuais padrão da Comissão Europeia."],
      },
      {
        heading: "8. Por quanto tempo guardamos os dados",
        items: [
          "Guardamos seus dados enquanto a sua conta existir.",
          "Se você excluir a conta, suas credenciais, perfil, foto, progresso, XP, conquistas e notificações são apagados imediatamente e todas as sessões terminam.",
          "Os backups são feitos diariamente no servidor e apagados automaticamente após 14 dias, então uma cópia antiga pode conter seus dados por até 14 dias depois de você excluir a conta.",
          "Os logs do servidor podem guardar seu identificador interno aleatório (sem nome, sem e-mail) e, nos logs de acesso do servidor web, endereços IP e endereços requisitados até serem rotacionados: os logs de acesso do servidor web são apagados após no máximo 40 dias e os logs da aplicação são sobrescritos conforme os arquivos, de tamanho limitado, são rotacionados.",
        ],
      },
      {
        heading: "9. Segurança",
        paragraphs: [
          "As conexões com o TechRat usam HTTPS. As senhas são guardadas como hashes com salt, várias senhas erradas bloqueiam a conta por alguns minutos, as requisições têm limite de frequência e o banco de dados não é acessível pela internet. Nenhum sistema é perfeitamente seguro; por isso escolha uma senha forte e exclusiva.",
        ],
      },
      {
        heading: "10. Crianças",
        paragraphs: [
          "O TechRat é destinado a pessoas com 16 anos ou mais (16 é a idade de consentimento digital na Irlanda) e não coleta conscientemente dados de crianças menores. Hoje não há verificação de idade no cadastro. Se você acredita que uma criança criou uma conta, escreva para nós e a excluiremos.",
        ],
      },
      {
        heading: "11. Seus direitos",
        items: [
          "Acesso e correção: você vê seus dados no app e altera nome de exibição, bio, foto e senha em Configurações.",
          "Exclusão: em Configurações, Excluir conta (site), em Perfil, Excluir conta (app Android), ou em https://techrat.io/account/delete. Vale imediatamente.",
          `Outros pedidos, como uma cópia dos seus dados em formato portável, oposição ou restrição: escreva para ${l.contactEmail}; respondemos no prazo de um mês, como exige o GDPR. Você também pode reclamar à Data Protection Commission, a autoridade de supervisão da Irlanda (dataprotection.ie).`,
        ],
      },
      {
        heading: "12. Mudanças nesta política",
        paragraphs: ["Quando mudarmos esta política, publicaremos a nova versão nesta página com uma nova data. Em mudanças importantes, também avisaremos você no app ou por e-mail."],
      },
      {
        heading: "13. Contato",
        paragraphs: [`Dúvidas ou pedidos sobre seus dados: ${l.contactEmail}.`],
      },
    ],
  }),
  termsPage: (l) => ({
    intro: [
      `Estes termos regem o uso do TechRat, a plataforma de aprendizado operada por ${l.companyName} (o site techrat.io e o app Android). Ao criar uma conta ou usar o TechRat, você concorda com eles e com a nossa Política de Privacidade.`,
    ],
    sections: [
      {
        heading: "1. Sua conta",
        items: [
          "Informe dados corretos e mantenha sua senha em segredo. Você é responsável pelo que acontece na sua conta.",
          "Você deve ter pelo menos 16 anos, como diz a Política de Privacidade.",
          "Você pode excluir sua conta a qualquer momento (veja a Política de Privacidade).",
        ],
      },
      {
        heading: "2. Uso aceitável",
        paragraphs: ["Não é permitido:"],
        items: [
          "usar bots ou scripts para responder questões, acumular XP ou subir nos rankings, nem copiar o banco de questões;",
          "atacar, sobrecarregar ou sondar o serviço, nem tentar acessar contas ou dados de outras pessoas;",
          "usar nome, bio ou foto ilegais, de ódio, sexuais, enganosos ou que se passem por outra pessoa;",
          "usar o TechRat para qualquer fim ilegal.",
        ],
      },
      {
        heading: "3. Seu conteúdo",
        paragraphs: [
          "Seu nome de exibição, bio e foto continuam sendo seus. Você nos autoriza a mostrá-los a outros alunos dentro do TechRat, como descrito na Política de Privacidade, apenas enquanto a sua conta existir. Podemos remover conteúdo que viole estes termos.",
        ],
      },
      {
        heading: "4. Nosso conteúdo",
        paragraphs: [
          "As questões, explicações, roadmaps, o design e o software do TechRat pertencem a nós ou aos nossos licenciadores. Você pode usá-los para o seu próprio aprendizado, sem fins comerciais, mas não pode copiá-los, revendê-los ou republicá-los.",
        ],
      },
      {
        heading: "5. Conteúdo de aprendizado",
        paragraphs: [
          "O TechRat é uma ferramenta educacional. Nos esforçamos para manter questões e explicações corretas, mas não prometemos que não tenham erros, que estejam atualizadas nem que levarão você a um emprego, uma certificação ou um resultado em prova. Links para documentação levam a sites de terceiros que não controlamos.",
        ],
      },
      {
        heading: "6. Disponibilidade e mudanças",
        paragraphs: ["Podemos alterar, suspender ou encerrar funcionalidades e atualizar estes termos. Mudanças relevantes são avisadas no app ou por e-mail, e continuar usando o TechRat depois significa que você as aceita."],
      },
      {
        heading: "7. Suspensão e encerramento",
        paragraphs: ["Podemos suspender ou encerrar uma conta que viole estes termos ou ponha o serviço ou outros usuários em risco. Você pode parar de usar o TechRat e excluir sua conta a qualquer momento. Quando uma conta é excluída, seus dados são apagados como descrito na Política de Privacidade."],
      },
      {
        heading: "8. Sem garantias",
        paragraphs: ["O TechRat é oferecido “no estado em que se encontra” e “conforme a disponibilidade”, sem garantias de qualquer tipo, na medida em que a lei permitir."],
      },
      {
        heading: "9. Limitação de responsabilidade",
        paragraphs: ["Não excluímos nem limitamos a responsabilidade que a lei não permite excluir ou limitar, inclusive por fraude, por morte ou lesão corporal causadas por negligência e os seus direitos legais de consumidor. Respeitado isso, e como o TechRat é gratuito, não respondemos por perdas indiretas ou consequenciais, nem pela perda de dados ou de progresso."],
      },
      {
        heading: "10. Lei aplicável",
        paragraphs: ["Estes termos são regidos pelas leis da Irlanda e os tribunais da Irlanda têm competência. Se você é consumidor e mora em outro país da UE, mantém a proteção da lei de consumo obrigatória desse país e também pode ajuizar a ação nos tribunais dele."],
      },
      {
        heading: "11. Contato",
        paragraphs: [`Dúvidas sobre estes termos: ${l.contactEmail}.`],
      },
    ],
  }),
};
