# Finale demo script (about 3 minutes)

Cast: **Mother** (teammate with phone A), **Husband** (phone B), **ASHA** (phone C), **Doctor** (any teammate), **Presenter** (laptop with demo board).
Before going on stage: `POST /api/demo/reset`, check that ngrok is up, all phones charged and unmuted, and that the board shows the seeded mother "Lakshmi" in green.

1. **Onboarding (40 s)**
   - Presenter uploads a photo of a sample (synthetic) discharge slip on `/onboard`.
   - Board shows extracted fields (C-section, 2.6 kg, labetalol) marked *pending*.
   - Presenter clicks **Start onboarding call**; phone A rings; Jodi reads the details back in Kannada; Mother says "haudu" (yes).
   - Timeline shows the entries as *document_extracted* ✓ confirmed.

2. **Jump to day 5 (5 s)**
   - Presenter clicks **Advance day → 5** ("jaundice window, high-risk week").

3. **Check-in call that turns red (50 s)**
   - Presenter clicks **Start check-in call**; phone A rings.
   - Mother: *"naalku batte since morning… tale bhaara… magu haalu kammi kudiyuttide."*
   - Board: facts appear live (mother: pads 4, headache; baby: feeding poor). Rules fire: M-BLEED-02, M-HTN-05, D-INF/feeding. Status turns red.
   - Jodi reads the RED script verbatim and transfers; phone B (Husband) rings.

4. **Dismissal-proof (20 s)**
   - Husband: *"Delivery aadmele heege, normal."* ("it's normal after delivery")
   - Jodi reads DISMISSAL-RESPONSE. Board: ticket stays **open**, badge "dismissed by family", next escalation timer counting down.

5. **ASHA (35 s)**
   - Board's ASHA list re-orders: Lakshmi at #1 (red).
   - ASHA calls in from phone C: *"Lakshmi nodide, BP 150 over 100, magu 2.8 kg."*
   - Jodi reads back; ASHA confirms. Entries appear as *ASHA-measured*. ASHA says the mother is going to the district hospital → ticket moves to **reached**.

6. **Her phone is her record (30 s)**
   - Mother hands phone A to the Doctor; Jodi recognises the mother's number and reads her summary.
   - Doctor: "Started iron and labetalol 200." Jodi reads back; entry appears as *doctor-verified*.
   - Presenter clicks **Verify record**: hash chain ✅ valid.

**Fallbacks:** if a live call fails, the presenter plays the pre-recorded backup call and uses the **Inject transcript** demo control (backend `POST /api/demo/inject` if implemented) so the board still updates.
