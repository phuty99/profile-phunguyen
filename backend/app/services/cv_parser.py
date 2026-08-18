import json
import logging
import re

import pymupdf
import pymupdf4llm
import requests

from app.core.config import settings

DATE_RANGE = re.compile(
    r"(?P<start>(?:0?[1-9]|1[0-2])[/-]\d{4}|[A-Za-z]{3,9}\.?\s+\d{4}|\d{4})"
    r"\s*(?:-|–|—|to)\s*"
    r"(?P<end>(?:0?[1-9]|1[0-2])[/-]\d{4}|[A-Za-z]{3,9}\.?\s+\d{4}|\d{4}|Present|present|Current|current|Now|now)"
)

LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/\S+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/\S+", re.IGNORECASE)
WEBSITE_RE = re.compile(r"https?://(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/\S*)?")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")

SECTION_KEYS = {
    "education": ["education", "academic background"],
    "skills": ["skills", "technical skills", "core competencies"],
    "interests": ["interests", "hobbies", "personal interests"],
    "experience": [
        "experience",
        "experiences",
        "work experience",
        "employment history",
        "professional experience",
        "work history",
    ],
}

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
CONTACT_LINE_RE = re.compile(r"^\*\*[A-Za-z ]+\*\*\s*:?")
BULLET_PREFIX_RE = re.compile(r"^[-*●▪‣]\s*")

ZERO_WIDTH_RE = re.compile(r"[​‌‍﻿]")
NB_HYPHEN_RE = re.compile(r"[‐‑‒–—]")
TITLE_KEYWORDS_RE = re.compile(
    r"\b(?:Developer|Engineer|Manager|Director|Designer|Analyst|Specialist|Lead|"
    r"Consultant|Architect|Officer|Coordinator|Intern|Founder|CEO|CTO|CFO|President)\b",
    re.IGNORECASE,
)
DEGREE_KEYWORDS_RE = re.compile(
    r"\b(?:Bachelor|Master|Ph\.?D|Associate|Diploma|MBA|BSc|MSc|B\.?A\.?|M\.?A\.?)\b"
)


LEADING_LABEL_RE = re.compile(r"^[A-Za-z][A-Za-z ]{1,20}:\s*")


