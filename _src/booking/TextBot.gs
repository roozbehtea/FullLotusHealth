/**
 * Full Lotus Health: book by text.
 *
 * Lives in the SAME Apps Script project as Code.gs (tea sits) and Booking.gs. It is a guided conversation, not an AI:
 * it understands numbers, service names, days and a few keywords, and it never answers health questions. Everything a
 * booking needs comes from Booking.gs, so text bookings follow exactly the same rules as the website:
 *   - the openings offered are apptSlots_ (same days, same 3-per-day limit, same 24 hours' notice);
 *   - the booking itself is apptBook_ (rereads the live calendar, then makes the Stripe checkout);
 *   - nothing reaches the calendar until Stripe says it is paid (apptConfirm_ / apptReconcile_, unchanged).
 *
 * Channels. botHandle_(from, text, channel) takes one incoming text and returns the replies to send. The channel only
 * carries messages in and out:
 *   test   POST {action:'bot_test', id, text} from the test page (/text-booking-test). Stops before payment: it never
 *          creates a Stripe checkout, holds a time, writes a sheet row or emails anyone.
 *   sms    a real phone number. Not connected yet; botInbound_(phone, text) is what a number calls once one is chosen.
 *
 * Keywords any time: STOP (no more texts), START (texts again), HELP, MENU or BOOK (start over), ROOZBEH (pass the
 * conversation to Roozbeh and stay quiet for BOT_HANDOFF_HOURS). Cancel or reschedule requests always go to Roozbeh.
 *
 * Script properties (all optional):
 *   BOT_HANDOFF_HOURS=12   how long the bot stays quiet after handing a conversation to Roozbeh
 *   BOT_TEST=true          false turns the public test page off
 */

var BOT_ORDER = ['acupuncture-initial-treatment', 'acupuncture-repeat-treatment', 'full-lotus-lift', 'medical-microneedling-session',
  'facial-nano-needling', 'initial-consultation-online', 'repeat-consultation-online'];
var BOT_SHORT = {
  'acupuncture-initial-treatment': 'Acupuncture, first visit',
  'acupuncture-repeat-treatment': 'Acupuncture, returning patient',
  'full-lotus-lift': 'Cosmetic acupuncture',
  'medical-microneedling-session': 'Microneedling',
  'facial-nano-needling': 'Nanoneedling',
  'initial-consultation-online': 'Online consultation, first',
  'repeat-consultation-online': 'Online consultation, follow-up'
};
var BOT_STATE_SECS = 21600;      // a conversation is forgotten after 6 quiet hours
var BOT_PAGE = 6;                // times listed per message
var BOT_DAILY_MAX = 80;          // messages answered per sender per day
var BOT_TEST_HOURLY_MAX = 400;   // test page messages answered per hour, all visitors together
var BOT_LINKS_PER_HOUR = 3;      // payment links per sender per hour
var BOT_LOG = 'Text bot';
var BOT_LOG_HEADERS = ['Time', 'From', 'Channel', 'They wrote', 'Bot replied', 'Step'];

function botCfg_() {
  return {
    handoffMs: parseFloat(prop_('BOT_HANDOFF_HOURS', '12')) * 3600000,
    testOn: String(prop_('BOT_TEST', 'true')) !== 'false'
  };
}

// ------------------------------------------------------------------ entry points
/** Code.gs hands any POST whose action starts with "bot_" here. */
function botPost_(b) {
  if (b.action === 'bot_test') {
    if (!botCfg_().testOn) return { error: 'off' };
    var id = String(b.id || '');
    if (!/^[A-Za-z0-9]{8,40}$/.test(id)) return { error: 'bad_request' };
    if (!botCount_('bot-test-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH'), BOT_TEST_HOURLY_MAX, 3600)) return { error: 'busy' };
    return { replies: botHandle_('test:' + id, String(b.text || ''), 'test') };
  }
  return { error: 'bad_request' };
}

/** What a phone number calls for each incoming text, once one is connected. Returns the replies to send back. */
function botInbound_(phone, text) {
  var key = apptPhoneKey_(phone);
  if (!key) return [];
  return botHandle_('sms:' + key, text, 'sms');
}

