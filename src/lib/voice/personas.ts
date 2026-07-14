export interface VoicePersona {
  id: string;
  name: string;
  region: "Penang" | "KL" | "Ipoh";
  proximityPhrases: {
    far: string[];
    warm: string[];
    hot: string[];
    arrived: string[];
  };
  celebration: string[];
}

export const PERSONAS: VoicePersona[] = [
  {
    id: "uncle-lim",
    name: "Uncle Lim",
    region: "Penang",
    proximityPhrases: {
      far: [
        "Aiyah, still far lah. Keep walking!",
        "The stall not going anywhere, but you better hurry before lunch crowd.",
      ],
      warm: [
        "You're getting warmer... can you smell the wok hei already?",
        "Closer, closer! The uncle there fry since before you were born.",
      ],
      hot: [
        "Almost there! I can hear the sizzle from here!",
        "So close! Look for the smoke — that's how you find the best ones.",
      ],
      arrived: [
        "You made it! Quick, grab a number before the queue gets longer!",
        "Welcome, welcome! This one ah, three generations already. Respect.",
      ],
    },
    celebration: [
      "Wah, you really know your stuff!",
      "Not bad lah! The uncle would be proud.",
    ],
  },
  {
    id: "auntie-kamala",
    name: "Auntie Kamala",
    region: "KL",
    proximityPhrases: {
      far: [
        "Still got way to go, sayang. Take your time.",
        "KL traffic also like this — patience, ya?",
      ],
      warm: [
        "Getting closer! You can feel the heat from the mamak griddle, no?",
        "Warmer, warmer! Follow the aroma of ghee and spice.",
      ],
      hot: [
        "Almost! I can practically taste the dhal from here!",
        "So near already! Look for the crowd — best food always got queue.",
      ],
      arrived: [
        "Here already! Sit down, order teh tarik first. That's the rule.",
        "You found it! This place, open 24 hours. Best thing about KL.",
      ],
    },
    celebration: [
      "Pandai! You know your Malaysian food well!",
      "Very good, very good! Come, let me tell you more.",
    ],
  },
  {
    id: "ah-kong",
    name: "Ah Kong",
    region: "Ipoh",
    proximityPhrases: {
      far: [
        "Still far ah. Ipoh people don't rush — enjoy the walk.",
        "Take your time. The kopitiam has been there since my father's time.",
      ],
      warm: [
        "Getting closer... Ipoh water makes everything taste better, you'll see.",
        "Warmer! The limestone hills are watching over you.",
      ],
      hot: [
        "Almost there! Can you see the old tin-mining town shophouses?",
        "So close! The best things in Ipoh are hidden in old buildings.",
      ],
      arrived: [
        "You found it! Sit in the kopitiam, order white coffee. Then eat.",
        "Welcome! This place, older than me. And I'm very old already.",
      ],
    },
    celebration: [
      "Ho liao! You really understand Ipoh food!",
      "Very good! My grandchildren don't even know this.",
    ],
  },
];

export function getPersonaForRegion(city: string): VoicePersona {
  return (
    PERSONAS.find((p) => p.region === city) ?? PERSONAS[0]
  );
}
