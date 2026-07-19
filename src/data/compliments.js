// Compliment pool for the floating popup shown on correct answers.
// Kana/kanji first (what actually shows), romaji reading underneath.
export const compliments = [
  { text: '素晴らしい', romaji: 'subarashii' },
  { text: 'さすが', romaji: 'sasuga' },
  { text: '完璧', romaji: 'kanpeki' },
  { text: 'やった', romaji: 'yatta' },
  { text: 'すごい', romaji: 'sugoi' },
  { text: '天才', romaji: 'tensai' },
  { text: '最高', romaji: 'saikou' },
  { text: '神業', romaji: 'kamiwaza' },
  { text: '見事', romaji: 'migoto' },
  { text: '無敵', romaji: 'muteki' },
  { text: '一撃', romaji: 'ichigeki' },
  { text: 'グッジョブ', romaji: 'good job' },
  { text: '正解', romaji: 'seikai' },
  { text: '冴えてる', romaji: 'saeteru' },
  { text: 'パーフェクト', romaji: 'perfect' },
  { text: 'あっぱれ', romaji: 'appare' },
  { text: '神', romaji: 'kami' }
];

// Reserved for notably fast correct answers.
export const speedCompliments = [
  { text: '速い', romaji: 'hayai' },
  { text: '電光石火', romaji: 'denkousekka' },
  { text: '瞬殺', romaji: 'shunsatsu' }
];

export function pickCompliment(isFast) {
  const pool = isFast ? speedCompliments : compliments;
  return pool[Math.floor(Math.random() * pool.length)];
}