function botHandle_(from, text, channel) {
  text = String(text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!text) return [];
  if (!botCount_('bot-day-' + botHash_(from) + '-' + dayKey_(Date.now()), BOT_DAILY_MAX, 86400)) return [];
  // No script lock here: apptBook_ takes that lock itself while it checks the calendar and makes the checkout.
  var st = botLoad_(from);
  st.hist = (st.hist || []).concat(['Them: ' + text]).slice(-16);     // before the step, so a handoff email includes this message
  var out = botStep_(st, text, { from: from, test: channel === 'test', now: Date.now() });
  st.hist = (st.hist || []).concat(out.map(function (m) { return 'Bot: ' + m; })).slice(-16);
  botSave_(from, st);
  if (channel !== 'test') botLog_(from, channel, text, out.join('\n\n'), st.step);
  return out;
}

// ------------------------------------------------------------------ the conversation
function botStep_(st, text, ctx) {
  var t = text.toLowerCase().replace(/[.!?]+$/, '').trim();

  // Opted out: only START brings texts back. Nothing else is answered.
  if (botOptedOut_(ctx.from)) {
    if (/^(start|unstop|yes)$/.test(t)) { botOptOut_(ctx.from, false); botReset_(st); return ['You\'re back on. ' + botMenuText_(st)]; }
    return [];
  }
  if (/^(stop|stopall|unsubscribe|end|quit|revoke|opt ?out)$/.test(t)) {
    botOptOut_(ctx.from, true);
    botReset_(st);
    return ['You won\'t get any more texts from this assistant. Reply START anytime to turn them back on.'];
  }
  if (/^(help|info)$/.test(t)) {
    return ['Full Lotus Health booking assistant (automated). Reply BOOK to book a visit, ROOZBEH to reach Roozbeh himself, or STOP to stop texts. ' +
      cfg_().address + '.'];
  }
  if (/^(roozbeh|human|person|agent|operator|talk to (a )?(human|person|someone|roozbeh)|call me)$/.test(t)) {
    return botHandoff_(st, ctx, 'Asked for Roozbeh');
  }
  if (/^(menu|book|restart|start over|hi|hello|hey|start)$/.test(t) && st.step !== 'human') {
    var firstTime = !(st.hist && st.hist.length > 1);
    botReset_(st);
    return [botMenuText_(st, firstTime || /^(hi|hello|hey)$/.test(t) ? null : '')];
  }

  // Handed to Roozbeh: stay quiet until the pause ends, unless they ask to book again.
  if (st.step === 'human') {
    if (ctx.now < (st.until || 0)) {
      if (/^(menu|book|restart|start over)$/.test(t)) { botReset_(st); return [botMenuText_(st, '')]; }
      return [];
    }
    botReset_(st);
  }

  switch (st.step) {
    case 'service': return botOnService_(st, t, ctx);
    case 'newold': return botOnNewOld_(st, t, ctx);
    case 'slot': return botOnSlot_(st, t, ctx);
    case 'known': return botOnKnown_(st, text, t, ctx);
    case 'name': return botOnName_(st, text, t, ctx);
    case 'email': return botOnEmail_(st, text, t, ctx);
    case 'confirm': return botOnConfirm_(st, t, ctx);
    case 'paylink': return botOnPaylink_(st, t, ctx);
  }
  return botOnFirst_(st, t, ctx);
}

/** The first text of a conversation (or after one finished). */
function botOnFirst_(st, t, ctx) {
  if (/\b(cancel|reschedul\w*|move my|change my|push my|push back|running late|be late|late today|can'?t make|cannot make|can'?t come)\b/.test(t)) {
    return botHandoff_(st, ctx, 'Cancel or reschedule', 'I\'ve passed this to Roozbeh and he\'ll text you back personally. ' +
      'A reminder that changes with less than 24 hours\' notice are charged $95.');
  }
  if (/\btea\b/.test(t)) {
    botReset_(st);
    return [botGreeting_() + ' Tea sits are reserved on the website: ' + cfg_().site + '/tea-sits\n\nI can book treatments here. ' + botMenuText_(st, '')];
  }
  botReset_(st);
  var pick = botMatchService_(t);
  if (pick === 'acupuncture') { st.step = 'newold'; return [botGreeting_() + ' Is this your first acupuncture visit with Roozbeh?\n1) Yes, first visit\n2) No, I\'ve been before']; }
  if (pick) return botStartSlots_(st, pick, botGreeting_() + ' ');
  return [botMenuText_(st)];
}

