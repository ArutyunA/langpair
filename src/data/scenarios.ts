export interface Phrase {
  phrase: string;
  translation: string;
  romanization?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  yourRole: string;
  partnerRole: string;
  russianPhrases: Phrase[];
  cantonesePhrases: Phrase[];
}

export const scenarios: Scenario[] = [
  {
    id: "coffee-shop",
    title: "Ordering at a Coffee Shop",
    description: "Practice ordering drinks and making small talk with a barista. One of you is the customer, the other is the barista.",
    yourRole: "Customer",
    partnerRole: "Barista",
    russianPhrases: [
      {
        phrase: "Здравствуйте!",
        translation: "Hello!",
        romanization: "Zdrastvuyte!"
      },
      {
        phrase: "Мне, пожалуйста, капучино.",
        translation: "I'd like a cappuccino, please.",
        romanization: "Mne, pozhaluysta, kapuchino."
      },
      {
        phrase: "Сколько это стоит?",
        translation: "How much is it?",
        romanization: "Skol'ko eto stoit?"
      },
      {
        phrase: "С собой или здесь?",
        translation: "To go or here?",
        romanization: "S soboy ili zdes'?"
      },
      {
        phrase: "Спасибо большое!",
        translation: "Thank you very much!",
        romanization: "Spasibo bol'shoye!"
      }
    ],
    cantonesePhrases: [
      {
        phrase: "你好！",
        translation: "Hello!",
        romanization: "nei5 hou2"
      },
      {
        phrase: "我想要一杯卡布奇諾",
        translation: "I'd like a cappuccino",
        romanization: "ngo5 soeng2 jiu3 jat1 bui1 kaa1 bou3 kei4 nou4"
      },
      {
        phrase: "幾多錢？",
        translation: "How much?",
        romanization: "gei2 do1 cin2"
      },
      {
        phrase: "喺度飲定拎走？",
        translation: "Drink here or take away?",
        romanization: "hai2 dou6 jam2 ding6 ling1 zau2"
      },
      {
        phrase: "唔該晒！",
        translation: "Thank you!",
        romanization: "m4 goi1 saai3"
      }
    ]
  }
];

export const achievements = [
  {
    id: "first-day",
    title: "First Day",
    description: "Complete your first lesson",
    icon: "star" as const,
    earned: true,
  },
  {
    id: "week-streak",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "trophy" as const,
    earned: false,
  },
  {
    id: "phrase-master",
    title: "Phrase Master",
    description: "Learn 50 phrases",
    icon: "target" as const,
    earned: false,
  },
  {
    id: "conversation-king",
    title: "Conversation King",
    description: "Complete 10 scenarios",
    icon: "sparkles" as const,
    earned: false,
  },
];
