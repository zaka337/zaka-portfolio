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
