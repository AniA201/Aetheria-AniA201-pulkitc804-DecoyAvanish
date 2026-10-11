# Aetheria

Aetheria helps people make sense of long clinical research documents, starting with consent forms. A participant can read shorter, plain-language explanations beside the original text, ask questions with source citations, and check their understanding before speaking with a study team. Researchers can review that wording and compare the consent form with a matching protocol. This is a synthetic demo. It does not give medical advice, record a signature, decide that someone consented, or approve a protocol.

The study AETHER-01, the product Aetherol, and Northwind Clinical Research are fictional. Visit count, study length, and payment were planted so the document check has a known mismatch. Approval status stays unverified because this preview has no authorized approval list.

One real trial is used for the research-team tools: **NCT03238781** (Amgen, AMG 301 for migraine prevention, Phase 2a, completed, 343 enrolled, results posted). Its registry record, protocol (Amendment 2, 17 Oct 2017, 132 PDF pages), statistical analysis plan, and 24 similar completed Phase 2 migraine-prevention trials were downloaded from ClinicalTrials.gov on 10 Oct 2026 and stored in `public/trials/NCT03238781/` with each source URL and retrieval time. Its results are never presented as AETHER-01's, and the app does not approve its protocol. Refresh the copy with:

```bash
npm run fetch-trial
```

The protocol PDF uses a font whose text layer is shifted by a fixed number of code points on some pages; `scripts/fetch-public-trial.mjs` decodes those pages and keeps the page numbers.

## Run

The web app and the FastAPI account service run together. One-time backend setup:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env   # then set JWT_SECRET and RESEARCHER_REGISTRATION_KEY
```

`backend/.env` uses SQLite (`DATABASE_URL=sqlite:///./aetheria.db`); the database file is created on first start and is git-ignored. Then:

```bash
npm install
npm test
npm run dev:all
```

`dev:all` starts uvicorn on the first free port from 8000 and Vite with its `/api` proxy pointed at that port, and stops both on Ctrl-C. `GET /api/health` should return `{"status":"ok"}`. `npm run dev` alone starts only the web app; sign-in and teach-back handoffs then report that the service is not reachable.

Open the local address printed by Vite. Sign in as a participant and submit a PDF, `.txt`, or `.md` consent form. A PDF is read page by page, and each page keeps its page number. A scan with no text layer is refused rather than indexed as empty. The button beside the file control, **Use included sample**, loads the bundled consent `demo/synthetic/ICF-AETHER-01-v2.1.txt` and pairs it with the sample protocol. DOCX is not read.

The dev server proxies local Ollama at `/ollama`. Inside some sandboxes, bind the server explicitly:

```bash
npm run dev:all -- --host 127.0.0.1 --port 5173
```

Optional model settings live in `.env.example`. Copy it to `.env` only if you want a different local model.

### Team secrets (`.env.team`)

Shared model keys, such as Gemini, live in `.env.team`. The file is committed, but **every value is encrypted**, so anyone without the decryption key sees only `encrypted:…`. Account-service settings live in the ignored `backend/.env` file.

1. Ask Pulkit for the decryption key in a private message. Never post it in GitHub, an issue, or a group chat.
2. Save it as a file named `.env.keys` in the repo root (git ignores it):
   ```
   DOTENV_PRIVATE_KEY_TEAM=the-key-you-were-sent
   ```
3. Run `npm run dev`. The dev server decrypts `.env.team` on start. Your own `.env.local` values, if any, take priority.

To add or change a secret (it's encrypted as it's saved): `npm run secret:set -- JWT_SECRET "value"`. Then commit `.env.team`. To read one: `npm run secret:get -- JWT_SECRET`.

| Name | Used by |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | `npm run dev` (dev server only, never the browser). `GEMINI_MODEL` is a comma-separated list. Free-tier limits are per model (`gemini-3-flash-preview` allows only 20 requests a day), so when one model hits its limit the next is used. |
| `DATABASE_URL`, `JWT_SECRET`, `RESEARCHER_REGISTRATION_KEY` | `backend/.env`; read by the FastAPI backend when `npm run api` or `npm run dev:all` starts it |

