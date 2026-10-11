# Aetheria

Aetheria is a synthetic demo that helps a participant read a clinical-trial consent form and helps a research team compare that form with a matching protocol. It explains, answers, checks understanding, and flags document disagreements. It does not give medical advice, record a signature, decide that someone consented, or approve a protocol.

The study AETHER-01, the product Aetherol, and Northwind Clinical Research are fictional. Visit count, study length, and payment were planted so the document check has a known mismatch. Approval status stays unverified because this preview has no authorized approval list.

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

### Aetheria Guide (optional, Gemini free tier)

**Ask the Guide**, bottom right on every participant and research page, is an agent. It searches the form, checks a number someone heard, opens the right chapter, and saves a question for the coordinator. Researchers can use it to read the flags and run the plain-language check. It cannot change a review decision.

To turn it on, get a free key at https://aistudio.google.com/apikey and put it in `.env.local`, which git ignores:

```bash
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3-flash-preview
```

Restart `npm run dev`. The key is read by the dev server only and never reaches the browser. Guide questions and the matching passages go to Google, and Google may use free-tier data to improve its products. Dose, approval, and cure questions are refused before Gemini is called. Gemini may cite only passages its tools returned, and the quotation on screen is the stored passage. Gemini also runs Ask, Check, and the Summary question list.

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

## Judge walkthrough

1. Create a participant account (Client) and sign in. Create a research account with the registration key set in `backend/.env`.
2. As the participant, on Start, submit a consent file or press Use included sample. Read a section and switch between the short reading and the original clause. The sample source is ICF-AETHER-01 v2.1.
3. Ask “How many clinic visits are in this study?” The reply cites the consent passage. Ask “Can my cousin enroll with me next week?” The reply says the form does not answer that.
4. On Check, pick Leaving the study and type “Once I start I can't quit.” It is marked Needs clarification and names the misunderstanding. Tick the caregiver box and answer “She can leave at any time, her own doctor still treats her, and the team may keep safety information.” It is read as the participant's answer. A reply in Spanish is routed to a person. Each result is sent to the research team.
5. As the researcher, Questions lists those handoffs from the backend with the participant's name, and runs the five starter-sheet personas.
6. Compare: every shared block is read from the files and rebuilt from its template. Propose any value for any block; every sentence that uses it is listed with its owner, and each line can be accepted or rejected. Download the redline. Below it, the pre-flight checklist, findings, planted-error result, amendment-risk areas, and the design brief.
7. Plain language: two readings (adult and caregiver) with Flesch scores, figure checks, a trace to the consent passage, reviewer comments, and the planted-error test. Reviewer disagreement blocks Accept.
8. Files: the 21 CFR 50.25 element check and the registry card. Settings: enter `v2.0` as the only approved version, then open Read, Ask, or Check as the participant — v2.1 is refused.
9. Checks runs the same checks as `npm test` and counts the result from that run.

## What the starter sheets do here

The supplied Regeneron pack contains many sheets. This app uses the four that match the consent product. Everything below is computed from the stored text on each run; the numbers quoted are what the sample produces today.

- **Teach It Back.** Read, Ask, Check, and Summary. There is a teach-back question for each of the five sample sections, and for every section of an uploaded consent. Replies are judged for the key ideas (Gemini or Ollama when available, phrase rules otherwise). Named misunderstandings — "I'll definitely get the new drug", "I can't quit", "the study replaces my doctor", "no risks", "my name will be published" — are flagged even when other ideas are present, unless negated. Caregiver answers are read about the participant. Spanish replies are routed to a person, because no reviewed Spanish form exists. Results go to the backend (`POST /api/handoffs`) and appear on the researcher's Questions page. Dictation works on Ask and Check. The five sheet personas pass as expected (5 of 5). If a person enters an approved-version list, unlisted versions are refused in Read, Ask, Check, and the Guide.
- **Say It Plainly.** Two readings, adult and caregiver, generated from the consent; submitting a new consent regenerates both and keeps the old ones in a version history. Flesch Reading Ease and grade are computed with the formula shown on screen (sample: source 79, adult 89, caregiver 86). Each reading must keep 6 times, about 16 weeks, and $50, add no figure the source lacks, and use none of the protocol's 8 visits, 24 weeks, or $80. Each figure is traced to the passage that contains it. Medical, Legal, and Patient-advocate comments can approve or ask for a change; a disagreement blocks Accept. The planted-error test catches 5 of 5 (changed number, protocol number, promotional word, omitted allergic-reaction risk, swapped blinding) with 0 false alarms on a faithful control. Translation is a persisted handoff to a human reviewer; no translation is generated. The lay results summary lists the EU CTR Annex V headings and stays empty because the study has no results.
- **Write Once.** Five blocks (visits, weeks, payment, blood volume, retention) are read from the protocol and consent text. Each protocol, consent, plain-language, and registry sentence is a template; tests prove each template reproduces the stored sentence exactly. Proposing any value for any block lists every affected sentence with its owner, warns when a sentence names a visit that would no longer exist, records accept/reject per line with a version history, and exports a redline. The source files are never edited.
- **Protocol Pre-Flight.** The checklist is computed from protocol text against 24 ICH M11 headings and all 34 SPIRIT 2025 items. Any protocol (PDF, `.txt`, `.md`) can be uploaded. The coverage figure is shown with its formula, (present + 0.5 × thin) ÷ items × 100, and is labeled a checklist count, not an approval or quality grade; the 5-section practice protocol scores 10. Internal checks compare the treatment period with the last visit and each endpoint's week with the schedule. Cross-checks compare each block with the consent. The planted-error test catches 8 of 8 with 0 false alarms. Amendment-risk areas are named from the gaps; no amendment rate is predicted. A typed design brief drafts M11-numbered sections only from what it states and exports USDM-shaped JSON that is not validated against the CDISC schema. Similar public trials are not loaded; an NCT id is only noted.

Sources: SPIRIT 2025 statement, Table 1 (Chan et al., 2025; PMC12035670). ICH M11 Clinical electronic Structured Harmonised Protocol (FDA copy; ICH adoption 19 Nov 2025). 21 CFR 50.25. EU Regulation 536/2014, Annex V.

## Feature status

| Feature | Status |
| --- | --- |
| Consent reader, plain language, original clause, version label | Working from the file the participant submits, or from the included sample |
| Ask, with citations | Working. Ollama when it is running; otherwise labeled local rules |
| Missing-answer fallback | Working. Dose, approval, and unrelated questions are not invented |
| Teach-back concept check | Working for every section. Misunderstandings, caregiver answers, and Spanish routing. Supportive labels, not a pass/fail certificate |
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
| ClinicalTrials.gov, PDF OCR, phone calls, translation | Not connected. A PDF must already contain text |
| Protocol approval | Intentionally absent. The coverage figure is a checklist count |

## Data and privacy

Session state stays in this browser’s session storage. Uploaded text is parsed locally. Accounts and teach-back handoffs (topic, label, the participant's words, feedback) are stored by the local FastAPI service in `backend/aetheria.db`; only a research-team account can read handoffs. When Ollama is running, only the retrieved passages for a question are sent to `127.0.0.1`. When a Gemini key is set, Guide, Ask, Check, and Summary requests go to Google as described above. Voice audio is not stored.