def _clean_md(text: str) -> str:
    text = re.sub(r"</?u>", "", text)
    text = re.sub(r"\[(.*?)\]\([^)]*\)", r"\1", text)
    text = text.replace("**", "").replace("*", "")
    text = ZERO_WIDTH_RE.sub("", text)
    text = NB_HYPHEN_RE.sub("-", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def _strip_leading_label(text: str) -> str:
    return LEADING_LABEL_RE.sub("", text).strip()


def extract_markdown(file_bytes: bytes) -> str:
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    try:
        return pymupdf4llm.to_markdown(doc)
    finally:
        doc.close()


def _parse_headings(lines: list[str]) -> list[tuple[int, int, str]]:
    headings = []
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m:
            headings.append((i, len(m.group(1)), _clean_md(m.group(2))))
    return headings


def _match_section_key(heading_text: str) -> str | None:
    lowered = heading_text.strip().lower()
    for key, keywords in SECTION_KEYS.items():
        if lowered in keywords:
            return key
    return None


def _entry_from_block(header_text: str, body_lines: list[str]) -> dict[str, str]:
    body = [_clean_md(BULLET_PREFIX_RE.sub("", line)) for line in body_lines]
    body = [line for line in body if line]

    date_line_idx = next((i for i, line in enumerate(body) if DATE_RANGE.search(line)), None)
    start_date, end_date, secondary = "", "", ""
    description_lines = body

    if date_line_idx is not None:
        m = DATE_RANGE.search(body[date_line_idx])
        start_date, end_date = m.group("start"), m.group("end")
        remainder = (body[date_line_idx][: m.start()] + body[date_line_idx][m.end() :]).strip(" -–—|,\t")
        rest = body[:date_line_idx] + ([remainder] if remainder else []) + body[date_line_idx + 1 :]
        if rest:
            secondary = rest[0]
            description_lines = rest[1:]
        else:
            description_lines = []
    else:
        if body:
            secondary = body[0]
            description_lines = body[1:]

    return {
        "primary": _clean_md(header_text),
        "secondary": secondary,
        "start_date": start_date,
        "end_date": end_date,
        "description": "\n".join(description_lines),
    }


def _split_by_subheadings(lines: list[str]) -> list[dict[str, str]]:
    sub = [(i, _clean_md(HEADING_RE.match(line).group(2))) for i, line in enumerate(lines) if HEADING_RE.match(line)]
    if not sub:
        return []
    entries = []
    for idx, (start_i, header_text) in enumerate(sub):
        end_i = sub[idx + 1][0] if idx + 1 < len(sub) else len(lines)
        entries.append(_entry_from_block(header_text, lines[start_i + 1 : end_i]))
    return entries


def _split_by_dates_fallback(lines: list[str]) -> list[dict[str, str]]:
    cleaned = [_clean_md(BULLET_PREFIX_RE.sub("", line)) for line in lines]
    cleaned = [line for line in cleaned if line]
    date_idxs = [i for i, line in enumerate(cleaned) if DATE_RANGE.search(line)]
    if not date_idxs:
        if not cleaned:
            return []
        return [
            {
                "primary": cleaned[0],
                "secondary": cleaned[1] if len(cleaned) > 1 else "",
                "start_date": "",
                "end_date": "",
                "description": "\n".join(cleaned[2:]),
            }
        ]

    starts = []
    for idx in date_idxs:
        m = DATE_RANGE.search(cleaned[idx])
        remainder = (cleaned[idx][: m.start()] + cleaned[idx][m.end() :]).strip(" -–—|,\t")
        starts.append(idx if remainder else max(idx - 1, 0))
    for k in range(1, len(starts)):
        if starts[k] <= starts[k - 1]:
            starts[k] = date_idxs[k]

    entries = []
    for k, block_start in enumerate(starts):
        block_end = starts[k + 1] if k + 1 < len(starts) else len(cleaned)
        block = cleaned[block_start:block_end]
        date_pos = next(i for i, line in enumerate(block) if DATE_RANGE.search(line))
        m = DATE_RANGE.search(block[date_pos])
        remainder = (block[date_pos][: m.start()] + block[date_pos][m.end() :]).strip(" -–—|,\t")
        header_lines = block[:date_pos] + ([remainder] if remainder else [])
        description = "\n".join(block[date_pos + 1 :])
        primary = header_lines[0] if header_lines else ""
        secondary = header_lines[1] if len(header_lines) > 1 else ""
        entries.append(
            {
                "primary": primary,
                "secondary": secondary,
                "start_date": m.group("start"),
                "end_date": m.group("end"),
                "description": description,
            }
        )
    return entries


def _split_entries(lines: list[str]) -> list[dict[str, str]]:
    entries = _split_by_subheadings(lines)
    if entries:
        return entries
    return _split_by_dates_fallback(lines)


CV_JSON_SCHEMA_HINT = """{
  "full_name": "",
  "headline": "",
  "bio": "",
  "phone": "",
  "website_url": "",
  "linkedin_url": "",
  "github_url": "",
  "skills": "comma-separated list",
  "interests": "comma-separated list",
  "experiences": [
    {"title": "", "company": "", "start_date": "", "end_date": "", "description": ""}
  ],
  "educations": [
    {"school": "", "degree": "", "start_date": "", "end_date": "", "description": ""}
  ]
}"""

LLM_SCALAR_FIELDS = (
    "full_name",
    "headline",
    "bio",
    "phone",
    "website_url",
    "linkedin_url",
    "github_url",
    "skills",
    "interests",
)

LLM_SYSTEM_PROMPT = (
    "You extract structured resume data from CV text. "
    "Reply with a single JSON object matching exactly this shape, "
    "leaving fields as empty string/list when not found in the text:\n"
    f"{CV_JSON_SCHEMA_HINT}"
)


def _normalize_llm_result(data: dict) -> dict:
    result = {field: data.get(field, "") or "" for field in LLM_SCALAR_FIELDS}
    result["experiences"] = [
        {
            "title": e.get("title", ""),
            "company": e.get("company", ""),
            "start_date": e.get("start_date", ""),
            "end_date": e.get("end_date", ""),
            "description": e.get("description", ""),
        }
        for e in data.get("experiences", [])
    ]
    result["educations"] = [
        {
            "school": e.get("school", ""),
            "degree": e.get("degree", ""),
            "start_date": e.get("start_date", ""),
            "end_date": e.get("end_date", ""),
            "description": e.get("description", ""),
        }
        for e in data.get("educations", [])
    ]
    return result


def parse_cv_with_deepseek(markdown: str) -> dict:
    logging.info("Parsing CV with DeepSeek API")
    if not settings.deepseek_api_key:
        raise RuntimeError("DeepSeek API key is not configured")

    response = requests.post(
        f"{settings.deepseek_api_base}/chat/completions",
        headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
        json={
            "model": "deepseek-chat",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": LLM_SYSTEM_PROMPT},
                {"role": "user", "content": markdown},
            ],
            "temperature": 0,
        },
        timeout=30,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return _normalize_llm_result(json.loads(content))


def parse_cv_with_gemini(markdown: str) -> dict:
    logging.info("Parsing CV with Gemini API")
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini API key is not configured")

    response = requests.post(
        f"{settings.gemini_api_base}/v1beta/models/{settings.gemini_model}:generateContent",
        params={"key": settings.gemini_api_key},
        json={
            "system_instruction": {"parts": [{"text": LLM_SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": markdown}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
        },
        timeout=30,
    )
    response.raise_for_status()
    content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return _normalize_llm_result(json.loads(content))


def parse_cv(markdown: str) -> dict:
    logging.info("Parsing CV with local parser")
    lines = markdown.splitlines()
    headings = _parse_headings(lines)

    h1 = next((h for h in headings if h[1] == 1), None)
    if h1:
        full_name = h1[2]
        body_start = h1[0] + 1
    else:
        full_name = ""
        body_start = 0

    h2_list = [h for h in headings if h[1] == 2]
    first_h2_line = h2_list[0][0] if h2_list else len(lines)

    preamble = lines[body_start:first_h2_line]
    contact_text = "\n".join(preamble)
    bio_lines = [
        _clean_md(line) for line in preamble if line.strip() and not CONTACT_LINE_RE.match(line.strip())
    ]
    bio = " ".join(line for line in bio_lines if line)

    if not full_name:
        contact_match = re.search(r"\*\*(?:Email|Phone|LinkedIn|GitHub|Address|Website)\*\*", contact_text)
        pre_contact = contact_text[: contact_match.start()] if contact_match else contact_text
        full_name = _clean_md(pre_contact.splitlines()[0]) if pre_contact.strip() else ""

    flat_markdown = re.sub(r"</?u>", "", markdown)
    phone_match = PHONE_RE.search(contact_text)
    linkedin_match = LINKEDIN_RE.search(flat_markdown)
    github_match = GITHUB_RE.search(flat_markdown)
    website_match = next(
        (
            m
            for m in WEBSITE_RE.finditer(flat_markdown)
            if "linkedin.com" not in m.group(0) and "github.com" not in m.group(0)
        ),
        None,
    )

    sections: dict[str, list[str]] = {}
    for idx, (start_i, level, text) in enumerate(h2_list):
        end_i = h2_list[idx + 1][0] if idx + 1 < len(h2_list) else len(lines)
        key = _match_section_key(text)
        if key:
            sections[key] = lines[start_i + 1 : end_i]

    def joined(key: str) -> str:
        return "\n".join(_clean_md(BULLET_PREFIX_RE.sub("", line)) for line in sections.get(key, []) if line.strip())

    experiences = []
    for e in _split_entries(sections.get("experience", [])):
        title, company = e["primary"], e["secondary"]
        # Some CVs bold the company as the heading rather than the job title;
        # if only the secondary field reads like a job title, swap them.
        if TITLE_KEYWORDS_RE.search(company) and not TITLE_KEYWORDS_RE.search(title):
            title, company = company, title
        experiences.append(
            {
                "title": _strip_leading_label(title),
                "company": _strip_leading_label(company),
                "start_date": e["start_date"],
                "end_date": e["end_date"],
                "description": e["description"],
            }
        )

    educations = []
    for e in _split_entries(sections.get("education", [])):
        school, degree = e["primary"], e["secondary"]
        # School and degree sometimes land merged on a single source line;
        # split them apart at the first recognizable degree keyword.
        degree_match = DEGREE_KEYWORDS_RE.search(school)
        if degree_match and not DEGREE_KEYWORDS_RE.search(degree):
            degree = school[degree_match.start() :].strip(" -–—|,\t")
            school = school[: degree_match.start()].strip(" -–—|,\t")
        educations.append(
            {
                "school": _strip_leading_label(school),
                "degree": _strip_leading_label(degree),
                "start_date": e["start_date"],
                "end_date": e["end_date"],
                "description": e["description"],
            }
        )

    return {
        "full_name": full_name,
        "headline": "",
        "bio": bio,
        "phone": phone_match.group(0).strip() if phone_match else "",
        "website_url": website_match.group(0) if website_match else "",
        "linkedin_url": linkedin_match.group(0) if linkedin_match else "",
        "github_url": github_match.group(0) if github_match else "",
        "skills": joined("skills"),
        "interests": joined("interests"),
        "experiences": experiences,
        "educations": educations,
    }
