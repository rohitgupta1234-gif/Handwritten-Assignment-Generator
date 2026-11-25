const text = `
Wedding
When James was in high school he had the
likes for a girl, named Savannah. He loved her
enough to stare at her in social study class
because he sat behind her, years later he went
to her house to ask her if she wanted to
marry him and she said yes and he go happy
and got children, and she died last month.
Career
Lebron's career is to be a basketball player.
And today he is in the NBA and with the maimi
heat. And he is a great player, but he might get
transfered to the Lakers in 2014, with Carmello
Anthony and kobe Bryant. And he used to play
football for st-vincent - st-mary high. Futher more
he was a great football player.
Team
Maimi heat is a professinal basketball team
based on Maimi, Florida, United state. The team is a
member of the southeast Divison in the Eastern
of the NBA. And were they play there home games is
American Airlines Areana in Downtown Maimi. And formed
in 1988 as one of the NBA four expansion franishes.
Therefore maimi is the best team in
the world to me.
`;

const chars = new Set();
for (const c of text) {
  if (c !== '\n' && c !== ' ') chars.add(c);
}
const sorted = Array.from(chars).sort();
console.log('Total unique characters in handwritting6.jpg:', sorted.length);
console.log('Characters:', sorted.join(' '));

const lower = sorted.filter(c => /[a-z]/.test(c));
console.log('Lowercase count:', lower.length, 'Missing:', 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !chars.has(c)).join(' '));

const upper = sorted.filter(c => /[A-Z]/.test(c));
console.log('Uppercase count:', upper.length, 'Present:', upper.join(' '), 'Missing:', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !chars.has(c)).join(' '));

const digits = sorted.filter(c => /[0-9]/.test(c));
console.log('Digits count:', digits.length, 'Present:', digits.join(' '), 'Missing:', '0123456789'.split('').filter(c => !chars.has(c)).join(' '));

const punct = sorted.filter(c => !/[a-zA-Z0-9]/.test(c));
console.log('Punctuation:', punct.join(' '));