function botOnService_(st, t, ctx) {
  var pick = botMatchService_(t);
  if (pick === 'acupuncture') { st.step = 'newold'; return ['Is this your first acupuncture visit with Roozbeh?\n1) Yes, first visit\n2) No, I\'ve been before']; }
  if (pick) return botStartSlots_(st, pick, '');
  return botNotUnderstood_(st, ctx, 'Sorry, I didn\'t catch that. Reply with a number from 1 to ' + BOT_ORDER.length + ', or ROOZBEH to reach Roozbeh.');
}

function botOnNewOld_(st, t, ctx) {
  if (/^(1|yes|y|yeah|yep|first|new)\b/.test(t) || /first/.test(t)) return botStartSlots_(st, 'acupuncture-initial-treatment', '');
  if (/^(2|no|n|nope|returning|been before)\b/.test(t) || /before|return|again/.test(t)) return botStartSlots_(st, 'acupuncture-repeat-treatment', '');
  return botNotUnderstood_(st, ctx, 'Reply 1 if this is your first visit, or 2 if you\'ve been before.');
}

function botStartSlots_(st, slug, lead) {
  st.svc = slug;
  st.after = '';
  st.filter = null;
  st.misses = 0;
  var svc = APPT_SERVICES[slug];
  var head = lead + svc.name + ' ($' + svc.price + ', ' + svc.minutes + ' min). ';
  return [head + botListText_(st, '')];
}

/** Lists the next openings after st.after (and matching st.filter), numbered, and remembers them. */
function botListText_(st, intro) {
  var data = apptSlots_(st.svc);
  var days = (data && data.days) || [], list = [], lastDay = '';
  for (var i = 0; i < days.length; i++) {
    var d = days[i];
    if (st.after && d.date <= st.after) continue;
    if (st.filter && st.filter.date && d.date !== st.filter.date) continue;
    if (st.filter && st.filter.dow && dow_(at_(d.date, 720)) !== st.filter.dow) continue;
    var slots = d.slots.filter(function (s) { return botTodOk_(s.start, st.filter && st.filter.tod); });
    if (!slots.length) continue;
    if (list.length && list.length + slots.length > BOT_PAGE) break;
    slots.forEach(function (s) { list.push({ start: s.start, day: d.label, date: d.date, time: s.label }); });
    lastDay = d.date;
    if (st.filter && st.filter.date) break;
  }
  st.step = 'slot';
  st.offer = list;
  if (!list.length) {
    st.offer = [];
    if (st.filter) {
      var what = st.filter.label || 'then';
      st.filter = null;
      return intro + 'I don\'t have anything open online ' + what + '. Reply MORE to see other times, or ROOZBEH and he\'ll look for a time with you.';
    }
    return intro + 'That\'s everything I can book online for the next few weeks. Reply ROOZBEH and he\'ll find a time with you, or MENU to choose something else.';
  }
  st.lastDay = lastDay;
  var lines = list.map(function (o, k) { return (k + 1) + ') ' + botShortDay_(o.day) + ', ' + o.time; });
  return intro + (intro ? '' : 'Here are the next openings:\n') + lines.join('\n') +
    '\n\nReply a number to pick a time, MORE for later dates, or tell me a day that suits you (for example "Friday" or "mornings").';
}

