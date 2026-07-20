# Deploy — World Time Box

Guia passo a passo para colocar worldtimebox.com no ar via Vercel.

## Status atual

- [x] Código completo no GitHub: https://github.com/guipenalva-tech/world-time-zone
- [x] Domínio registrado: worldtimebox.com (expira 2027-07-19, renovação automática ligada)
- [x] Build de produção validada (601 páginas estáticas, tsc limpo)
- [ ] Projeto criado no Vercel
- [ ] Domínio apontado
- [ ] E-mail de contato criado

## Etapa 1 — Criar o projeto no Vercel (~5 min)

1. Acesse https://vercel.com e faça login com a conta GitHub (guipenalva-tech)
2. **Add New → Project**
3. Importe o repositório `guipenalva-tech/world-time-zone`
4. Framework: Next.js (detectado automaticamente pelo vercel.json)
5. Antes de clicar em Deploy, abra **Environment Variables** e adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://worldtimebox.com` |

   (As variáveis de AdSense ficam para depois da aprovação — sem elas o site
   renderiza os placeholders, que é o correto para a fase de revisão.)

6. Clique em **Deploy** e aguarde (~2-3 min)
7. Teste a URL temporária `*.vercel.app` que o Vercel gera

## Etapa 2 — Apontar o domínio (~10 min + propagação)

No Vercel:
1. Projeto → **Settings → Domains**
2. Adicione `worldtimebox.com` e `www.worldtimebox.com`
3. O Vercel vai mostrar as instruções de DNS. Escolha UMA das opções:

**Opção A — Nameservers do Vercel (recomendada, mais simples):**
- O Vercel mostra dois nameservers (ex: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
- No painel do registrador (Hostinger): Domínio → DNS/Nameservers → **Editar**
- Substitua `lunar.dns-parking.com` e `solar.dns-parking.com` pelos do Vercel
- Propagação: minutos a 48h (geralmente < 2h)

**Opção B — Registros A/CNAME (mantém DNS no registrador):**
- Registro A: `@` → `76.76.21.21`
- CNAME: `www` → `cname.vercel-dns.com`

4. Aguarde o Vercel validar (aba Domains mostra "Valid Configuration")
5. HTTPS é automático (certificado Let's Encrypt provisionado pelo Vercel)

## Etapa 3 — E-mail de contato (~10 min)

O site publica `contact@worldtimebox.com` na página de Contato.
Crie esse endereço de UMA das formas:

**Opção A — Encaminhamento gratuito (suficiente para começar):**
- Hostinger: Emails → Encaminhamento de e-mail → criar
  `contact@worldtimebox.com` → encaminhar para `ai4guip@gmail.com`
- (Se usar os nameservers do Vercel na Etapa 2, os registros MX precisam
  ser criados no Vercel: Settings → Domains → DNS Records)

**Opção B — Caixa postal real (Hostinger Email, Zoho Mail grátis, etc.)**

Teste enviando um e-mail para o endereço antes de submeter ao AdSense.

## Etapa 4 — Pós-deploy (mesmo dia)

1. **Smoke test em produção**: abra https://worldtimebox.com e verifique
   - Home carrega nos 11 idiomas (troque no seletor)
   - Uma página de cidade: https://worldtimebox.com/pt/time/tokyo
   - Páginas legais no rodapé (privacidade, termos, sobre, contato)
   - Banner de consentimento aparece na primeira visita
2. **Google Search Console**: https://search.google.com/search-console
   - Adicionar propriedade `worldtimebox.com` (verificação via DNS TXT)
   - Enviar os sitemaps: os 11 estão listados em
     https://worldtimebox.com/robots.txt (`/sitemap/0.xml` … `/sitemap/10.xml`)
3. **Bing Webmaster Tools** (importa direto do Search Console)

## Etapa 5 — AdSense (após 1-2 semanas de site no ar)

Deixar o Google indexar o site primeiro melhora a chance de aprovação.

1. https://adsense.google.com → criar conta → adicionar site `worldtimebox.com`
2. Colocar o código de verificação (o layout já suporta via env)
3. Aguardar revisão (1-14 dias)
4. Quando aprovado:
   - Copiar o publisher ID (`ca-pub-…`) para `public/ads.txt` (substituir o placeholder)
   - Criar as unidades de anúncio e preencher no Vercel:
     `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM`,
     `NEXT_PUBLIC_ADSENSE_SLOT_INFEED_1`
   - Redeploy
   - Recomendação: ativar só ~3 posições na largada e crescer depois

## Rollback

Qualquer deploy anterior pode ser restaurado em Vercel → Deployments →
menu ⋯ → Promote to Production.
