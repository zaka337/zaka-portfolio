import { PROJECTS } from "@/lib/projects";
import { SOCIAL } from "@/lib/site";

/* What Zaka answers when someone talks to the portfolio (components/Voice.tsx). Plain keyword
   matching on what the speech engine heard, written from the site's own content: there is no
   AI behind it, so it can only say true things about Zaka and always has a way out. */

export type Reply = {
  say: string;                                  // what is spoken (and shown)
  go?: string;                                  // a page of this site to open once it has spoken
  link?: { label: string; href: string };       // something to tap: new tabs are only allowed from a tap
  act?: "dark" | "light" | "crumble" | "xray" | "terminal" | "stop" | "lamp" | "lampoff" | "tour";
};

/* How each project is likely to be heard: speech engines split and respell names, so these are
   matched against the transcript with the spaces removed. */
const HEARD: Record<string, string[]> = {
  "qa-with-zaka": ["qawithzaka", "qawithzakka", "queuewithzaka", "learningplatform", "qaplatform"],
  "zong-health-scanner": ["zong", "healthscanner", "websitescanner", "healthscan"],
  "momcare-ai": ["momcare", "mumcare", "mamacare", "maternal", "momkare"],
  "glamourhub": ["glamourhub", "glamorhub", "glamorushub", "glamourhob", "glamourhubb"],
  "bazaarbox": ["bazaarbox", "bazarbox", "bizarrebox", "bazaarboks", "bazarboks"],
  "portfolio": ["thisportfolio", "thissite", "thiswebsite", "theportfolio"],
};

const JOKES = [
  "A QA engineer walks into a bar. Orders one beer. Orders zero beers. Orders ninety nine million beers. Orders a lizard. Orders minus one beers. Then the first real customer walks in and asks where the bathroom is, and the bar catches fire.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are ten kinds of people: those who understand binary, and those who do not.",
  "My code works on my machine. So we are shipping my machine.",
];