function botOnSlot_(st, t, ctx) {
  var n = parseInt(t, 10);
  if (/^\d+\)?$/.test(t) && n >= 1 && n <= (st.offer || []).length) {
    st.pick = st.offer[n - 1];
    st.misses = 0;
    var known = ctx.test ? null : botKnown_(ctx.from);
    if (known) {
      st.known = known;
      st.step = 'known';
      return [botPickedLine_(st) + ' Should I book it for ' + known.name + ' (' + botMaskEmail_(known.email) + ')? Reply YES, or send the name I should use.'];
    }
    st.step = 'name';
    return [botPickedLine_(st) + ' What\'s your first and last name?'];
  }
  if (/^(more|next|later|other|others|more times|later dates)\b/.test(t)) {
    if (st.filter) { st.filter = null; } else { st.after = st.lastDay || st.after; }
    return [botListText_(st, '')];
  }
  if (/^(earlier|back|previous|first)\b/.test(t)) { st.after = ''; st.filter = null; return [botListText_(st, '')]; }
  var f = botParseWhen_(t, ctx.now);
  if (f) { st.filter = f; st.after = ''; return [botListText_(st, '')]; }
  var other = /^\d/.test(t) ? '' : botMatchService_(t);
  if (other && other !== st.svc && other !== 'acupuncture') return botStartSlots_(st, other, 'Switching to ');
  return botNotUnderstood_(st, ctx, 'Reply the number next to the time you\'d like (1 to ' + (st.offer || []).length + '), MORE for later dates, or a day like "Monday".');
}

function botOnKnown_(st, raw, t, ctx) {
  if (/^(y|yes|yeah|yep|yup|correct|that'?s me|sure|ok|okay)$/.test(t)) {
    st.name = st.known.name;
    st.email = st.known.email;
    return botConfirmText_(st);
  }
  if (/^(n|no|nope)$/.test(t)) { st.step = 'name'; return ['No problem. What name should I book it under (first and last)?']; }
  return botOnName_(st, raw, t, ctx);
}

function botOnName_(st, raw, t, ctx) {
  var name = raw.replace(/^(it'?s|my name is|this is|i'?m|i am)\s+/i, '').trim();
  if (!/[A-Za-zÀ-ɏ؀-ۿ]/.test(name) || name.length < 2 || name.length > 80 || /@/.test(name) || /^\d+$/.test(name)) {
    return botNotUnderstood_(st, ctx, 'Please send the first and last name for the booking.');
  }
  st.name = clean_(name, 80);
  st.misses = 0;
  if (st.email) return botConfirmText_(st);
  st.step = 'email';
  return ['Thanks, ' + st.name.split(' ')[0] + '! And your email? Your confirmation and calendar invite go there.'];
}

function botOnEmail_(st, raw, t, ctx) {
  var m = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/i.exec(raw);
  var email = m ? m[0].toLowerCase().replace(/[.]+$/, '') : '';
  if (!email || email.length > 254 || /^[=+\-@]/.test(email)) return botNotUnderstood_(st, ctx, 'That doesn\'t look like an email address. Could you send it again?');
  st.email = email;
  st.misses = 0;
  return botConfirmText_(st);
}

function botConfirmText_(st) {
  var svc = APPT_SERVICES[st.svc], s = Date.parse(st.pick.start);
  st.step = 'confirm';
  var where = svc.online ? 'Online, by video' : 'Full Lotus Health, ' + cfg_().address;
  return ['Here\'s your visit:\n' + svc.name + '\n' + whenLabel_(s, s + svc.minutes * 60000) + '\n' + where + '\n' + st.name + ', ' + st.email + '\n\n' +
    '$' + svc.price + ', paid online to hold the time.' + (svc.series ? ' It counts toward a series if you go on with one.' : '') +
    ' Changes need 24 hours\' notice; later cancellations are charged $95.\n\nReply YES for your secure payment link, or NO to pick a different time.'];
}

function botOnConfirm_(st, t, ctx) {
  if (/^(y|yes|yeah|yep|yup|confirm|book it|ok|okay|sure|sounds good)$/.test(t)) return botBook_(st, ctx);
  if (/^(n|no|nope|change|different time|other time)$/.test(t)) { st.after = ''; st.filter = null; return [botListText_(st, 'No problem. ')]; }
  if (/@/.test(t)) return botOnEmail_(st, t, t, ctx);
  return botNotUnderstood_(st, ctx, 'Reply YES to get your payment link, or NO to choose another time.');
}

function botBook_(st, ctx) {
  var svc = APPT_SERVICES[st.svc];
  if (ctx.test) {
    // Test page: check the time is still open on the live calendar, then stop. No checkout, hold, sheet row or email.
    var cfg = apptCfg_(), now = Date.now();
    var from = at_(dayKey_(now), 0), to = at_(addDays_(dayKey_(now), cfg.windowDays + 8), 0);
    var still = apptDays_(apptBusy_(from, to, cfg), svc.minutes, cfg, now).some(function (d) {
      return d.slots.some(function (s) { return Date.parse(s.start) === Date.parse(st.pick.start); });
    });
    if (!still) { st.after = ''; return [botListText_(st, 'Someone just took that time. ')]; }
    st.step = 'done';
    return ['TEST MODE: the time is still open, so a real patient would now get a secure Stripe payment link for $' + svc.price +
      '. Once paid, it goes on your calendar and they get the confirmation email and invite.\n\nReply BOOK to try again.'];
  }
  if (!botCount_('bot-links-' + botHash_(ctx.from) + '-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH'), BOT_LINKS_PER_HOUR, 3600)) {
    return botHandoff_(st, ctx, 'Many payment links in an hour');
  }
  var res;
  try {
    res = apptBook_({ service: st.svc, start: st.pick.start, name: st.name, email: st.email, phone: botPhone_(ctx.from), returning: false });
  } catch (err) {
    console.error('bot book: ' + err);
    res = { error: 'server' };
  }
  if (res && res.ok) {
    st.step = 'paylink';
    st.session = res.session;
    st.url = res.url;
    st.linkAt = Date.now();
    return ['Here\'s your secure payment link, good for 30 minutes:\n' + res.url +
      '\n\nAs soon as it\'s paid you\'re booked, and the confirmation and calendar invite go to ' + st.email + '.'];
  }
  if (res && res.error === 'taken') { st.after = ''; return [botListText_(st, 'Someone just took that time. ')]; }
  if (res && res.error === 'email') { st.step = 'email'; st.email = ''; return ['That email didn\'t go through. Could you send it again?']; }
  return botHandoff_(st, ctx, 'Booking error: ' + ((res && res.error) || 'unknown'), 'Something went wrong on my end. I\'ve passed this to Roozbeh and he\'ll text you to finish booking.');
}

