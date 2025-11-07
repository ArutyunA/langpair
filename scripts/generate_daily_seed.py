#!/usr/bin/env python3
"""Generate SQL seed data for daily vocabulary and scenarios from days1to10.csv."""

from __future__ import annotations

import csv
import re
import uuid
from pathlib import Path
from typing import Dict, List

CSV_PATH = Path("days1to10.csv")
OUTPUT_PATH = Path("supabase/migrations/20251106151611_seed_daily_content.sql")
PROMPTS_OUTPUT_PATH = Path("supabase/migrations/20251107160000_seed_daily_prompts.sql")
BASE_DATE = "2025-01-01"

SCENARIO_META = {
    1: ("Cafe Catch-Up", "Friend A", "Friend B"),
    2: ("Weekend Planning Chat", "Friend A", "Friend B"),
    3: ("Train Station Prep", "Traveler", "Travel Partner"),
    4: ("Clothes Shopping", "Shopper", "Friend"),
    5: ("Dinner at the Restaurant", "Diner One", "Diner Two"),
    6: ("Movie Reactions", "Friend A", "Friend B"),
    7: ("Weekend Trip Prep", "Traveler A", "Traveler B"),
    8: ("Doctor Visit", "Patient", "Doctor"),
    9: ("Team Standup", "Colleague A", "Colleague B"),
    10: ("Giving Directions", "Local Guide", "Traveler"),
}

PROMPT_BLUEPRINTS = {
    1: [
        "Ask {partner} whether {vocab0} or {vocab1} sounds better today and why.",
        "Explain that you already ordered {vocab2} and see if {partner} wants to share.",
        "Suggest enjoying {vocab3} here versus taking it to go and get their opinion.",
        "Check if {partner} has tried {vocab4} before and ask for their tasting notes.",
        "Coordinate paying the {vocab5} and who handles the tip.",
    ],
    2: [
        "Compare two spots for tomorrow using {vocab0} and {vocab1}, then decide together.",
        "Share your {vocab2} and ask if {partner} prefers a different time.",
        "Invite extra {vocab3} and check if the group size works.",
        "Use {vocab4} to discuss transportation or meeting point details.",
        "Confirm who sends the final {vocab5} update and by when.",
    ],
    3: [
        "Debate which {vocab0} to catch and why it fits the schedule.",
        "Use the {vocab1} to double-check {vocab2} and avoid delays.",
        "Discuss what happens if there's a {vocab3} and how you'll adjust.",
        "Confirm {vocab4} preferences and whether you need extra comfort items.",
        "Review the {vocab5} together and assign tasks for tickets and snacks.",
    ],
    4: [
        "Talk about style goals for the trip using {vocab0} and {vocab1}.",
        "Plan a route through the {vocab2} and {vocab3} to stay efficient.",
        "Ask {partner} to give honest feedback at the {vocab4}.",
        "Discuss budget by referencing {vocab5} and how many outfits you need.",
        "Decide who carries the {vocab6} and where to stash receipts.",
    ],
    5: [
        "Compare menu ideas and highlight {vocab0} vs {vocab1} depending on mood.",
        "Ask {partner} to suggest a {vocab2} if the waiter is busy.",
        "Use {vocab3} to talk about service expectations and tipping.",
        "Plan to capture the moment with {vocab4} and share online.",
        "Coordinate feedback to the {partner} role about the {vocab5} or meal overall.",
    ],
    6: [
        "Ask which {vocab0} scene stood out most and why.",
        "Debate the performance of a {vocab1} and whether it worked.",
        "Imagine rewriting part of the {vocab2} and pitching it to {partner}.",
        "Use {vocab3} to connect the movie to a personal experience.",
        "Suggest the next film night using {vocab4} ideas.",
    ],
    7: [
        "Use {vocab0} to pitch a destination and ask {partner} for theirs.",
        "Check the {vocab1} and see if plans need adjusting.",
        "Assign who handles {vocab2} or {vocab3} and packing responsibilities.",
        "Mention bringing the {vocab4} and get suggestions for other gear.",
        "Decide on a shared {vocab5} album or daily recap tradition.",
    ],
    8: [
        "Describe symptoms clearly using {vocab0} so {partner} understands.",
        "Ask about the {vocab1} and share concerns.",
        "Discuss taking or avoiding {vocab2} and why.",
        "Confirm follow-up plans using {vocab3} and timeline cues.",
        "Reassure {partner} by outlining how you'll rest and monitor progress.",
    ],
    9: [
        "Kick off the {vocab0} by sharing status and asking {partner} for theirs.",
        "Highlight blockers tied to {vocab1} and agree on next actions.",
        "Use {vocab2} to negotiate deadlines or scope.",
        "Reassign {vocab3} items if someone is overloaded.",
        "Plan the next check-in referencing {vocab4} or updates.",
    ],
    10: [
        "Explain {vocab0} clearly and confirm {partner} understood the turn.",
        "Use {vocab1} to anchor landmarks and ask for repeat-back.",
        "Offer an alternative route using {vocab2} and gauge confidence.",
        "Discuss timing and reassure them if the {vocab3} feels far.",
        "Wrap up by inviting questions and confirming final steps at the {vocab4}.",
    ],
}

