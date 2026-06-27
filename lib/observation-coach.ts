export type ObservationSignal = {
  id: string;
  label: string;
  found: boolean;
  prompt: string;
};

const ACTION_WORDS = /\b(built|made|said|asked|noticed|tried|tested|changed|carried|joined|watched|pointed|moved|shared|helped|created|drew|climbed|sorted|counted|explained|returned|adjusted|stopped|started|stacked|knocked|poured|filled|dug|rolled|painted|sang|danced|jumped|balanced|pushed|pulled|opened|grabbed|reached|waved|threw|kicked|splashed|mixed|stirred|scooped|wrote|read|fed|washed|cut|glued|used|picked|placed|lined|collected|explored|investigated|pretended|built up|pretend)\b/i;
const VOICE_MARKERS = /["“”']|\b(said|asked|told|called|explained|signed|gestured)\b/i;
const LEARNING_MARKERS = /\b(again|kept|tried|tested|adjusted|solved|worked out|wondered|noticed|compared|changed|planned|persisted|waited|shared|took turns|taking turns|turn[- ]taking|swapped|swap|negotiated|figured|experimented|problem|persevered)\b/i;
const CONTEXT_MARKERS = /\b(outside|inside|garden|sandpit|mat|table|room|home|park|kitchen|water|blocks|scooter|book|paint|group|morning|today|during|sand|dough|playdough|clay|easel|puzzle|ball|bike|trike|slide|swing|tower|train|cars|dolls|shop|music|story|cups|bucket|spade|crayon|pencil|playground|lunch|outdoor|art|collage)\b/i;
const CONNECTION_MARKERS = /\b(wh[aā]nau|family|mum|dad|parent|grandparent|home|culture|language|community|friend|tamariki|children|peer|sibling)\b/i;

export function getObservationSignals(observation: string): ObservationSignal[] {
  const text = observation.trim();
  return [
    {
      id: "action",
      label: "Concrete action",
      found: ACTION_WORDS.test(text),
      prompt: "Add one thing the child did, changed, tested, or chose.",
    },
    {
      id: "voice",
      label: "Child voice",
      found: VOICE_MARKERS.test(text),
      prompt: "Add an exact phrase, gesture, expression, or clear indication of the child's thinking.",
    },
    {
      id: "learning",
      label: "Learning evidence",
      found: LEARNING_MARKERS.test(text),
      prompt: "Add what happened when the child tried again, solved a problem, collaborated, or changed strategy.",
    },
    {
      id: "context",
      label: "Moment and context",
      found: CONTEXT_MARKERS.test(text),
      prompt: "Add where or when the moment happened and what materials were involved.",
    },
    {
      id: "connection",
      label: "Relationships or identity",
      found: CONNECTION_MARKERS.test(text),
      prompt: "If relevant, add a peer, whānau, home-language, identity, or community connection.",
    },
  ];
}

export function getObservationReadiness(observation: string) {
  const signals = getObservationSignals(observation);
  const found = signals.filter((signal) => signal.found).length;
  return {
    signals,
    found,
    total: signals.length,
    label: found >= 4 ? "Strong observation" : found >= 2 ? "Good start" : "Add one more detail",
  };
}
