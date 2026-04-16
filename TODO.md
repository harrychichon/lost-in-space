# TODO

Pending design/content work. Tick off when done.

## Small

- [ ] **Mira accompanies you in caves.** Draw her sprite on the cave surface near the player (or as a follower), so she's visibly with you when exploring caves. Probably add to `Cave.ts` — position her near player start, maybe with a subtle idle sway.
- [ ] **Mira coffee-maker dialogue tweak.** In `Kitchen.ts`, the cavediver's line when `coffee_maker` is collected currently reads *"Mira is cleaning out the coffee maker. / 'Takes work, but you'll thank me in the morning.'"* — change it to something like *"Don't ask where the beans come from."*
- [ ] **Dog dialogue on rescue day.** On day 7 (when `isRescueEventReady` is true), the dog's dialogue in the Comms room should shift to reflect that it's agitated — something like *"The dog is barking at the noise coming from the comms."* Currently the dog dialogue in `Comms.ts` is static. Branch on `GameState.isRescueEventReady(this)`.
- [ ] **Spawn outside the room you just left.** When returning to the Ship corridor from a chore room, the player currently spawns at the default position. Instead, they should spawn just outside the door of the room they just exited, so moving between rooms feels continuous. Probably pass `fromRoom` or the door x-position in scene.start data, and have `Ship.create` position the player accordingly.

## Bigger

- [ ] **Dinner cinematic scene.** New scene triggered after completing the Kitchen chore (the `Eat` action). Short cinematic (~3–5 seconds) showing the meal.
  - **Solo:** bland, silent, cold lighting. One figure at the table, slow zoom, long silence, back to Ship.
  - **With dog:** dog eating from its bowl beside the player. Warmer tint.
  - **With botanist:** two figures, a bit of ambient chatter (text bubble?), more color.
  - **With Mira:** three figures, laughter/music hints, coffee cups visible if `coffee_maker` collected, music_box maybe plays if collected.
  - Reuses existing companion draw helpers. Likely a new `Dinner.ts` scene routed to from `Kitchen.ts` on chore completion, then back to Ship.
  - Design question: should this also happen when the Kitchen chore is auto-completed in future iterations? For now only on manual `Eat`.
