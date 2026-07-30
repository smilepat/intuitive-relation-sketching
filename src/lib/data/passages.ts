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
