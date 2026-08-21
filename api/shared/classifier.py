"""Transparent, no-cost ticket-category suggestion logic.

The classifier scores category-specific phrases and keywords in a ticket's
title and description.  It deliberately returns its evidence so an admin can
review the automated suggestion instead of treating it as a black box.
"""

import re

from .categories import CATEGORIES


def normalize_text(text):
    text = text.lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def contains_word(text, term):
    pattern = r"\b" + re.escape(term) + r"\b"

    return re.search(
        pattern,
        text
    ) is not None


def calculate_confidence(scores):
    ordered = sorted(
        scores.values(),
        reverse=True
    )


    winner_score = ordered[0]


    if winner_score <= 0:
        return 0.30


    runner_up_score = (
        ordered[1]
        if len(ordered) > 1
        else 0
    )


    total_score = sum(scores.values())


    if total_score <= 0:
        return 0.30


    saturation = min(
        winner_score / 12.0,
        1.0
    )


    margin = (
        (winner_score - runner_up_score)
        / winner_score
    )


    margin = max(
        0.0,
        min(margin, 1.0)
    )


    confidence = (
        0.40
        + (0.35 * saturation)
        + (0.25 * margin)
    )


    return round(
        min(confidence, 0.99),
        2
    )


def classify_with_keywords(text):
    text = normalize_text(text)


    scores = {}
    evidence = {}


    for category, rules in CATEGORIES.items():
        score = 0
        matched = []


        for phrase in rules.get(
            "phrase",
            []
        ):
            if phrase.lower() in text:
                score += 4
                matched.append(phrase)


        for term in rules.get(
            "strong",
            []
        ):
            if contains_word(
                text,
                term.lower()
            ):
                score += 3
                matched.append(term)


        for term in rules.get(
            "medium",
            []
        ):
            if contains_word(
                text,
                term.lower()
            ):
                score += 2
                matched.append(term)


        for term in rules.get(
            "weak",
            []
        ):
            if contains_word(
                text,
                term.lower()
            ):
                score += 1
                matched.append(term)


        scores[category] = score
        evidence[category] = matched


    winner = max(
        scores,
        key=scores.get
    )


    winner_score = scores[winner]


    if winner_score == 0:
        return {
            "category": "General Enquiry",
            "confidence": 0.30,
            "method": "keyword-rules",
            "evidence": [],
        }


    confidence = calculate_confidence(
        scores
    )


    return {
        "category": winner,
        "confidence": confidence,
        "method": "keyword-rules",
        "evidence": evidence[winner],
    }


def classify_ticket(title, description):
    text = f"{title} {description}"


    return classify_with_keywords(text)
