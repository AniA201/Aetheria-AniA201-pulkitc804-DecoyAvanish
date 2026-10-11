import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { promptsFor } from "../lib/consent";
import { type Answer } from "../lib/answers";
import { runAgent, type AgentEnv, type AgentReply } from "../lib/agent";
import { assessTeachbackWithGemini, localBriefing, writeBriefingWithGemini, type Briefing } from "../lib/coach";
import type { SubmittedConsent } from "../lib/consent";
import { cachedGeminiStatus, type GeminiContent } from "../lib/gemini";
import { loadParticipantMessages, sendHandoff, sendHandoffMessage, type HandoffMessage, type SendState } from "../lib/handoff";
import { useT } from "../lib/i18n";
import { languageInfo } from "../lib/languages";
import { askIn, localBriefingIn, translate } from "../lib/multilingual";
import { assessTeachback, type Speaker, type TeachResult } from "../lib/teachback";
import { canListen, listenOnce, speak, stopSpeaking } from "../lib/voice";
import { versionStanding } from "../lib/workbook";
import { practice, practicePrompt } from "../data/practiceLanguages";
import { teachPrompts, type SectionId, type TeachPrompt } from "../data/study";
import { useSession, type Language, type Translation } from "../state/Session";
import { ListenButton, useTitle } from "../components/Chrome";
import { VersionGate, VersionStanding } from "../components/SheetPanels";
import { ConsentFile } from "../components/ConsentFile";
import { ConsentSheet } from "../scene/ConsentSheet";
import { FormMap3D } from "../scene/FormMap3D";

type Section = SubmittedConsent["sections"][number];

/** A section as the participant sees it in the chosen language. `source` says where the translation came from. */
type ShownSection = Section & { source: "english" | "practice" | "machine" | "missing"; engine?: string };

/** Spanish machine translations saved before French and Mandarin keep their old key without a language. */
const translationKey = (consent: SubmittedConsent, sectionId: string, language: Language) =>
  `${language === "es" ? "" : `${language}:`}${consent.documentId}:${consent.version}:${sectionId}`;

function shown(section: Section, consent: SubmittedConsent, language: Language, translations: Record<string, Translation>): ShownSection {
  if (language === "en") return { ...section, source: "english" };
  const reading = consent.sample ? practice[language].sections[section.id as SectionId] : undefined;
  if (reading) return { ...section, title: reading.title, plain: reading.plain, terms: reading.terms, ask: reading.ask, source: "practice" };
  const cached = translations[translationKey(consent, section.id, language)];
  if (cached) return { ...section, title: cached.title, plain: cached.plain, source: "machine", engine: cached.engine };
  return { ...section, source: "missing" };
}

function useShown(consent: SubmittedConsent | null) {
  const { language, translations } = useSession();
  return (section: Section) => shown(section, consent!, language, translations);
}

/** The check question in the screen language. Uploaded forms have no non-English answer key. */
function shownPrompt(prompt: TeachPrompt, language: Language): TeachPrompt {
  if (language === "en" || !teachPrompts.includes(prompt)) return prompt;
  return practicePrompt(language, prompt.id) ?? prompt;
}

function NeedFile({ title }: { title: string }) {
  const t = useT();
  return (
    <div className="page participant-home">
      <h1>{title}</h1>
      <p className="lede dark">{t.needFile}</p>
      <Link className="btn solid dark" to="/participant/home">
        {t.goStart}
      </Link>
    </div>
  );
}

function PassageText({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="passage-body">
      {parts.map((part, index) => (
        <p key={index}>{part}</p>
      ))}
    </div>
  );
}

const studyTitle = (consent: SubmittedConsent, language: Language) => (consent.sample && language !== "en" ? practice[language].studyName : consent.studyName);