DEFAULT_BLUEPRINTS = [
    "Add a new detail to the scenario \"{desc}\" and check how {partner} reacts.",
    "Introduce {vocab0} naturally and explore how it changes the conversation.",
    "Ask {partner} to choose between {vocab1} and {vocab2} and explain why.",
    "Suggest a follow-up action that involves {vocab3} and divide tasks.",
    "Confirm next steps with {partner} so both roles stay aligned.",
]

STOPWORDS = {
    "a", "an", "and", "are", "be", "but", "can", "do", "does", "for", "go", "have", "how", "i", "is", "it", "let",
    "let's", "me", "my", "need", "not", "of", "on", "please", "she", "he", "so", "thanks", "thank", "that", "the",
    "their", "there", "they", "this", "to", "we", "what", "when", "where", "which", "who", "why", "will", "with",
    "you", "your", "in", "at", "about", "from", "up", "down", "left", "right", "here", "today", "tomorrow", "weekend",
    "friend", "time", "meeting", "help", "feel", "could", "would", "should", "get", "take", "give", "want", "like",
    "see", "come", "back", "ready", "plan", "plans", "trip", "week", "day", "night", "work", "call", "soon", "later",
    "again", "more", "less", "new", "old", "good", "bad", "very", "movie", "doctor", "symptoms", "medicine", "project",
    "meeting", "directions", "turn", "straight", "stay", "near", "far", "team", "task", "tasks", "bill", "coffee"
}

WORD_PATTERN = re.compile(r"[A-Za-z']+")
NAMESPACE = uuid.UUID("9d21f670-1f7c-4d70-846e-89c1e03249f8")


def english_score(text: str) -> int:
    return sum(1 for w in WORD_PATTERN.findall(text.lower()) if w in STOPWORDS)


def contains_non_ascii(value: str) -> bool:
    return any(ord(ch) > 127 for ch in value)


def parse_phrase_tokens(tokens: List[str]) -> Dict[str, str]:
    working = tokens[:]
    while working and working[-1] == "":
        working.pop()

    target_parts: List[str] = []
    while working and contains_non_ascii(working[0]):
        target_parts.append(working.pop(0))

    if not target_parts and working:
        target_parts.append(working.pop(0))

    target = ",".join(part for part in target_parts if part).strip()
    ascii_tokens = [tok for tok in working if tok]

    if not ascii_tokens:
        return {"phrase": target, "romanization": "", "translation": ""}

    if len(ascii_tokens) == 1:
        return {"phrase": target, "romanization": "", "translation": ascii_tokens[0].strip()}

    best_idx = 1
    best_score = -1
    for idx in range(1, len(ascii_tokens)):
        candidate = ",".join(ascii_tokens[idx:]).strip()
        score = english_score(candidate)
        if score > best_score or (score == best_score and idx > best_idx):
            best_score = score
            best_idx = idx

    romanization = ",".join(ascii_tokens[:best_idx]).strip()
    translation = ",".join(ascii_tokens[best_idx:]).strip()
    return {"phrase": target, "romanization": romanization, "translation": translation}


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def scenario_uuid(day: int, language: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"day-{day}-{language}")