function botOnPaylink_(st, t, ctx) {
  var found = st.session ? apptFind_(st.session) : null;
  var status = found ? found.row[AC.status - 1] : '';
  if (status === 'paid') {
    st.step = 'done';
    return ['You\'re all set for ' + found.row[AC.when - 1] + '. The confirmation is in your email. See you soon!'];
  }
  if (status === 'pending' && Date.now() - (st.linkAt || 0) < 30 * 60000) {
    return ['I don\'t see the payment yet. Here\'s your link again:\n' + st.url + '\n\nReply MENU to start over, or ROOZBEH for help.'];
  }
  st.after = '';
  return [botListText_(st, 'That payment link has expired, so the time was released. ')];
}

function botNotUnderstood_(st, ctx, msg) {
  st.misses = (st.misses || 0) + 1;
  if (st.misses >= 3) return botHandoff_(st, ctx, 'Bot could not follow', 'I\'m having trouble following, so I\'ve passed this to Roozbeh. He\'ll text you back personally.');
  return [msg];
}

/** Pass the conversation to Roozbeh by email, then stay quiet for a while so he can reply himself. */
function botHandoff_(st, ctx, reason, reply) {
  var hist = (st.hist || []).slice(-12).join('\n');
  st.step = 'human';
  st.until = ctx.now + botCfg_().handoffMs;
  if (!ctx.test) {
    try {
      var c = cfg_();
      MailApp.sendEmail({
        to: c.notify, name: 'Full Lotus text booking',
        subject: 'Text from ' + botPhoneLabel_(ctx.from) + ': ' + reason,
        body: reason + '\nFrom: ' + botPhoneLabel_(ctx.from) + '\n\nRecent messages:\n' + (hist || '(none)') +
          '\n\nThe booking assistant will stay quiet with this number for ' + Math.round(botCfg_().handoffMs / 3600000) +
          ' hours so you can reply yourself. If they text BOOK, it picks up again.'
      });
    } catch (err) { console.error('bot handoff email: ' + err); }
  }
  return [(reply || 'I\'ve passed this to Roozbeh and he\'ll text you back personally, usually the same day.') +
    (ctx.test ? '\n\n(TEST MODE: Roozbeh would get an email with this conversation now.)' : '')];
}

