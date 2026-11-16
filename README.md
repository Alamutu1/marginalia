# marginalia

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Alamutu1/marginalia/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Alamutu1/marginalia/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

MARGINALIA — the last librarian defends the library. A roguelike deck-builder: play story-cards to fight the Inkblight across five wings of a living library, bind two tales into one stronger bound tale, and unwrite the Eraser on the Fifth Wing before it erases your deck. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080/index.html in a desktop browser. No build step, no network — the game is plain static files.

## How to play

- Each wing offers a choice: fight, elite fight, a quiet shelf (rest), the Reading Room (shop), and on the Fifth Wing, the boss.
- Each fight: draw 5 tales, 3 ink a turn. Click a card (or press 1-5) to play it. E ends your turn.
- Every enemy shows its intent ("Will chew 8") — block before a big hit, weaken and make it vulnerable before your big cards.
- Win a fight to draft 1 of 3 new tales, then optionally BIND two cards into one stronger bound tale (e.g. Thorn Lash + Nettle Fan = Bramble Fan), and buy relics in the Reading Room with gold.
- The Eraser, the boss of the Fifth Wing, has two phases: below half health it erases one random card from your deck every turn. End it fast.
- 16 tale-cards, 12 relics, 8 foes + the boss, 5 wings, 3 difficulties (Dusty, Archival, Forbidden), seeds, run history, grades, and WebAudio synth sound.
- P pauses, M mutes, R restarts, S replays the same seed, Esc returns to the menu.
- The game is fully deterministic: `?seed=N` fixes the run, and `?shot=title|play|draft|win` stages a screenshot scene.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7qgp7z5x&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
