# Personal upgrade branch

Follow CLAUDE.md for architecture and coding conventions.

- This fork is samQian3/kanna; upstream is jakemor/kanna.
- Deploy only committed and pushed code from sam-upgrade using `bun run deploy:local`.
- Preserve local customizations when integrating upstream changes.
- Wait for active Kanna tasks to finish before restarting the service unless the user explicitly authorizes interruption.
- Keep passwords, task transcripts, attachments, local deployment payloads and backups out of Git.
- See UPGRADE.md for the deployment contract and its limitations.
