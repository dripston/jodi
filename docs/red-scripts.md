# Fixed scripts (read verbatim, never generated)

> ⚠️ English is the master text. Kannada and Hindi versions must be written and checked by a native speaker on the team (Mayura translation is fine as a first draft, then human-checked). The backend stores these in a lookup table keyed by `(script_id, language)` and returns them in `say_verbatim`. **No LLM may paraphrase these.** Placeholders: `{facility}`, `{name}`.

> Kannada (`kn:`) and Hindi (`hi:`) lines: first draft by Sarvam `sarvam-translate:v1`, corrected for meaning and register (2026-11-13). **Still needs a native speaker's sign-off before real patients.** Any edit here is live after a backend restart.

## RED-MOTHER (any mother red rule)

> "{name}, this is serious and needs a doctor now. Please call 108 immediately and go to {facility}. Do not wait. I am connecting your family now, and I am informing your ASHA."
> **kn:** "{name}, ಇದು ಗಂಭೀರವಾಗಿದೆ ಮತ್ತು ಈಗ ವೈದ್ಯರ ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ 108 ಗೆ ಕರೆ ಮಾಡಿ ಮತ್ತು {facility} ಗೆ ಹೋಗಿ. ಕಾಯಬೇಡಿ. ನಾನು ಈಗ ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ ಮತ್ತು ನಿಮ್ಮ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸುತ್ತಿದ್ದೇನೆ."
> **hi:** "{name}, यह गंभीर मामला है और अभी डॉक्टर की ज़रूरत है। कृपया तुरंत 108 पर कॉल करें और {facility} जाएँ। इंतज़ार न करें। मैं अभी आपके परिवार को कनेक्ट कर रही हूँ, और आपकी आशा को सूचित कर रही हूँ।"

## RED-BABY (any baby red rule)

> "Your baby needs to see a doctor now. Please call 108 immediately and take the baby to {facility}. Keep the baby warm and close to you. I am connecting your family now, and I am informing your ASHA."
> **kn:** "ನಿಮ್ಮ ಮಗುವನ್ನು ಈಗಲೇ ವೈದ್ಯರಿಗೆ ತೋರಿಸಬೇಕು. ದಯವಿಟ್ಟು ತಕ್ಷಣ 108 ಗೆ ಕರೆ ಮಾಡಿ ಮತ್ತು ಮಗುವನ್ನು {facility} ಗೆ ಕರೆದುಕೊಂಡು ಹೋಗಿ. ಮಗುವನ್ನು ಬೆಚ್ಚಗೆ ಮತ್ತು ನಿಮ್ಮ ಹತ್ತಿರ ಇರಿಸಿ. ನಾನು ಈಗ ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ ಮತ್ತು ನಿಮ್ಮ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸುತ್ತಿದ್ದೇನೆ."
> **hi:** "आपके बच्चे को अभी डॉक्टर को दिखाने की ज़रूरत है। कृपया तुरंत 108 पर कॉल करें और बच्चे को {facility} ले जाएँ। बच्चे को गर्म और अपने पास रखें। मैं अभी आपके परिवार को कनेक्ट कर रही हूँ, और आपकी आशा को सूचित कर रही हूँ।"

## RED-FITS (M-FITS-01, B-FITS-01, K-SAFETY-01)

> "Turn her gently on her side. Do not hold her down. Do not put anything in her mouth. Call 108 now. I am connecting your family and informing your ASHA."
> **kn:** "ಅವರನ್ನು ನಿಧಾನವಾಗಿ ಒಂದು ಬದಿಗೆ ತಿರುಗಿಸಿ. ಅವರನ್ನು ಬಲವಂತವಾಗಿ ಹಿಡಿದುಕೊಳ್ಳಬೇಡಿ. ಅವರ ಬಾಯಿಗೆ ಏನನ್ನೂ ಹಾಕಬೇಡಿ. ಈಗಲೇ 108 ಗೆ ಕರೆ ಮಾಡಿ. ನಾನು ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ ಮತ್ತು ನಿಮ್ಮ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸುತ್ತಿದ್ದೇನೆ."
> **hi:** "उन्हें धीरे से एक करवट पर लिटा दें। उन्हें ज़बरदस्ती न पकड़ें, न दबाएँ। उनके मुँह में कुछ भी न डालें। अभी 108 पर कॉल करें। मैं आपके परिवार को कनेक्ट कर रही हूँ और आपकी आशा को सूचित कर रही हूँ।"

