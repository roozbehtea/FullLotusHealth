/* Checks the guided chat against the facts file the build just wrote.
   Run from the repo root, after python3 _src/build.py:
     node _src/chat/test_chat.js
*/
var fs = require("fs");
var path = require("path");
var chat = require("../../assets/chat.js");

var root = path.join(__dirname, "..", "..");
var facts = JSON.parse(fs.readFileSync(path.join(root, "assets/chat-facts.json"), "utf8"));
var passes = 0, fails = 0;

function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); fails++; }
  else passes++;
}
function blob(r) {
  if (!r) return "";
  return r.text + " " + (r.links || []).map(function (l) { return l.href + " " + l.label; }).join(" ");
}
function has(r, s) { return blob(r).indexOf(s) >= 0; }

var micro = chat.reply(facts, "how much is microneedling?");
assert(micro && has(micro, "$500"), "microneedling price");
assert(has(micro, "/book/medical-microneedling-session"), "microneedling books deep");
assert(has(micro, "$2,000"), "microneedling series price from packages");

var nano = chat.reply(facts, "nanoneedling cost");
assert(has(nano, "$350") && has(nano, "/book/facial-nano-needling"), "nanoneedling price and book");

var lift = chat.reply(facts, "I want cosmetic acupuncture");
assert(has(lift, "$250") && has(lift, "/book/full-lotus-lift"), "cosmetic acupuncture");
assert(blob(lift).indexOf("/book/acupuncture") < 0, "cosmetic does not book plain acupuncture");

var initial = chat.reply(facts, "book an initial acupuncture visit");
assert(has(initial, "$180") && has(initial, "/book/acupuncture-initial-treatment"), "initial acupuncture");

var repeat = chat.reply(facts, "repeat acupuncture price");
assert(has(repeat, "$120") && has(repeat, "/book/acupuncture-repeat-treatment"), "repeat acupuncture");

var online = chat.reply(facts, "how much is an online consultation?");
assert(has(online, "$180") && has(online, "/book/initial-consultation-online"), "initial online consult");
assert(blob(online).indexOf("by video") >= 0, "online consult says video");

var online2 = chat.reply(facts, "repeat consultation online");
assert(has(online2, "/book/repeat-consultation-online"), "repeat online consult");

var gong = chat.reply(facts, "book a gong fu ceremony");
assert(has(gong, "$55") && has(gong, "sms:+18182539307"), "gong fu is text");
assert(blob(gong).indexOf("/book/gong") < 0, "gong fu is not an online book slug");

var bowl = chat.reply(facts, "bowl tea price");
assert(has(bowl, "$35") && has(bowl, "sms:"), "bowl tea text");

var priv = chat.reply(facts, "private gong fu ceremony");
assert(has(priv, "$250") && has(priv, "sms:"), "private tea text");
assert(!has(priv, "/book/"), "private tea has no /book/ link");

var sits = chat.reply(facts, "when is the weekly tea sit?");
assert(has(sits, "/tea-sits"), "tea sits page");

var park = chat.reply(facts, "where do I park?");
assert(park.text.indexOf("Street parking on Glenoaks.") >= 0, "parking sentence");
assert(has(park, "2116 N Glenoaks"), "address");
assert(has(park, facts.mapsGoogle) && has(park, facts.mapsApple), "both map links");

var hrs = chat.reply(facts, "what are your hours?");
assert(hrs.text.indexOf("By appointment") >= 0 && hrs.text.indexOf("booking calendar") >= 0, "hours by appointment");

var cancel = chat.reply(facts, "what is the cancellation policy?");
assert(has(cancel, "$95") && has(cancel, "24"), "late fee");

