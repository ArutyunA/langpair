#!/usr/bin/env python3
"""Generate extended daily content rows for days 11+ by translating English scaffolding."""

from __future__ import annotations

import csv
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple
import time

os.environ.setdefault("PYLANGACQ_PARALLEL", "0")

import pycantonese  # type: ignore
import warnings
from urllib3.exceptions import NotOpenSSLWarning  # type: ignore

warnings.filterwarnings("ignore", category=NotOpenSSLWarning)

CSV_PATH = Path("days1to10.csv")
CACHE_PATH = Path(".cache/translation_cache.json")

TRANS_FLAGS = [
    "-no-ansi",
    "-show-original",
    "n",
    "-show-original-phonetics",
    "n",
    "-show-original-dictionary",
    "n",
    "-show-translation",
    "y",
    "-show-translation-phonetics",
    "y",
    "-show-dictionary",
    "n",
    "-show-alternatives",
    "n",
    "-show-languages",
    "n",
    "-show-prompt-message",
    "n",
]


@dataclass
class DayDefinition:
    day: int
    title: str
    your_role: str
    partner_role: str
    prompt: str
    vocabulary: List[str]
    phrases: List[str]


NEW_DAYS: List[DayDefinition] = [
    DayDefinition(
        day=11,
        title="After-School Catch-Up",
        your_role="Parent",
        partner_role="Daughter",
        prompt="After school you and your daughter Min talk about her commute, homework, and how she felt today.",
        vocabulary=[
            "daughter",
            "school day",
            "homework",
            "backpack",
            "lunchbox",
            "school bus",
        ],
        phrases=[
            "How was your day at school, Min?",
            "Did the bus ride feel crowded this afternoon?",
            "Show me the homework so we can plan breaks.",
            "Pack your art project carefully for tomorrow.",
        ],
    ),
    DayDefinition(
        day=12,
        title="Hurrying to Homeroom",
        your_role="Friend",
        partner_role="Student",
        prompt="You call Ka Ming while he rushes back to middle school and help him plan what to review before class starts.",
        vocabulary=[
            "middle school",
            "homeroom",
            "textbook",
            "locker",
            "late bell",
            "study plan",
        ],
        phrases=[
            "Ka Ming, are you almost back on campus?",
            "Grab the science textbook from your locker first.",
            "The late bell rings in five minutes, so breathe and focus.",
            "Review the history notes tonight so you feel ready.",
        ],
    ),
    DayDefinition(
        day=13,
        title="Cold Evening Texts",
        your_role="Friend",
        partner_role="Friend",
        prompt="Late at night Lingling and Ga Jun text about the chilly air, sleep, and small comforts that help them relax.",
        vocabulary=[
            "night breeze",
            "thick blanket",
            "space heater",
            "hot tea",
            "window latch",
            "sleep quality",
        ],
        phrases=[
            "Lingling, did the night breeze sneak through the window again?",
            "I will warm a thermos of hot tea for you two.",
            "Check whether the space heater timer actually turned on.",
            "Let us track sleep quality tomorrow and compare notes.",
        ],
    ),
    DayDefinition(
        day=14,
        title="James at the Company",
        your_role="Coworker",
        partner_role="Coworker",
        prompt="At the office you help James recap tasks, meetings, and how he feels about his projects this week.",
        vocabulary=[
            "company",
            "coworker chat",
            "weekly meeting",
            "project brief",
            "deadlines",
            "feedback notes",
        ],
        phrases=[
            "James, how are you feeling about the client meeting today?",
            "Let us swap feedback notes before the weekly call.",
            "Can you update the project brief while I email the manager?",
            "We should block time for breaks so the deadlines feel lighter.",
        ],
    ),
    DayDefinition(
        day=15,
        title="Lisa Wants New Shoes",
        your_role="Shopping Buddy",
        partner_role="Friend",
        prompt="You stroll with Lisa through the shoe district, compare styles, and discuss budgets before she buys new pairs.",
        vocabulary=[
            "shoe store",
            "sneakers",
            "heel height",
            "size chart",
            "return policy",
            "comfort test",
        ],
        phrases=[
            "Lisa, do these sneakers feel better than the last pair?",
            "Let us double check the size chart before we pay.",
            "I will ask about the return policy just in case.",
            "Walk a full lap to test the comfort and balance.",
        ],
    ),
    DayDefinition(
        day=16,
        title="Andy Shares News",
        your_role="Friend",
        partner_role="Friend",
        prompt="Andy introduces his new girlfriend over coffee, and you both chat about dates, hobbies, and expectations.",
        vocabulary=[
            "girlfriend",
            "coffee date",
            "hobby",
            "weekend plan",
            "text thread",
            "celebration",
        ],
        phrases=[
            "Andy, what do you like most about her so far?",
            "Should we plan a double coffee date next week?",
            "Tell me the funniest text thread you two shared.",
            "Remember to celebrate slowly and enjoy the new pace.",
        ],
    ),
    DayDefinition(
        day=17,
        title="Jack Preps for a Party",
        your_role="Friend",
        partner_role="Friend",
        prompt="You help Jack get ready for a birthday party, covering gifts, outfits, and timing before heading out.",
        vocabulary=[
            "birthday party",
            "gift wrap",
            "dress code",
            "guest list",
            "party bus",
            "sparkler candles",
        ],
        phrases=[
            "Jack, did you sign the birthday card yet?",
            "I can wrap the gift while you iron the shirt.",
            "Should we call a ride share or catch the party bus?",
            "Save room for cake because the host ordered extra.",
        ],
    ),
    DayDefinition(
        day=18,
        title="Too Small Apartment",
        your_role="Roommate",
        partner_role="Roommate",
        prompt="You and Jie plan how to make a tiny apartment livable by moving furniture, sharing chores, and seeking upgrades.",
        vocabulary=[
            "tiny apartment",
            "storage box",
            "floor plan",
            "rent budget",
            "folding table",
            "shared closet",
        ],
        phrases=[
            "This tiny apartment feels packed, so let us redraw the floor plan.",
            "Can we build more storage boxes for the hallway?",
            "I will ask the landlord about a folding table or shelf.",
            "Let us split the rent budget review every Sunday night.",
        ],
    ),
    DayDefinition(
        day=19,
        title="Ho Yi's Screen Routine",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ho Yi spends every day on the computer, so you check in about breaks, posture, and healthier routines.",
        vocabulary=[
            "laptop stand",
            "wireless mouse",
            "screen break",
            "focus timer",
            "software update",
            "stretch reminder",
        ],
        phrases=[
            "Ho Yi, did you install the latest software updates?",
            "Set a focus timer so breaks actually happen.",
            "I will send a stretch reminder every hour today.",
            "Let us adjust the laptop stand to save your shoulders.",
        ],
    ),
    DayDefinition(
        day=20,
        title="Ziyi at the Restaurant",
        your_role="Dining Partner",
        partner_role="Server",
        prompt="You meet Ziyi at a favorite restaurant to talk about dishes, service, and catching up on good news.",
        vocabulary=[
            "table reservation",
            "menu special",
            "waitlist",
            "tea pot",
            "signature dish",
            "bill split",
        ],
        phrases=[
            "Ziyi, which signature dish are you craving tonight?",
            "Let us ask if the waitlist is moving quickly.",
            "Could you pour the tea while I check the menu special?",
            "We can split the bill and leave a thank you note.",
        ],
    ),
    DayDefinition(
        day=21,
        title="Music Break with Hiu Suet",
        your_role="Friend",
        partner_role="Friend",
        prompt="Hiu Suet relaxes by listening to music, and you join to swap playlists, practice moves, and unwind.",
        vocabulary=[
            "playlist",
            "headphones",
            "dance move",
            "chorus",
            "volume knob",
            "favorite singer",
        ],
        phrases=[
            "Hiu Suet, cue up the playlist you mentioned yesterday.",
            "Let us slow the volume so we can still chat.",
            "Teach me that dance move you practiced last night.",
            "Share a favorite singer so I can add it to my list.",
        ],
    ),
    DayDefinition(
        day=22,
        title="Workout Accountability",
        your_role="Workout Buddy",
        partner_role="Friend",
        prompt="Zi Yan and Ah Hung promise to lose weight together, so you coordinate meals, workouts, and motivation.",
        vocabulary=[
            "meal prep",
            "step count",
            "hydration",
            "interval run",
            "sleep rhythm",
            "progress photo",
        ],
        phrases=[
            "Are we logging our step count tonight, Ah Hung?",
            "Let us prep meals so tomorrow feels easier.",
            "Remember to hydrate before the interval run.",
            "Take a progress photo now so we can compare later.",
        ],
    ),
    DayDefinition(
        day=23,
        title="Zi Jun Wants a New Job",
        your_role="Career Coach",
        partner_role="Job Seeker",
        prompt="You help Zi Jun map out resumes, networking, and interviews while he searches for a new role.",
        vocabulary=[
            "job listing",
            "resume draft",
            "cover letter",
            "skills grid",
            "video interview",
            "network coffee",
        ],
        phrases=[
            "Zi Jun, which job listing excited you this morning?",
            "Let us tailor the resume draft before lunch.",
            "I can role-play the video interview tonight.",
            "Schedule a networking coffee while momentum is high.",
        ],
    ),
    DayDefinition(
        day=24,
        title="Unwinding After Work",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Jun just clocked out, so you chat about stress, snacks, and the commute home.",
        vocabulary=[
            "timecard",
            "commute",
            "street food",
            "podcast episode",
            "sofa nap",
            "night market",
        ],
        phrases=[
            "Ah Jun, did work end on time today?",
            "Grab some street food before the long commute.",
            "I saved a podcast episode for your ride home.",
            "Text me when you reach the sofa so we can debrief.",
        ],
    ),
    DayDefinition(
        day=25,
        title="Morning Outfit Rush",
        your_role="Sibling",
        partner_role="Sibling",
        prompt="You help Si pick clothes in the morning, matching layers, weather, and meetings.",
        vocabulary=[
            "wardrobe",
            "laundry rack",
            "ironing board",
            "weather report",
            "accessories",
            "backup outfit",
        ],
        phrases=[
            "Si, lay the wardrobe pieces on the bed first.",
            "Let us check the weather report before choosing shoes.",
            "I will handle the ironing board if you pick accessories.",
            "Pack a backup outfit so you feel calm all day.",
        ],
    ),
    DayDefinition(
        day=26,
        title="School Break Chat",
        your_role="Classmate",
        partner_role="Classmate",
        prompt="You meet Cheuk Man during a school break and talk about snacks, homework, and club plans.",
        vocabulary=[
            "study hall",
            "snack bar",
            "club meeting",
            "notebook",
            "locker pass",
            "practice quiz",
        ],
        phrases=[
            "Cheuk Man, want to sit by the snack bar?",
            "Let us swap notebooks and compare answers.",
            "I will grab the locker pass so we can move quickly.",
            "Bring your club updates so we can plan practice.",
        ],
    ),
    DayDefinition(
        day=27,
        title="Mei Mei Heads Back to Work",
        your_role="Coworker",
        partner_role="Coworker",
        prompt="You check on Mei Mei as she returns to work, reviewing priorities, breaks, and friendly encouragement.",
        vocabulary=[
            "shift schedule",
            "task queue",
            "badge swipe",
            "lunch break",
            "status board",
            "pep talk",
        ],
        phrases=[
            "Mei Mei, let us skim the task queue together.",
            "Swipe your badge early so nothing glitches.",
            "I booked our lunch break for twelve sharp.",
            "Here is a quick pep talk before the status board meeting.",
        ],
    ),
    DayDefinition(
        day=28,
        title="One-Day Vacation",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Wah finally has a day off, so you brainstorm restful plans, treats, and gentle movement.",
        vocabulary=[
            "day off",
            "spa ticket",
            "park bench",
            "novel",
            "slow brunch",
            "photo journal",
        ],
        phrases=[
            "How do you want to spend this precious day off?",
            "Let us reserve a slow brunch by the park.",
            "Pack a novel so you can truly unplug.",
            "We can start a photo journal of restful moments.",
        ],
    ),
    DayDefinition(
        day=29,
        title="Checking on Yuet Ling",
        your_role="Friend",
        partner_role="Friend",
        prompt="Yuet Ling feels unwell, so you discuss symptoms, doctors, and rest plans.",
        vocabulary=[
            "temperature",
            "clinic",
            "medicine dose",
            "rest day",
            "ginger soup",
            "follow-up call",
        ],
        phrases=[
            "Yuet Ling, when did the discomfort start?",
            "Let us book a clinic visit if the fever stays.",
            "Remember your medicine dose after eating.",
            "Text me a photo of the soup so I know you rested.",
        ],
    ),
    DayDefinition(
        day=30,
        title="Campus Life with Ah Yan",
        your_role="Classmate",
        partner_role="Student",
        prompt="You catch up with Ah Yan about university life, classes, and balancing part-time work.",
        vocabulary=[
            "lecture hall",
            "semester plan",
            "research lab",
            "student card",
            "group project",
            "cafeteria pass",
        ],
        phrases=[
            "Ah Yan, which lecture hall are you in today?",
            "Let us review the semester plan together.",
            "Do you need help reserving a research lab slot?",
            "Bring your student card so we can grab dinner later.",
        ],
    ),
    DayDefinition(
        day=31,
        title="Ka Chung Hunts for Work",
        your_role="Friend",
        partner_role="Job Seeker",
        prompt="Ka Chung is hustling for a new job, and you keep him accountable for applications and interviews.",
        vocabulary=[
            "job portal",
            "portfolio link",
            "referral",
            "salary range",
            "mock interview",
            "celebration snack",
        ],
        phrases=[
            "Ka Chung, upload the new portfolio link tonight.",
            "Let us request another referral while leads are warm.",
            "We can rehearse interview answers after dinner.",
            "Promise me a celebration snack when you land the job.",
        ],
    ),
    DayDefinition(
        day=32,
        title="Waiting for the Baby",
        your_role="Friend",
        partner_role="Expectant Parent",
        prompt="Ah Kin's partner is about to give birth, so you plan hospital bags, calls, and calm breathing.",
        vocabulary=[
            "hospital bag",
            "birth plan",
            "prenatal visit",
            "night shift",
            "family hotline",
            "baby blanket",
        ],
        phrases=[
            "Is the hospital bag zipped and by the door?",
            "Let us review the birth plan one more time.",
            "I will handle family hotline updates for you.",
            "Practice calm breathing while we wait for the taxi.",
        ],
    ),
    DayDefinition(
        day=33,
        title="Cleaning Ah Wai's Room",
        your_role="Friend",
        partner_role="Roommate",
        prompt="Ah Wai needs to clean his room, so you coach him through sorting, donating, and celebrating progress.",
        vocabulary=[
            "laundry pile",
            "storage bin",
            "donation bag",
            "dust cloth",
            "task timer",
            "playlist speaker",
        ],
        phrases=[
            "Start with the laundry pile and keep only what you wear.",
            "Set a task timer so you do not burn out.",
            "I will label the storage bins while you sweep.",
            "Let us play music to make the cleaning sprint fun.",
        ],
    ),
    DayDefinition(
        day=34,
        title="Ah Lam Plans a Trip",
        your_role="Travel Buddy",
        partner_role="Traveler",
        prompt="Ah Lam is eager to travel, and you map out tickets, packing, and budget ideas.",
        vocabulary=[
            "travel budget",
            "packing cubes",
            "itinerary",
            "passport copy",
            "currency exchange",
            "travel journal",
        ],
        phrases=[
            "Where do you want the first stamp on this itinerary?",
            "Let us price flights before booking hotels.",
            "Start packing cubes early to avoid stress.",
            "Keep a travel journal so memories stay bright.",
        ],
    ),
    DayDefinition(
        day=35,
        title="Finally Leaving the Country",
        your_role="Friend",
        partner_role="Traveler",
        prompt="After months of waiting you cheer on a friend who finally visits a new country.",
        vocabulary=[
            "boarding pass",
            "customs form",
            "travel insurance",
            "airport express",
            "time zone",
            "arrival text",
        ],
        phrases=[
            "Send me a photo of your boarding pass to celebrate.",
            "Remember to fill out the customs form on the plane.",
            "Do you need help buying travel insurance tonight?",
            "Text me once you adjust to the new time zone.",
        ],
    ),
    DayDefinition(
        day=36,
        title="Learning to Cook",
        your_role="Coach",
        partner_role="Student",
        prompt="Jia Hong wants to learn cooking basics, and you guide through groceries, recipes, and practice.",
        vocabulary=[
            "cooking class",
            "grocery list",
            "cutting board",
            "saucepan",
            "seasoning",
            "taste test",
        ],
        phrases=[
            "Write the grocery list before we leave the house.",
            "Hold the knife safely and breathe through the steps.",
            "Taste the sauce and add seasoning slowly.",
            "We can record the recipe so you repeat it later.",
        ],
    ),
    DayDefinition(
        day=37,
        title="Early Saturday Routine",
        your_role="Friend",
        partner_role="Friend",
        prompt="Wai Kit used to wake up early every Saturday, so you revisit habits, alarms, and rewards.",
        vocabulary=[
            "alarm clock",
            "sunrise walk",
            "coffee thermos",
            "stretch mat",
            "habit tracker",
            "reward snack",
        ],
        phrases=[
            "Do you still set two alarms for Saturdays?",
            "Let us plan a sunrise walk to make it fun.",
            "I will pack a coffee thermos for the park bench.",
            "Mark the habit tracker every week you keep it up.",
        ],
    ),
    DayDefinition(
        day=38,
        title="Friend Moved Far Away",
        your_role="Friend",
        partner_role="Friend",
        prompt="Your close friend moved far away, so you keep in touch about feelings, schedules, and visits.",
        vocabulary=[
            "long distance",
            "video chat",
            "care package",
            "time difference",
            "shared playlist",
            "future visit",
        ],
        phrases=[
            "How is the new city treating you this week?",
            "Let us schedule a video chat every Sunday morning.",
            "I am mailing a care package with photos.",
            "Start a list of places for my future visit.",
        ],
    ),
    DayDefinition(
        day=39,
        title="Breakfast Experiments",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Yat tries to eat breakfast every day, and you trade simple recipes and reminders.",
        vocabulary=[
            "morning alarm",
            "smoothie",
            "oatmeal",
            "stovetop pan",
            "grocery basket",
            "habit streak",
        ],
        phrases=[
            "Did you manage a real breakfast today?",
            "Let us prep oatmeal jars for the whole week.",
            "Send me a photo of your smoothie experiments.",
            "Track the habit streak on the fridge calendar.",
        ],
    ),
    DayDefinition(
        day=40,
        title="Lecture Hall Catch-Up",
        your_role="Classmate",
        partner_role="Classmate",
        prompt="You and Xiao Ming discuss last week's lecture, assignments, and motivation to keep studying.",
        vocabulary=[
            "lecture recap",
            "presentation slides",
            "study partner",
            "campus shuttle",
            "tutor session",
            "coffee voucher",
        ],
        phrases=[
            "Xiao Ming, which notes confused you last week?",
            "Let us split the presentation slides tonight.",
            "I can book the tutor session if you cover snacks.",
            "Meet me at the campus shuttle stop after class.",
        ],
    ),
    DayDefinition(
        day=41,
        title="Class Dinner Plans",
        your_role="Classmate",
        partner_role="Classmate",
        prompt="You help Chun organize dinner with classmates, covering reservations, rides, and conversation starters.",
        vocabulary=[
            "group chat",
            "reservation",
            "carpool",
            "shared bill",
            "photo booth",
            "after party",
        ],
        phrases=[
            "Chun, did everyone reply in the group chat?",
            "Let us confirm the reservation time before leaving.",
            "I will coordinate carpool spots from campus.",
            "Plan one silly photo booth pose for the group.",
        ],
    ),
    DayDefinition(
        day=42,
        title="Never Had a Dog",
        your_role="Parent",
        partner_role="Child",
        prompt="Your child admits they never had a dog, so you discuss responsibilities, shelters, and patience.",
        vocabulary=[
            "pet adoption",
            "daily walk",
            "food bowl",
            "vet visit",
            "training treats",
            "care schedule",
        ],
        phrases=[
            "What kind of dog would make you happiest?",
            "Let us read about daily walks and chores together.",
            "We can visit a shelter to learn from staff.",
            "Create a care schedule so the whole family can help.",
        ],
    ),
    DayDefinition(
        day=43,
        title="Neighbor's Big Family",
        your_role="Neighbor",
        partner_role="Neighbor",
        prompt="You visit neighbor Ah Yan, hear stories about the big family, and offer help for gatherings.",
        vocabulary=[
            "family tree",
            "photo album",
            "potluck",
            "shared courtyard",
            "story night",
            "memory box",
        ],
        phrases=[
            "Tell me again how big your family became over the years.",
            "Let us label the photo album before it fades.",
            "I can bring dessert for the next potluck.",
            "We should plan a story night for the younger kids.",
        ],
    ),
    DayDefinition(
        day=44,
        title="Pre-Work Jitters",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Fai feels anxious before work, so you practice breathing, routines, and gentle pep talks.",
        vocabulary=[
            "breathing drill",
            "affirmation",
            "coffee walk",
            "calm playlist",
            "support text",
            "reward plan",
        ],
        phrases=[
            "Ah Fai, let us do a breathing drill before you leave.",
            "Type out the affirmation you want to read during breaks.",
            "I will walk you to the bus stop with coffee.",
            "Plan a reward tonight so the day feels doable.",
        ],
    ),
    DayDefinition(
        day=45,
        title="Story of Two Friends",
        your_role="Narrator",
        partner_role="Friend",
        prompt="You reflect on the friendship between Ah Jan and Ka Ling, tracing honesty, conflict, and gratitude.",
        vocabulary=[
            "childhood memory",
            "trust exercise",
            "team project",
            "apology",
            "shared journal",
            "celebration toast",
        ],
        phrases=[
            "What first connected Ah Jan and Ka Ling?",
            "Let us document the tough moments alongside the sweet ones.",
            "Maybe they need a new trust exercise to reset.",
            "End the story with gratitude for long friendships.",
        ],
    ),
    DayDefinition(
        day=46,
        title="Concert Night",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Mei adores a singer who just played a concert, so you relive the show and plan future gigs.",
        vocabulary=[
            "concert ticket",
            "merch table",
            "set list",
            "encore",
            "ride home",
            "fan club",
        ],
        phrases=[
            "Which song from the set list surprised you most?",
            "Did you grab anything from the merch table?",
            "Let us plan a ride home before the encore rush.",
            "I will join the fan club newsletter with you.",
        ],
    ),
    DayDefinition(
        day=47,
        title="Crowded Household",
        your_role="Family Member",
        partner_role="Family Member",
        prompt="Ah Ching lives in a crowded home, so you discuss sharing space, chores, and quiet moments.",
        vocabulary=[
            "shared sofa",
            "quiet corner",
            "chore wheel",
            "laundry slot",
            "kitchen timer",
            "family forum",
        ],
        phrases=[
            "How many people are home tonight?",
            "Let us design a chore wheel that feels fair.",
            "Reserve a quiet corner for study time.",
            "Schedule a short family forum on Sunday evenings.",
        ],
    ),
    DayDefinition(
        day=48,
        title="Restaurant Catch-Up",
        your_role="Friend",
        partner_role="Friend",
        prompt="Kwong Jai meets a friend at a restaurant, and you focus on stories, service, and plans afterward.",
        vocabulary=[
            "table manners",
            "servers",
            "side dish",
            "dessert tray",
            "closing time",
            "night tram",
        ],
        phrases=[
            "Kwong Jai, which table feels best for conversation?",
            "Let us try a new side dish before dessert.",
            "Thank the servers since they stayed late for us.",
            "Do you want to take the night tram together afterward?",
        ],
    ),
    DayDefinition(
        day=49,
        title="Buying a Dog",
        your_role="Friend",
        partner_role="Friend",
        prompt="You listen to Ah Sum's story about shopping for a dog and help plan next steps.",
        vocabulary=[
            "breed research",
            "pet budget",
            "trial visit",
            "leash",
            "groomer",
            "training class",
        ],
        phrases=[
            "Which breeds match your lifestyle, Ah Sum?",
            "Let us build a pet budget before you swipe a card.",
            "Schedule a trial visit with the dog this weekend.",
            "I can join a training class with you if needed.",
        ],
    ),
    DayDefinition(
        day=50,
        title="Jason Reviews His Schedule",
        your_role="Classmate",
        partner_role="Classmate",
        prompt="Jason studies his school timetable, and you help balance classes, clubs, and rest.",
        vocabulary=[
            "class timetable",
            "study slot",
            "lab hour",
            "club signup",
            "open period",
            "printer queue",
        ],
        phrases=[
            "Jason, highlight the tough classes in your planner.",
            "Let us add a study slot between lab hours.",
            "Do not forget to pencil in club signups.",
            "Print copies of the schedule and stick one on the door.",
        ],
    ),
    DayDefinition(
        day=51,
        title="Living Alone in a Small Flat",
        your_role="Friend",
        partner_role="Friend",
        prompt="Ah Sin lives alone in a tiny apartment, and you brainstorm comfort items and routines.",
        vocabulary=[
            "tiny flat",
            "reading lamp",
            "meal kit",
            "neighbor chat",
            "budget sheet",
            "self care list",
        ],
        phrases=[
            "How does the flat feel at night when it is quiet?",
            "Let us add a reading lamp to cozy up the sofa.",
            "I can drop off a meal kit on Wednesdays.",
            "Track a self care list so weekends feel lighter.",
        ],
    ),
    DayDefinition(
        day=52,
        title="Three-Day Hike",
        your_role="Hiking Buddy",
        partner_role="Hiker",
        prompt="Ah Chi has been hiking for three days, and you coordinate check-ins, supplies, and reflections.",
        vocabulary=[
            "trail map",
            "daypack",
            "water filter",
            "camp stove",
            "ankle brace",
            "check-in point",
        ],
        phrases=[
            "Which trail map are you using for day three?",
            "Let us check the water filter before nightfall.",
            "Stretch with the ankle brace when you reach camp.",
            "Send me a voice memo from each check-in point.",
        ],
    ),
    DayDefinition(
        day=53,
        title="Flight to Los Angeles",
        your_role="Friend",
        partner_role="Traveler",
        prompt="Anna flies to Los Angeles tonight, so you talk through packing, paperwork, and airport timing.",
        vocabulary=[
            "passport",
            "boarding gate",
            "carry-on",
            "travel pillow",
            "customs line",
            "arrival pickup",
        ],
        phrases=[
            "Anna, double check your passport and visa.",
            "Let us set an alarm so you reach the boarding gate early.",
            "Pack a travel pillow for the overnight flight.",
            "Text me when you clear the customs line in L.A..",
        ],
    ),
    DayDefinition(
        day=54,
        title="New Job Energy",
        your_role="Friend",
        partner_role="Friend",
        prompt="Sisi recently started a new job, and you check on training, coworkers, and energy levels.",
        vocabulary=[
            "orientation",
            "mentor",
            "workspace",
            "task tracker",
            "lunch buddy",
            "celebration treat",
        ],
        phrases=[
            "How did orientation day feel for you, Sisi?",
            "Let us list questions for your mentor.",
            "Decorate your workspace with something calming.",
            "Plan a celebration treat after the first week.",
        ],
    ),
    DayDefinition(
        day=55,
        title="Parents Push for University",
        your_role="Student",
        partner_role="Parent",
        prompt="Your parents urge you to attend university, so you discuss goals, finances, and personal timing.",
        vocabulary=[
            "university offer",
            "tuition budget",
            "major choice",
            "gap year",
            "campus tour",
            "family meeting",
        ],
        phrases=[
            "I hear that you really want me enrolled this fall.",
            "Let us map tuition and scholarship options together.",
            "Can we visit the campus before I decide on a major?",
            "Maybe a short gap year could still fit our goals.",
        ],
    ),
]


