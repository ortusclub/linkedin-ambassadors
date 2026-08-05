# How to run the Promo Team screening pipeline (brief for Claude)

You help screen applicants for LinkedVelocity's "Promo Team" (field marketers who hand out
QR flyers at Market! Market! to recruit LinkedIn "ambassadors"). There are two tabs in the
"Promo Staff / Street Team" Google Sheet:

- **Intake tab (tab 1)** — auto-filled by the website form at linkedvelocity.com/promo-team.
- **Screening Results tab** — filled by YOU, after each screening call.

## Your job, per call
Milee sends you a **Fathom transcript or summary** of a screening call, plus the applicant's
**name, email, and call date**. You score it and **POST the row into the Screening Results tab
yourself** via the webhook below. Milee never edits the sheet — she just talks to you.

## The webhook (how you write to the sheet)
POST JSON to this URL (it's a Google Apps Script web app bound to the sheet):

```
https://script.google.com/macros/s/AKfycbyQuCNxDbqR6re_YTXNr8YGJbys3DrQCsPTNA4QP08rclRQPDC3in5yg0ZSCSZLyMwlmQ/exec
```

Send a JSON body with `"type": "screening"` and these 14 fields (they map to columns A–N):

```json
{
  "type": "screening",
  "name": "", "email": "", "callDate": "Jul 14, 2026",
  "comfortable": "", "communicates": "", "approaching": "",
  "rejection": "", "reliable": "", "priorWork": "",
  "available": "", "verdict": "", "notes": "",
  "recording": "", "linkedin": ""
}
```

Post it with curl (write the JSON to a file first to avoid shell-quoting issues):

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" --data @payload.json "<webhook URL>"
```

**HTTP 302 = success** (the Apps Script ran and wrote the row). Do NOT use `curl -L` — following
the redirect returns a misleading 405/"page not found". If you get HTTP 500, wait ~2s and retry
(transient Apps Script hiccup).

## Upsert behavior (important)
The webhook **matches on email**: if a row with that email already exists, it **overwrites it in
place**; otherwise it appends a new row. So you can safely re-post to fix/update anyone (e.g.
a no-show who later shows up, a re-score) with **no duplicates**. Commas in the notes are fine —
it's JSON, not a paste.

## Scoring rubric
Four dimensions, each **1–5**:
- **communicates** — clarity, confidence, easy to talk to
- **approaching** — comfort walking up to strangers (THE core skill)
- **rejection** — resilience when told no
- **reliable** — genuine interest + seriousness (not just the money)

Plus **comfortable** = Yes/No — comfort with the account-rental model. This is the **hard gate /
dealbreaker**, not part of the number. Also capture **priorWork** (people-facing experience),
**available** (free for the trial), **linkedin** (familiar with LinkedIn? Yes/No/vague), and
**notes** (location + weekly availability + standout quotes + any concerns).

**Verdict** = `POOL (X/20)` where X = communicates + approaching + rejection + reliable.
Use the score to prioritize POOL candidates. Other verdicts: `MAYBE`, `NO (X/20)`,
`NO-SHOW`, `NO-SHOW (2x)`, `RESCHEDULE` (blank scores for no-shows/reschedules).

## Key judgment rule
**Weight the interviewer's (Milee's) live read over the transcript.** A transcript can't hear
shyness, low energy, or warmth. If Milee says someone "seemed shy / one-word answers," that
outranks a good-looking transcript → likely NO for a people-facing street role. If she says
someone came across strong despite a rough transcript (bad audio, Tagalog), bump them up.
Tagalog/Taglish comfort is fine — often better — for approaching Filipino mall-goers.

## Main tab hookup
The intake tab has lookup formulas that pull **Verdict / Notes / Recording** from Screening
Results by email, so once you post, those show up next to the applicant automatically.

## Trial context (as of Jul 2026)
Trial days: **Tue Jul 21 & Thu Jul 23**, 10am–7pm, Market! Market!. Need **6 marketers (3/day)**.
Pay: ₱2,000/day + ₱500 per successfully onboarded sign-up.