Vite puts `VITE_` values into the browser bundle, so use that prefix only for publishable values. Never use it for a database URL, password, or JWT secret. Copy `backend/.env.example` to `backend/.env` and replace the example JWT secret and researcher key there. The registration key is case sensitive. Restart the FastAPI process after changing it.

### Aetheria Guide (optional, Gemini free tier)

**Ask the Guide**, bottom right on every participant and research page, is an agent. It searches the form, checks a number someone heard, opens the right chapter, and saves a question for the coordinator. Researchers can use it to read the flags and run the plain-language check. It cannot change a review decision.

The team's Gemini key is already in `.env.team` (see above). To use your own key instead, get a free one at https://aistudio.google.com/apikey and put it in `.env.local`, which git ignores:

```bash
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.5-flash,gemini-3-flash-preview,gemini-flash-latest,gemini-3.1-flash-lite
```

Restart `npm run dev:all`. Until this file exists, every Gemini step falls back to the engines below and the screen says so. The key is read by the dev server only and never reaches the browser. Guide questions and the matching passages go to Google, and Google may use free-tier data to improve its products. Dose, approval, and cure questions are refused before Gemini is called. Gemini may cite only passages its tools returned, and the quotation on screen is the stored passage. Gemini also runs Ask, Check, and the Summary question list.

If Gemini can't answer, the next engine takes over, and the screen says which one answered:

1. **Gemini** (free tier), when a key is set.
2. **Local RAG on this computer.** Passage retrieval plus Ollama (`llama3.2:3b` by default).
3. **The built-in consent rules.**

When Gemini hits its free limit, it pauses for 60 seconds, and questions go straight to the local engines. Every engine's answer passes the same checks, so a fallback is never less safe.

```bash
# Ollama, on this computer, optional
ollama serve
ollama pull llama3.2:3b
```

If Ollama is not running, Ask Aetheria still answers from the local consent rules and says so. Participant reading, teach-back, plain-language review, and document comparison keep working.

`npm run demo` repeats the scripted workflow checks.

### Spanish, French, and Mandarin

The **EN / ES / FR / 中** switch in the bottom-left dock works for both roles.

In the **research workspace** it translates the interface: navigation, headings, labels, buttons, result states, reviewer comments, and the Guide's controls. Document text, quotations, check findings, and Guide answers stay in English, because the documents are English and the findings quote them; these are marked as English for screen readers. A banner says the interface is machine-translated and unreviewed.

On the **participant screens** it switches to Spanish, French, or Mandarin Chinese (Simplified characters, Mandarin voice). A banner on every page says the text is a machine translation that has not been reviewed and that the English form is the official text. All three languages work the same way:

- **Read.** The included sample has a short reading in each language for each of its five sections, written for this practice app with the same figures (6 visits, about 16 weeks, about 2 hours, $50, 1 in 10, 15 years); a test checks that every reading keeps every number and adds none. For an uploaded form, **Translate this section** asks Gemini, or Ollama, to translate. The translation is kept only if every number in the source appears in it, it adds no number, its length is close to what that language needs (Chinese runs about a third of the English length, French and Spanish a little longer), it is written in the target language, and it is not the source repeated. A heading that fails stays in English, and a discard button removes a bad translation. The full text and the citation stay in English because the English form is the official text.
- **Ask and the Guide.** A question about a dose, a personal treatment choice, approval, or a cure is refused in the participant's language before anything else runs. Otherwise the question is put into English by a model, or matched by keywords in that language when no model can translate (or when the model's output is not English — the small local model sometimes answers instead of translating, and the guard rejects that). The same agent answers from the English form, the English quotation is shown, and the answer is given in the participant's language: the section's written reading for the sample, or a number-checked translation for an upload. The English answer stays one click away.
- **Check.** The five sample questions have an answer key in each language with the same concept ids as the English key, plus misunderstandings in that language ("pierdo la atención de mi médico", "je perds mon médecin", "退出后会失去我的医生"…), negation ("no pierdo…", "je ne vais pas perdre…", "不会失去…", "ne promet pas que…", "没有承诺会…"), caregiver replies ("ella puede salir", "elle peut partir", "她可以退出"), and short yes / "I don't know" replies. The reply's language is detected, so a French reply on the Spanish screen still uses the French key. Mandarin is matched without spaces (voice transcripts add them) and treats a comma as the end of a clause. The research team sees English labels, the participant's own words, and the tag "in French, needs an interpreter" (or Spanish, or Mandarin Chinese). A non-English reply to an uploaded form, which has no key in that language, goes to a person.
- **Voice.** The voice check on Check reads each section, asks the question, listens (browser speech recognition in es-US, fr-FR, zh-CN, or en-US), checks the reply, and speaks the feedback. Each language has its own words for repeat, slower, and asking for a person ("repetir", "répéter", "重复"…). An emergency word ends the session with "call 911". Voice audio is not stored, and every spoken session starts by saying it is an automated voice.
- **Summary.** The coordinator list is built in the participant's language from the session and offers a qualified interpreter.

## Judge walkthrough

1. Create a participant account (Client) and sign in. Create a research account with the registration key set in `backend/.env`.
2. As the participant, on Start, submit a consent file or press Use included sample. Read a section and switch between the short reading and the original clause. The sample source is ICF-AETHER-01 v2.1.
3. Ask “How many clinic visits are in this study?” The reply cites the consent passage. Ask “Can my cousin enroll with me next week?” The reply says the form does not answer that.
4. On Check, pick Leaving the study and type “Once I start I can't quit.” It is marked Needs clarification and names the misunderstanding. Tick the caregiver box and answer “She can leave at any time, her own doctor still treats her, and the team may keep safety information.” It is read as the participant's answer. Each result is sent to the research team.
5. Press **ES** in the bottom-left dock. Read shows the Spanish short reading. Ask “¿Cuántas visitas hay?” and “¿Me pagan por venir?”; ask “¿Cuál es el mejor tratamiento para mi migraña?” and it is refused. On Check, answer “Si me salgo del estudio pierdo la atención de mi médico.” It is marked Necesita aclaración. Summary builds the coordinator list in Spanish. Press **FR** and, on Check, answer “Je peux partir à tout moment et je ne vais pas perdre mon médecin.” The negation is understood. Press **中**, open the Guide, and pick “我听说有 8 次就诊，对吗？” — it answers that there are 6 visits. Press **EN** to go back.
6. As the researcher, Questions lists those handoffs from the backend with the participant's name and a language/interpreter tag, and runs the seven personas (the five starter-sheet personas plus a French and a Mandarin speaker; 7 of 7).
7. Start shows the real-trial numbers for NCT03238781. Compare: **Protocol Pre-Flight** and **Write Once** on the real protocol, SAP, and registry, then the same tools on the practice pair, then the design brief filled from the registry with similar trials.
8. Plain language: the NCT03238781 lay results summary (seven readers, including Spanish, French, and Mandarin drafts; EU CTR Annex V, GLSP steps, fact trace, reviewer comments), then the practice consent's two readings. Press **中** or **FR** to see the research workspace in that language.
9. Files: the 21 CFR 50.25 element check and the registry card. Settings: enter `v2.0` as the only approved version, then open Read, Ask, or Check as the participant — v2.1 is refused.
10. Checks runs the same checks as `npm test` and counts the result from that run.

## What the starter sheets do here

The supplied Regeneron pack contains many sheets. This app uses the four that match the consent product (Teach It Back, Say It Plainly, Write Once, Protocol Pre-Flight; the design brief is part of Pre-Flight). Everything below is computed from the stored text on each run; the numbers quoted are what the app produces today.

