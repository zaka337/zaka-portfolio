/* Where the standalone sitepulse package lives (the open-source scanner that /tools/site-check runs).

   There are two honest states, and the page must say only what is true:
   - `onGitHub`: the source is public at `repo`. The page links to it and says the npm package is coming.
   - `published`: the package is also on npm, so `npx sitepulse ...` really works. Only then does the page show the
     copyable commands and the npm link. Set it to true after `npm publish` (and the MCP registry listing). */

export const SITEPULSE = {
  onGitHub: true, // github.com/zaka337/sitepulse, public since 2026-11-06 (CI green on Ubuntu and Windows, Node 20 and 22)
  published: true, // on npm since 2026-11-06 (sitepulse@0.1.0); `npx sitepulse` and the MCP handshake were tried from the registry
  repo: "https://github.com/zaka337/sitepulse",
  npm: "https://www.npmjs.com/package/sitepulse",
  cli: "npx sitepulse your-site.com",
  mcp: "claude mcp add sitepulse -- npx -y sitepulse mcp",
} as const;

/* The same switch for llmcheck (the open-source test runner for AI features, /tools/llmcheck). It is installed from
   GitHub, not from PyPI, so there is no PyPI link: `published` means the repository is public and the `pip install
   git+...` line below works (checked in a clean virtualenv on 2026-11-06; CI green on Ubuntu and Windows, Python 3.10,
   3.12, 3.13). */
export const LLMCHECK = {
  published: true,
  repo: "https://github.com/zaka337/llmcheck",
  install: "pip install git+https://github.com/zaka337/llmcheck",
} as const;