var ins = chat.reply(facts, "do you take aetna ppo insurance?");
assert(ins && ins.id === "insurance", "insurance question");
assert(has(ins, "/insurance"), "insurance page link");
assert(ins.text.indexOf("Eligibility is not a guarantee of payment.") >= 0, "insurance disclaimer");
assert(ins.text.indexOf("Aetna PPO") >= 0, "names Aetna PPO");
assert(ins.text.indexOf("HMO") >= 0, "names plans that are not accepted");
assert(!/\bfree\b/i.test(ins.text), "insurance answer has no free wording");
assert(ins.text.indexOf("Dr.") < 0, "insurance answer does not say Dr.");
assert(fs.existsSync(path.join(root, "insurance.html")), "insurance page exists");

var health = chat.reply(facts, "will microneedling help my acne scars?");
assert(health.id === "medical", "health question is refused");
assert(!/\b(it will help|this will help|yes, it will)\b/i.test(health.text), "no promise");
assert(health.text.indexOf("Roozbeh") >= 0, "offers Roozbeh");
assert(has(health, "/book/acupuncture-initial-treatment"), "health steers to booking");
assert(health.text.toLowerCase().indexOf("share health details") >= 0, "health reminder");

var cond = chat.reply(facts, "do you treat eczema?");
assert(cond.id === "medical" || cond.id === "scope", "condition question is not a promise");
assert(!/\b(it will help|this will help|treats eczema|good for eczema)\b/i.test(cond.text), "does not claim eczema");