const karachiTime = (now: Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi", hour12: false }).format(now);

export function understand(raw: string, now: Date = new Date()): Reply {
  const t = ` ${raw.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  const squash = t.replace(/[^a-z0-9]/g, "");
  const has = (re: RegExp) => re.test(t);
  const words = t.trim().split(" ").filter(Boolean).length;

  if (!t.trim()) return { say: "I did not hear anything. Tap to try again." };

  // Ways out first
  if (has(/ (stop|cancel|never ?mind|be quiet|quiet|shut up|enough) /)) return { say: "Okay.", act: "stop" };

  // The fun ones
  if (has(/ (delete|destroy|wipe|erase|nuke|crumble|break|knock over|tear down) .*(everything|the site|the page|the website|it all|this site|this page|this website) /) || has(/ rm rf /)) {
    return { say: "You asked for it. Hold on.", act: "crumble" };
  }
  if (has(/ (x ray|xray|blueprint) /) || has(/ show me the (skeleton|structure|bones) /)) return { say: "Drawing the blueprint.", act: "xray" };
  if (has(/ (terminal|command line|console|shell) /)) return { say: "Opening the terminal.", act: "terminal" };
  if (has(/ (tour|show me around|walk me through|take me around|guided) /)) return { say: "Sure. A one minute walk around the site.", act: "tour" };
  if (has(/ (lamp|flashlight|torch|spotlight) /)) {
    return has(/ (off|stop|out) /) ? { say: "Lamp off.", act: "lampoff" } : { say: "Lamp on. Move around to light the page.", act: "lamp" };
  }
  if (has(/ (dark mode|night mode|dark theme|lights off|turn off the lights|go dark) /)) return { say: "Dark mode.", act: "dark" };
  if (has(/ (light mode|day mode|light theme|lights on|turn on the lights|go light) /)) return { say: "Light mode.", act: "light" };
  if (has(/ (joke|funny|make me laugh|something funny) /)) return { say: JOKES[Math.floor(Math.random() * JOKES.length)] };

  // A project by name
  for (const p of PROJECTS) {
    if ((HEARD[p.slug] ?? [p.title.toLowerCase().replace(/[^a-z0-9]/g, "")]).some((k) => squash.includes(k))) {
      return { say: `Opening ${p.title}. ${p.pitch}`, go: `/projects/${p.slug}` };
    }
  }

  // Working together
  if (has(/ (available|availability|free to|hire|hiring|freelance|open for work|work with you|work together|looking for a developer|for a project) /)) {
    return { say: "Yes, I am open for work. Opening the project brief.", go: "/contact-me" };
  }

  // Ways to reach Zaka (new tabs need a tap, so these come back as a button)
  if (has(/ (whats ?app|message you|text you) /)) return { say: "Here is WhatsApp. Tap to open it.", link: { label: "Open WhatsApp", href: "/whatsapp" } };
  if (has(/ git ?hub /)) return { say: "Here is GitHub. Tap to open it.", link: { label: "Open GitHub", href: SOCIAL.github } };
  if (has(/ linked ?in /)) return { say: "Here is LinkedIn. Tap to open it.", link: { label: "Open LinkedIn", href: SOCIAL.linkedin } };
  if (has(/ (instagram|insta) /)) return { say: "Here is Instagram. Tap to open it.", link: { label: "Open Instagram", href: SOCIAL.instagram } };
  if (has(/ (e ?mail|mail you) /)) return { say: "Here is my email. Tap to write to me.", link: { label: "Write an email", href: `mailto:${SOCIAL.email}` } };
  if (has(/ (resume|cv|curriculum) /)) return { say: "Opening the resume.", go: "/resume" };
  if (has(/ (nokia|snake|old phone) /)) return { say: "Opening the Nokia. Try the snake game.", go: "/contact" };
  if (has(/ (contact|reach|get in touch|talk to you|call you|speak to you) /)) {
    return { say: "Opening the project brief. Or ask me for WhatsApp, email or LinkedIn.", go: "/contact-me" };
  }

  // About Zaka
  if (has(/ (about page|more about|read more|full story|his story|your story) /)) return { say: "Opening the about page.", go: "/about" };
  if (has(/ (where|location|based|live|city|country|from|time zone|timezone|what time) /)) {
    return { say: `I am in Islamabad, Pakistan. Right now it is ${karachiTime(now)} there.` };
  }
  if (has(/ (stack|skills?|tech|technolog\w*|tools|languages?|frameworks?|good at|know how|experience) /)) {
    return { say: "I build with React, Next.js and TypeScript, Flutter and Firebase, and three.js for 3D. For testing I use Selenium, Playwright and Python." };
  }
  if (has(/ (qa|quality|testing|tester|automation|selenium|playwright|appium) /)) {
    return { say: "I test what I build. QA automation with Selenium and Playwright is half of what I do, and I teach it at QA with Zaka." };
  }
  if (has(/ (who are you|who is zaka|who is this|about you|about yourself|yourself|introduce|background|what do you do|tell me about you) /)) {
    return { say: "I am Zaka Ullah Waheed, a full-stack developer and QA automation engineer from Islamabad, Pakistan. Ask me about my projects, my skills, or whether I am free to work." };
  }

  // Looking around
  if (has(/ (projects?|portfolio|case stud\w*|showcase|what have you (built|made)|what did you (build|make)|your work|show me your work|built|made) /)) {
    return { say: "Here are my projects.", go: "/projects" };
  }
  if (has(/ (home|home page|go back|start) /)) return { say: "Going home.", go: "/" };

  // Small talk, help
  if (has(/ (thanks?|thank you|cool|nice|awesome|great|amazing) /)) return { say: "Anytime." };
  if (has(/ (help|what can i (say|ask)|commands?|options|what can you do) /)) {
    return { say: "Try: show me your projects. Are you available? What is your stack? Where are you based? Open the blueprint. Or tell me a joke." };
  }
  if (words <= 4 && has(/ (hi|hello|hey|yo|salam|assalam o alaikum|assalamualaikum|good (morning|afternoon|evening)) /)) {
    return { say: "Hey! I am Zaka. Ask me about my projects, my skills, or whether I am free to work." };
  }

  return { say: "Hmm, I did not catch that. Try: show me your projects, are you available, or what is your stack." };
}