export function ParticipantHome() {
  const t = useT();
  useTitle(t.home.kicker);
  const { reviewed, saved, teach, displayName, consent, clearConsent, language } = useSession();
  const view = useShown(consent);
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">{t.home.kicker}</p>
        <h1>{t.home.addTitle(displayName)}</h1>
        <p className="lede dark">{t.home.addLede}</p>
        <ConsentFile />
      </div>
    );
  }
  const next = consent.sections.find((section) => !reviewed.includes(section.id)) ?? consent.sections[0];

  return (
    <div className="page participant-home">
      <p className="kicker">{consent.sample ? t.home.practice : consent.filename}</p>
      <h1>{studyTitle(consent, language)}</h1>
      <p className="lede dark">{t.home.sections(consent.sections.length)}</p>
      <div className="stat-row">
        <article>
          <strong>
            {reviewed.length}/{consent.sections.length}
          </strong>
          <span>{t.home.opened}</span>
        </article>
        <article>
          <strong>{saved.length}</strong>
          <span>{t.home.saved}</span>
        </article>
        <article>
          <strong>{teach.length}</strong>
          <span>{t.home.replies}</span>
        </article>
      </div>
      <div className="action-row">
        <Link className="btn solid dark" to={`/participant/explore-consent/${next.id}`}>
          {t.home.read}
        </Link>
        <Link className="btn on-paper" to="/participant/ask">
          {t.home.ask}
        </Link>
        <button className="btn on-paper" type="button" onClick={clearConsent}>
          {t.home.another}
        </button>
      </div>
      <section className="start-next" aria-label="Next section">
        <p className="kicker">Continue with</p>
        <div>
          <span>{next.index}</span>
          <div>
            <h2>{view(next).title}</h2>
            <p>{view(next).short}</p>
          </div>
          <Link to={`/participant/explore-consent/${next.id}`} aria-label={`Read ${view(next).title}`}><span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section className="start-map" aria-label="Study form sections">
        <div className="start-map-heading">
          <h2>Your form at a glance</h2>
          <Link to="/participant/my-study">View all sections</Link>
        </div>
        <ol>
          {consent.sections.map((section) => {
            const local = view(section);
            const done = reviewed.includes(section.id);
            return <li key={section.id}><Link to={`/participant/explore-consent/${section.id}`}><span>{section.index}</span><strong>{local.title}</strong><em>{done ? "Read" : "Open"}</em></Link></li>;
          })}
        </ol>
      </section>
    </div>
  );
}

