# Phrase lexicon: everyday speech to fact codes

Used inside the extraction prompt (backend) and the voice agent prompt (voice) so the AI understands how mothers and families actually talk.

> ⚠️ Kannada and Hindi phrases are **drafts** and must be checked by a native speaker on the team before the demo. Add new phrases as you hear them in test calls.

| Everyday phrase (example) | Language | Fact code | Notes |
|---|---|---|---|
| "naalku batte since morning" / "4 cloths since morning" | kn / en | `pads_soaked_count` = 4 | "batte" / "kapda" / "cloth" = pad |
| "ondu ghante alli batte poora odde aaytu" | kn | `pad_soaked_within_hour` | soaked within an hour |
| "ek ghante mein kapda poora geela" | hi | `pad_soaked_within_hour` | |
| "dodda dodda gadde / clot" | kn | `clots_large` | |
| "bahut khoon aa raha hai" | hi | `bleeding_heavy` | |
| "tale bhaara", "tale tumba novu" | kn | `headache_severe` | "head heavy" |
| "sar bhaari hai", "sar mein bahut dard" | hi | `headache_severe` | |
| "kannu manju", "lights blinking", "kannu mundhe minchu" | kn / en | `vision_blurred` | |
| "aankhon ke aage andhera / chamak" | hi | `vision_blurred` | |
| "mukha / kai bandide", "chehra sooja hai" | kn / hi | `swelling_face_hands` | |
| "jvara", "maiyalli bisi" | kn | `fever` | |
| "bukhar", "badan garam" | hi | `fever` | |
| "kettu vaasane", "badboo wala discharge" | kn / hi | `discharge_foul` | |
| "hotte tumba novu", "pet mein bahut dard" | kn / hi | `abdominal_pain_severe` | |
| "holige kempu aagide / neeru barutide", "taanke laal / pani aa raha" | kn / hi | `wound_red_or_oozing` | stitches |
| "edhe kempu, novu", "doodh wali jagah laal, dard" | kn / hi | `breast_red_painful` | |
| "kaalu oodhide, novu", "pair ki pindli mein dard, sujan" | kn / hi | `calf_pain_swelling` | |
| "usiru kashta", "saans phool rahi hai" | kn / hi | `breathless` | |
| "fits bantu", "jhatke aaye", "daura pada" | kn / hi | `fits` | **keyword safety net** |
| "moorchhe hogidlu", "behosh ho gayi" | kn / hi | `unconscious` / `dizziness_fainting` | ask which |
| "BP maatre nilsidini", "BP ki dawai band kar di" | kn / hi | `stopped_bp_medicine` | |
| "magu haalu kudiyuttilla", "bachcha doodh nahi pee raha" | kn / hi | `not_feeding` | confirm: none at all vs less |
| "kammi kudiyuttide", "kam pee raha hai" | kn / hi | `feeding_poor` | |
| "magu usiru bega bega", "bachcha tez saans le raha" | kn / hi | `breathing_fast` | then guide breath count |
| "magu maiyalli bisi / thanda", "bachcha garam / thanda hai" | kn / hi | `feels_hot` / `feels_cold` | |
| "magu tumba nidre, eddelu illa", "bachcha bilkul sust" | kn / hi | `lethargic` | |
| "kai kaalu haladi", "hatheli talve peele" | kn / hi | `jaundice_palms_soles` | ask about palms and soles specifically |
| "mukha haladi", "chehra peela" | kn / hi | `jaundice_face_body` | |
| "hokkalu kempu / keevu", "naal laal / mawad" | kn / hi | `cord_red_or_pus` | |
| "ella vaanti", "sab ulti kar deta hai" | kn / hi | `vomiting_everything` | |

## Dismissal phrases (`dismissal_detected = true`)

"normal ide", "ella sari ide", "delivery aadmele heege", "sab theek hai", "aisa hota hai", "chinta mat karo", "it's normal", "she's fine".
