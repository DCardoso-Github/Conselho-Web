# Conselho-Web
Aplicação Web para o Conselho de Classe.

## Desenvolvimento

Requer Node.js 20.9 ou superior. Execute `npm ci` e `npm run dev`.
Consulte a documentação da versão instalada em `node_modules/next/dist/docs` antes de alterar APIs do Next.js.

## Interface para reuniões

- Início e alunos: seis cartões por página, com busca e filtros aplicados à turma inteira.
- Iniciar conselho: escolha explícita entre todos os alunos e alunos com notas vermelhas.
- Ficha e apresentação: painéis Notas, Frequência e Prova Paulista e Acompanhamento.
- Quatro disciplinas por página. Trocar o aluno reinicia o painel e a página de disciplinas.
- Ferramentas de importação, fotos, exportação e exclusão em Gerenciar turma.
- Tema escuro inicial; a preferência salva e o tema claro continuam disponíveis no Menu.
- Edição explícita, com confirmação de descarte e proteção ao sair da página.

As rotas permanecem iguais. A apresentação aceita `scope=all|low` e `from=<id>`.
Sem `scope`, mantém o recorte anterior: alunos com notas vermelhas, ou a turma toda quando não houver nenhum.
Se `from` apontar para um aluno fora do recorte, a sequência passa a incluir toda a turma.

Os registros continuam no IndexedDB local, sem mudança de esquema. Reimportar um mapão atualiza as notas e preserva fotos, anotações, ficha, frequência e Prova Paulista já associadas.
Domínios de prévia e produção têm armazenamentos independentes.

## Validação

`npm run test` testa recortes da apresentação, valores ausentes versus zero e o fluxo real de importação → edição → exportação → reimportação usando IndexedDB em memória.
`npm run lint` e `npm run build` verificam o código e a compilação de produção.

`npm run fixtures` gera planilhas e uma imagem sintéticas em `artifacts/fixtures` (ignorado pelo Git).
Importe os sete mapões pela interface para testar paginação, nomes longos, oito disciplinas e informações ausentes.
Importe também Prova Paulista e Frequência/Tutor pela turma 6A.

Validação manual realizada com dados fictícios:

- Apresentação em 1280×720, 1366×768 e 1920×1080; tablet 768×1024 e celular 390×844.
- Reflow em 640×360, equivalente à área útil de 1280×720 com ampliação de 200%. O zoom real do navegador embutido não respondeu ao atalho; precisa de conferência final em um navegador comum.
- Temas claro e escuro, busca fora da primeira página, filtros e ordenação.
- Painéis e paginação independentes, retorno a Notas ao trocar de aluno e navegação por setas.
- Edição, salvamento, confirmação ao voltar com alterações pendentes e observações extensas com rolagem.
- Importações de mapão, Prova Paulista e frequência; downloads de XLSX e PDF.
- Comparação visual com o commit original usando os mesmos alunos fictícios.

Redução de movimento é respeitada por CSS e por MotionConfig. A preferência do sistema não foi modificada durante os testes.