def load_cache() -> Dict[str, Dict[str, str]]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return {}


def save_cache(cache: Dict[str, Dict[str, str]]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def run_translator(text: str, target: str) -> Tuple[str, str | None]:
    cmd = ["trans", *TRANS_FLAGS, f":{target}", text]
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            if not lines:
                raise RuntimeError(f"No translation output for {text!r} -> {target}")
            translation = lines[0]
            romanization = None
            if len(lines) > 1 and lines[1].startswith("(") and lines[1].endswith(")"):
                romanization = lines[1][1:-1]
            return translation, romanization
        except subprocess.CalledProcessError as exc:
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"Translation failed for {text!r} -> {target}") from last_error


def translate_ru(text: str, cache: Dict[str, Dict[str, str]]) -> Tuple[str, str]:
    key = f"ru::{text}"
    if key not in cache:
        translation, roman = run_translator(text, "ru")
        cache[key] = {"t": translation, "r": roman or ""}
    data = cache[key]
    return data["t"], data["r"]


def translate_yue(text: str, cache: Dict[str, Dict[str, str]]) -> Tuple[str, str]:
    key = f"yue::{text}"
    if key not in cache:
        translation, _ = run_translator(text, "yue")
        jyutping_pairs = pycantonese.characters_to_jyutping(translation)
        roman = " ".join(j for _, j in jyutping_pairs if j) or ""
        cache[key] = {"t": translation, "r": roman}
    data = cache[key]
    return data["t"], data["r"]


