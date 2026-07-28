/**
 * Before-and-after examples for the public Examples page.
 *
 * The "note" side is deliberately rough: half sentences, no punctuation, the
 * kind of thing an educator actually thumbs into a phone while kneeling on a
 * mat. The "story" side is what a finished draft looks like. Showing both is
 * the most persuasive thing on the site, because the gap between them is the
 * entire product.
 *
 * These are illustrative examples written by us, not real children's records.
 */

export type StoryExample = {
  slug: string;
  childName: string;
  ageGroup: string;
  framework: "NZ" | "AU";
  setting: string;
  note: string;
  storyTitle: string;
  story: string;
  learningSummary: string;
  dispositions: string[];
  curriculumLinks: string[];
  nextSteps: string[];
  familyQuestion: string;
};

export const STORY_EXAMPLES: StoryExample[] = [
  {
    slug: "swing",
    childName: "Harry",
    ageGroup: "3-4 years",
    framework: "NZ",
    setting: "Outdoor area",
    note: "harry played on the swing for ages. wouldnt get off. pushed himself",
    storyTitle: "Working out how to keep himself going",
    learningSummary:
      "Harry stayed with one physical challenge for a long stretch and worked out how to sustain the movement himself rather than asking for a push.",
    dispositions: ["perseverance", "physical confidence", "independence"],
    curriculumLinks: [
      "Mana atua | Wellbeing, particularly children developing physical confidence and knowing what their body can do. Harry kept adjusting his movement until he could sustain the swing on his own.",
      "Mana aotūroa | Exploration, particularly using strategies for reasoning and problem solving. Working out the timing of a swing is a genuine physical problem, solved by testing rather than being told.",
    ],
    nextSteps: [
      "Leave the swings available at the same time tomorrow and notice whether Harry goes straight back to them.",
      "Offer a second kind of movement challenge nearby, such as a balance beam or a rope, and see whether the persistence carries across.",
    ],
    familyQuestion: "Is there something at home Harry keeps going back to until he has worked it out?",
    story: `Learning Story
Harry spent a long stretch of outside time on the swing today. The note records that he stayed with it and did not want to get off, and that he was pushing himself rather than asking an adult to push him.

That last detail is the interesting one. Getting a swing going from a standing start, and then keeping it going, takes a specific bit of timing that cannot really be explained to a three year old. It has to be felt. Leaning back at the right moment, tucking the legs at the right moment, and repeating it. Harry stayed with that long enough to work it out.

What learning we noticed
The clearest thing here is persistence with a physical problem. Harry did not lose interest when the swing slowed, and he did not look around for an adult to fix it. He kept adjusting until the movement held.

There is also a growing physical confidence. Sustaining a swing means trusting your own body to hold on while it is moving, which is not a small thing at this age.

Because the note does not tell us whether anyone else was involved, we have kept this story about Harry alone. If other tamariki were waiting or taking turns, that would add a social dimension worth recording next time.

Curriculum links
This links with Mana atua | Wellbeing, particularly children developing physical confidence and knowing what their body can do.

It also links with Mana aotūroa | Exploration. Working out the timing of a swing is genuine problem solving, tested through repetition rather than instruction.

Where to next / Responding
We will keep the swings available at the same point in the day and notice whether Harry returns to them straight away. We can also offer a different kind of movement challenge nearby, such as a low balance beam, and watch whether the same persistence shows up when the problem changes.

Family/whānau link
Whānau may recognise this at home. Children who stay with one physical challenge often have a particular thing they return to again and again.`,
  },
  {
    slug: "sandpit",
    childName: "Aria",
    ageGroup: "2-3 years",
    framework: "NZ",
    setting: "Sandpit",
    note: "aria in sandpit. filled bucket, tipped it out. did it like 20 times. said 'again'",
    storyTitle: "Again, and again, and again",
    learningSummary:
      "Aria repeated one action many times, which at this age is how a working theory gets built and tested rather than boredom.",
    dispositions: ["curiosity", "working theories", "concentration"],
    curriculumLinks: [
      "Mana aotūroa | Exploration, particularly children developing working theories for making sense of the world. Repetition is how a two year old checks that something happens the same way every time.",
      "Mana reo | Communication. Aria used a single clear word to signal her intention to keep going.",
    ],
    nextSteps: [
      "Add a container of a different shape so the outcome changes slightly and see whether Aria notices.",
      "Try wet sand alongside dry and watch whether she comments on the difference.",
    ],
    familyQuestion: "What does Aria ask to do over and over at home?",
    story: `Learning Story
Aria spent time in the sandpit filling a bucket and tipping it out. The note says she did this around twenty times, and that she said "again".

To an adult, twenty repetitions of the same action can look like a child who has run out of ideas. It is usually the opposite. For a two year old, repeating something that many times is how you confirm that the world behaves the way you think it does. The sand comes out. It comes out again. It comes out the same way the twentieth time as the first.

What learning we noticed
Aria was building and testing a working theory: what goes in comes out, and it does so predictably. That is early cause and effect, and she was gathering her own evidence for it.

Her concentration is worth noting too. Staying with one self chosen task for that long, without an adult structuring it, is a real skill at this age.

The word "again" also matters. It is short, but it is Aria communicating a clear intention: not finished, keep going. She used language to keep control of her own activity.

Curriculum links
This links with Mana aotūroa | Exploration, particularly children developing working theories for making sense of the natural, social, physical and material worlds.

It also links with Mana reo | Communication, as Aria used a word purposefully to direct what happened next.

Where to next / Responding
We can add a container with a different shape, so the result changes slightly, and notice whether Aria spots the difference. Offering wet sand beside dry sand would give her a second variable to test.

Family/whānau link
Whānau may notice the same pattern at home, where a child asks for the same small thing over and over. It is usually a sign of thinking, not of being stuck.`,
  },
  {
    slug: "painting",
    childName: "Mia",
    ageGroup: "4-5 years",
    framework: "AU",
    setting: "Art table",
    note: "mia painted. mixed blue and yellow, got green, was surprised. told everyone",
    storyTitle: "The moment green appeared",
    learningSummary:
      "Mia made an unexpected discovery through her own experimenting and immediately wanted to share it, which turned a solo moment into a group one.",
    dispositions: ["curiosity", "confidence", "communication"],
    curriculumLinks: [
      "EYLF Outcome 4: Children are confident and involved learners, particularly using processes such as experimenting, hypothesising and investigating. Mia produced a result she had not predicted and noticed that it was new.",
      "EYLF Outcome 5: Children are effective communicators. Mia chose to tell others what she had found rather than keep it to herself.",
    ],
    nextSteps: [
      "Put out only the three primary colours tomorrow so mixing is the only way to get anything else.",
      "Ask Mia to predict what red and yellow will make before she tries it.",
    ],
    familyQuestion: "Has Mia been mixing or combining things at home to see what happens?",
    story: `Learning Story
Mia was painting at the art table when she mixed blue and yellow together and produced green. The note records that she was surprised, and that she told everyone.

What happened
Mia had not set out to make green. She was combining colours to see what they did, and the result was something she had not expected. Her surprise tells us this was genuinely new to her rather than something she had been shown.

The second half of the moment matters as much as the first. Having discovered something, Mia did not keep it to herself. She turned around and told the other children and the educators about it. A discovery became a shared piece of knowledge because she chose to pass it on.

What learning we noticed
Mia was experimenting in a real sense. She combined two things, observed the outcome, and recognised that the outcome was unexpected. Noticing that something is surprising requires having had an expectation in the first place, which is more sophisticated than it looks.

We also saw confidence in sharing. Announcing a discovery to a room takes a certain security in being listened to.

Curriculum links
This links with EYLF Outcome 4, particularly children using processes such as experimenting, hypothesising, researching and investigating.

It also links with EYLF Outcome 5, as Mia used language to share a discovery and make it available to others.

Where to next / Responding
Tomorrow we will put out only red, blue and yellow, so that any other colour has to be made rather than taken. We can also ask Mia to predict what red and yellow will make before she mixes them, which turns an accidental discovery into a deliberate test.

Family link
Families may notice Mia combining things at home, in cooking or in play, to find out what happens.`,
  },
  {
    slug: "sharing",
    childName: "Tane",
    ageGroup: "3-4 years",
    framework: "NZ",
    setting: "Block corner",
    note: "tane wouldnt share the blocks at first. then he did. gave some to leo",
    storyTitle: "Deciding to share, in his own time",
    learningSummary:
      "Tane moved from holding on to the blocks to offering some to another child, and appears to have made that decision himself rather than being directed.",
    dispositions: ["empathy", "self-regulation", "social negotiation"],
    curriculumLinks: [
      "Mana tangata | Contribution, particularly children learning to take another point of view and to negotiate with others.",
      "Mana atua | Wellbeing, particularly children managing themselves and their feelings with growing independence.",
    ],
    nextSteps: [
      "Notice whether the sharing happens again unprompted, or whether it needed the same circumstances.",
      "Name what happened simply next time it occurs, so Tane hears the behaviour described.",
    ],
    familyQuestion: "How does Tane work out sharing at home, particularly with people he knows well?",
    story: `Learning Story
Tane was playing in the block corner and at first did not want to share the blocks. Later in the same session he did, and the note records that he gave some to Leo.

Because the note does not tell us what happened in between, we have written this carefully. We do not know whether an adult stepped in, whether Leo asked, or whether Tane simply changed his mind. That gap is worth filling next time, because it changes what the moment means.

What learning we noticed
What we can say is that Tane's position shifted within one play session. He went from holding on to the materials to handing some over. Whatever prompted it, he was the one who did it.

Sharing at this age is genuinely hard. A three year old is still working out that another person can want the same object for reasons of their own. Moving from "mine" to "some for you" involves holding your own want and someone else's at the same time, and choosing.

The fact that this happened during play, rather than at an adult's instruction, is what makes it worth recording.

Curriculum links
This links with Mana tangata | Contribution, particularly children learning to take another point of view and to negotiate.

It also links with Mana atua | Wellbeing, as managing a strong want and choosing differently is early self regulation.

Where to next / Responding
We will notice whether this happens again without prompting, and in what circumstances. It would also help to name it simply when it happens, so Tane hears his own behaviour described back to him. Something like noticing that he gave Leo some blocks, without turning it into praise.

Educator check
Confirm whether an adult prompted the sharing. If so, the story should say so, because a supported moment and a self chosen one are different pieces of evidence.

Family/whānau link
Whānau may have noticed Tane working sharing out at home, especially with siblings or cousins.`,
  },
  {
    slug: "quiet",
    childName: "Sophie",
    ageGroup: "4-5 years",
    framework: "AU",
    setting: "Book corner",
    note: "sophie sat by herself reading. quiet all morning. didnt join group",
    storyTitle: "Choosing her own company",
    learningSummary:
      "Sophie chose sustained solitary reading over group activity, which is a legitimate choice rather than something to be corrected.",
    dispositions: ["concentration", "self-direction", "early literacy"],
    curriculumLinks: [
      "EYLF Outcome 1: Children have a strong sense of identity, particularly children developing autonomy and making choices about their own learning.",
      "EYLF Outcome 5: Children are effective communicators, particularly engaging with texts and finding meaning in them.",
    ],
    nextSteps: [
      "Leave the choice open rather than steering Sophie toward group time, and notice what she selects tomorrow.",
      "Ask about the book itself rather than about why she was alone.",
    ],
    familyQuestion: "Does Sophie have books or quiet activities she returns to at home?",
    story: `Learning Story
Sophie spent the morning in the book corner by herself. The note records that she was quiet throughout and did not join the group activity.

We want to be careful about how this is read. A child who chooses to be alone is not automatically a child who needs to be brought in. Sophie made a choice about how to spend her morning, stayed with it, and sustained her attention on books for an extended period.

What learning we noticed
The clearest evidence here is sustained self directed engagement. Sophie chose an activity, and stayed with it without adult structuring, for a long time. That is concentration, and it is a genuine strength.

There is also her relationship with books. Spending a whole morning with them suggests they hold something for her, whether that is the pictures, the story, or the quiet itself.

We would want to know more before drawing conclusions about the social side. Choosing solitude on one morning is different from consistently avoiding others, and the note only covers one morning.

Curriculum links
This links with EYLF Outcome 1, particularly children developing autonomy and making choices about their own learning.

It also links with EYLF Outcome 5, as Sophie was engaging with texts over a sustained period.

Where to next / Responding
We will leave the choice genuinely open rather than steering Sophie toward group time, and notice what she picks tomorrow. When we talk with her, we will ask about the book rather than about why she was on her own, because the book is the part she chose.

Educator check
Worth confirming over the coming week whether this is a preference or a pattern, and whether Sophie seeks company at other points in the day.

Family link
Families may recognise this at home, and may know which books or quiet activities Sophie returns to.`,
  },
  {
    slug: "upset",
    childName: "Noah",
    ageGroup: "2-3 years",
    framework: "NZ",
    setting: "Morning arrival",
    note: "noah cried at drop off again. took a while. wanted his blanket. was ok by kai time",
    storyTitle: "Finding his way into the day",
    learningSummary:
      "Noah needed time and a familiar object to settle at arrival, and got there himself within the morning.",
    dispositions: ["emotional regulation", "trust", "resilience"],
    curriculumLinks: [
      "Mana atua | Wellbeing, particularly children being kept safe emotionally and learning to manage themselves with support.",
      "Mana whenua | Belonging, particularly children and families feeling a sense of belonging, and knowing that they have a place here.",
    ],
    nextSteps: [
      "Keep the blanket accessible at arrival rather than putting it away, and notice whether the settling time shortens.",
      "Keep the arrival routine identical for a fortnight so the predictability itself does some of the work.",
    ],
    familyQuestion: "Is there a goodbye routine at home that seems to help, that we could match here?",
    story: `Learning Story
Noah cried at drop off again this morning. The note records that it took a while, that he wanted his blanket, and that he was settled by kai time.

The word "again" tells us this is a pattern rather than a one off, and the last part tells us the important thing: he got there.

What learning we noticed
Noah is learning one of the harder things a two year old has to learn, which is that a parent leaving is not a parent gone. That takes repetition and it takes time, and it is not helped by being hurried.

He also knew what he needed. Asking for his blanket is Noah identifying his own comfort strategy and requesting it, which is more active than simply being distressed. That is the beginning of self regulation: recognising the feeling and reaching for something that helps.

By kai time he had made it into his day. The distance between the door and the table was covered by Noah, with support, and that is worth recording as progress rather than as a difficulty.

Curriculum links
This links with Mana atua | Wellbeing, particularly children being kept safe emotionally and learning to manage themselves with the support of trusted adults.

It also links with Mana whenua | Belonging. A settled arrival is how belonging is built, one morning at a time.

Where to next / Responding
We will keep the blanket accessible at arrival rather than putting it away, so Noah does not have to ask for it while he is already upset. We will also keep the arrival routine identical for the next fortnight, because predictability does a lot of the work here.

Family/whānau link
It would help to know whether there is a goodbye routine at home that seems to work, so we can match it. Consistency between home and here usually shortens this stage.`,
  },
];

export function getExample(slug: string) {
  return STORY_EXAMPLES.find((example) => example.slug === slug) ?? null;
}