(Baby version: "Lay the baby on its side on a flat, safe surface. Do not put anything in the baby's mouth. Call 108 now…")

## RED-BLEED (M-BLEED-01)

> "Lie down flat and raise your legs on a pillow. Do not stand up. Call 108 now and go to {facility}. I am connecting your family and informing your ASHA."
> **kn:** "ಸಮತಟ್ಟಾಗಿ ಮಲಗಿ ಮತ್ತು ದಿಂಬಿನ ಮೇಲೆ ನಿಮ್ಮ ಕಾಲುಗಳನ್ನು ಎತ್ತಿ ಇಡಿ. ಎದ್ದು ನಿಲ್ಲಬೇಡಿ. ಈಗಲೇ 108 ಗೆ ಕರೆ ಮಾಡಿ ಮತ್ತು {facility} ಗೆ ಹೋಗಿ. ನಾನು ನಿಮ್ಮ ಕುಟುಂಬಕ್ಕೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ ಮತ್ತು ನಿಮ್ಮ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸುತ್ತಿದ್ದೇನೆ."
> **hi:** "सीधी लेट जाइए और अपने पैर तकिये पर ऊपर रखिए। खड़ी मत होइए। अभी 108 पर कॉल कीजिए और {facility} जाइए। मैं आपके परिवार को कनेक्ट कर रही हूँ और आपकी आशा को सूचित कर रही हूँ।"

## AMBER-MOTHER

> "{name}, this needs to be checked today. Your ASHA will visit you today, and I will call you again in a few hours. If it gets worse, call 108 or call me back on this number at any time."
> **kn:** "{name}, ಇದನ್ನು ಇಂದೇ ಪರೀಕ್ಷಿಸಬೇಕು. ನಿಮ್ಮ ಆಶಾ ಇಂದು ನಿಮ್ಮನ್ನು ಭೇಟಿ ಮಾಡುತ್ತಾರೆ, ಮತ್ತು ನಾನು ಕೆಲವು ಗಂಟೆಗಳಲ್ಲಿ ನಿಮಗೆ ಮತ್ತೆ ಕರೆ ಮಾಡುತ್ತೇನೆ. ಇದು ಇನ್ನಷ್ಟು ಹೆಚ್ಚಾದರೆ, 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಈ ನಂಬರಿಗೆ ನನಗೆ ಮತ್ತೆ ಕರೆ ಮಾಡಿ."
> **hi:** "{name}, आज ही इसकी जाँच होनी चाहिए। आपकी आशा आज आपसे मिलने आएँगी, और मैं कुछ घंटों में आपको फिर से कॉल करूँगी। अगर यह और बिगड़े, तो 108 पर कॉल करें या किसी भी समय इसी नंबर पर मुझे वापस कॉल करें।"

## AMBER-BABY

> "Your baby should be checked today. Your ASHA will visit today, and I will call again in a few hours. If the baby stops feeding, has fits, breathes very fast, or feels very hot or cold, call 108 immediately."
> **kn:** "ನಿಮ್ಮ ಮಗುವನ್ನು ಇಂದೇ ಪರೀಕ್ಷಿಸಬೇಕು. ನಿಮ್ಮ ಆಶಾ ಇಂದು ಭೇಟಿ ನೀಡುತ್ತಾರೆ, ಮತ್ತು ನಾನು ಕೆಲವು ಗಂಟೆಗಳಲ್ಲಿ ಮತ್ತೆ ಕರೆ ಮಾಡುತ್ತೇನೆ. ಮಗು ಹಾಲು ಕುಡಿಯುವುದನ್ನು ನಿಲ್ಲಿಸಿದರೆ, ಫಿಟ್ಸ್ ಬಂದರೆ, ತುಂಬಾ ವೇಗವಾಗಿ ಉಸಿರಾಡಿದರೆ, ಅಥವಾ ಮೈ ತುಂಬಾ ಬಿಸಿ ಅಥವಾ ತಣ್ಣಗಿದ್ದರೆ, ತಕ್ಷಣ 108 ಗೆ ಕರೆ ಮಾಡಿ."
> **hi:** "आज आपके बच्चे की जाँच होनी चाहिए। आपकी आशा आज आएँगी, और मैं कुछ घंटों में फिर से कॉल करूँगी। अगर बच्चा दूध पीना बंद कर दे, दौरे पड़ें, बहुत तेज़ साँस ले, या बहुत गर्म या ठंडा लगे, तो तुरंत 108 पर कॉल करें।"

