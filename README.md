# Stakejack

![Stakejack panel](docs/preview.png)

A browser extension for Pragmatic Play Live Blackjack on Stake. It reads the table you're sitting at and tells you the best play for your hand, what to bet, and how the count is running. It only watches the game. It never clicks or bets for you.

## Install

Build it with pnpm:

```sh
pnpm install
pnpm build:all
```

In Chrome, open `chrome://extensions`, turn on developer mode, choose Load unpacked and pick `.output/chrome-mv3`. In Firefox, open `about:debugging#/runtime/this-firefox` and load `.output/firefox-mv3/manifest.json` as a temporary add-on. Regular Firefox only keeps signed add-ons, so for a permanent install run `pnpm sign:firefox` with your addons.mozilla.org API key in `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET`.

Reload the blackjack table after installing and the panel shows up in the game.

## How it works

The extension listens to the game's own WebSocket, plus the wallet and table config requests the client already makes. From that it knows your seat, every card on the table and your balance.

Moves come from an exact expected value calculation for this table's rules: eight decks, dealer stands on soft 17, double after split, one split, and a dealer who only checks for blackjack behind an ace. That last rule means doubles and splits lose to a dealer blackjack behind a ten, which changes a few book plays, like 11 against a 10.

Once it has seen a shoe from the first card, it keeps a Hi-Lo count, adjusts plays to the cards left and sizes your bet with half Kelly. The count is saved per table, so a reload picks up where it left off.

## Development

`pnpm dev` runs a live build. `pnpm typecheck`, `pnpm lint` and `pnpm format:check` keep the code clean. `pnpm replay <capture.json>` runs a recorded session through the advisor, and `pnpm tsx scripts/strategy-chart.ts` prints the full strategy chart. The built extension also includes `preview.html`, which renders every panel state from sample hands.
