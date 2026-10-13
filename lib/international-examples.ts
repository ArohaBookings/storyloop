/**
 * Real England (EYFS) and Ireland (Aistear) drafts, shown on their guides.
 *
 * The notes were written by us to test the new writer on 13 Oct 2026 (they
 * are not about real children), and each story is exactly what
 * generateInternationalStory returned for it, unedited. Four were written;
 * all four passed every check in inspectInternationalStory. Never retype or
 * tidy these: regenerate and paste if a draft ever needs replacing.
 */
export type InternationalExample = {
  framework: "UK" | "IE";
  childName: string;
  age: string;
  note: string;
  title: string;
  story: string;
  outcomes: string[];
  writtenOn: string;
};

export const INTERNATIONAL_EXAMPLES: Record<"UK" | "IE", InternationalExample> = {
  UK: {
    framework: "UK",
    childName: "Poppy",
    age: "3 years",
    note: "Poppy (3y 2m) at the playdough table. Rolled long snakes and said 'mine is longest'. Lined hers up next to Alfie's to check. Then cut hers in half and said 'now it's two'. Counted the pieces 1, 2. Asked me for the knife to make more.",
    title: "Making more with playdough",
    story: "Making more with playdough\n\nLearning Story\nPoppy was at the playdough table rolling the dough into long snake shapes. As she looked at her own piece, she said, “mine is longest”. She then lined her playdough snake up next to Alfie’s to check.\n\nAfter comparing the two pieces, Poppy changed her idea. She cut her long piece in half and said, “now it’s two”. She counted the pieces, “1, 2”, then asked us for the knife so she could make more.\n\nWhat learning we noticed\nPoppy was using real mathematical thinking in her play. She compared length by placing her piece next to Alfie’s, rather than just guessing. When she cut the playdough in half, she noticed that one long piece had become two pieces, and she matched this with counting.\n\nPoppy also showed confidence in talking about her thinking. Her words helped us see what she was noticing: longest, two, and more. Asking for the knife showed that she had a plan and wanted to carry on changing the playdough herself.\n\nCurriculum links\nThis links with EYFS: Mathematics, as Poppy compared length, noticed quantity, and counted two pieces. It also links with EYFS: Communication and language, as she used words to explain what she had made and what changed. We also saw Creating and thinking critically, as Poppy tested an idea, checked it against Alfie’s, then changed the playdough to make something new.\n\nWhere to next / Responding\nWe can keep playdough tools available so Poppy can cut, roll, compare and count in her own way. We can add simple measuring language as she plays, such as longer, shorter, same, more, less, one piece and two pieces. We can also offer chances to line up playdough shapes, ribbons or blocks so Poppy can keep comparing and checking her ideas.\n\nFamily link\nAt home, Poppy might enjoy comparing everyday objects by length, such as spoons, socks or toy cars, and counting what happens when something is shared or cut into pieces.",
    outcomes: ["EYFS: Mathematics", "EYFS: Communication and language", "EYFS characteristic: Creating and thinking critically"],
    writtenOn: "2026-10-13",
  },
  IE: {
    framework: "IE",
    childName: "Oisín",
    age: "2 years",
    note: "Oisín 2y 4m outside after the rain. Stamped in the puddle, watched the splash, stamped harder. Said 'big splash!' Got a stick and drew lines in the mud, then showed me and said 'look, road'. Brought Ella over to stamp with him.",
    title: "Puddles, mud and roads",
    story: "Puddles, mud and roads\n\nLearning Story\nOisín was outside after the rain and went straight into investigating the puddle. He stamped in the water, watched the splash, and then stamped harder. When the splash changed, Oisín named what he saw: “big splash!”\n\nHe then picked up a stick and used it in the mud. Oisín drew lines and showed us his idea, saying “look, road”. He was not only making marks, he was giving those marks a meaning and sharing that meaning with us.\n\nOisín also brought Ella over to stamp with him. He wanted another child to join his play and shared the puddle experience with her.\n\nWhat learning we noticed\nOisín was testing what his body could do in the puddle. He noticed that stamping made a splash, then changed his action by stamping harder. This showed early cause and effect thinking.\n\nHis mud lines became a road in his play. Oisín used a simple natural material, a stick, to make marks and represent an idea. His words helped us understand what he was thinking.\n\nBringing Ella over showed Oisín beginning to include others in his play. He used a shared experience, stamping in the puddle, as a way to connect with another child.\n\nCurriculum links\nAistear: Exploring and Thinking. Oisín tested how the puddle responded when he stamped, changed the force of his stamping, and used a stick to draw lines in the mud.\n\nAistear: Communicating. Oisín used words to name what happened and to explain his mark-making idea, including “big splash!” and “look, road”.\n\nAistear: Identity and Belonging. Oisín invited Ella into the play, showing confidence in sharing an idea with another child.\n\nWhere to next / Responding\nWe can offer more outdoor mark-making after wet weather, with sticks, mud, water and open space for large movements. We can use simple language beside Oisín’s play, such as splash, bigger, line, road, long, short, soft and hard, while leaving room for his own words.\n\nWe will continue to notice how Oisín shares his ideas with other children and how he changes his actions when he sees something new happen.\n\nFamily link\nAt home, Oisín might enjoy noticing puddles, tyre tracks, paths or marks in the mud during walks after rain.",
    outcomes: ["Aistear: Exploring and Thinking", "Aistear: Communicating", "Aistear: Identity and Belonging"],
    writtenOn: "2026-10-13",
  },
};