**Real trial (NCT03238781).** NCT03238781 posts a protocol, an SAP, and results, but no consent form. So Teach It Back uses the practice consent or a form the participant uploads, and the research-team sheets run on the real documents:

- **Protocol Pre-Flight (Compare).** The real protocol scores 69 on the M11 + SPIRIT 2025 checklist, shown with its formula and labelled a checklist count. Findings come from the protocol text. A planted-error test on the real text catches 5 of 5. Two amendments are listed; Amendment 1's summary is only partly posted (page 1 of 16), and the screen says so. The 24 similar trials give enrollment and arm counts. The visit-burden estimate lists its assumptions. The 15-visit schedule cannot be compared with the similar trials because the registry does not hold their schedules.
- **Write Once (Compare).** Eight facts are read from the protocol, SAP, and registry and compared, with quotes. One real wording difference is found: the SAP writes "QM" where the protocol and registry write Q4W. A planted test catches 8 of 8. A change request (CR-001…) lists every place a value appears, and each line can be accepted or rejected.
- **Design brief and precedent (Compare).** The brief can be filled from the registry and lists similar trials as precedent.
- **Say It Plainly (Plain language).** A lay results summary for seven readers: adult, caregiver, teen, physician, and Spanish, French, and Mandarin adult drafts with translated Annex V headings. It follows the four GLSP steps and covers the 10 EU CTR Annex V elements. Each reading checks its figures against 76 registry facts (Chinese dates included), traces each figure, and checks for promotional words and unsupported benefit claims in its own language. Readability is scored for the English readings only. Reviewer comments can block acceptance, and accepted summaries export as Markdown. The translated drafts are labelled machine-written and can be sent to a translation reviewer. A planted-error test catches 5 of 5. A practice correction (one placebo serious adverse event added) regenerates the summaries and marks them stale.

**Practice consent and protocol (synthetic).**