var free = chat.reply(facts, "do you offer a free consult or a discount?");
assert(free.id === "offer", "offer question");
assert(/isn't a free consultation/i.test(free.text), "no free consult");
assert(free.text.indexOf("20% off your first") < 0, "no invented first-visit discount");
assert(!/fifth is free|sessions for free/i.test(free.text), "series is not described as free");
assert(/\$2,000/.test(blob(chat.replyById(facts, "series"))), "series chip states the package price");

assert(chat.reply(facts, "do you have wifi in the tea room?") === null, "unknown stays unknown for the optional AI path");

var hi = chat.reply(facts, "hello");
assert(hi.id === "hello" && hi.text.length > 20, "greeting");

function postHit(q, href) {
  var r = chat.reply(facts, q);
  assert(r && has(r, href), q + " links " + href);
  assert(/Read more: /.test(blob(r)), "read more label for " + q);
  assert(r.id === "post" && r.text && r.text.length < 400, "short post summary for " + q);
  assert(!/free consult|20% off your first/i.test(r.text), "post answer invents no offer");
  var file = href.replace(/^\//, "") + ".html";
  assert(fs.existsSync(path.join(root, file)), "post page exists " + href);
}
postHit("what to expect at a first acupuncture visit", "/post/first-acupuncture-visit-burbank");
postHit("how does cosmetic acupuncture work?", "/post/cosmetic-acupuncture-burbank-what-to-know");
postHit("what is the difference between microneedling and nanoneedling?", "/post/microneedling-vs-nanoneedling-burbank");
postHit("what to expect from nanoneedling", "/post/nanoneedling-burbank-what-to-expect");
postHit("tell me about ten years of full lotus", "/post/ten-years-full-lotus-health-burbank");

var healthPost = chat.reply(facts, "will microneedling help my acne scars?");
assert(healthPost.id === "medical", "health question stays a visit reply");
assert(has(healthPost, "/book/acupuncture-initial-treatment"), "health still books");
assert(has(healthPost, "/post/microneedling-vs-nanoneedling-burbank"), "health can link a post as reading");
assert(!/\b(it will help|this will help)\b/i.test(healthPost.text), "health post link is not a promise");

var stillPrice = chat.reply(facts, "how much is nanoneedling?");
assert(has(stillPrice, "$350") && stillPrice.id !== "post", "a price question stays a price");
assert(/5 sessions for \$1,400/.test(stillPrice.text), "nanoneedling package price");
assert(!/\bfree\b/i.test(stillPrice.text), "nanoneedling price does not say free");
assert(has(stillPrice, "/post/nanoneedling-burbank-what-to-expect"), "nanoneedling price may link that post");

var acuPrice = chat.reply(facts, "How much is acupuncture?");
assert(acuPrice && has(acuPrice, "$180") && has(acuPrice, "$120"), "both acupuncture fees");
assert(!/Read more:/.test(blob(acuPrice)), "generic acupuncture price attaches no post");
assert(!/\bfree\b/i.test(acuPrice.text), "acupuncture price does not say free");

var migraine = chat.reply(facts, "Can acupuncture cure my migraines?");
assert(migraine && migraine.id === "medical", "migraine question is refused");
assert(!/Read more:/.test(blob(migraine)), "migraine refusal attaches no unrelated post");
assert(has(migraine, "/book/acupuncture-initial-treatment"), "migraine refusal still offers booking");

var microSeries = chat.reply(facts, "how much is microneedling?");
assert(/5 sessions for \$2,000/.test(microSeries.text), "microneedling package price stated plainly");
assert(!/\bfree\b/i.test(microSeries.text), "microneedling answer has no free wording");

["prices", "book", "where", "hours", "cancel", "intake", "series", "tea"].forEach(function (id) {
  var r = chat.replyById(facts, id);
  assert(r && r.text && r.id === id, "chip " + id);
});

var fake = JSON.parse(JSON.stringify(facts));
fake.services.forEach(function (s) { if (s.slug === "facial-nano-needling") s.price = 123; });
fake.series.packages.forEach(function (p) { if (p.slug === "facial-nano-needling") p.price = 4567; });
var drifted = chat.reply(fake, "what is the nanoneedling price?");
assert(has(drifted, "$123"), "price is read from facts");
assert(blob(drifted).indexOf("$350") < 0, "old nano price is not hardcoded");
assert(has(drifted, "$4,567"), "series price is read from facts");
fake.lateFee = 77;
assert(chat.reply(fake, "cancellation").text.indexOf("$77") >= 0, "late fee is read from facts");

facts.services.forEach(function (s) {
  if (s.book.indexOf("/book/") === 0) {
    var file = path.join(root, "book", s.slug + ".html");
    assert(fs.existsSync(file), "booking page exists for " + s.slug);
  } else if (s.group === "tea") {
    assert(s.book === "sms:+18182539307", "tea books by text: " + s.slug);
  }
});
assert(fs.existsSync(path.join(root, "tea-sits.html")), "tea sits page exists");

var llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
assert(llms.indexOf("Street parking on Glenoaks.") >= 0, "llms parking");
assert(llms.indexOf("By appointment") >= 0, "llms hours");
assert(llms.indexOf("$2,000") >= 0 && llms.indexOf("$1,400") >= 0, "llms series prices");

function html(name) { return fs.readFileSync(path.join(root, name), "utf8"); }
var home = html("index.html");
assert(home.indexOf('id="flh-chat"') >= 0, "home has chat");
assert(home.indexOf("Virtual assistant") >= 0, "home labels the assistant");
assert(home.indexOf("don't share health details") >= 0, "home shows the health note");
assert((home.match(/visit-map/g) || []).length === 1, "home has one map");
assert(/<iframe[^>]*loading="lazy"[^>]*Glenoaks[^>]*output=embed/.test(home), "lazy address map");
assert(home.indexOf("query_place_id=ChIJJVOw4haVwoARK0UW-MPNiMw") >= 0, "google maps link uses the place id");
assert(home.indexOf("Open in Google Maps") >= 0 && home.indexOf("Open in Apple Maps") >= 0, "map links");
assert(home.indexOf("Street parking on Glenoaks.") >= 0, "home parking line");

var treat = html("treatments.html");
assert((treat.match(/<iframe/g) || []).length === 1, "treatments footer map");
assert(treat.indexOf('id="flh-chat"') >= 0, "treatments chat");

var patients = html("new-patients.html");
assert((patients.match(/<iframe/g) || []).length === 1, "new patients map");
assert(patients.indexOf('href="/insurance"') >= 0, "new patients links to insurance");

var insPage = html("insurance.html");
assert(insPage.indexOf("<title>Acupuncture Insurance in Burbank | PPO Plans | Full Lotus Health</title>") >= 0, "insurance title");
assert(insPage.indexOf("Acupuncture that takes PPO insurance in Burbank") >= 0, "insurance meta phrase");
assert(insPage.indexOf("Eligibility is not a guarantee of payment.") >= 0, "disclaimer visible");
assert(insPage.indexOf('"@type":"FAQPage"') >= 0, "faq schema");
assert(insPage.indexOf('aria-current="page"') >= 0 && insPage.indexOf('href="/insurance"') >= 0, "insurance is in the nav");
assert(insPage.indexOf("2116 N Glenoaks") >= 0, "insurance page address");
assert(insPage.indexOf("Aetna PPO") >= 0, "insurance page names Aetna PPO");
assert((insPage.split("A limited number of sliding scale treatments are available for those in financial need.").length - 1) >= 3, "sliding scale on the page, in the faq, and in schema");
assert(insPage.indexOf('"name":"Are sliding scale treatments available?"') >= 0, "sliding scale question in schema");
assert(!/\bDr\./.test(insPage), "insurance page does not say Dr.");
assert(!/\bcomplimentary\b/i.test(insPage), "insurance page does not say complimentary");
assert(!/\bfree\b/i.test(insPage), "insurance page does not say free");
assert(insPage.indexOf('id="ins-check"') >= 0, "benefits form");
assert(insPage.indexOf('name="website"') >= 0, "benefits honeypot");
assert(insPage.indexOf('for="ins-first"') >= 0 && insPage.indexOf('for="ins-consent"') >= 0, "benefits labels");
assert(insPage.indexOf("/assets/insurance-check.js") >= 0, "benefits script");
assert(!/healthcare\.us\.stedi|STEDI_API_KEY/.test(insPage), "insurance page has no Stedi secret");
var insJs = fs.readFileSync(path.join(root, "assets/insurance-check.js"), "utf8");
assert(/var APPS_SCRIPT_URL = "";/.test(insJs), "APPS_SCRIPT_URL is the empty placeholder");
assert(!/healthcare\.us\.stedi|STEDI_API_KEY/.test(insJs), "form script has no Stedi secret");
var insGs = fs.readFileSync(path.join(root, "apps-script/insurance-check.gs"), "utf8");
assert(insGs.indexOf("https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3") >= 0, "stedi legacy url");
assert(insGs.indexOf("'Aetna PPO': '60054'") >= 0, "aetna payer id");
assert(insGs.indexOf("INS_SERVICE_TYPE = '30'") >= 0, "service type 30");
assert(insGs.indexOf("status: checked.status") >= 0, "returns a status only");
assert((insPage.match(/<iframe/g) || []).length === 1, "insurance page has one map");

var bookPage = html("book-online.html");
assert(bookPage.indexOf('href="/insurance"') >= 0, "booking page links to insurance");
var treatPage = html("treatments.html");
assert(treatPage.indexOf('href="/insurance"') >= 0, "treatments links to insurance");
var book = html("book/facial-nano-needling.html");
assert(book.indexOf('id="flh-chat"') >= 0, "booking page chat");
assert(book.indexOf("/assets/chat.js") >= 0, "chat script");

var hrefs = blob(chat.replyById(facts, "prices")).match(/\/book\/[a-z0-9-]+/g) || [];
hrefs.forEach(function (href) {
  assert(fs.existsSync(path.join(root, href.slice(1) + ".html")), "prices link resolves " + href);
});

if (fails) {
  console.error(fails + " failed, " + passes + " passed");
  process.exit(1);
}

["how much are your fees?", "what are your prices", "what do you charge", "how much does it cost"].forEach(function (q) {
  var r = chat.reply(facts, q);
  assert(r && r.id === "prices" && has(r, "$180") && has(r, "/book/"), "generic price question gives the price list: " + q);
});

console.log(passes + " checks passed");
