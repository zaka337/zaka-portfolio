/* The roles that the home page's right-hand block cycles through (components/RoleType.tsx).
   Two short lines each, in capitals. Every one is something Zaka really does. */

export interface Role { l1: string; l2: string }

export const ROLES: Role[] = [
  { l1: "FULL-STACK", l2: "DEVELOPER" },
  { l1: "FRONTEND", l2: "DEVELOPER" },
  { l1: "QA", l2: "AUTOMATION" },
  { l1: "FLUTTER", l2: "BUILDER" },
  { l1: "REACT &", l2: "NEXT.JS" },
  { l1: "API", l2: "ENGINEER" },
  { l1: "FIREBASE", l2: "EXPERT" },
  { l1: "N8N", l2: "WORKFLOWS" },
  { l1: "SELENIUM", l2: "TESTER" },
  { l1: "VERCEL", l2: "DEPLOYER" },
];

export const roleName = (r: Role) => `${r.l1} ${r.l2}`.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
