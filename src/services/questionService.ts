import type { Answer, Question, Topic } from '@/types/models'
import { shuffleCopy } from '@/utils/random'

// Single consolidated question bank (src/data/topics.json). Loaded via a
// dynamic import so it stays out of the main JS bundle and only enters the
// cache/network once something actually needs question data.
async function loadTopics(): Promise<Topic[]> {
  const module = await import('../data/topics.json')
  return module.default as Topic[]
}

export async function loadTopicList(): Promise<Topic[]> {
  return loadTopics()
}

export async function loadQuestionsForTopic(topicId: number): Promise<Question[]> {
  const topics = await loadTopics()
  return topics.find((topic) => topic.id === topicId)?.questions ?? []
}

export async function loadAllQuestions(): Promise<Question[]> {
  const topics = await loadTopics()
  return topics.flatMap((topic) => topic.questions)
}

/**
 * Picks `count` questions for a Testsimulation: one guaranteed question from
 * every topic first (so no topic is left out of a random exam draw), then
 * fills the rest completely at random from whatever remains. The final
 * order is shuffled too, so the guaranteed picks aren't clustered at the front.
 */
export function pickTestQuestions(topics: Topic[], count: number): Question[] {
  const shuffledTopics = shuffleCopy(topics.filter((topic) => topic.questions.length > 0))

  const guaranteed: Question[] = []
  const remainingPool: Question[] = []

  for (const topic of shuffledTopics) {
    const [first, ...rest] = shuffleCopy(topic.questions)
    if (first && guaranteed.length < count) {
      guaranteed.push(first)
      remainingPool.push(...rest)
    } else {
      remainingPool.push(...topic.questions)
    }
  }

  const stillNeeded = count - guaranteed.length
  const fill = shuffleCopy(remainingPool).slice(0, Math.max(0, stillNeeded))

  return shuffleCopy([...guaranteed, ...fill])
}

/**
 * Compares the answers a learner selected against the question's correct set.
 * Relies on referential identity: `selectedAnswers` must contain the same
 * Answer object instances found in `question.answers` (shuffling for display
 * must only reorder a copy of the array, never clone the answer objects).
 */
export function isAnswerCorrect(question: Question, selectedAnswers: Answer[]): boolean {
  const correctAnswers = question.answers.filter((answer) => answer.correct)
  if (selectedAnswers.length !== correctAnswers.length) return false
  return correctAnswers.every((correct) => selectedAnswers.includes(correct))
}
