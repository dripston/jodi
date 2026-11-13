"""Fixed prompts and labels for the Telegram onboarding flow (pure constants)."""

from __future__ import annotations

Buttons = list[list[tuple[str, str]]]
SHARE_PHONE = "📱 Share my phone number"
CONSENT_TEXT = "I agree Jodi keeps our health record and shares it only with our family and ASHA"

PROMPTS: dict[str, tuple[str, Buttons]] = {
    "ask_role": ("Welcome to Jodi. Who is registering?", [[("I'm the mother", "ob:role:mother"),
                                                            ("I'm family", "ob:role:family")]]),
    "mother_name": ("What is the mother's name?", []),
    "mother_phone": ("What is the mother's mobile number? (10 digits)", []),
    "delivery_date": ("When was the baby born? Tap a button or type the date (e.g. 12/11/2026).",
                      [[("Today", "ob:date:0"), ("Yesterday", "ob:date:1"), ("2 days ago", "ob:date:2")]]),
    "delivery_type": ("How was the delivery?", [[("Normal", "ob:type:normal"), ("C-section", "ob:type:c_section"),
                                                 ("Assisted", "ob:type:assisted")]]),
    "baby_weight": ("What was the baby's weight at birth? (e.g. 2.6 kg or 2600 g)", []),
    "born_early": ("Was the baby born early (before 37 weeks)?",
                   [[("Yes, early", "ob:early:yes"), ("No, on time", "ob:early:no"), ("Don't know", "ob:early:unknown")]]),
    "dm_choice": ("Who should Jodi call first in an emergency?", [[("Me", "ob:dm:me"), ("Someone else", "ob:dm:other")]]),
    "dm_name": ("Name of the family member Jodi should call in an emergency?", []),
    "dm_relation": ("How is this person related to the mother?",
                    [[("Husband", "ob:rel:husband"), ("Mother-in-law", "ob:rel:mother_in_law")],
                     [("Mother", "ob:rel:mother"), ("Other", "ob:rel:family")]]),
    "dm_phone": ("Their mobile number? (10 digits)", []),
    "language": ("Which language should Jodi speak on calls?",
                 [[("Kannada", "ob:lang:kn"), ("Hindi", "ob:lang:hi"), ("English", "ob:lang:en")]]),
    "upload_slip": ("Send a photo of the discharge slip, or tap Skip.", [[("Skip", "ob:skip")]]),
    "consent": ("Last step. Jodi will call the mother on milestone days and alert the family and ASHA if there "
                "is a danger sign.", [[(f"✅ {CONSENT_TEXT}", "ob:consent:yes")], [("Not now", "ob:consent:no")]]),
}  # fmt: skip
INVALID = {
    "mother_name": "Please type the name (letters only).",
    "mother_phone": "That doesn't look like a 10-digit mobile number. Please try again.",
    "dm_phone": "That doesn't look like a 10-digit mobile number. Please try again.",
    "dm_name": "Please type the name (letters only).",
    "delivery_date": "Please give a date within the last 42 days, e.g. 12/11/2026.",
    "baby_weight": "Please give a weight between 0.8 and 5.5 kg, e.g. 2.6 kg.",
}
FIELD_LABELS = [("mother_name", "Mother"), ("mother_phone", "Mother's phone"), ("delivery_date", "Born on"),
                ("delivery_type", "Delivery"), ("baby_weight", "Birth weight"), ("born_early", "Born early"),
                ("dm_name", "Emergency contact"), ("language", "Call language")]  # fmt: skip
HELP = ("Jodi commands:\n/status – how the mother and baby are doing\n/prescription – send a prescription photo\n"
        "/stop – stop Jodi messages in this chat\n/help – this list\nIn an emergency, call 108.")  # fmt: skip
DM_CHAIN = ["dm_name", "dm_relation", "dm_phone"]