// ------------------------------------------------------------------ wording
function botGreeting_() { return 'Hi! This is the Full Lotus Health booking assistant (automated).'; }
function botMenuText_(st, lead) {
  st.step = 'service';
  var lines = BOT_ORDER.filter(function (k) { return APPT_SERVICES[k]; }).map(function (k, i) {
    var s = APPT_SERVICES[k];
    return (i + 1) + ') ' + BOT_SHORT[k] + ', $' + s.price + ' (' + s.minutes + ' min)';
  });
  var head = lead === undefined || lead === null ? botGreeting_() + ' I can book your visit right here by text.\n\n' : (lead || '');
  return head + 'What would you like to book?\n' + lines.join('\n') + '\n\nReply a number. For anything else, reply ROOZBEH to reach Roozbeh himself.';
}
function botPickedLine_(st) { return 'Great, ' + botShortDay_(st.pick.day) + ' at ' + st.pick.time + '.'; }
function botShortDay_(label) { return String(label).replace(/^(\w{3})\w*, (\w{3})\w* (\d+)$/, '$1 $2 $3'); }
function botMaskEmail_(e) { var p = String(e).split('@'); return p.length === 2 ? p[0].charAt(0) + '•••@' + p[1] : 'your email on file'; }
function botReset_(st) {
  var keep = { hist: st.hist };
  for (var k in st) if (st.hasOwnProperty(k)) delete st[k];
  st.hist = keep.hist || [];
  st.step = 'start';
}

// ------------------------------------------------------------------ understanding
/** A service slug, 'acupuncture' when it is not clear whether it is a first visit, or '' for nothing recognized. */
function botMatchService_(t) {
  var avail = BOT_ORDER.filter(function (k) { return APPT_SERVICES[k]; });
  var num = /^(\d{1,2})\)?$/.exec(t);
  if (num) { var n = parseInt(num[1], 10); return n >= 1 && n <= avail.length ? avail[n - 1] : ''; }
  if (/micro ?needl|\bmicro\b/.test(t)) return 'medical-microneedling-session';
  if (/nano ?needl|\bnano\b/.test(t)) return 'facial-nano-needling';
  if (/\b(online|video|virtual|zoom|remote|telehealth|phone consult)\b/.test(t)) {
    return /\b(follow|repeat|again|return|second)/.test(t) ? 'repeat-consultation-online' : 'initial-consultation-online';
  }
  if (/cosmetic|facial|face|lift|wrinkle|skin/.test(t)) return 'full-lotus-lift';
  if (/acupunct|\bacu\b|treatment|appointment|session|visit|book/.test(t)) {
    if (/\b(first|new|initial|never been)\b/.test(t)) return 'acupuncture-initial-treatment';
    if (/\b(repeat|follow|return|again|regular|usual|another)\b/.test(t)) return 'acupuncture-repeat-treatment';
    return 'acupuncture';
  }
  return '';
}

