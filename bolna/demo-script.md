# Recorded demo script (2–4 minutes)

Do not record until chat tests pass and you have approved a voice call.

**Setup:** Chat-tested agent. Browser or inbound call. Caller is Rahul.

1. **Open** — Maya: Digit claims, this is Maya. New accident or existing claim?
2. **Intent** — Caller: New. Someone scraped my Honda City in Koramangala just now. Nobody is hurt.
3. **Identify** — Maya asks for policy or registration. Caller: POL-DGT-4821.
4. **Tool** — lookup_policy. Maya: comprehensive cover, deductible twenty-five hundred rupees.
5. **Edge case** — Caller: Can I go to the Koramangala workshop?
6. **Tool** — find_cashless_garages. Maya: Koramangala is full; Indiranagar can take it today.
7. **Change** — Caller: Fine, Indiranagar.
8. **Confirm** — Maya restates vehicle, scrape, deductible, Indiranagar. Asks to register.
9. **Yes** — Caller: Yes, please register it.
10. **Tool** — register_claim. Maya reads claim ID and WhatsApp self-inspection next step.
11. **Close** — Caller: That’s all. Maya: Take care.

If the first garage had been invented as available, the demo would be a chatbot. The capacity miss is the point.
