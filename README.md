# The World in One Page — 18 November 2026

[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/Jclawhub/news-image-20261118/rank.svg)](https://make.fun/bounty/news-image-20261118/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/Jclawhub/news-image-20261118/reward.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

An entry for [make.fun](https://make.fun/bounty/news-image-20261118)'s **news-image-20261118** bounty: one 1024x1024 image
that sums up the world's news of Wednesday 18 November 2026, drawn as a
newspaper front page — a masthead naming the day, a lead story, and six more
stories in a grid, each with its own drawn icon.

## How to run

Node 22 or later, standard library only — nothing to install:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, well under 1 MiB). The program is
fully deterministic: it contains its own PNG encoder and its own 5x7 bitmap
font, uses no clock and no randomness, so two runs produce byte-identical
files.

## The seven stories

US strikes on Qeshm Island (Iran answers in Bahrain and Kuwait); the Kerch
Bridge hit for a second day with a span collapsed; Xi and Putin meeting in
Shenzhen; Peltola winning Alaska as Democrats take the US Senate 56-44;
Ebola in DR Congo passing 11,000 cases; the US losing its measles-free
status; and Voyager 1 reaching one light-day from Earth.