## DISMISSAL-RESPONSE (when family says "it's normal")

> "I understand. But this sign can be dangerous after delivery, so we must get it checked. I have informed your ASHA, and I will stay in touch until someone has seen her."
> **kn:** "ನನಗೆ ಅರ್ಥವಾಯಿತು. ಆದರೆ ಹೆರಿಗೆಯ ನಂತರ ಈ ಲಕ್ಷಣ ಅಪಾಯಕಾರಿಯಾಗಬಹುದು, ಆದ್ದರಿಂದ ಇದನ್ನು ಪರೀಕ್ಷಿಸಿಕೊಳ್ಳಲೇಬೇಕು. ನಾನು ನಿಮ್ಮ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸಿದ್ದೇನೆ, ಮತ್ತು ಯಾರಾದರೂ ಅವರನ್ನು ನೋಡುವವರೆಗೆ ನಾನು ಸಂಪರ್ಕದಲ್ಲಿರುತ್ತೇನೆ."
> **hi:** "मैं समझती हूँ। लेकिन डिलीवरी के बाद यह लक्षण खतरनाक हो सकता है, इसलिए इसकी जाँच ज़रूर करवानी होगी। मैंने आपकी आशा को सूचित कर दिया है, और जब तक कोई उन्हें देख नहीं लेता, मैं संपर्क में रहूँगी।"

## FAMILY-ALERT (outbound call to decision-maker)

> "Namaskara, this is Jodi, calling about {name}. She reported a danger sign just now. Please make sure she reaches {facility} or calls 108 now. Her ASHA has been informed. Please press or say 'yes' to confirm you are on it."
> **kn:** "ನಮಸ್ಕಾರ, ನಾನು ಜೋಡಿ, {name} ಬಗ್ಗೆ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ಅವರು ಈಗಷ್ಟೇ ಒಂದು ಅಪಾಯದ ಲಕ್ಷಣದ ಬಗ್ಗೆ ಹೇಳಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ಅವರು {facility} ತಲುಪುವಂತೆ ಅಥವಾ ಈಗಲೇ 108 ಗೆ ಕರೆ ಮಾಡುವಂತೆ ನೋಡಿಕೊಳ್ಳಿ. ಅವರ ಆಶಾ ಅವರಿಗೆ ತಿಳಿಸಲಾಗಿದೆ. ನೀವು ಇದನ್ನು ನೋಡಿಕೊಳ್ಳುತ್ತಿದ್ದೀರಿ ಎಂದು ಖಚಿತಪಡಿಸಲು ದಯವಿಟ್ಟು 'ಹೌದು' ಎಂದು ಹೇಳಿ ಅಥವಾ ಒತ್ತಿ."
> **hi:** "नमस्कार, मैं जोडी बोल रही हूँ, {name} के बारे में कॉल कर रही हूँ। उन्होंने अभी-अभी एक खतरे का लक्षण बताया है। कृपया पक्का करें कि वे {facility} पहुँचें या अभी 108 पर कॉल करें। उनकी आशा को सूचित कर दिया गया है। आप यह संभाल रहे हैं, इसकी पुष्टि के लिए कृपया 'हाँ' कहें या बटन दबाएँ।"

## NOT-ALLOWED (read-summary denied)

> "I can only share health information with the mother, her family or her ASHA. You can still tell me any update and I will save it."
> **kn:** "ನಾನು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ತಾಯಿ, ಅವರ ಕುಟುಂಬ ಅಥವಾ ಅವರ ಆಶಾ ಅವರೊಂದಿಗೆ ಮಾತ್ರ ಹಂಚಿಕೊಳ್ಳಬಹುದು. ಆದರೂ ನೀವು ಯಾವುದೇ ಅಪ್‌ಡೇಟ್ ಹೇಳಬಹುದು, ನಾನು ಅದನ್ನು ಉಳಿಸುತ್ತೇನೆ."
> **hi:** "मैं स्वास्थ्य की जानकारी सिर्फ़ माँ, उनके परिवार या उनकी आशा के साथ ही साझा कर सकती हूँ। फिर भी आप मुझे कोई भी अपडेट बता सकते हैं, मैं उसे सेव कर लूँगी।"