def load_content():
    content: Dict[int, Dict[str, Dict[str, object]]] = {}
    with CSV_PATH.open(encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if not header:
            raise RuntimeError("CSV missing header row")

        for row in reader:
            if not row or not row[0].strip():
                continue
            day_label = row[0].strip()
            if not day_label.lower().startswith("day"):
                continue
            day = int(day_label.split()[1])
            language = row[1].strip().lower()
            section = row[2].strip().lower()
            type_ = row[3].strip().lower()

            lang_entry = content.setdefault(day, {}).setdefault(language, {
                "vocabulary": [],
                "prompt": "",
                "phrases": []
            })

            if section == "vocabulary":
                word = row[4].strip()
                romanization = row[5].strip()
                translation = row[6].strip()
                lang_entry["vocabulary"].append({
                    "word": word,
                    "romanization": romanization,
                    "translation": translation,
                })
            elif section == "roleplay":
                if type_ == "prompt":
                    lang_entry["prompt"] = row[6].strip()
                elif type_ == "phrase":
                    phrase_data = parse_phrase_tokens(row[4:])
                    lang_entry["phrases"].append(phrase_data)
    return content


def format_vocab(vocabulary: List[Dict[str, str]], index: int) -> str:
    if index < len(vocabulary):
        entry = vocabulary[index]
        word = entry.get("word", "").strip()
        translation = entry.get("translation", "").strip().lower()
        if word and translation:
            return f"{translation} ({word})"
        if translation:
            return translation
        if word:
            return word
    return "that idea"


def build_prompts(
    day: int,
    description: str,
    your_role: str,
    partner_role: str,
    vocabulary: List[Dict[str, str]],
) -> List[str]:
    description_snippet = description.split(".", 1)[0].strip() or description
    templates = PROMPT_BLUEPRINTS.get(day, DEFAULT_BLUEPRINTS)
    prompts: List[str] = []

    context = {
        "desc": description_snippet,
        "you": your_role.lower(),
        "partner": partner_role.lower(),
        "vocab0": format_vocab(vocabulary, 0),
        "vocab1": format_vocab(vocabulary, 1),
        "vocab2": format_vocab(vocabulary, 2),
        "vocab3": format_vocab(vocabulary, 3),
        "vocab4": format_vocab(vocabulary, 4),
        "vocab5": format_vocab(vocabulary, 5),
    }

    for template in templates:
        try:
            prompts.append(template.format(**context))
        except KeyError:
            continue

    if not prompts:
        prompts = [template.format(**context) for template in DEFAULT_BLUEPRINTS][:5]

    return prompts[:5]


def build_sql():
    content = load_content()

    vocab_values: List[str] = []
    scenario_values: List[str] = []
    phrase_values: List[str] = []
    prompt_values: List[str] = []

    for day in sorted(content.keys()):
        day_meta = SCENARIO_META.get(day)
        if not day_meta:
            raise RuntimeError(f"Missing scenario metadata for day {day}")
        title, your_role, partner_role = day_meta

        for language, lang_data in content[day].items():
            prompt = lang_data["prompt"]
            scenario_id = scenario_uuid(day, language)
            scenario_values.append(
                f"('{scenario_id}', {day}, '{language}', '{sql_escape(title)}', "
                f"'{sql_escape(prompt)}', '{sql_escape(your_role)}', '{sql_escape(partner_role)}')"
            )

            phrases = lang_data["phrases"]
            for order_index, phrase in enumerate(phrases, start=1):
                roman = phrase["romanization"]
                roman_sql = f"'{sql_escape(roman)}'" if roman else "NULL"
                phrase_values.append(
                    f"('{scenario_id}', {order_index}, '{sql_escape(phrase['phrase'])}', "
                    f"'{sql_escape(phrase['translation'])}', {roman_sql})"
                )

            vocabulary = lang_data["vocabulary"]
            for vocab in vocabulary:
                roman = vocab["romanization"]
                roman_sql = f"'{sql_escape(roman)}'" if roman else "NULL"
                vocab_values.append(
                    f"({day}, '{language}', '{sql_escape(vocab['word'])}', "
                    f"'{sql_escape(vocab['translation'])}', {roman_sql}, "
                    f"DATE '{BASE_DATE}' + INTERVAL '{day - 1} day')"
                )

            prompts = build_prompts(
                day,
                prompt,
                your_role,
                partner_role,
                vocabulary,
            )
            for order_index, prompt_text in enumerate(prompts, start=1):
                prompt_values.append(
                    f"('{scenario_id}', {order_index}, '{sql_escape(prompt_text)}')"
                )

    sql_sections = [
        "-- Seed daily vocabulary",
        "INSERT INTO public.daily_vocabulary (day_number, language, word, translation, romanization, date)",
        "VALUES",
        ",\n".join(vocab_values),
        "ON CONFLICT (day_number, language, word) DO NOTHING;",
        "",
        "-- Seed daily scenarios",
        "INSERT INTO public.daily_scenarios (id, day_number, language, title, description, your_role, partner_role)",
        "VALUES",
        ",\n".join(scenario_values),
        "ON CONFLICT (day_number, language) DO UPDATE SET",
        "  title = EXCLUDED.title,",
        "  description = EXCLUDED.description,",
        "  your_role = EXCLUDED.your_role,",
        "  partner_role = EXCLUDED.partner_role;",
        "",
        "-- Seed scenario phrases",
        "INSERT INTO public.daily_scenario_phrases (scenario_id, order_index, phrase, translation, romanization)",
        "VALUES",
        ",\n".join(phrase_values),
        "ON CONFLICT (scenario_id, order_index) DO UPDATE SET",
        "  phrase = EXCLUDED.phrase,",
        "  translation = EXCLUDED.translation,",
        "  romanization = EXCLUDED.romanization;",
    ]

    OUTPUT_PATH.write_text("\n".join(sql_sections) + "\n", encoding="utf-8")
    print(f"Wrote seed SQL to {OUTPUT_PATH}")

    prompt_sections = [
        "-- Seed daily scenario conversation prompts",
        "INSERT INTO public.daily_scenario_prompts (scenario_id, order_index, prompt)",
        "VALUES",
        ",\n".join(prompt_values),
        "ON CONFLICT (scenario_id, order_index) DO UPDATE SET",
        "  prompt = EXCLUDED.prompt;",
    ]

    PROMPTS_OUTPUT_PATH.write_text("\n".join(prompt_sections) + "\n", encoding="utf-8")
    print(f"Wrote prompt seed SQL to {PROMPTS_OUTPUT_PATH}")


if __name__ == "__main__":
    build_sql()
