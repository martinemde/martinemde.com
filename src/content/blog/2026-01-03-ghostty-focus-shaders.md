---
title: 'Ghossty Focus / Blur Shaders'
date: 2026-01-02T20:16:00-08:00
author: martinemde
description: 'Creating dynamic unfocused states and adding focus resume animations with Ghostty shaders. How to create shaders for the unreleased feature on Ghostty.'
published: false
slug: ghossty-focus-based-shader-effects
---

Ghostty just merged my change to allow shaders to know when the window is focused. It's not released yet, but you can use it on main. This tiny feature unlocks shaders in a way that makes even the crazier shaders usable.

## Focus/Blur Effects

I don't think many people want to type into a crazy stylized CRT terminal.
Even if it looks cool, usability matters and the CRT shader definitely reduces usability even while looking fucking awesome.

The `iFocus` uniform (the name for a Shadertoy style input variable) is an int that is `1` when the window is focused and `0` when it is not. This means you can enable or disable shaders based on focus state.

Here's an example you can tack on to any shader to make it skip focus states.
Flip the logic as needed.

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    // Early exit when focused - skip all effects
    if (iFocus == 0) {
        fragColor = texture(iChannel0, uv);
        return;
    }

    // Make cool stuff happen...
}
```

Surfaces can only reliably render shaders when focused.
Blurred (not focused) surfaces in Ghostty don't get frames reliably, or receive shader calls at odd intervals while defocused.
It's a good idea to gate all shaders on iFocus to improve performance.

With this change, you can make it really obvious which frames are blurred and which are focused, by literally making them blur and focus.

## Focus Resume Animations

The other thing I added is `iTimeFocus` which gives the last timestamp when focus was received.

## Installing ghostty@tip

If you want to use these, you'll need to install the dev version of Ghostty.
It might be glitchy (I immediately submitted another bug fix after this feature because the dev build had a problem)

```glsl
// Early exit when focused - skip all CRT effects
if (iFocus > 0.5) {
  fragColor = texture(iChannel0, uv);
  return;
}
```
