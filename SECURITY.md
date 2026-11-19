# Política de Segurança

## Reportando vulnerabilidades

**Não abra issue pública.** Envie os detalhes para **marcosfeliphe404@gmail.com** com:

- descrição da vulnerabilidade;
- passos para reproduzir;
- impacto estimado;
- versão afetada.

## Tempos de resposta

- Confirmação: até 3 dias úteis.
- Investigação inicial: até 7 dias úteis.
- Correção: prazo definido após avaliação de severidade.
- Divulgação coordenada: até 90 dias, creditando o autor se desejar.

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| 1.0.x | Sim |

## Escopo

API HTTP, autenticação, autorização, upload de arquivos, geração de PDF e PWA. Problemas em dependências devem ser reportados aqui se afetarem o Cuco.

## Uso responsável

Não explore a vulnerabilidade além do necessário para demonstrá-la, não acesse dados de outras pessoas e aguarde a correção antes de divulgar publicamente.

## Configuração segura em produção

- Defina `SESSION_SECRET` com valor aleatório de 48 bytes.
- Use HTTPS e `SECURE_COOKIES=1`.
- Não exponha o banco SQLite diretamente à internet.
- Mantenha `TRUST_PROXY=1` apenas atrás de proxy confiável.
- Faça backup de `data/cuco.db` regularmente.
