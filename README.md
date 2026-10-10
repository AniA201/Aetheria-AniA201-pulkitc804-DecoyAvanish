# Aetheria

Aetheria is a synthetic demo that helps a participant read a clinical-trial consent form and helps a research team compare that form with a matching protocol. It explains, answers, checks understanding, and flags document disagreements. It does not give medical advice, record a signature, decide that someone consented, or approve a protocol.

The study AETHER-01, the product Aetherol, and Northwind Clinical Research are fictional. Visit count, study length, and payment were planted so the document check has a known mismatch. Approval status stays unverified because this preview has no authorized approval list.

## Run

```bash
npm install
npm test
npm run dev
```

Open the local address printed by Vite. Sign in as a participant and submit a PDF, `.txt`, or `.md` consent form. A PDF is read page by page, and each page keeps its page number. A scan with no text layer is refused rather than indexed as empty. The button beside the file control, **Use included sample**, loads the bundled consent `demo/synthetic/ICF-AETHER-01-v2.1.txt` and pairs it with the sample protocol. DOCX is not read.

The dev server proxies local Ollama at `/ollama`. Inside some sandboxes, bind the server explicitly:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
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

1. Open the landing page, choose Start reading, and enter as a participant.
2. On Home, either submit a consent file or press Use included sample. Then read a section and switch between the plain-language reading and the original clause. The sample source is ICF-AETHER-01 v2.1.
3. Ask “How many clinic visits are in this study?” The reply cites the consent passage. The quotation is the passage itself.
4. Ask “Can my cousin enroll with me next week?” The reply says the form does not answer that.
5. On Teach-Back, explain withdrawal in your own words, then try “I consent.” The second reply is not treated as understanding.
6. Sign in as a researcher with the demo phrase printed on the login page: NORTHWIND-DEMO.
7. In Plain Language Studio, edit the suggestion. Accepting it does not replace the original clause. Dropping `$50` fails the fact check.
8. In Document Integrity, the planted differences are 8 versus 6 visits, 24 weeks versus about 16 weeks, and $80 versus $50. Mark one under review and write a note. Neither document is edited.
9. Documents & Versions shows v2.1 as the reader, v2.0 as outdated, and the shared facts. Settings & Audit lists the actions from this browser session.
10. Test Lab runs the same checks as `npm test` and counts the result from that run.

## What the starter sheets do here

The supplied Regeneron pack contains many sheets. This app uses the four that match the consent product. The others describe different jobs and are not implemented.

- **Teach It Back.** Explore Consent, Ask Aetheria, Teach-Back, and My Summary. Answers and teach-back concepts come from the selected consent. A yes is not understanding. The summary is a handoff, not a signature. Outdated consent v2.0 is stored and is not used for answers. Voice is the browser speech engine. Dictate types into the question box and does not submit by itself.
- **Say It Plainly.** Explore Consent and Plain Language Studio. The shorter reading keeps 6 times, about 16 weeks, and $50. It must not import 8 visits, 24 weeks, or $80. The word count is a count, not a reader test. Promotional wording is flagged. A person accepts or rejects the draft. The source clause stays in the file.
- **Write Once.** The consent sections and protocol sentences live in `demo/synthetic/`. Explanations, answers, teach-back, and the comparison read those passages. Shared facts are listed on Documents & Versions. A change is not copied into the other document from the screen.
- **Protocol Pre-Flight.** Document Integrity compares the synthetic protocol with the consent. Each planted mismatch is a confirmed textual difference, with both sentences, where they are, and why a person should look. Matching blood volume and record retention stay unflagged. Review states are Open, Under review, Resolved, and Not a discrepancy. There is no approval score. This is not a full SPIRIT or ICH M11 checklist.

## Feature status

| Feature | Status |
| --- | --- |
| Consent reader, plain language, original clause, version label | Working from the file the participant submits, or from the included sample |
| Ask, with citations | Working. Ollama when it is running; otherwise labeled local rules |
| Missing-answer fallback | Working. Dose, approval, and unrelated questions are not invented |
| Teach-back concept check | Working. Supportive labels, not a pass/fail certificate |
| Saved questions and follow-up | Working in this browser session |
| Plain-language edit, accept, reject | Working. Source text is not replaced |
| Protocol comparison and review note | Working for the five shared facts |
| Versions, outdated form excluded from answers | Working |
| Consent file | PDF text is extracted page by page. `.txt` and `.md` still work. A scanned PDF is not indexed as empty. DOCX is not read |
| Audit trail | Working in this browser session |
| Test Lab | Working. Counts a real run |
| ClinicalTrials.gov, PDF OCR, phone calls | Not connected. A PDF must already contain text |
| Pre-flight score or protocol approval | Intentionally absent |

## Data and privacy

Demo state stays in this browser’s session storage. Uploaded text is parsed locally. When Ollama is running, only the retrieved passages for that question are sent to `127.0.0.1`. No cloud model is called. Voice audio is not stored. The demo phrase is a local gate, not an account system.