def filtered_existing_rows() -> List[List[str]]:
    rows: List[List[str]] = []
    with CSV_PATH.open(encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        rows.append(header)
        for row in reader:
            if not row:
                continue
            day_label = row[0].strip().lower()
            if day_label.startswith("day"):
                try:
                    day_num = int(day_label.split()[1])
                except (IndexError, ValueError):
                    day_num = 0
                if day_num >= 11:
                    continue
            rows.append(row)
    return rows


def build_rows(day_def: DayDefinition, cache: Dict[str, Dict[str, str]]) -> List[List[str]]:
    rows: List[List[str]] = []
    day_label = f"Day {day_def.day}"
    for language, translator in (("Russian", translate_ru), ("Cantonese", translate_yue)):
        for vocab in day_def.vocabulary:
            translation, roman = translator(vocab, cache)
            rows.append([
                day_label,
                language,
                "Vocabulary",
                "Flashcard",
                translation,
                roman,
                vocab,
                "",
                "",
            ])
        rows.append([
            day_label,
            language,
            "Roleplay",
            "Prompt",
            "",
            "",
            day_def.prompt,
            "",
            "",
        ])
        for phrase in day_def.phrases:
            translation, roman = translator(phrase, cache)
            rows.append([
                day_label,
                language,
                "Roleplay",
                "Phrase",
                translation,
                roman,
                phrase,
                "",
                "",
            ])
    return rows


def main() -> None:
    cache = load_cache()
    rows = filtered_existing_rows()
    header = rows[0]
    body = rows[1:]
    with CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        for row in body:
            writer.writerow(row)
        for day in NEW_DAYS:
            for new_row in build_rows(day, cache):
                writer.writerow(new_row)
    save_cache(cache)
    print(f"Extended CSV with days {NEW_DAYS[0].day}–{NEW_DAYS[-1].day}")


if __name__ == "__main__":
    main()