var BOT_DAYS = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
var BOT_MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** A day or time of day in what they wrote: {date|dow, tod, label}, or null. */
function botParseWhen_(t, nowMs) {
  var f = {}, label = [];
  var tod = /\b(morning|mornings|am)\b/.test(t) ? 'am' : /\b(afternoon|afternoons|evening|evenings|after work|pm|later in the day)\b/.test(t) ? 'pm' : '';
  var today = dayKey_(nowMs);
  var md = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})\b/.exec(t) || null;
  var slash = /\b(\d{1,2})\/(\d{1,2})\b/.exec(t);
  var month = 0, day = 0;
  if (md) { month = BOT_MONTHS[md[1]]; day = parseInt(md[2], 10); }
  else if (slash) { month = parseInt(slash[1], 10); day = parseInt(slash[2], 10); }
  if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    var y = parseInt(today.slice(0, 4), 10);
    var key = y + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    if (key < today) key = (y + 1) + key.slice(4);
    f.date = key;
    label.push('on ' + botShortDay_(Utilities.formatDate(new Date(at_(key, 720)), TZ, 'EEEE, MMMM d')));
  } else if (/\btomorrow\b/.test(t)) {
    f.date = addDays_(today, 1);
    label.push('tomorrow');
  } else {
    var w = /\b(mon|tue|wed|thu|fri|sat|sun)(day|s|sday|nesday|rsday|urday|days)?\b/.exec(t);
    if (w) { f.dow = BOT_DAYS[w[1]]; label.push('on ' + ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][f.dow - 1]); }
  }
  if (tod) { f.tod = tod; label.push(tod === 'am' ? 'in the morning' : 'in the afternoon'); }
  if (!f.date && !f.dow && !f.tod) return null;
  f.label = label.join(' ');
  return f;
}
function botTodOk_(startIso, tod) {
  if (!tod) return true;
  var h = parseInt(Utilities.formatDate(new Date(startIso), TZ, 'H'), 10);
  return tod === 'am' ? h < 12 : h >= 12;
}

// ------------------------------------------------------------------ who is texting
/** The most recent paid booking from this phone, for "Should I book it for Jane?". Real numbers only. */
function botKnown_(from) {
  if (from.indexOf('sms:') !== 0) return null;
  var key = from.slice(4), rs = apptRows_();
  for (var i = rs.length - 1; i >= 0; i--) {
    var r = rs[i];
    if (r[AC.status - 1] === 'paid' && apptPhoneKey_(r[AC.phone - 1]) === key && r[AC.name - 1] && r[AC.email - 1]) {
      return { name: String(r[AC.name - 1]), email: String(r[AC.email - 1]) };
    }
  }
  return null;
}
function botPhone_(from) { return from.indexOf('sms:') === 0 ? from.slice(4) : ''; }
function botPhoneLabel_(from) {
  var d = botPhone_(from);
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : (d || 'test page');
}

// ------------------------------------------------------------------ storage
function botHash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'fl-bot|' + s)).slice(0, 22);
}
function botLoad_(from) {
  try {
    var raw = CacheService.getScriptCache().get('bot-st-' + botHash_(from));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error('bot load: ' + e); }
  return { step: 'start', hist: [] };
}
function botSave_(from, st) {
  try { CacheService.getScriptCache().put('bot-st-' + botHash_(from), JSON.stringify(st), BOT_STATE_SECS); }
  catch (e) { console.error('bot save: ' + e); }
}
/** Opt-outs are kept for good (script properties), not in the 6-hour cache. */
function botOptedOut_(from) { return PropertiesService.getScriptProperties().getProperty('BOT_OFF_' + botHash_(from)) === '1'; }
function botOptOut_(from, off) {
  var p = PropertiesService.getScriptProperties(), k = 'BOT_OFF_' + botHash_(from);
  if (off) p.setProperty(k, '1'); else p.deleteProperty(k);
}
/** Adds one to a counter that expires after `secs`; false once it would pass `max`. */
function botCount_(key, max, secs) {
  try {
    var c = CacheService.getScriptCache(), n = parseInt(c.get(key) || '0', 10) + 1;
    if (n > max) return false;
    c.put(key, String(n), secs);
  } catch (e) { console.error('bot count: ' + e); }
  return true;
}
function botLog_(from, channel, text, reply, step) {
  try {
    apptSheet_(BOT_LOG, BOT_LOG_HEADERS).appendRow([new Date(), botPhoneLabel_(from), channel, clean_(text, 500), clean_(reply, 2000), step]);
  } catch (e) { console.error('bot log: ' + e); }
}
