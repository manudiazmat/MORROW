# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One shared brand language on iOS and Android (Expo / React Native), with each OS's guarantees kept: safe areas, system Back, Reduce Motion, font scaling, haptics where available.

## Stack

Pinned by the brief: React Native + Expo (SDK 58) + TypeScript + Expo Router, Reanimated, react-native-svg, Supabase (auth, Postgres with RLS, Edge Functions). RevenueCat deferred. Local-first persistence (Zustand + AsyncStorage) with an outbox sync to Supabase when configured.

## Users

People of 20–35 starting their independence or juggling several goals at once (young professionals). They open the app for a few seconds to check today, and occasionally spend twenty minutes reviewing a month. Usable regardless of age, profession or income.

## Product Purpose

MORROW (MY + TOMORROW) connects time, work, money, health, relationships, leisure, growth and future in one personal system, so a person understands how they use their time, how they manage their resources and whether they are moving toward the life they want. Success: it helps people organise to live better, not live to organise.

## Positioning

Not another productivity app. The Life Balance flower turns registered data and the person's own rating into one radial picture of eight life dimensions, always showing which part is self-rated and which part is measured. A contextual assistant reads the person's own data (with consent) and proposes actions that never run without confirmation.

## Operating Context

Daily quick look (today, next event, priorities); weekly planning with conflict detection; manual money logging; monthly review of Life Balance snapshots; weekly review. Default language Spanish (Spain), English available. Currency default EUR.

## Capabilities and Constraints

- Five sections: Home, Plan, Finance, Goals, Profile. Cross-cutting: Quick Add, Personal Assistant.
- No bank connections in the MVP. No payments yet (freemium prepared, not built).
- AI is provider-independent behind a backend; keys never in the client; the app must work fully without AI and must never simulate model answers.
- No personal data leaves the device for AI without explicit consent.
- Undecided: pricing (research 3,99–5,99 €/month), premium boundaries.

## Brand Commitments

Name MORROW; line "Your life. Your time. Your tomorrow." Warm digital minimalism + soft (moderate) neumorphism. Manrope (DM Sans fallback). Light palette Ivory #F2F0EA, Sand #E6E2D9, Sage #C5C9B8, Olive #858A7D, Ink #373A35. Dark palette #20211F / #292B28 / #30332F, text #F0EEE8 / #AAA99F, accent #AEB69D / #7F8974; dark designed on its own, not inverted. Tabular figures for money and stats. Light, dark and automatic themes, persisted.

## Evidence on Hand

User-supplied references: radial 8-petal chart (IMG_0237), neumorphic search fields (IMG_0235), Free/Premium pill toggle (GIF), soft fingerprint well (IMG_0233), dark floating nav pill with FAB (IMG_0236). No user data, testimonials or metrics exist: nothing may be invented; empty states start from zero.

## Product Principles

1. Seconds to understand today, depth on demand (overview → management → insights).
2. Honest numbers: scores, balances and assistant answers come from registered data and say where they come from.
3. Nothing acts on the person's behalf without a preview and a yes.
4. Calm over completeness: never make the person feel behind.

## Accessibility & Inclusion

44pt touch targets, text contrast ≥ 4.5:1 in both themes, font scaling respected, Reduce Motion honoured, every control labelled for screen readers.