export function MyStudy() {
  const t = useT();
  useTitle(t.nav.form);
  const { consent, language } = useSession();
  const view = useShown(consent);
  if (!consent) return <NeedFile title={t.myStudy.none} />;
  return (
    <div className="page participant-form">
      <p className="kicker">{t.myStudy.kicker}</p>
      <h1>Your form</h1>
      <p className="lede dark">
        {studyTitle(consent, language)} · {consent.filename}
        {consent.sample ? t.myStudy.practice : ""}
      </p>
      <ol className="topic-index form-section-grid">
        {consent.sections.map((section) => (
          <li key={section.id}>
            <Link to={`/participant/explore-consent/${section.id}`}>
              <span className="section-card-number">{section.index}</span>
              <span className="section-card-copy">
                <strong>{view(section).title}</strong>
                <small>{view(section).short}</small>
              </span>
              <span className="section-card-arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Explore() {
  const t = useT();
  useTitle(t.read.title);
  const params = useParams();
  const { consent, textOnly, markReviewed, reviewed, reducedMotion, approvedVersions, language, setTranslation } = useSession();
  const view = useShown(consent);
  const [showOriginal, setShowOriginal] = useState(false);
  const [translating, setTranslating] = useState("");
  if (!consent) return <NeedFile title={t.read.title} />;
  if (versionStanding(consent.version, approvedVersions) === "not-listed") return <VersionGate version={consent.version} title={t.read.title} language={language} />;
  const sections = consent.sections;
  const known = !params.sectionId || sections.some((section) => section.id === params.sectionId);
  const requested = (known ? params.sectionId : undefined) ?? sections[0].id;
  const raw = sections.find((item) => item.id === requested) ?? sections[0];
  if (!known) {
    return <Navigate to={`/participant/explore-consent/${sections[0].id}`} replace />;
  }
  const section = view(raw);
  const index = sections.findIndex((item) => item.id === section.id);
  const previous = sections[index - 1];
  const next = sections[index + 1];

  const translateSection = async () => {
    setTranslating(t.read.translating);
    const [title, plain] = await Promise.all([translate(raw.title, "en", language), translate(raw.plain, "en", language)]);
    if (plain.engine === "local") {
      setTranslating(`${t.read.noTranslation} ${plain.note}`);
      return;
    }
    setTranslation(translationKey(consent, raw.id, language), {
      title: title.engine === "local" ? raw.title : title.text,
      plain: plain.text,
      engine: plain.engine,
      at: new Date().toISOString(),
    });
    setTranslating("");
  };

  return (
    <div className={`reader participant-reader ${textOnly || !consent.sample ? "text-only" : ""}`}>
      <aside className="chapter-nav" aria-label={t.nav.read}>
        {sections.map((item) => (
          <Link
            key={item.id}
            to={`/participant/explore-consent/${item.id}`}
            className={item.id === section.id ? "current" : ""}
            aria-current={item.id === section.id ? "page" : undefined}
          >
            <span>{item.index}</span>
            {view(item).title}
            {reviewed.includes(item.id) ? <em>{t.read.done}</em> : null}
          </Link>
        ))}
      </aside>
      {!textOnly && (
        <div className="consent-stage">
          <ConsentSheet chapter={index} reducedMotion={reducedMotion} />
          <p className="stage-caption">{t.read.caption}</p>
        </div>
      )}
      <article className="reading">
        <p className="kicker">
          {section.index} / {sections.length} · {consent.version}
        </p>
        <h1>{section.title}</h1>
        <p className="fine">{section.citation}</p>
        {language !== "en" ? (
          <p className="fine">
            {section.source === "practice"
              ? t.read.practiceNote
              : section.source === "machine"
                ? t.read.machineNote(section.engine ?? "")
                : t.read.noTranslation}{" "}
            {t.read.officialEnglish}
          </p>
        ) : null}
        {language !== "en" && section.source === "missing" ? (
          <div className="action-row">
            <button type="button" className="btn on-paper" onClick={translateSection} disabled={translating === t.read.translating}>
              {translating === t.read.translating ? t.read.translating : t.read.translate}
            </button>
            {translating && translating !== t.read.translating ? <p className="fine">{translating}</p> : null}
          </div>
        ) : null}
        {language !== "en" && section.source === "machine" ? (
          <button type="button" className="text-button" onClick={() => setTranslation(translationKey(consent, raw.id, language), null)}>
            {t.read.discard}
          </button>
        ) : null}
        <div className="reading-tools">
          <button type="button" className="btn on-paper" aria-pressed={!showOriginal} onClick={() => setShowOriginal(false)}>
            {t.read.short}
          </button>
          <button type="button" className="btn on-paper" aria-pressed={showOriginal} onClick={() => setShowOriginal(true)}>
            {t.read.full}
          </button>
          <ListenButton
            text={showOriginal ? raw.original : section.plain}
            lang={showOriginal || section.source === "missing" ? "en" : language}
          />
        </div>
        <div className="passage" id="source" lang={showOriginal || section.source === "missing" ? "en" : languageInfo[language].html}>
          <p className="passage-label">{showOriginal ? t.read.fromForm : section.source === "missing" ? t.read.shortUntranslated : t.read.shortLabel}</p>
          <PassageText text={showOriginal ? raw.original : section.plain} />
        </div>
        <dl className="terms">
          {section.terms.map((term) => (
            <div key={term.word}>
              <dt>{term.word}</dt>
              <dd>{term.meaning}</dd>
            </div>
          ))}
        </dl>
        {consent.sample ? (
          <figure className="citation" lang="en">
            <figcaption>
              {raw.citation} · {raw.page}
            </figcaption>
            <blockquote>{raw.original}</blockquote>
          </figure>
        ) : null}
        <div className="action-row">
          <button type="button" className="btn solid dark" onClick={() => markReviewed(section.id)}>
            {reviewed.includes(section.id) ? t.read.marked : t.read.markRead}
          </button>
          <Link className="btn on-paper" to={`/participant/ask?q=${encodeURIComponent(section.ask)}`}>
            {t.read.askThis}
          </Link>
        </div>
        <div className="pager">
          {previous ? (
            <Link to={`/participant/explore-consent/${previous.id}`}>
              {t.read.previous} · {view(previous).title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/participant/explore-consent/${next.id}`}>
              {t.read.next} · {view(next).title}
            </Link>
          ) : (
            <span />
          )}
        </div>
      </article>
    </div>
  );
}

type ChatMessage = {
  id: string;
  role: "person" | "aetheria";
  text: string;
  question?: string;
  answer?: Answer;
  steps?: string[];
  note?: string;
  links?: { to: string; label: string }[];
  english?: string;
  how?: string;
};

function useGeminiModel(): string | undefined {
  const [model, setModel] = useState<string>();
  useEffect(() => {
    cachedGeminiStatus().then((status) => setModel(status.configured ? status.model : undefined));
  }, []);
  return model;
}

function toAnswer(reply: AgentReply, consent: SubmittedConsent, model?: string): Answer {
  if (reply.fallbackAnswer) return reply.fallbackAnswer;
  const quote = reply.quotes[0];
  return {
    supported: reply.supported && Boolean(quote),
    answer: reply.answer,
    sectionId: quote?.sectionId,
    citation: quote?.citation,
    quote: quote?.text,
    page: quote?.page,
    documentId: consent.documentId,
    version: consent.version,
    passageId: quote?.passageId,
    engine: reply.engine === "gemini" ? "gemini" : "local-rules",
    model,
  };
}

function engineNote(answer: Answer, note?: string): string {
  if (answer.engine === "gemini") return "Answered by Gemini from the form.";
  if (note) return note;
  return answer.engine === "ollama" ? "Answered on this computer." : "Answered from the form.";
}

function engineNoteIn(words: { gemini: string; fallback: string; ollama: string; form: string }, answer: Answer, note?: string): string {
  if (answer.engine === "gemini") return words.gemini;
  if (note) return words.fallback;
  return answer.engine === "ollama" ? words.ollama : words.form;
}

function useDictation(onText: (text: string) => void, sendLabel: string) {
  const t = useT();
  const { language } = useSession();
  const [note, setNote] = useState("");
  const start = async () => {
    if (!canListen()) {
      setNote(t.dictation.unavailable);
      return;
    }
    setNote(t.dictation.listening);
    const heard = await listenOnce(language).done;
    if (heard) {
      onText(heard);
      setNote(t.dictation.inBox(sendLabel));
    } else {
      setNote(t.dictation.stopped);
    }
  };
  return { note, start };
}

export function Ask() {
  const t = useT();
  useTitle(t.ask.title);
  const { consent, saveQuestion, approvedVersions, language, reducedMotion } = useSession();
  const view = useShown(consent);
  const [params] = useSearchParams();
  const starter = params.get("q") ?? "";
  const [draft, setDraft] = useState(starter);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const dictation = useDictation(setDraft, t.ask.send);
  const [savedId, setSavedId] = useState<string | null>(null);
  const request = useRef(0);
  const history = useRef<GeminiContent[]>([]);
  const model = useGeminiModel();
  if (!consent) return <NeedFile title={t.ask.title} />;
  if (versionStanding(consent.version, approvedVersions) === "not-listed") return <VersionGate version={consent.version} title={t.ask.title} language={language} />;

  const ask = async (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const ticket = request.current + 1;
    request.current = ticket;
    const botId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "person", text: clean },
      { id: botId, role: "aetheria", text: t.ask.looking, question: clean },
    ]);
    setDraft("");
    setSavedId(null);
    const links: { to: string; label: string }[] = [];
    const env: AgentEnv = {
      role: "participant",
      consent,
      reviews: {},
      model,
      // On this page the agent suggests a chapter instead of leaving the conversation.
      navigate: (to) => links.push({ to, label: to.endsWith("teach-back") ? t.ask.practice : t.ask.openPart }),
      saveQuestion: (saved, answer) =>
        saveQuestion({ question: saved, answer, supported: false, documentId: consent.documentId, version: consent.version, followUp: true }),
    };
    const localized = language !== "en" ? await askIn(language, clean, consent, env, history.current) : null;
    const reply = localized ? localized.reply : await runAgent(clean, env, history.current);
    if (request.current !== ticket) return;
    history.current = [
      ...history.current,
      { role: "user", parts: [{ text: localized?.englishQuestion ?? clean }] },
      { role: "model", parts: [{ text: reply.answer }] },
    ];
    const answer = toAnswer(reply, consent, model);
    const extra = links.filter((link) => !link.to.endsWith(`/${answer.sectionId}`));
    setMessages((current) =>
      current.map((item) =>
        item.id === botId
          ? {
              ...item,
              text: localized ? localized.answer : answer.answer,
              english: localized ? answer.answer : undefined,
              how: localized?.how,
              answer,
              question: clean,
              steps: reply.steps.map((step) => step.summary),
              note: reply.note,
              links: extra,
            }
          : item,
      ),
    );
  };

  return (
    <div className="page ask-page ask-studio">
      <header className="panel-head">
        <div className="ask-greeting">
          <strong><span>Ask</span><span>Aetheria</span></strong>
          <span className="ask-greeting-note">Five sections of your form, in view</span>
          <FormMap3D reducedMotion={reducedMotion} />
        </div>
      </header>
      <div className="thread" aria-live="polite">
        {messages.length === 0 && (
          <div className="ask-empty-state">
            <p>What would you like to understand?</p>
            <div className="ask-whispers" aria-label="Sample questions">
              {["How many visits are there?", "Can I leave later?", "What does placebo mean?", "What will I be paid?"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => setDraft(prompt)}>{prompt}</button>
              ))}
            </div>
            <div className="suggestions">
              {consent.sections.slice(0, 4).map((item) => {
                const local = view(item);
                return (
                  <button key={item.id} type="button" className="chip" onClick={() => ask(local.ask)}>
                    {local.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <article key={message.id} className={`bubble ${message.role}`}>
            {!message.english && message.steps && message.steps.length > 0 ? <small>{message.steps.join(" · ")}</small> : null}
            <p>{message.text}</p>
            {message.answer?.supported && message.answer.sectionId && (
              <div className="cite-card" lang="en">
                <strong>
                  {message.answer.citation} · {message.answer.page}
                </strong>
                <blockquote>{message.answer.quote}</blockquote>
                <Link to={`/participant/explore-consent/${message.answer.sectionId}#source`}>{t.ask.open}</Link>
              </div>
            )}
            {message.english ? (
              <details>
                <summary>{t.ask.original}</summary>
                <p lang="en">{message.english}</p>
                {message.steps && message.steps.length > 0 ? <small lang="en">{message.steps.join(" · ")}</small> : null}
                {message.note ? <small lang="en">{message.note}</small> : null}
              </details>
            ) : null}
            {message.answer && (
              <>
                {message.links?.map((link) => (
                  <Link key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
                <small>
                  {message.how ? `${message.how} ` : ""}
                  {message.english ? engineNoteIn(t.ask.answered, message.answer, message.note) : engineNote(message.answer, message.note)} {message.answer.citation}
                </small>
                <ListenButton text={message.text} />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    saveQuestion({
                      question: message.question ?? message.text,
                      answer: message.text,
                      supported: message.answer!.supported,
                      citation: message.answer!.citation,
                      documentId: message.answer!.documentId,
                      version: message.answer!.version,
                      followUp: true,
                    });
                    setSavedId(message.id);
                  }}
                >
                  {savedId === message.id ? t.ask.savedNote : t.ask.save}
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <label className="sr-only" htmlFor="question">Your question</label>
        <textarea id="question" value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} placeholder="Ask about your study form" />
        <div className="ask-form-actions">
          <button className="btn solid dark ask-send" type="submit" aria-label={t.ask.send}>
            <span aria-hidden="true">↑</span>
          </button>
          <button className="btn on-paper ask-dictate" type="button" onClick={dictation.start} aria-label={t.ask.dictate} title={t.ask.dictate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0v-5a3 3 0 0 0-3-3Zm-5 7.3v.7a5 5 0 0 0 10 0v-.7M12 16.5V21M8.5 21h7" /></svg>
          </button>
        </div>
        {dictation.note ? <p className="fine">{dictation.note}</p> : null}
      </form>
    </div>
  );
}

type VoiceLine = { id: string; who: "voice" | "you" | "note"; text: string };

/** Spoken teach-back: read the section, ask, listen, check, give feedback, and record it. */
function VoiceCheck({
  prompts,
  startAt,
  judge,
  onHuman,
}: {
  prompts: TeachPrompt[];
  startAt: number;
  judge: (prompt: TeachPrompt, response: string) => Promise<TeachResult>;
  onHuman: (prompt: TeachPrompt, response: string, emergency: boolean) => Promise<void>;
}) {
  const t = useT();
  const { consent, language, narrationRate, translations } = useSession();
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const stopped = useRef(false);
  const listener = useRef<{ stop: () => void } | null>(null);

  useEffect(
    () => () => {
      stopped.current = true;
      listener.current?.stop();
      stopSpeaking();
    },
    [],
  );

  const add = (who: VoiceLine["who"], text: string) => setLines((current) => [...current, { id: crypto.randomUUID(), who, text }]);
  const short = (text: string) => text.trim().split(/\s+/).length <= 6;

  const run = async () => {
    if (!consent) return;
    stopped.current = false;
    setRunning(true);
    setLines([]);
    let rate = narrationRate;
    let first = true;
    const say = async (text: string) => {
      add("voice", text);
      await speak(text, language, rate, first);
      first = false;
    };
    for (const english of prompts.slice(startAt)) {
      if (stopped.current) break;
      const prompt = shownPrompt(english, language);
      const section = consent.sections.find((item) => item.id === english.sectionId);
      const reading = section ? shown(section, consent, language, translations) : null;
      setStatus(t.voice.reading(prompt.topic));
      if (reading) await say(reading.source === "missing" ? section!.plain : reading.plain);
      for (let attempt = 0; attempt < 4 && !stopped.current; attempt += 1) {
        setStatus(t.voice.asking);
        await say(`${t.voice.askPrompt} ${prompt.question}`);
        if (stopped.current) break;
        setStatus(t.voice.listening);
        const session = listenOnce(language);
        listener.current = session;
        const heard = await session.done;
        listener.current = null;
        if (stopped.current) break;
        if (!heard) {
          add("note", t.voice.nothing);
          stopped.current = true;
          break;
        }
        add("you", heard);
        if (t.voice.emergencyWords.test(heard)) {
          await say(t.voice.emergency);
          await onHuman(english, heard, true);
          stopped.current = true;
          break;
        }
        if (short(heard) && t.voice.humanWords.test(heard)) {
          await say(t.voice.human);
          await onHuman(english, heard, false);
          stopped.current = true;
          break;
        }
        if (short(heard) && t.voice.slowerWords.test(heard)) {
          rate = Math.max(0.7, rate - 0.15);
          if (reading) await say(reading.source === "missing" ? section!.plain : reading.plain);
          continue;
        }
        if (short(heard) && t.voice.repeatWords.test(heard)) {
          if (reading) await say(reading.source === "missing" ? section!.plain : reading.plain);
          continue;
        }
        const result = await judge(english, heard);
        await say(`${t.labels[result.label] ?? result.label}. ${result.feedback}`);
        break;
      }
    }
    if (!stopped.current) {
      add("note", t.voice.finished);
      await say(t.voice.finished);
    }
    setStatus("");
    setRunning(false);
  };

  const stop = () => {
    stopped.current = true;
    listener.current?.stop();
    stopSpeaking();
    setRunning(false);
    setStatus("");
  };

  return (
    <section className="voice-check" aria-labelledby="voice-heading">
      <h2 id="voice-heading">{t.voice.heading}</h2>
      <p className="fine">{t.voice.intro}</p>
      {!canListen() ? <p className="notice">{t.voice.unavailable}</p> : null}
      <div className="action-row">
        {running ? (
          <button type="button" className="btn on-paper" onClick={stop}>
            {t.voice.stop}
          </button>
        ) : (
          <button type="button" className="btn solid dark" onClick={run} disabled={!canListen()}>
            {t.voice.start}
          </button>
        )}
      </div>
      {status ? (
        <p className="fine" aria-live="polite">
          {status}
        </p>
      ) : null}
      {lines.length > 0 ? (
        <ol className="voice-log" aria-live="polite">
          {lines.map((line) => (
            <li key={line.id} className={line.who}>
              {line.who === "you" ? t.voice.heard(line.text) : line.text}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function Teach() {
  const t = useT();
  useTitle(t.check.title);
  const { consent, recordTeach, approvedVersions, language } = useSession();
  const prompts = consent ? promptsFor(consent) : [];
  const [promptId, setPromptId] = useState(prompts[0]?.id ?? "");
  const [response, setResponse] = useState("");
  const [caregiver, setCaregiver] = useState(false);
  const [result, setResult] = useState<TeachResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState<{ state: SendState; detail: string } | null>(null);
  const dictation = useDictation(setResponse, t.check.submit);
  if (!consent || prompts.length === 0) return <NeedFile title={t.check.title} />;
  if (versionStanding(consent.version, approvedVersions) === "not-listed") return <VersionGate version={consent.version} title={t.check.title} language={language} />;
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0];
  const asked = shownPrompt(prompt, language);
  const speaker: Speaker = caregiver ? "caregiver" : "participant";

  const deliver = async (next: TeachResult, topic: string) => {
    setResult(next);
    recordTeach(next);
    const outcome = await sendHandoff(next, topic);
    setSent(language !== "en" && t.sent[outcome.state] ? { ...outcome, detail: t.sent[outcome.state] } : outcome);
  };

  const judge = async (target: TeachPrompt, reply: string): Promise<TeachResult> => {
    const local = assessTeachback(target.id, reply, prompts, speaker, language);
    const judged: TeachResult =
      local.misconception || (local.language && local.language !== "en")
        ? { ...local, documentId: consent.documentId, version: consent.version, engine: "local" }
        : { ...(await assessTeachbackWithGemini(target, reply, consent)), speaker };
    const next: TeachResult = { ...judged, response: reply };
    setPromptId(target.id);
    setResponse(reply);
    await deliver(next, target.topic);
    return next;
  };

  const submit = async () => {
    if (checking) return;
    setChecking(true);
    setSent(null);
    await judge(prompt, response);
    setChecking(false);
  };

  const askForPerson = async (target: TeachPrompt, heard: string, emergency: boolean) => {
    const next: TeachResult = {
      promptId: target.id,
      label: "Requires human follow-up",
      matched: [],
      missing: target.concepts.map((concept) => concept.label),
      feedback: emergency ? t.voice.emergency : t.voice.human,
      documentId: consent.documentId,
      version: consent.version,
      engine: "local",
      response: heard,
      speaker,
      language,
      note: emergency ? "Emergency words were heard during the voice check." : "Asked for a person during the voice check.",
    };
    setPromptId(target.id);
    setResponse(heard);
    await deliver(next, target.topic);
  };

  const shownMatched = result ? (result.shownMatched ?? result.matched) : [];
  const shownMissing = result ? (result.shownMissing ?? result.missing) : [];

  return (
    <div className="page check-page check-studio">
      <header className="panel-head">
        <p className="kicker">{t.check.title}</p>
        <h1>{t.check.heading}</h1>
        <p className="lede dark">{t.check.lede}</p>
        <VersionStanding version={consent.version} language={language} />
      </header>
      <div className="check-layout">
        <form
          className="teach-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="prompt">{t.check.topic}</label>
          <select
            id="prompt"
            value={prompt.id}
            onChange={(event) => {
              setPromptId(event.target.value);
              setResult(null);
              setResponse("");
            }}
          >
            {prompts.map((item) => (
              <option key={item.id} value={item.id}>
                {shownPrompt(item, language).topic}
              </option>
            ))}
          </select>
          <p className="prompt-text">{asked.question}</p>
          {language !== "en" && asked === prompt ? <p className="fine">{t.check.noKey}</p> : null}
          <label htmlFor="reply">{t.check.yours}</label>
          <textarea id="reply" rows={5} value={response} onChange={(event) => setResponse(event.target.value)} placeholder={t.check.placeholder} />
          <label className="check-row">
            <input type="checkbox" checked={caregiver} onChange={(event) => setCaregiver(event.target.checked)} />
            {t.check.caregiver}
          </label>
          <div className="action-row">
            <button className="btn solid dark" type="submit" disabled={checking}>
              {checking ? t.check.checking : t.check.submit}
            </button>
            <button className="btn on-paper" type="button" onClick={dictation.start}>
              {t.ask.dictate}
            </button>
          </div>
          {dictation.note ? <p className="fine">{dictation.note}</p> : null}
        </form>
        {result && (
          <article className="result" aria-live="polite">
            <p className="kicker">{t.labels[result.label] ?? result.label}</p>
            {result.misconception ? (
              <p>
                <strong>{t.check.clear}</strong> {result.shownMisconception ?? result.misconception}
                {t.fullStop}
              </p>
            ) : null}
            <p>{result.feedback}</p>
            {shownMatched.length > 0 && (
              <ul>
                {shownMatched.map((item) => (
                  <li key={item}>
                    {t.check.covered} {item}
                  </li>
                ))}
              </ul>
            )}
            {shownMissing.length > 0 && (
              <ul>
                {shownMissing.map((item) => (
                  <li key={item}>
                    {t.check.toClarify} {item}
                  </li>
                ))}
              </ul>
            )}
            <p>{t.check.change}</p>
            {result.label !== "Understands the key concept" && (
              <button
                type="button"
                className="btn on-paper"
                onClick={() => {
                  setResult(null);
                  document.getElementById("reply")?.focus();
                }}
              >
                {t.check.retry}
              </button>
            )}
            <p className="fine">
              {result.engine === "gemini" ? t.check.byGemini : result.engine === "ollama" ? t.check.byOllama : (result.note ?? t.check.byKey)}
              {result.speaker === "caregiver" ? t.check.asCaregiver : ""}
            </p>
            {result.language === language && t.check.interpreter ? <p className="fine">{t.check.interpreter}</p> : null}
            {sent ? <p className="fine">{sent.detail}</p> : null}
            <Link to={`/participant/explore-consent/${prompt.sectionId}`}>{t.check.reread(asked.topic)}</Link>
          </article>
        )}
      </div>
      <VoiceCheck prompts={prompts} startAt={Math.max(0, prompts.indexOf(prompt))} judge={judge} onHuman={askForPerson} />
    </div>
  );
}

export function Summary() {
  const t = useT();
  useTitle(t.summary.title);
  const { reviewed, saved, teach, consent, language } = useSession();
  const view = useShown(consent);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [writing, setWriting] = useState(false);
  const openTopics = useMemo(() => teach, [teach]);
  useEffect(() => setBriefing(null), [language]);
  if (!consent) return <NeedFile title={t.summary.title} />;
  const prompts = promptsFor(consent);

  return (
    <div className="page summary-page">
      <header className="panel-head">
        <p className="kicker">{t.summary.title}</p>
        <h1>{t.summary.heading}</h1>
        <VersionStanding version={consent.version} language={language} />
        <p className="notice">{t.summary.notSignature}</p>
      </header>
      <div className="summary-grid">
        <section>
          <h2>{t.summary.coordinator}</h2>
          {briefing ? (
            <>
              <p>{briefing.summary}</p>
              {briefing.questions.length === 0 ? (
                <p className="empty">{t.summary.nothing}</p>
              ) : (
                <ol className="stack">
                  {briefing.questions.map((item) => (
                    <li key={item.text}>
                      <strong>{item.text}</strong>
                      <p>{item.reason}</p>
                    </li>
                  ))}
                </ol>
              )}
              <p className="fine">
                {briefing.engine === "gemini" ? t.summary.byGemini : briefing.engine === "ollama" ? t.summary.byOllama : (briefing.note ?? t.summary.built)}
              </p>
              <ListenButton text={[briefing.summary, ...briefing.questions.map((item) => item.text)].join(" ")} />
            </>
          ) : (
            <p className="empty">{t.summary.empty}</p>
          )}
          <button
            type="button"
            className="btn on-paper"
            disabled={writing}
            onClick={async () => {
              setWriting(true);
              const input = { consent, reviewed, saved, teach };
              setBriefing(language !== "en" ? localBriefingIn(language, input) : await writeBriefingWithGemini(input).catch(() => localBriefing(input)));
              setWriting(false);
            }}
          >
            {writing ? t.summary.writing : briefing ? t.summary.again : t.summary.write}
          </button>
        </section>
        <section>
          <h2>{t.summary.readHeading}</h2>
          <ul className="plain-list">
            {consent.sections.map((section) => (
              <li key={section.id}>
                <span className="summary-title">{view(section).title}</span>
                <span className={reviewed.includes(section.id) ? "mark done" : "mark"}>{reviewed.includes(section.id) ? t.summary.readMark : t.summary.notYet}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t.summary.savedHeading}</h2>
          {saved.length === 0 ? (
            <p className="empty">{t.summary.noSaved}</p>
          ) : (
            <ul className="stack">
              {saved.map((item) => (
                <li key={item.id}>
                  <strong>{item.question}</strong>
                  <p>{item.answer}</p>
                  <small>
                    {item.followUp ? t.summary.followUp : ""}
                    {item.supported ? item.citation : t.summary.notAnswered}
                    {item.version ? ` · ${item.version}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>{t.summary.handoff}</h2>
          {openTopics.length === 0 ? (
            <p className="empty">{t.summary.noChecks}</p>
          ) : (
            <ul className="stack">
              {openTopics.map((item) => {
                const english = prompts.find((prompt) => prompt.id === item.promptId);
                return (
                  <li key={item.promptId}>
                    <strong>
                      {english ? shownPrompt(english, language).topic : item.promptId} · {t.labels[item.label] ?? item.label} · {consent.version}
                    </strong>
                    {item.speaker === "caregiver" ? <small>{t.summary.byCaregiver}</small> : null}
                    {item.language && item.language !== "en" ? <small>{t.summary.answeredIn[item.language]}</small> : null}
                    {item.misconception ? (
                      <small>
                        {t.summary.misunderstanding} {item.language === language ? (item.shownMisconception ?? item.misconception) : item.misconception}
                        {t.fullStop}
                      </small>
                    ) : null}
                    {item.response ? (
                      <p>
                        {t.summary.words} {item.response}
                      </p>
                    ) : null}
                    <p>{item.label === "Understands the key concept" ? t.summary.noGap : item.feedback}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <ParticipantMessages />
      </div>
      <p className="fine">{t.summary.used(`${consent.documentId} ${consent.version}`, consent.date, consent.status)}</p>
    </div>
  );
}

function ParticipantMessages() {
  const [state, setState] = useState<"loading" | "ok" | "signed-out" | "offline">("loading");
  const [messages, setMessages] = useState<HandoffMessage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const refresh = () =>
    loadParticipantMessages().then((result) => {
      setState(result.state);
      setMessages(result.messages);
    });

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = messages.reduce<Record<string, HandoffMessage[]>>((all, message) => {
    (all[message.handoff_id] ??= []).push(message);
    return all;
  }, {});

  return (
    <section className="participant-messages">
      <div className="inbox-head">
        <div>
          <h2>Messages from your research team</h2>
          <p className="fine">Replies appear here automatically.</p>
        </div>
        <button type="button" className="btn on-paper" onClick={() => void refresh()}>Refresh</button>
      </div>
      {state === "loading" ? <p className="fine">Checking for replies…</p> : null}
      {state === "signed-out" ? <p className="fine">Sign in to see research-team replies.</p> : null}
      {state === "offline" ? <p className="fine">Messages are unavailable right now.</p> : null}
      {state === "ok" && Object.keys(grouped).length === 0 ? <p className="empty">No new messages.</p> : null}
      {note ? <p className="fine" aria-live="polite">{note}</p> : null}
      <div className="message-list">
        {Object.entries(grouped).map(([handoffId, thread]) => (
          <article className="message-card" key={handoffId}>
            <header>
              <div>
                <strong>{thread[0].topic ?? "Your follow-up"}</strong>
                <p>{thread[0].document_id} {thread[0].version}</p>
              </div>
            </header>
            <div className="message-thread">
              {thread.map((message) => (
                <p key={message.id} className={message.author_role === "researcher" ? "from-researcher" : "from-participant"}>
                  <strong>{message.author_role === "researcher" ? "Research team" : "You"}</strong> {message.message}
                </p>
              ))}
            </div>
            <div className="reply-row">
              <label className="sr-only" htmlFor={`participant-reply-${handoffId}`}>Reply to your research team</label>
              <input
                id={`participant-reply-${handoffId}`}
                value={drafts[handoffId] ?? ""}
                placeholder="Write a reply"
                onChange={(event) => setDrafts((current) => ({ ...current, [handoffId]: event.target.value }))}
              />
              <button
                type="button"
                className="btn solid dark"
                disabled={!drafts[handoffId]?.trim()}
                onClick={async () => {
                  const result = await sendHandoffMessage(handoffId, drafts[handoffId].trim());
                  setNote(result.detail);
                  if (result.ok) {
                    setDrafts((current) => ({ ...current, [handoffId]: "" }));
                    await refresh();
                  }
                }}
              >
                Reply
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
