---
name: QA Privacy LGPD
description: Auditoria de privacidade e LGPD no Cuco: minimização, direitos do titular, retenção, logs, fotos e coerência da política.
---

# QA Privacy LGPD

Use ao alterar cadastro, perfil, auditoria, exportação/eliminação ou textos de privacidade.

## Mapa de dados

Confirme o que é coletado e onde:

- Usuário: nome, login, senha (hash), perfil, foto, vínculo, timestamps.
- Integrante: nome, cargo, e-mail, cor, foto, setor/equipe/cargo.
- Escala: datas, horários, status, observações, autoria.
- Trocas/convites/notificações: partes envolvidas, status, código.
- Auditoria: ação, IP, user-agent, data.
- Configurações: dados da empresa/endereço, regras de conformidade.

Nada de localização/GPS (módulo removido) deve ser coletado.

## Checklist

- **Finalidade**: cada campo tem uso claro; não coletar “só por segurança”.
- **Minimização**: listagens não expõem hash, tokens, CSRF, IP desnecessário ou foto base64 gigante.
- **Direitos**: `GET /api/me/data` exporta os dados do próprio titular em formato legível; `DELETE /api/me/data` elimina/anonymiza conforme prometido.
- **Isolamento**: titular só acessa os próprios dados; admin não usa exportação para outro usuário sem base.
- **Retenção**: política de privacidade e comportamento real coincidem (prazos, contas inativas, fotos).
- **Consentimento/base legal**: texto explica base legal; não prometer consentimento se usa execução de contrato.
- **Transparência**: política cita categorias, finalidade, compartilhamento, retenção e direitos.
- **Segurança**: dados sensíveis em trânsito local/HTTPS em produção; logs sem senha/token.
- **Auditoria**: ações relevantes registradas com autor, data e IP; sem dado excessivo.
- **Incidentes**: canal/prazo comunicados de forma coerente.
- **Terceiros**: fontes externas (Google Fonts) e cookies divulgados; CSP coerente.
- **Menores/consentimento**: se aplicável, fluxo definido.

## Testes práticos

1. Exportar dados como funcionário e conferir se só contém os próprios registros.
2. Eliminar dados em conta demo e verificar o que some/anonimiza.
3. Procurar senha/token/CSRF em respostas, logs, HTML e PDF.
4. Comparar texto de Privacidade com endpoints e retenção real.
5. Verificar se foto e e-mail aparecem para quem não deveria.

## Evidência

Resposta dos endpoints, trechos da política, campos observados e screenshots. Aponte divergência entre promessa e prática.

## Critério de falha

Exportação vazando dados de terceiros, eliminação que não elimina, coleta não divulgada ou retenção contraditória é P0/P1.
