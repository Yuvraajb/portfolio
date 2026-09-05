---
title: Building Synapse, a Habit Tracker That Grows a Brain
tags: [swift, sceneKit, side-projects]
---

Most habit trackers show you a grid of checkmarks. I wanted mine to show me a brain growing synapses, because apparently a grid of checkmarks was never going to hold my attention for more than four days.

Synapse is a SwiftUI + SceneKit iOS app I've been building on and off. The idea is simple even if the implementation wasn't: every habit completion spawns a glowing neuron inside a translucent brain shell, and consecutive-day streaks wire synapses between them. Five life categories — Fitness, Learning, Work, Social, Mind — map to distinct anatomical regions, so over time your habits quite literally reshape the brain sitting in the middle of your screen.

A few things I learned building it:

- **Draw the brain, don't import it.** I started by looking for a free `.usdz` brain mesh and gave up after realizing I could get a perfectly good dorsal-view silhouette out of `UIBezierPath` extruded with `SCNShape` — fissure notch, two hemispheres, brainstem notch, and eight curved gyri hint-lines per hemisphere. Zero external assets, and it's easier to restyle later.
- **Hebbian growth is a satisfying model for UI, not just neuroscience.** "Cells that fire together, wire together" turns out to be a pretty good rule for turning boring streak data into something that feels alive.
- **A timeline scrubber changes how people feel about their own data.** Watching five months of completions animate into a growing constellation hits differently than staring at a static heatmap.

It's still a prototype — there's a time-lapse scrubber, tap-to-inspect neuron details, and an ambient bloom/pulse shader doing more work than is strictly necessary for a to-do app. Which, if you know me, is exactly on brand.

Code lives on [GitHub](https://github.com/yuvraajb) if you want to poke at the SceneKit internals.
