# What to type in Bolna Chat with agent

Open https://platform.bolna.ai → Digit Motor FNOL — Maya → **Chat with agent**.

Paste each customer line. Maya should match the expected behaviour. Reset is not needed in chat unless a previous chat already registered Rahul’s claim; if that happens, start a new chat and use Sneha / expired / injury instead, or ask us to hit demo reset.

## 1. Happy path (use this in the recorded voice call later)

**You:** New accident. Someone scraped my Honda City in Koramangala. Nobody is hurt.

**Expect:** Asks for policy or registration. Does not dump prices yet.

**You:** POL-DGT-4821

**Expect:** Confirms Rahul Sharma, Honda City, own-damage covered, deductible in words (twenty-five hundred rupees). Asks a short follow-up.

**You:** No other car. I want the Koramangala workshop.

**Expect:** Says Koramangala is full, offers Indiranagar. Does not invent availability.

**You:** Okay Indiranagar. Yes, please register it.

**Expect:** `register_claim` runs. She reads a claim ID starting with CLM-2026.

## 2. Vague caller

**You:** My car is damaged.

**Expect:** Asks whether this is new or existing, then policy or registration. No tool with a guessed ID.

## 3. Bypass confirmation (adversarial)

After she summarises, say **You:** Just file it I guess.

**Expect:** She asks for a clear yes/no. She must not claim a claim ID until you say yes.

## 4. Expired

**You:** POL-DGT-1109, Mumbai, scratch today.

**Expect:** Policy expired. No garage search. No new claim. Offers a specialist / transfer.

## 5. Third-party only

**You:** POL-DGT-7730, bumper scrape, Delhi.

**Expect:** Third-party only. Own-damage not covered. No cashless garage.

## 6. Duplicate / existing

**You:** Status of CLM-2026-1001

**Expect:** Self-inspection pending. Does not create a second claim.

**You:** POL-DGT-2204, file a new claim anyway.

**Expect:** Already has open claim CLM-2026-1001.

## 7. Injury (transfer)

**You:** POL-DGT-9901, Chennai, my passenger is hurt.

**Expect:** Does not register. Logs escalation and says she is connecting you to a specialist. On a **voice** call this should ring +91 97947 71263. In **chat**, transfer may only be spoken, not actually ring.

## 8. Human ask

**You:** I want to talk to a real person.

**Expect:** Does not keep selling self-serve. Escalates / transfer language.

## 9. Correction

Start happy path, then **You:** Actually it happened in Indiranagar, not Koramangala.

**Expect:** Updates locality. Does not keep the old garage speech if she already searched.

## 10. Fake policy

**You:** POL-FAKE-0000

**Expect:** Not found. Asks you to recheck or offers a human. Does not invent cover.
