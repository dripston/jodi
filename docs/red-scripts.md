# Fixed scripts (read verbatim, never generated)

> ⚠️ English is the master text. Kannada and Hindi versions must be written and checked by a native speaker on the team (Mayura translation is fine as a first draft, then human-checked). The backend stores these in a lookup table keyed by `(script_id, language)` and returns them in `say_verbatim`. **No LLM may paraphrase these.** Placeholders: `{facility}`, `{name}`.

## RED-MOTHER (any mother red rule)

> "{name}, this is serious and needs a doctor now. Please call 108 immediately and go to {facility}. Do not wait. I am connecting your family now, and I am informing your ASHA."

## RED-BABY (any baby red rule)

> "Your baby needs to see a doctor now. Please call 108 immediately and take the baby to {facility}. Keep the baby warm and close to you. I am connecting your family now, and I am informing your ASHA."

## RED-FITS (M-FITS-01, B-FITS-01, K-SAFETY-01)

> "Turn her gently on her side. Do not hold her down. Do not put anything in her mouth. Call 108 now. I am connecting your family and informing your ASHA."

(Baby version: "Lay the baby on its side on a flat, safe surface. Do not put anything in the baby's mouth. Call 108 now…")

## RED-BLEED (M-BLEED-01)

> "Lie down flat and raise your legs on a pillow. Do not stand up. Call 108 now and go to {facility}. I am connecting your family and informing your ASHA."

## AMBER-MOTHER

> "{name}, this needs to be checked today. Your ASHA will visit you today, and I will call you again in a few hours. If it gets worse, call 108 or call me back on this number at any time."

## AMBER-BABY

> "Your baby should be checked today. Your ASHA will visit today, and I will call again in a few hours. If the baby stops feeding, has fits, breathes very fast, or feels very hot or cold, call 108 immediately."

## DISMISSAL-RESPONSE (when family says "it's normal")

> "I understand. But this sign can be dangerous after delivery, so we must get it checked. I have informed your ASHA, and I will stay in touch until someone has seen her."

## FAMILY-ALERT (outbound call to decision-maker)

> "Namaskara, this is Jodi, calling about {name}. She reported a danger sign just now. Please make sure she reaches {facility} or calls 108 now. Her ASHA has been informed. Please press or say 'yes' to confirm you are on it."

## NOT-ALLOWED (read-summary denied)

> "I can only share health information with the mother, her family or her ASHA. You can still tell me any update and I will save it."
