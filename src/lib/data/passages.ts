export interface Passage {
  title: string;
  text: string;
  summary: string;
}

export interface Sentence {
  text: string;
  pattern: string;
  level: string;
  time: number;
}

export const passage: Passage = {
  title: 'The Hidden Risk of Learning Too Fast',
  text: `Learning quickly often looks impressive. With accurate guidance, people can reach correct answers faster and avoid many unnecessary mistakes. When driving in an unfamiliar city or traveling through a new country, for example, following a guide may help someone reach a destination with little confusion. However, there is a hidden risk in this convenience. A person who always follows directions may arrive quickly, but may not develop the ability to judge routes independently. By contrast, someone who drives or travels without constant guidance may get lost, compare alternatives, and correct mistakes. Over time, these experiences can strengthen judgment and a sense of direction. The same principle applies to learning. A tutor who immediately provides information and shows the fastest path to an answer can improve short-term performance. Yet students who rarely experience curiosity, challenge, and trial and error may lose opportunities to build the mental networks needed for independent thinking. Fast learning can produce quick success, but lasting growth often requires time to explore, struggle, and decide.`,
  summary: '빠른 안내는 단기 성과를 높이지만, 시행착오와 독립적 판단의 기회를 줄여 장기적인 사고 성장을 약화시킬 수 있다.',
};

export const sentenceData: Sentence[] = [
  {
    text: 'Learning quickly often looks impressive.',
    pattern: '겉보기 평가',
    level: '하',
    time: 30,
  },
  {
    text: 'With accurate guidance, people can reach correct answers faster and avoid many unnecessary mistakes.',
    pattern: '안내 → 효율',
    level: '중',
    time: 40,
  },
  {
    text: 'When driving in an unfamiliar city or traveling through a new country, for example, following a guide may help someone reach a destination with little confusion.',
    pattern: '예시 → 빠른 도달',
    level: '중',
    time: 45,
  },
  {
    text: 'However, there is a hidden risk in this convenience.',
    pattern: '반전',
    level: '하',
    time: 30,
  },
  {
    text: 'A person who always follows directions may arrive quickly, but may not develop the ability to judge routes independently.',
    pattern: '빠른 도달 ↔ 판단 약화',
    level: '중',
    time: 45,
  },
  {
    text: 'By contrast, someone who drives or travels without constant guidance may get lost, compare alternatives, and correct mistakes.',
    pattern: '시행착오의 과정',
    level: '중',
    time: 45,
  },
  {
    text: 'Over time, these experiences can strengthen judgment and a sense of direction.',
    pattern: '경험 → 성장',
    level: '중',
    time: 40,
  },
  {
    text: 'A tutor who immediately provides information and shows the fastest path to an answer can improve short-term performance.',
    pattern: '과외 → 단기 성과',
    level: '중',
    time: 45,
  },
  {
    text: 'Yet students who rarely experience curiosity, challenge, and trial and error may lose opportunities to build the mental networks needed for independent thinking.',
    pattern: '경험 부족 → 사고 성장 저하',
    level: '상',
    time: 55,
  },
  {
    text: 'Fast learning can produce quick success, but lasting growth often requires time to explore, struggle, and decide.',
    pattern: '단기 성공 ↔ 장기 성장',
    level: '상',
    time: 50,
  },
];

export interface PassageEntry {
  id: string;
  title: string;
  passage: Passage;
  sentences: Sentence[];
}

const forgettingPassage: Passage = {
  title: 'Why We Forget',
  text: `Forgetting is often seen as a failure of the mind. Yet researchers now argue that forgetting serves an important purpose. If we remembered every detail we encountered, our minds would be crowded with useless information. By letting go of minor facts, the brain keeps the most relevant memories easy to reach. In this sense, forgetting is not a weakness but a form of mental organization.`,
  summary: '망각은 실패가 아니라, 사소한 정보를 버려 중요한 기억을 쉽게 꺼내게 하는 정신적 정리 작용이다.',
};

const forgettingSentences: Sentence[] = [
  { text: 'Forgetting is often seen as a failure of the mind.', pattern: '통념', level: '하', time: 30 },
  { text: 'Yet researchers now argue that forgetting serves an important purpose.', pattern: '반전', level: '중', time: 35 },
  { text: 'If we remembered every detail we encountered, our minds would be crowded with useless information.', pattern: '가정 → 문제', level: '중', time: 45 },
  { text: 'By letting go of minor facts, the brain keeps the most relevant memories easy to reach.', pattern: '망각 → 효율', level: '중', time: 45 },
  { text: 'In this sense, forgetting is not a weakness but a form of mental organization.', pattern: '재정의', level: '상', time: 45 },
];

const connectionPassage: Passage = {
  title: 'The Cost of Constant Connection',
  text: `Smartphones keep us connected at every moment of the day. This constant connection feels convenient and even necessary. However, always being available can quietly drain our attention. Each notification pulls the mind away from deep, focused work. People who set clear limits on their devices often think more clearly and feel calmer.`,
  summary: '항상 연결된 상태는 편리해 보이지만 주의를 흩뜨리며, 기기 사용에 한계를 두는 사람이 더 또렷하게 사고한다.',
};

const connectionSentences: Sentence[] = [
  { text: 'Smartphones keep us connected at every moment of the day.', pattern: '현상', level: '하', time: 30 },
  { text: 'This constant connection feels convenient and even necessary.', pattern: '긍정 평가', level: '하', time: 30 },
  { text: 'However, always being available can quietly drain our attention.', pattern: '반전', level: '중', time: 40 },
  { text: 'Each notification pulls the mind away from deep, focused work.', pattern: '원인 → 결과', level: '중', time: 40 },
  { text: 'People who set clear limits on their devices often think more clearly and feel calmer.', pattern: '조건 → 개선', level: '중', time: 45 },
];

/** Built-in passages the learner can choose from. */
export const passageLibrary: PassageEntry[] = [
  { id: 'learning-too-fast', title: passage.title, passage, sentences: sentenceData },
  { id: 'why-we-forget', title: forgettingPassage.title, passage: forgettingPassage, sentences: forgettingSentences },
  { id: 'constant-connection', title: connectionPassage.title, passage: connectionPassage, sentences: connectionSentences },
];
