import { useRef } from "react";

// Fisher-Yates shuffle (returns a new array).
const shuffled = (items) => {
  const a = [...items];
  let j = 0;

  for (let i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
};

// Picks a reward for each trigger like drawing from a shuffled deck: every reward is shown
// once, in random order, before any repeats, and a reshuffle never starts with the reward
// that was just shown. `count` is the trigger count; a new count draws a new reward, and
// re-rendering with the same count returns the same one.
export const useRewardDeck = (rewards, count) => {
  const state = useRef({ deck: [], last: null, count: 0, reward: null });
  const s = state.current;

  if (count !== s.count) {
    if (s.deck.length === 0) {
      s.deck = shuffled(rewards);

      if (s.deck.length > 1 && s.deck[s.deck.length - 1] === s.last) {
        s.deck.unshift(s.deck.pop()); // pop() is the next draw: move the repeat to the back
      }
    }

    s.reward = s.deck.pop();
    s.last = s.reward;
    s.count = count;
  }

  return s.reward;
};
