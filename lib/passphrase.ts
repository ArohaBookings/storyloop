// Readable strong passwords for the signup form ("Make me a strong password").
// Five words from 128 plus two digits: about 41 bits in all (35 from the words), and
// random, so it will not be on a breach list the way "Summer2024!" is.
const WORDS = [
  "acorn", "amber", "anchor", "apple", "aroha", "autumn", "badger", "bamboo", "basket", "beacon", "berry", "birch",
  "blossom", "bramble", "breeze", "brook", "button", "cabin", "candle", "canyon", "cedar", "cherry", "cinder", "clover",
  "cobble", "comet", "copper", "coral", "cosy", "crayon", "cricket", "daisy", "dawn", "delta", "dune", "ember",
  "fable", "falcon", "fern", "fiddle", "flint", "forest", "fox", "garden", "ginger", "glade", "harbour", "hazel",
  "heron", "hollow", "honey", "island", "ivy", "jasper", "juniper", "kauri", "kea", "kite", "kiwi", "kowhai",
  "lagoon", "lantern", "lark", "lemon", "lily", "linen", "maple", "marble", "meadow", "mint", "moss", "nectar",
  "nikau", "oak", "ocean", "olive", "orchard", "otter", "pebble", "pepper", "pine", "pīwakawaka", "plum", "pohutu",
  "pony", "poppy", "puddle", "quill", "rain", "raven", "reef", "ribbon", "river", "robin", "rosemary", "saffron",
  "sage", "sail", "shell", "silver", "sparrow", "spruce", "star", "stone", "summit", "sunny", "swan", "tide",
  "tui", "tulip", "valley", "velvet", "violet", "walnut", "wave", "weka", "willow", "wren", "yarrow", "zest",
  "atlas", "biscuit", "compass", "drum", "echo", "feather", "galaxy", "hammock",
].map((w) => w.normalize("NFD").replace(/[̀-ͯ]/g, ""));

function randomIndex(max: number) {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function suggestPassphrase() {
  const words = Array.from({ length: 5 }, () => {
    const w = WORDS[randomIndex(WORDS.length)];
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const digits = String(randomIndex(90) + 10);
  return `${words.join("-")}-${digits}`;
}

export const PASSPHRASE_WORDS = WORDS;
