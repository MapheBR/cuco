# Como fazer o GitHub reconhecer a licença BSL 1.1

Hoje o GitHub exibe `NOASSERTION` para a licença do Cuco, embora o arquivo `LICENSE` exista. Isso acontece porque a BSL 1.1 não tem SPDX totalmente padronizado na API do GitHub.

## Opção recomendada — manter BSL 1.1 e informar no README

O GitHub continuará mostrando "Other"/"NOASSERTION", mas o README já deixa claro:

```markdown
## Licença

Copyright © 2026 Marcos Moraes. Código sob Business Source License 1.1 (BSL-1.1), com conversão para MIT em 19/11/2030. Ver `LICENSE` e `NOTICE`.
```

Atualize o `NOTICE` para `Copyright (c) 2026 Marcos Moraes` e o e-mail de contato para `marcosfeliphe404@gmail.com`.

## Opção alternativa — SPDX customizado

Se quiser que a API exiba algo legível, adicione no início do arquivo `LICENSE`:

```
SPDX-License-Identifier: LicenseRef-BSL-1.1
```

Isso é honesto (LicenseRef = licença customizada) e evita dizer que é MIT/Apache quando não é.

## O que NÃO fazer

- Não renomear o arquivo para MIT só para o GitHub mostrar badge verde — seria informação falsa.
- Não usar "All rights reserved" sem licença de uso — afasta recrutadores que querem ler e executar o projeto.
- Não colocar texto de licença de terceiros sem atribuição.

## Explicação curta para o recrutador

> Licença BSL 1.1: uso para estudo e avaliação livre; uso comercial exige autorização; vira MIT em 2030.
