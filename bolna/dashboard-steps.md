# Dashboard steps that MCP cannot do

1. Open the agent in [platform.bolna.ai](https://platform.bolna.ai) → Agent Setup.
2. Paste `system-prompt.md` into the Agent tab if the MCP prompt looks truncated.
3. Tools tab → Custom Function → Write manually. Paste each file in `tools/` after substituting `PUBLIC_BASE_URL` and `DEMO_API_KEY`.
4. Add built-in **Transfer Call** if you have a destination number. Otherwise chat tests can only log escalations.
5. Save agent.
6. **Chat with agent** and run `chat-test-matrix.md`.
7. Do not use **Get call from agent** until credits are explicitly approved.
