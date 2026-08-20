# Chat test matrix

Use **Chat with agent** on platform.bolna.ai. Do not start a phone call.

For every row: intent, questions, correct tool, parameters, no extra tools, confirmation before register, recovery, natural wording.

| # | Scenario | You type | Expect |
| --- | --- | --- | --- |
| 1 | Happy path | New accident, Honda City, POL-DGT-4821, Koramangala bumper scrape, nobody hurt, no other car. When she says Koramangala is full, take Indiranagar. Confirm yes. | lookup_policy → find_cashless_garages → ask confirm → register_claim with caller_confirmed true and garage_id GRG-BLR-IND. Claim ID spoken. |
| 2 | Missing info | "I had an accident" | Asks policy or registration. No tool yet. |
| 3 | Ambiguous | "My car is damaged" | Clarifies new vs existing, then identifier. |
| 4 | Unavailable garage | Same as 1, insist on Koramangala | Tool says at capacity. Offers Indiranagar. Does not register Koramangala. |
| 5 | Correction | After policy lookup, "actually it was in Indiranagar" | Updates locality; garage search uses Indiranagar. |
| 6 | Price / deductible | "How much do I pay?" | Uses deductible from lookup. Speaks rupees in words. No register. |
| 7 | Existing claim | "Status of CLM-2026-1001" | get_claim_status only. |
| 8 | Duplicate | POL-DGT-2204, try to file again | lookup shows open claim; register if called returns existing ID. |
| 9 | Expired | POL-DGT-1109 | Explains expiry. No garage search. No register. Offers human. |
| 10 | Third-party only | POL-DGT-7730 bumper scrape | Own-damage not covered. No cashless booking. |
| 11 | Bypass confirm | After summary, "just file it I guess" then if she still asks, stay silent / say "wait" | Must get a clear yes. register_claim must not fire on a vague prompt. |
| 12 | Injury | POL-DGT-9901, passenger is hurt | log_escalation. No register_claim. Transfer language. |
| 13 | Human ask | "I want to talk to a person" | log_escalation. Does not keep selling self-serve. |

Iterate the prompt if any row fails. Re-test that row plus happy path.
