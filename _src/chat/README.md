# Optional chat answers (Google Apps Script)

The chat bubble on the website works with no setup and no monthly cost. Quick replies and keyword matching run in the browser from `assets/chat-facts.json`, which the build writes from the same prices and clinic facts as the rest of the site.

Blog posts are included automatically. Every build adds each post under `_src/posts` to those facts: the title, the `/post/<slug>` link, a one- or two-sentence summary, and keywords taken from the title and from a `tags` line in the front matter when a post has one. The same titles and summaries are written into `llms.txt`. A new post is picked up the next time you run `python3 _src/build.py`. You do not edit the chat by hand to add it.

This script is only for a typed question the bubble does not already recognize. Leave it off and nothing changes: those questions get a short "I can help with fees, booking, parking…" reply instead.

## Turn it on

1. Open [Google AI Studio](https://aistudio.google.com/apikey) in the info@fulllotushealth.com account and create an API key. The key is free to create. Do not put it in the website or in git.
2. Go to [script.google.com](https://script.google.com) → New project. Name it "Full Lotus chat".
3. Replace the default file with `Code.gs` from this folder. Save.
4. Project Settings → Script properties → Add:
   - `GEMINI_API_KEY`: the key from step 1.
   - `GEMINI_MODEL` (optional): defaults to `gemini-2.0-flash`. Change it only if Google retires that model.
5. Deploy → New deployment → type Web app. Execute as: Me. Who has access: Anyone. Deploy and approve the prompt.
6. Copy the web app URL (it ends in `/exec`) into `_src/config.json` as `chat_url`. Run `python3 _src/build.py`, commit, and push.
7. Publish the site first, or at least have the current `llms.txt` live. The script reads https://www.fulllotushealth.com/llms.txt and will not answer from anything else. That file is the model's context, including parking, hours, fees, the cancellation note, and the blog titles and summaries.

After any change to `Code.gs`, use Deploy → Manage deployments → Edit → New version, so the URL stays the same.

To turn it off, clear `chat_url` and rebuild. You can also delete the `GEMINI_API_KEY` property. The bubble keeps working either way.

## What it will and will not do

- It answers only from the published `llms.txt`, in two or three sentences. Blog titles and summaries in that file are general reading, not medical advice.
- It does not give medical advice. The browser also refuses health-looking questions and never sends them here.
- It does not invent a free consult, a discount, a guarantee, or a testimonial.
- It stores nothing. No spreadsheet row, no log of the question.

## Cost

Expected cost is **$0 a month** at this clinic's traffic.

Google AI Studio's free tier covers the short answers a low-traffic site produces. Common questions (fees, booking, parking, hours, cancellation, tea) never call the model. Only an unrecognized typed question does, and only when a key is set.

Guards if traffic is higher than expected:

- The page sends at most 6 of those questions per visit, then uses the guided reply.
- The script stops at 40 model calls per hour, then uses the guided reply.
- A missing key, a model error, or a failed read of `llms.txt` uses the guided reply.

If the key is later moved to a billed Google Cloud project and the free quota is used up, Gemini Flash is a fraction of a cent per short answer. A few hundred of these questions in a month stays within a few dollars. There is no third-party chat subscription.
