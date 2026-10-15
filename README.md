# Conselho-Web
Aplicação Web para o Conselho de Classe.

## Desenvolvimento

Requer Node.js 20.9 ou superior. Execute `npm ci` e `npm run dev`.
Consulte a documentação da versão instalada em `node_modules/next/dist/docs` antes de alterar APIs do Next.js.

## Interface para reuniões

- Início: seis turmas por página. Lista da turma: todos os alunos na mesma página, com busca, filtros e ordenação.
- Alunos destaque: até cinco alunos com maior média de notas numéricas de 0 a 10 nas disciplinas da turma. Ausências e conceitos não numéricos são ignorados; alunos sem nota numérica ficam fora. Empates: menos notas vermelhas, nome e ordem original. A lista exibe a média e a quantidade de disciplinas consideradas, com apresentação exclusiva via `scope=top`. A seleção é calculada sobre a turma inteira, independentemente dos filtros da lista.
- Iniciar conselho: escolha explícita entre todos os alunos e alunos com notas vermelhas.
- Ficha e apresentação: foto ampliada e identidade do aluno em aproximadamente 28% da largura e informações acadêmicas em 72%, com adaptação para celular.
- Abas ocupam toda a faixa superior; foto ampliada e disciplinas ficam no centro. Frequência anual, participação e acertos da Prova Paulista ocupam toda a faixa inferior e permanecem visíveis em qualquer aba.
- Todas as disciplinas juntas, com ícones e títulos centralizados. Filtro Somente notas vermelhas com contagem por aluno, mantido ao navegar entre alunos e abas.
- Cabeçalho centralizado, controles compactos e cartões com altura mínima baseada no conteúdo. Em janelas menores, rolagem acessível evita sobreposição. Fotos são exibidas inteiras, sem corte para preencher o espaço. Novas importações preservam a proporção original (até 1200 px); fotos já recortadas precisam ser reenviadas para recuperar as áreas removidas.
- Abas para notas do bimestre, resultados por disciplina da Prova Paulista e acompanhamento. Trocar o aluno retorna às notas do bimestre.
- Grade adaptável: dezoito disciplinas simultâneas em 1886×886 e 1886×1065; em telas menores ou conjuntos maiores, rolagem acessível mantém todos os resultados disponíveis sem paginação.
- Ferramentas de importação, fotos, exportação e exclusão em Gerenciar turma.
- Tema escuro inicial; a preferência salva e o tema claro continuam disponíveis no Menu.
- Edição explícita, com confirmação de descarte e proteção ao sair da página.

As rotas permanecem iguais. A apresentação aceita `scope=all|low|top|evolution` e `from=<id>`.
Sem `scope`, mantém o recorte anterior: alunos com notas vermelhas, ou a turma toda quando não houver nenhum.
Nos recortes all/low/top, se `from` apontar para um aluno fora do recorte, a sequência passa a incluir toda a turma.

Os registros continuam no IndexedDB local. A versão 2 acrescenta a tabela gradePeriods sem apagar ou transformar os registros anteriores. Reimportar um mapão preserva IDs, fotos, anotações, ficha, frequência e Prova Paulista dos alunos correspondentes.
Domínios de prévia e produção têm armazenamentos independentes.

## Bimestres e evolução

- Na importação inicial, informe ano e bimestre. Importe arquivos do mesmo período por vez.
- Para turmas existentes sem período, abra **Gerenciar turma → Mapões e bimestres** e identifique primeiro o ano/bimestre das notas atuais, sem precisar reimportá-las.
- Importe outros mapões da mesma turma e ano nesse painel. O bimestre mais recente permanece ativo; anteriores entram apenas no histórico. Atualizar um bimestre existente exige marcar explicitamente a substituição. Cada bimestre pode ser exportado como XLSX separadamente.
- **Alunos evolução** compara dois bimestres escolhidos, sempre do inicial para um posterior. A média usa somente disciplinas comuns com notas numéricas válidas de 0 a 10 nos dois períodos. Notas ausentes, conceitos (ET etc.) e disciplinas novas/removidas não são imputados como zero.
- A associação usa o nome normalizado (acentos, caixa e espaços), sem aproximação. Participam os alunos da turma atual encontrados nos dois períodos; nomes ambíguos e alunos sem pares de notas são excluídos da comparação. Importações com nomes duplicados são rejeitadas.
- São exibidos até cinco ganhos positivos na média, do maior para o menor; desempate por maior quantidade de disciplinas comparadas, nome e ordem original. A cobertura pode variar por aluno e é indicada nos cartões. A comparação da turma inteira inclui quedas, estabilidade e ausência de comparação.
- **Apresentar evolução** usa `scope=evolution&year=2026&baseline=1&target=3` e abre a comparação selecionada, retornando a esse painel ao trocar de aluno. As outras abas continuam mostrando os dados atuais.
- Edições nas notas atuais atualizam apenas o bimestre ativo. Importar um bimestre anterior nunca substitui a turma atual; excluir a turma também exclui seus bimestres. Anos diferentes na mesma turma são rejeitados para evitar associações entre turmas anuais distintas.

## Validação

`npm run test` cobre seleção, valores ausentes versus zero, importação/edição/exportação/reimportação, migração do banco v1→v2, preservação do histórico, substituição explícita, nomes duplicados, comparação de disciplinas comuns e cinco maiores evoluções, usando IndexedDB em memória.
`npm run lint` e `npm run build` verificam o código e a compilação de produção.

`npm run fixtures` gera planilhas e uma imagem sintéticas em `artifacts/fixtures` (ignorado pelo Git).
Importe os sete mapões pela interface para testar paginação das turmas, lista completa de alunos, nomes longos, oito disciplinas e informações ausentes.
Importe também Prova Paulista e Frequência/Tutor pela turma 6A.

Validação manual realizada com dados fictícios:

- Apresentação em 1280×720, 1366×768 e 1920×1080; tablet 768×1024 e celular 390×844.
- Reflow em 640×360, equivalente à área útil de 1280×720 com ampliação de 200%. O zoom real do navegador embutido não respondeu ao atalho; precisa de conferência final em um navegador comum.
- Temas claro e escuro, busca fora da primeira página, filtros e ordenação.
- Painéis independentes, retorno às notas do bimestre ao trocar de aluno e navegação por setas.
- Visão integrada com oito, quinze e dezoito disciplinas, lista completa com nove alunos e indicadores ausentes tratados como Sem informação.
- Edição, salvamento, confirmação ao voltar com alterações pendentes e observações extensas com rolagem.
- Importações de mapão, Prova Paulista e frequência; downloads de XLSX e PDF.
- Comparação visual com o commit original usando os mesmos alunos fictícios.

Redução de movimento é respeitada por CSS e por MotionConfig. A preferência do sistema não foi modificada durante os testes.

Para testar evolução, importe `7B_2026_3bim.xlsx` como terceiro bimestre e depois `7B_2026_1bim.xlsx` como primeiro. Os dados fictícios têm cinco ganhos positivos (6, 5, 4, 3 e 2 pontos), uma queda, estabilidade, zero e ausência de notas.
