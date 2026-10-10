# Aetheria

Aetheria is a synthetic demo for reading a clinical-trial consent form with the original wording in view. A participant can move through five sections, ask a question, and try a teach-back. A research-team view compares a fictional protocol with that consent and shows the sentences behind each difference.

This preview does not give medical advice, record a signature, or decide that someone has consented.

## Demo data

The study AETHER-01, the product Aetherol, and Northwind Clinical Research are fictional. Visit count, study length, and payment were planted so the document check has a known mismatch. Approval status stays unverified.

Answers, teach-back labels, and the test lab run locally in the browser. No model key or ElevenLabs key is used. Listen, when the browser allows it, uses the device speech engine.

## Run

```bash
npm install
npm test
npm run dev
```

Open the local address printed by Vite. Start at the landing page, then enter the demo study.
