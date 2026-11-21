# news-image-20261121

A program that draws, in code only, a one-page newspaper front page summing up Saturday 21 November 2026's world news, and writes it to `/output/entry.png`.

- Masthead: **THE WORLD TODAY — Saturday 21 November 2026**
- 12 featured stories with headline + summary, all real news of Saturday 21 November 2026 (Peru 6.8 quake, Gen Z protests across Europe, Saudi coalition downing Houthi missiles, COP31 stalling, Trump on Nvidia and Jensen Huang, Denmark expelling a Russian diplomat, record foreign inflows into Indian shares, KL Rahul completing the SENA set, the JPMorgan/Visa/Mastercard vendor cyberattack, Russia targeting Kyiv crossings, Nepal's PM heading to Delhi, French police sentenced over the Zecler beating)
- A numbered world map marking where the news happened (12 numbered locations)
- `ALSO ON SATURDAY`: 23 more real stories, numbered 13–35
- Sources: Reuters, AP, BBC, Al Jazeera, AFP, NDTV, The Daily Short, WION, IMD. Markets strip at the foot of the page (Friday's close, reported on Saturday).

35 real stories in total. No network, no clock, no randomness: running `main.ts` twice writes byte-identical PNG output. Node 22 standard library only. MIT licensed.

## Run it

```sh
node main.ts            # writes /output/entry.png (1024x1024, < 1 MiB)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Verification

- Two runs write byte-identical output (sha256 `6c2fc1d0a3cbe308123645784d6ddd08b08cbf2fd8cc0e1be9a1570a412387a2`)
- PNG 1024x1024, 36,465 bytes (limit 1,048,576)
- All 12 featured headlines fit in two lines and all summaries in two lines; all 23 "also" items fit on one line; the markets strip fits inside the page (checked by the program's debug output and by viewing the rendered PNG)
