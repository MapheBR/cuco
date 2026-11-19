---
name: QA PWA
description: Validação do manifest, service worker, cache versionado, instalação, offline e atualização do Cuco.
---

# QA PWA

Use após mudanças em `public/sw.js`, `manifest.webmanifest`, assets ou estratégia de cache.

## Checklist

- Manifest válido: `name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, ícones 192/512.
- Ícones existem nos caminhos e tamanhos declarados; sem 404.
- Service worker registra sem erro; escopo correto.
- `CACHE` tem versão nova quando assets mudam; versões antigas são removidas no activate.
- Shell inclui HTML, CSS, JS, fontes/ícones essenciais; nada de arquivo removido.
- API cacheada apenas GET seguro (resumo, minhas escalas, configurações); escrita nunca cacheada.
- Offline: shell abre; dados sensíveis não ficam disponíveis indevidamente.
- Atualização: após deploy, `skipWaiting`/`clients.claim` não misturam versões; `?v=` dos assets está coerente.
- Botão “Atualizar” do app não fica preso em cache antigo.
- CSP permite os assets do próprio app e fontes declaradas.
- Instalação em desktop/mobile quando suportado; sem prompt agressivo.
- Logout limpa dados sensíveis do cache local.

## Procedimento

1. Abra o app com DevTools/rede e confirme o SW ativo.
2. Inspecione `caches.keys()` e os arquivos cacheados.
3. Simule offline e recarregue.
4. Faça uma alteração de versão e confirme a troca de cache.
5. Verifique se há assets antigos/removidos no cache.
6. Teste logout/limpeza.

## Evidência

Versão do cache, lista de URLs, status offline, screenshot e erros de console.

## Critério de falha

Cache preso em versão antiga, asset removido causando erro, offline quebrado ou dado sensível persistido após logout é FAIL.
