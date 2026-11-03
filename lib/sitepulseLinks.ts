/* Where the standalone sitepulse package lives (the open-source scanner that /tools/site-check runs).

   `published` stays false until the package really is on npm and GitHub: while it is false the page promises nothing
   and links nowhere. To switch it on (after `npm publish` and creating the GitHub repository), set it to true. */

export const SITEPULSE = {
  published: false,
  repo: "https://github.com/zaka337/sitepulse",
  npm: "https://www.npmjs.com/package/sitepulse",
  cli: "npx sitepulse your-site.com",
  mcp: "claude mcp add sitepulse -- npx -y sitepulse mcp",
} as const;

/* The same switch for llmcheck (the open-source test runner for AI features, /tools/llmcheck). Set `published` to true
   once the GitHub repository exists. It is installed from GitHub, not from PyPI, so there is no PyPI link. */
export const LLMCHECK = {
  published: false,
  repo: "https://github.com/zaka337/llmcheck",
  install: "pip install git+https://github.com/zaka337/llmcheck",
} as const;
