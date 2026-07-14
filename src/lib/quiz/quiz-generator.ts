import type { DishEntry } from "@/types/heritage";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: "heritage" | "dialect" | "technique" | "origin";
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistractors(correct: string, pool: string[], count: number): string[] {
  const filtered = pool.filter((p) => p !== correct);
  return shuffle(filtered).slice(0, count);
}

function makeQuestion(
  question: string,
  correct: string,
  distractors: string[],
  category: QuizQuestion["category"]
): QuizQuestion {
  const options = shuffle([correct, ...distractors]);
  return { question, options, correctIndex: options.indexOf(correct), category };
}

export function generateQuiz(dish: DishEntry, count: number = 3): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const allDishes = POKEDEX_ENTRIES;
  const allOrigins = ["Malay", "Chinese", "Indian", "Peranakan", "Mamak", "Portuguese"];
  const allStates = [...new Set(allDishes.map((d) => d.origin_state))];

  // Cultural origin question
  if (dish.culturalOrigin) {
    const distractors = pickDistractors(dish.culturalOrigin, allOrigins, 3);
    questions.push(
      makeQuestion(
        `What is the cultural origin of ${dish.name}?`,
        dish.culturalOrigin,
        distractors,
        "origin"
      )
    );
  }

  // Origin state question
  {
    const distractors = pickDistractors(dish.origin_state, allStates, 3);
    if (distractors.length >= 2) {
      questions.push(
        makeQuestion(
          `Which state is ${dish.name} most associated with?`,
          dish.origin_state,
          distractors.slice(0, 3),
          "heritage"
        )
      );
    }
  }

  // Dialect phrase question
  if (dish.dialectPhrases && dish.dialectPhrases.length > 0) {
    const phrase = dish.dialectPhrases[0];
    const otherMeanings = allDishes
      .flatMap((d) => d.dialectPhrases ?? [])
      .filter((dp) => dp.meaning !== phrase.meaning)
      .map((dp) => dp.meaning);
    const distractors = pickDistractors(phrase.meaning, otherMeanings, 3);
    if (distractors.length >= 2) {
      questions.push(
        makeQuestion(
          `What does "${phrase.phrase}" mean?`,
          phrase.meaning,
          distractors.slice(0, 3),
          "dialect"
        )
      );
    }
  }

  // Technique question
  if (dish.techniques && dish.techniques.length > 0) {
    const tech = dish.techniques[0];
    const otherTechs = allDishes
      .flatMap((d) => d.techniques ?? [])
      .filter((t) => t.name !== tech.name)
      .map((t) => t.name);
    const distractors = pickDistractors(tech.name, otherTechs, 3);
    if (distractors.length >= 2) {
      questions.push(
        makeQuestion(
          `Which cooking technique is essential for ${dish.name}?`,
          tech.name,
          distractors.slice(0, 3),
          "technique"
        )
      );
    }
  }

  // Ingredient question
  if (dish.ingredients.length > 0) {
    const ingredient = dish.ingredients[Math.floor(Math.random() * dish.ingredients.length)];
    const otherIngredients = allDishes
      .filter((d) => d.id !== dish.id)
      .flatMap((d) => d.ingredients)
      .map((i) => i.local_name);
    const distractors = pickDistractors(ingredient.local_name, otherIngredients, 3);
    if (distractors.length >= 2) {
      questions.push(
        makeQuestion(
          `What is "${ingredient.name}" called locally?`,
          ingredient.local_name,
          distractors.slice(0, 3),
          "heritage"
        )
      );
    }
  }

  return shuffle(questions).slice(0, count);
}