- **Teach It Back.** Read, Ask, Check, and Summary. There is a teach-back question for each of the five sample sections, and for every section of an uploaded consent. Replies are judged for the key ideas (Gemini or Ollama when available, phrase rules otherwise; Spanish, French, and Mandarin replies always use that language's phrase key). Named misunderstandings — "I'll definitely get the new drug", "I can't quit", "the study replaces my doctor", "no risks", "my name will be published" — are flagged even when other ideas are present, unless negated, and words inside the wrong statement are not credited. Caregiver answers are read about the participant. Spanish, French, and Mandarin are described above. Results go to the backend (`POST /api/handoffs`) and appear on the researcher's Questions page. Dictation works on Ask and Check, and a voice session reads, asks, listens, and gives feedback. The five sheet personas, plus a French and a Mandarin speaker, pass as expected (7 of 7). If a person enters an approved-version list, unlisted versions are refused in Read, Ask, Check, and the Guide.
- **Say It Plainly.** Two readings, adult and caregiver, generated from the consent; submitting a new consent regenerates both and keeps the old ones in a version history. Flesch Reading Ease and grade are computed with the formula shown on screen (sample: source 79, adult 89, caregiver 86). Each reading must keep 6 times, about 16 weeks, and $50, add no figure the source lacks, and use none of the protocol's 8 visits, 24 weeks, or $80. Each figure is traced to the passage that contains it. Medical, Legal, and Patient-advocate comments can approve or ask for a change; a disagreement blocks Accept. The planted-error test catches 5 of 5 (changed number, protocol number, promotional word, omitted allergic-reaction risk, swapped blinding) with 0 false alarms on a faithful control. Translation of these readings is a persisted handoff to a human reviewer. AETHER-01 has no results, so the lay results summary uses NCT03238781.
- **Write Once.** Five blocks (visits, weeks, payment, blood volume, retention) are read from the protocol and consent text. Each protocol, consent, plain-language, and registry sentence is a template; tests prove each template reproduces the stored sentence exactly. Proposing any value for any block lists every affected sentence with its owner, warns when a sentence names a visit that would no longer exist, records accept/reject per line with a version history, and exports a redline. The source files are never edited.
- **Protocol Pre-Flight.** The checklist is computed from protocol text against 24 ICH M11 headings and all 34 SPIRIT 2025 items. Any protocol (PDF, `.txt`, `.md`) can be uploaded. The coverage figure is shown with its formula, (present + 0.5 × thin) ÷ items × 100, and is labeled a checklist count, not an approval or quality grade; the 5-section practice protocol scores 10. Internal checks compare the treatment period with the last visit and each endpoint's week with the schedule. Cross-checks compare each block with the consent. The planted-error test catches 8 of 8 with 0 false alarms. Amendment-risk areas are named from the gaps; no amendment rate is predicted. A typed design brief drafts M11-numbered sections only from what it states and exports USDM-shaped JSON that is not validated against the CDISC schema.

Sources: SPIRIT 2025 statement, Table 1 (Chan et al., 2025; PMC12035670). ICH M11 Clinical electronic Structured Harmonised Protocol (FDA copy; ICH adoption 19 Nov 2025). 21 CFR 50.25. EU Regulation 536/2014, Annex V.

## Feature status

| Feature | Status |
| --- | --- |
| Consent reader, plain language, original clause, version label | Working from the file the participant submits, or from the included sample |
| Ask, with citations | Working. Ollama when it is running; otherwise labeled local rules |
| Missing-answer fallback | Working. Dose, approval, and unrelated questions are not invented |
| Teach-back concept check | Working for every section. Misunderstandings, caregiver answers, Spanish, French, and Mandarin answer keys for the sample. Supportive labels, not a pass/fail certificate |
| Spanish, French, and Mandarin participant screens | Working. Machine-written and labelled, not reviewed by a qualified translator; the English form stays official. Uploads are translated on request and number-checked |
| Spanish, French, and Mandarin research workspace | Interface translated and labelled unreviewed. Documents, quotations, findings, and Guide answers stay in English |
| Voice session | Working where the browser supports speech recognition (Chrome, Edge, Safari). No phone line |
| Real trial NCT03238781 | Working from the stored ClinicalTrials.gov copy. No consent form is posted for it |
| Teach-back handoff to the research team | Working through the FastAPI service and SQLite |
| Saved questions and follow-up | Working in this browser session |
| Plain-language readings for two audiences | Working, with Flesch scores, figure checks, trace, reviewer comments, history |
| Write Once blocks and change proposals | Working for five blocks read from the sample pair |
| Pre-flight checklist (M11 + SPIRIT 2025) | Working on the practice protocol or any uploaded protocol |
| Approved-version gate | Working once a person enters a list. Empty list means Unverified |
| Versions, outdated form excluded from answers | Working |
| Consent file | PDF text is extracted page by page. `.txt` and `.md` still work. A scanned PDF is not indexed as empty. DOCX is not read |
| Audit trail | Working in this browser session |
| Test Lab | Working. Counts a real run |
| Live ClinicalTrials.gov, PDF OCR, phone calls, reviewed translation | Not connected. Trial data is a stored copy refreshed with `npm run fetch-trial`. A PDF must already contain text |
| Protocol approval | Intentionally absent. The coverage figure is a checklist count |

## Data and privacy

Session state stays in this browser’s session storage. Uploaded text is parsed locally. Accounts and teach-back handoffs (topic, label, the participant's words, feedback) are stored by the local FastAPI service in `backend/aetheria.db`; only a research-team account can read handoffs. When Ollama is running, only the retrieved passages for a question are sent to `127.0.0.1`. When a Gemini key is set, Guide, Ask, Check, Summary, and translation requests go to Google as described above. Voice audio is not stored; speech recognition is done by the browser, which may use its vendor's service.
