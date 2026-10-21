/* The six bugs hidden in the QA challenge's checkout (components/qa/QaChallenge.tsx). Each one is a
   mistake real checkouts really have, and each comes with what a tester would try, and the
   automated check that would have caught it (Playwright, the tool Zaka works with). The
   checkout is a made-up shop on this page: nothing is sent anywhere. */

export interface QaBug {
  id: string;
  no: string;
  title: string;
  severity: "Critical" | "High" | "Medium";
  area: string;            // where on the checkout it lives, for the radar
  hints: [string, string]; // a nudge, then a stronger nudge
  what: string;            // what is wrong, said plainly
  idea: string;            // what a tester tries
  code: string;            // a short Playwright check that would catch it
  blip: [number, number];  // where it sits on the radar, as percentages
}

export const QA_BUGS: QaBug[] = [
  {
    id: "neg",
    no: "BUG-01",
    title: "Quantity can go below zero",
    severity: "High",
    area: "The cart",
    hints: ["Think about the smallest numbers a quantity can be.", "Keep pressing the minus button. Or type a number that should not be allowed."],
    what: "The quantity has no lower limit, so it can go negative. A negative line total makes the order total negative: the shop would be paying the customer.",
    idea: "Boundary values: try 0, -1 and a huge number in every number field.",
    code: `await page.getByLabel('Notebook quantity').fill('-1');
await expect(page.getByTestId('total')).not.toContainText('-');`,
    blip: [24, 30],
  },
  {
    id: "stack",
    no: "BUG-02",
    title: "A coupon can be used again and again",
    severity: "High",
    area: "The coupon box",
    hints: ["Coupons are about money. What could go wrong if you use one more than once?", "The code is SAVE10. Apply it, then apply it again."],
    what: "Applying SAVE10 a second time takes another 10% off instead of being refused, so the discount stacks.",
    idea: "Repeat any one-time action: apply the same coupon twice, then three times.",
    code: `await applyCoupon(page, 'SAVE10');
await applyCoupon(page, 'SAVE10');
await expect(page.getByTestId('discount')).toHaveText('10%');`,
    blip: [74, 26],
  },
  {
    id: "plus",
    no: "BUG-03",
    title: "A valid email is rejected",
    severity: "Medium",
    area: "The email field",
    hints: ["Emails come in more shapes than name@site.com.", "Try an address with a plus sign in it, like jane+shop@mail.com, and press Place order."],
    what: "The email check does not allow the plus sign, which is perfectly valid and widely used. Real customers are told their email is wrong.",
    idea: "Try valid but unusual input: plus signs, subdomains, long endings, capital letters.",
    code: `await page.getByLabel('Email').fill('jane+shop@mail.com');
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByText('Enter a valid email')).toBeHidden();`,
    blip: [84, 62],
  },
  {
    id: "card",
    no: "BUG-04",
    title: "Any card number is accepted",
    severity: "High",
    area: "The card field",
    hints: ["A card number has rules. Does this checkout enforce them?", "Type letters, or just 123, as the card number and place the order."],
    what: "The card field only checks that it is not empty. Letters and numbers that are far too short go through and the order is confirmed.",
    idea: "Put the wrong kind of input in every field: letters in a number box, too short, too long.",
    code: `await page.getByLabel('Card number').fill('abcd');
await placeOrder(page);
await expect(page.getByText('Enter a valid card number')).toBeVisible();`,
    blip: [66, 80],
  },
  {
    id: "ship",
    no: "BUG-05",
    title: "Free shipping fails at exactly $50",
    severity: "Medium",
    area: "Shipping",
    hints: ["Read the shipping note carefully. Now test the number in it, and the numbers either side.", "Make the subtotal exactly $50.00 (two notebooks and no pens) and look at shipping."],
    what: "Shipping is free on orders of $50 or more, but the code says 'more than $50'. At exactly $50.00 a $5 fee is still added.",
    idea: "Test every threshold three ways: just below, exactly on, and just above it.",
    code: `await setCart(page, { notebook: 2, pens: 0 }); // $50.00
await expect(page.getByTestId('shipping')).toHaveText('Free');`,
    blip: [30, 72],
  },
  {
    id: "double",
    no: "BUG-06",
    title: "Double-click places two orders",
    severity: "Critical",
    area: "The Place order button",
    hints: ["People click buttons twice. Impatient people click them many times.", "Fill in the form properly, then click Place order twice, fast."],
    what: "The button stays active while the first order is being sent, so a quick second click creates a second order and the customer is charged twice.",
    idea: "Click submit buttons twice, fast. A good button disables itself the moment it is used.",
    code: `await page.getByRole('button', { name: 'Place order' }).dblclick();
await expect(page.getByTestId('orders')).toHaveCount(1);`,
    blip: [50, 12],
  },
];

export const QA_RANKS: { min: number; name: string }[] = [
  { min: 520, name: "Release blocker spotter" },
  { min: 400, name: "Sharp-eyed tester" },
  { min: 250, name: "Steady tester" },
  { min: 0, name: "Getting started" },
];

/** 100 a bug, 15 off for each hint, a little off for every second past three minutes */
export function qaScore(found: number, hints: number, seconds: number): number {
  return Math.max(0, Math.round(found * 100 - hints * 15 - Math.max(0, seconds - 180) * 0.4));
}
export const qaRank = (score: number) => (QA_RANKS.find((r) => score >= r.min) ?? QA_RANKS[QA_RANKS.length - 1]).name;
