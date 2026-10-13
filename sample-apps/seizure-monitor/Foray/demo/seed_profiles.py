"""
FORAY — accounts, classes, case scenarios, questioned topics, chat history.

    python demo/seed_profiles.py        (run AFTER demo/seed_generator.py)

  ██  THIS FILE MAKES NO API CALLS. NOT ONE.  ██

Creates, deterministically:

  * SIX classes under ONE teacher — CS3591 Computer Networks (Semester V,
    the flagship demo cohort) plus the five Semester VI subjects from the
    uploaded archive: Compiler Design, Distributed Systems, Foundations of
    Cyber Security, IoT, Software Engineering.
  * ONE teacher — faculty@foray.edu — connected to every class.
  * EIGHT student logins, EACH IN THEIR OWN SUBJECT MIX:
      - three stay in Computer Networks, mapped BY QUERY to real seeded
        cohort members (the M12 / C03 stories stay backed by data)
      - five are enrolled one-per-subject in the Semester VI classes, with
        their own seeded reflections, diagnoses, mastery and chat in THAT
        subject's namespace
  * per-class questioned-topic cohorts (R-12): every class surfaces 3-4
    topics above k, and each deliberately holds one below k to show the
    gate hiding it.
  * seeded chat history per profile student — the append-only regulation
    log (R-11) has rows on day one, in every subject.

All demo passwords: foray123
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from api import db                                    # noqa: E402
from api.auth import hash_password                    # noqa: E402

SEED = 20260726
TERM_START = datetime(2026, 6, 8, tzinfo=timezone.utc)
PASSWORD = "foray123"

FACULTY_ID = "U_T01"
FACULTY_NAME = "Prof. Meenakshi Raman"
FACULTY_EMAIL = "faculty@foray.edu"

CN_CLASS = {
    "id": "CLS_CN5", "name": "Computer Networks — Semester V",
    "code": "CS3591", "unit": "Transport Layer (Kurose & Ross 8e, Ch. 3)",
    "faculty_user_id": FACULTY_ID, "source": "sem V.zip / Computer Networks",
    "course": "CN",
}


def sem6_classes() -> list[dict]:
    packs = json.loads(
        (ROOT / "data" / "sem6_courses.json").read_text(encoding="utf-8"))
    out = []
    for course in packs["courses"]:
        c = course["class"]
        out.append({
            "id": c["id"], "name": c["name"], "code": c["code"],
            "unit": c["unit"], "faculty_user_id": FACULTY_ID,
            "source": c["source"], "course": course["code"],
        })
    return out


# ═══════════════════════════════════════════════════════════════════
#  CN — three seats picked BY QUERY from the seeded cohort
# ═══════════════════════════════════════════════════════════════════

CN_IDENTITIES = [
    ("Aarav Krishnan", "aarav@foray.edu"),
    ("Divya Subramaniam", "divya@foray.edu"),
    ("Karthik Venkatesan", "karthik@foray.edu"),
]


def pick_cn_scenarios(conn) -> list[dict]:
    taken: set[str] = set()

    def first_free(rows) -> str | None:
        for r in rows:
            sid = r["student_id"] if "student_id" in r.keys() else r[0]
            if sid not in taken:
                taken.add(sid)
                return sid
        return None

    slots: list[dict] = []

    rows = conn.execute("""
        SELECT DISTINCT r.student_id FROM diagnoses d
        JOIN reflections r ON r.id = d.reflection_id
        WHERE r.week = 6 AND d.misconception_ids LIKE '%M12%'
          AND r.student_id NOT IN (
            SELECT r2.student_id FROM diagnoses d2
            JOIN reflections r2 ON r2.id = d2.reflection_id
            WHERE r2.week = 7 AND d2.misconception_ids LIKE '%M12%')
        ORDER BY r.student_id""").fetchall()
    slots.append({
        "sid": first_free(rows),
        "scenario": "Cleared after intervention",
        "note": ("Held M12 (port = connection) in week 6; after the "
                 "week-6 reteach, week 7 shows it resolved. The 23 -> 4 "
                 "story, one seat of it."),
    })

    rows = conn.execute("""
        SELECT DISTINCT r.student_id FROM diagnoses d
        JOIN reflections r ON r.id = d.reflection_id
        WHERE r.week = 7 AND d.misconception_ids LIKE '%M12%'
        ORDER BY r.student_id""").fetchall()
    slots.append({
        "sid": first_free(rows),
        "scenario": "Still holds M12 after reteach",
        "note": ("One of the 4 who still writes 'the port is the "
                 "connection' after the intervention. Needs a direct "
                 "follow-up, not another lecture."),
    })

    rows = conn.execute("""
        SELECT student_id FROM mastery WHERE concept_id = 'C03'
        ORDER BY level ASC, student_id""").fetchall()
    slots.append({
        "sid": first_free(rows),
        "scenario": "Weak on root cause (C03)",
        "note": ("Lowest demonstrated mastery on C03 Addressing and "
                 "ports — the prerequisite the week-6 spike traces back "
                 "to. Transport symptoms, addressing cause."),
    })

    return slots


# ═══════════════════════════════════════════════════════════════════
#  SEMESTER VI — five seats, one per subject, data authored in THAT
#  subject's namespace. Each entry seeds reflections (+ diagnosis when a
#  misconception id is attached), mastery, and the roster scenario.
# ═══════════════════════════════════════════════════════════════════

SEM6_STUDENTS: list[dict] = [
    {
        "name": "Meera Lakshman", "email": "meera@foray.edu",
        "class_id": "CLS_SE6", "sid": "S_SE01",
        "scenario": "Consistent high mastery",
        "note": ("Software Engineering. Clean reflections all term, no "
                 "misconception named yet — a candidate to peer-explain "
                 "process models in the next tutorial."),
        "reflections": [
            ("SE_C2", 2, "en",
             "process models today. waterfall is strictly sequential, the "
             "spiral adds risk analysis each cycle — the difference is what "
             "you do when reality changes", None, None),
            ("SE_C3", 4, "en",
             "scrum session made sense: fixed sprint scope, the backlog "
             "absorbs new work, the standup is sync not status theatre",
             None, None),
            ("SE_C5", 6, "en",
             "requirements class — functional says what the system does, "
             "non-functional constrains how well. wrote both for the "
             "library case study", None, None),
        ],
        "mastery": [("SE_C2", 0.86, 2), ("SE_C3", 0.88, 4), ("SE_C5", 0.84, 6)],
    },
    {
        "name": "Pranav Iyer", "email": "pranav@foray.edu",
        "class_id": "CLS_DS6", "sid": "S_DS01",
        "scenario": "Asks the most questions",
        "note": ("Distributed Systems. Highest questions-asked count in "
                 "his class — goroutines and consistency, mostly. Engaged, "
                 "not struggling; the questions map shows where the class "
                 "needs depth."),
        "reflections": [
            ("DS_C2", 3, "en",
             "go lab today. what i understood is that a goroutine is "
             "basically a thread you start with go func. worked for the "
             "echo exercise", "DS_M1",
             "a goroutine is basically a thread"),
            ("DS_C5", 6, "en",
             "consistency lecture. sequential consistency = one global "
             "order everyone agrees on, program order preserved per "
             "process. the diagram finally made it click", None, None),
        ],
        "mastery": [("DS_C2", 0.45, 3), ("DS_C5", 0.72, 6), ("DS_C1", 0.68, 2)],
        # the scenario is "asks the most questions" — make the count real
        "extra_questions": [
            ("DS_C2", 3, "when does the select statement block forever?"),
            ("DS_C2", 4, "how many goroutines is too many for one core?"),
            ("DS_C2", 4, "does closing a channel wake all receivers?"),
            ("DS_C1", 2, "scatter vs broadcast — when do i want each?"),
            ("DS_C5", 6, "difference between sequential consistency and "
                         "linearizability?"),
            ("DS_C5", 7, "who decides the order in sequential consistency?"),
            ("DS_C7", 8, "what causes the domino effect in rollback?"),
            ("DS_C4", 5, "can two events have the same lamport timestamp?"),
        ],
    },
    {
        "name": "Sahana Ramesh", "email": "sahana@foray.edu",
        "class_id": "CLS_FCS6", "sid": "S_FS01",
        "scenario": "Reflects in Tamil-English",
        "note": ("Cyber Security. Reflects in code-mixed Tamil; diagnosed "
                 "on the concept, never on fluency (R-05). Currently "
                 "holds the hashing-is-encryption idea — correction was "
                 "cited to the Ch.2 slides."),
        "reflections": [
            ("FS_C2", 3, "mixed",
             "innaiku crypto class. naan understand pannadhu — hashing is "
             "encryption dhaane, password ah encrypt panna hash use "
             "pandrom. correct ah theriyala", "FS_M1",
             "hashing is encryption dhaane"),
            ("FS_C4", 5, "mixed",
             "access control paathom. rbac la role ku dhaan permission, "
             "user ku direct ah illa nu puriyudhu", None, None),
        ],
        "mastery": [("FS_C2", 0.38, 3), ("FS_C4", 0.66, 5), ("FS_C1", 0.7, 1)],
    },
    {
        "name": "Tamilselvan Anbu", "email": "tamilselvan@foray.edu",
        "class_id": "CLS_IOT6", "sid": "S_IO01",
        "scenario": "Low participation",
        "note": ("IoT. One reflection all term. The system knows only "
                 "what is demonstrated — his Compass shows fewer, "
                 "better-evidenced items, not an invented roadmap (R-09)."),
        "reflections": [
            ("IO_C3", 4, "en",
             "mqtt class. i think mqtt works like http, the client asks "
             "the broker for the data it wants", "IO_M1",
             "mqtt works like http"),
        ],
        "mastery": [("IO_C3", 0.35, 4)],
    },
    {
        "name": "Ananya Pillai", "email": "ananya@foray.edu",
        "class_id": "CLS_CD6", "sid": "S_CD01",
        "scenario": "Out-of-syllabus questions",
        "note": ("Compiler Design. Keeps asking beyond the unit (LLVM "
                 "internals, borrow checkers). The agent refuses to answer "
                 "uncited and escalates to you — each refusal is in the "
                 "access log (R-02)."),
        "reflections": [
            ("CD_C2", 3, "en",
             "grammar lab. my takeaway: the parser reads the characters "
             "and makes the tokens as it goes. antlr hid this from us "
             "though", "CD_M1",
             "the parser reads the characters and makes the tokens"),
            ("CD_C3", 5, "en",
             "listener exercise worked — the walker fires enter and exit "
             "on the finished tree and my code just reacts to it",
             None, None),
        ],
        "mastery": [("CD_C2", 0.42, 3), ("CD_C3", 0.74, 5)],
    },
]


# ═══════════════════════════════════════════════════════════════════
#  Questioned topics per class — R-12. Every class: a few topics above
#  k, one deliberately below k that must stay hidden.
# ═══════════════════════════════════════════════════════════════════

CN_TOPIC_PLAN = [
    ("C11", 34, 21, [5, 6, 7], [
        "why do we need three messages for the handshake, why not two?",
        "what happens if the last ACK of the handshake is lost?",
        "is the connection open after SYN or after SYN-ACK? confused",
        "how does connection teardown actually finish?",
    ]),
    ("C03", 26, 16, [2, 3, 5, 6, 7], [
        "whats the difference between an IP address and a port really?",
        "how do two apps share one IP? dont get the port part",
        "why does the server port stay 80 for every client?",
        "port number ku IP address ku enna difference? theriyala",
    ]),
    ("C13", 15, 9, [8], [
        "why does slow start double instead of adding?",
        "how does the sender know the network is congested?",
        "what triggers fast recovery vs slow start again?",
    ]),
    ("C09", 11, 7, [4, 5], [
        "in go-back-n why resend everything after one loss?",
        "selective repeat window size confuses me, why N/2?",
    ]),
    ("C05", 8, 6, [3, 4], [
        "how does the receiver know which socket to send data to?",
        "what is in the four-tuple exactly?",
    ]),
    ("C07", 6, 5, [4], [
        "why do we need a checksum if the link layer has CRC?",
        "how does rdt3.0 handle a corrupted ACK?",
    ]),
    ("C12", 4, 3, [7], [        # below k — must stay hidden
        "is flow control the same as congestion control?",
        "what does the receive window actually advertise?",
    ]),
]

SEM6_TOPIC_PLANS: dict[str, list] = {
    "CLS_SE6": [
        ("SE_C5", 18, 9, [5, 6, 7], [
            "how do i tell a functional from a non-functional requirement?",
            "what goes in the srs vs the design doc?",
            "stakeholders keep contradicting each other, whose requirement wins?",
        ]),
        ("SE_C3", 12, 7, [3, 4], [
            "does agile really mean we skip documentation?",
            "what happens to work that doesnt fit in the sprint?",
        ]),
        ("SE_C2", 8, 6, [1, 2], [
            "when would anyone still pick waterfall over spiral?",
            "is prototyping a process model or a technique?",
        ]),
        ("SE_C6", 4, 3, [7], [   # below k
            "does every use case need an actor?",
        ]),
    ],
    "CLS_DS6": [
        ("DS_C2", 16, 9, [3, 4], [
            "why use channels instead of locks in go?",
            "how many goroutines is too many?",
            "when does the select statement block?",
        ]),
        ("DS_C5", 13, 8, [6, 7], [
            "is eventual consistency time-bounded or not?",
            "difference between sequential consistency and linearizability?",
        ]),
        ("DS_C1", 9, 6, [1, 2], [
            "why does mpi_bcast need every rank to call it?",
            "scatter vs broadcast — when each?",
        ]),
        ("DS_C7", 5, 5, [8], [
            "what causes the domino effect in rollback?",
        ]),
        ("DS_C3", 3, 2, [5], [   # below k
            "how does the rpc stub know the argument types?",
        ]),
    ],
    "CLS_FCS6": [
        ("FS_C2", 14, 8, [3, 4], [
            "can a hash be decrypted with the right key?",
            "why sign the hash instead of the whole message?",
            "symmetric vs public key — when do we use which?",
        ]),
        ("FS_C4", 9, 6, [5, 6], [
            "acl vs rbac, which one scales?",
            "is least privilege a policy or a mechanism?",
        ]),
        ("FS_C5", 7, 5, [7], [
            "how does a worm spread without anyone clicking?",
        ]),
        ("FS_C7", 3, 3, [8], [   # below k
            "who actually enforces an sop?",
        ]),
    ],
    "CLS_IOT6": [
        ("IO_C3", 11, 7, [4, 5], [
            "mqtt vs coap — which one for a battery sensor?",
            "does mqtt work without a broker?",
        ]),
        ("IO_C4", 8, 5, [5, 6], [
            "how does the publisher find its subscribers?",
            "when is request-response better than pub-sub?",
        ]),
        ("IO_C6", 3, 3, [2], [   # below k
            "is a relay a sensor or an actuator?",
        ]),
    ],
    "CLS_CD6": [
        ("CD_C2", 15, 8, [2, 3], [
            "why is my grammar ambiguous, it looks fine?",
            "left recursion breaks the parser, why does antlr allow it?",
            "parse tree vs ast, which one does the listener see?",
        ]),
        ("CD_C4", 10, 6, [5, 6], [
            "inherited attributes confuse me, which way do they flow?",
            "embedded actions vs listeners, when each?",
        ]),
        ("CD_C5", 7, 5, [6, 7], [
            "where does the symbol table live between passes?",
        ]),
        ("CD_C6", 3, 2, [7], [   # below k
            "why three-address code instead of the tree?",
        ]),
    ],
}


# ═══════════════════════════════════════════════════════════════════
#  Chat history — R-11, hand-authored per scenario, in-subject.
# ═══════════════════════════════════════════════════════════════════

def chat_scripts() -> dict[str, list[list[dict]]]:
    return {
        "Cleared after intervention": [[
            {"s": "so basically tcp connection management — the port is "
                  "basically the connection. still a bit confused about "
                  "the rest",
             "a": {"misconception_ids": ["M12"],
                   "evidence_span": "the port is basically the connection",
                   "correction_status": "sent", "grounded": True}},
            {"agent": "A TCP connection is identified by all four values — "
                      "source IP, source port, destination IP, destination "
                      "port — not the port alone. See Kurose & Ross, "
                      "page 222. In your own words: how do two browser "
                      "tabs both use port 443 without mixing up?"},
            {"s": "ohh because the source ports differ, so the four "
                  "values are different for each tab"},
            {"agent": "Exactly — you just described the four-tuple. "
                      "What would happen if the receiver used only the "
                      "destination port to pick the socket?"},
        ]],
        "Still holds M12 after reteach": [[
            {"s": "after todays revision class i still think the port "
                  "number identifies the connection, one port one "
                  "connection right?",
             "a": {"misconception_ids": ["M12"],
                   "evidence_span": "the port number identifies the "
                                    "connection, one port one connection",
                   "correction_status": "sent", "grounded": True}},
            {"agent": "That idea has a specific name here — a connection "
                      "is identified by the full four-tuple, not one "
                      "port. See Kurose & Ross, page 222. Which two of "
                      "the four values differ when two clients hit the "
                      "same server?"},
            {"s": "hmm not sure, the server side looks same to me"},
            {"agent": "Good observation — the server side IS the same; "
                      "the client IP and client port differ. Try "
                      "sketching both segments' headers. What does each "
                      "source field hold?"},
        ]],
        "Weak on root cause (C03)": [[
            {"s": "whats the difference between an ip address and a port? "
                  "i keep mixing them up",
             "a": {"is_question": True, "topic_concept_ids": ["C03"]}},
            {"agent": "An IP address reaches the machine; the port "
                      "reaches the program on it — like a building "
                      "address versus an apartment number. See the "
                      "Ch.2 slides on addressing. Which one does a "
                      "router care about when forwarding?"},
            {"s": "the ip i think? the router doesnt look at ports"},
            {"agent": "Right. Hold onto that split — it is exactly what "
                      "makes the transport four-tuple make sense later. "
                      "How would you explain a well-known port to a "
                      "friend?"},
        ]],
        "Consistent high mastery": [[
            {"s": "process models lecture was clear. waterfall commits "
                  "early, spiral buys information with each loop, agile "
                  "shortens the loop to a sprint"},
            {"agent": "That's a tight summary — three models by how they "
                      "handle change. Which one would you pick for a "
                      "safety-critical system with stable requirements, "
                      "and why?"},
        ]],
        "Asks the most questions": [[
            {"s": "why use channels instead of locks in go? both protect "
                  "shared state no?",
             "a": {"is_question": True, "topic_concept_ids": ["DS_C2"]}},
            {"agent": "Good question — channels move the DATA between "
                      "goroutines so ownership transfers with it; locks "
                      "guard a place where data stays shared. The Go lab's "
                      "echo exercise uses the first style. What would the "
                      "lock version of your lab solution have to protect?"},
            {"s": "and is eventual consistency guaranteed within some "
                  "seconds? like a deadline?",
             "a": {"is_question": True, "topic_concept_ids": ["DS_C5"],
                   "misconception_ids": ["DS_M2"],
                   "evidence_span": "guaranteed within some seconds",
                   "correction_status": "sent", "grounded": True}},
            {"agent": "It promises convergence once updates stop — with "
                      "no bound on when. See the consistency slides. "
                      "What could keep two replicas diverging forever if "
                      "writes never pause?"},
        ]],
        "Reflects in Tamil-English": [[
            {"s": "innaiku crypto class. hashing is encryption dhaane? "
                  "password ah encrypt panna hash use pandrom nu "
                  "nenaikiren",
             "a": {"misconception_ids": ["FS_M1"],
                   "evidence_span": "hashing is encryption dhaane",
                   "correction_status": "sent", "grounded": True}},
            {"agent": "Neenga sonna idea ku oru important difference "
                      "iruku — a hash is one-way and keyless; encryption "
                      "is reversible by whoever holds the key. See the "
                      "CompSec4e Ch.2 slides. Unga own words-la: login "
                      "check panna hash podhum, decrypt thevai illa — "
                      "yen?"},
        ]],
        "Low participation": [[
            {"s": "didnt follow much this week honestly"},
            {"agent": "That's a useful thing to say out loud — thank you. "
                      "No score attaches to it here. Pick one moment from "
                      "the week: what's a single sentence you remember "
                      "from the MQTT class?"},
        ]],
        "Out-of-syllabus questions": [[
            {"s": "how does LLVM pick registers compared to what gcc "
                  "does? and why does rust need a borrow checker?",
             "a": {"is_question": True, "topic_concept_ids": ["C00"],
                   "correction_status": "escalated_to_faculty",
                   "grounded": False}},
            {"agent": "Those go beyond what I can cite from your "
                      "prescribed material, so I've routed both to "
                      "Prof. Meenakshi Raman as open questions rather "
                      "than guessing. Within this unit — what does YOUR "
                      "compiler's code generator have to decide when two "
                      "values compete for one register?"},
            {"s": "it has to spill one to memory and reload it later"},
            {"agent": "Yes — and the optimization slides show when that "
                      "spill is cheap. You've answered the course-sized "
                      "half of your own question. What information would "
                      "the allocator need to choose WHICH value to spill?"},
        ]],
    }


# ═══════════════════════════════════════════════════════════════════

def seed_topic_plan(conn, rng, class_id: str, plan: list,
                    pool_students: list[str], own_sid: str | None) -> int:
    """Write one class's topic_questions. pool_students are the anonymous
    classmates; own_sid (a login student) joins the big topics."""
    n = 0
    for cid, total, n_students, weeks, frames in plan:
        pool = rng.sample(pool_students, min(n_students, len(pool_students)))
        if own_sid and own_sid not in pool and total >= 10:
            pool[0] = own_sid
        for i in range(total):
            sid = pool[i % len(pool)]
            week = rng.choice(weeks)
            ts = TERM_START + timedelta(weeks=week - 1,
                                        hours=rng.randint(9, 21),
                                        minutes=rng.randint(0, 59))
            db.upsert(conn, "topic_questions", {
                "student_id": sid, "class_id": class_id, "concept_id": cid,
                "week": week, "source": "seed",
                "excerpt": frames[i % len(frames)], "ts": ts.isoformat(),
            })
            n += 1
    return n


def seed_chats(conn, slots: list[dict]) -> tuple[int, int]:
    scripts = chat_scripts()
    n_sessions = 0
    n_messages = 0
    base = TERM_START + timedelta(weeks=6, days=2)
    for slot in slots:
        for si, msgs in enumerate(scripts.get(slot["scenario"], [])):
            n_sessions += 1
            session_id = f"CS_9{n_sessions:03d}"
            started = base + timedelta(days=si, hours=n_sessions % 5,
                                       minutes=7 * n_sessions)
            mids: set[str] = set()
            qids: set[str] = set()
            ts = started
            for m in msgs:
                ts = ts + timedelta(minutes=1)
                if "agent" in m:
                    conn.execute(
                        "INSERT INTO chat_messages (session_id, student_id, "
                        "sender, text, analysis, ts) VALUES (?,?,?,?,?,?)",
                        (session_id, slot["sid"], "agent", m["agent"],
                         json.dumps({"source": "seed"}), ts.isoformat()))
                else:
                    extra = m.get("a", {})
                    analysis = {
                        "is_question": extra.get("is_question", False),
                        "topic_concept_ids": extra.get("topic_concept_ids", []),
                        "misconception_ids": extra.get("misconception_ids", []),
                        "evidence_span": extra.get("evidence_span", ""),
                        "confidence": 0.9 if extra.get("misconception_ids") else 0.0,
                        "diagnosis_source": "seed",
                        "correction_status": extra.get("correction_status"),
                        "grounded": extra.get("grounded", False),
                    }
                    mids.update(analysis["misconception_ids"])
                    if analysis["is_question"]:
                        qids.update(analysis["topic_concept_ids"])
                    conn.execute(
                        "INSERT INTO chat_messages (session_id, student_id, "
                        "sender, text, analysis, ts) VALUES (?,?,?,?,?,?)",
                        (session_id, slot["sid"], "student", m["s"],
                         json.dumps(analysis, ensure_ascii=False),
                         ts.isoformat()))
                n_messages += 1
            db.upsert(conn, "chat_sessions", {
                "id": session_id, "student_id": slot["sid"],
                "class_id": slot["class_id"], "started_at": started.isoformat(),
                "ended_at": ts.isoformat(),
                "misconception_ids": sorted(mids),
                "question_concept_ids": sorted(qids),
            })
    return n_sessions, n_messages


def seed_sem6_student_records(conn, student: dict) -> None:
    """Reflections (+ diagnoses where a misconception is held), mastery,
    and the student's own asked questions — all in their subject."""
    for i, (cid, week, lang, text, mid, span) in enumerate(
            student["reflections"], start=1):
        rid = f"R_6{student['sid'][-4:]}{i}"      # e.g. R_6SE011
        created = TERM_START + timedelta(weeks=week - 1, hours=18)
        db.upsert(conn, "reflections", {
            "id": rid, "student_id": student["sid"], "concept_ids": [cid],
            "week": week, "lang": lang, "text": text,
            "created_at": created.isoformat(),
        })
        if mid:
            assert span and span in text, \
                f"evidence span not verbatim for {rid}"
            db.upsert(conn, "diagnoses", {
                "id": f"D_6{student['sid'][-4:]}{i}", "reflection_id": rid,
                "misconception_ids": [mid], "novel_text": None,
                "confidence": 0.88, "evidence_span": span,
            })
    for cid, level, week in student["mastery"]:
        db.upsert(conn, "mastery", {
            "student_id": student["sid"], "concept_id": cid,
            "level": level, "last_seen_week": week,
            "history": [{"week": week, "level": level}],
            "corrected_misconceptions": [],
        })
    for cid, week, text in student.get("extra_questions", []):
        ts = TERM_START + timedelta(weeks=week - 1, hours=19)
        db.upsert(conn, "topic_questions", {
            "student_id": student["sid"], "class_id": student["class_id"],
            "concept_id": cid, "week": week, "source": "seed",
            "excerpt": text, "ts": ts.isoformat(),
        })


def main() -> None:
    rng = random.Random(SEED)
    conn = db.connect()
    db.init_schema(conn)

    # idempotent: wipe only what THIS script owns. Semester VI student
    # records live in shared tables, so clear by id-prefix, never the table.
    for table in ("users", "classes", "auth_tokens",
                  "chat_sessions", "chat_messages", "topic_questions"):
        conn.execute(f"DELETE FROM {table}")
    conn.execute("DELETE FROM reflections WHERE id LIKE 'R_6%'")
    conn.execute("DELETE FROM diagnoses WHERE id LIKE 'D_6%'")
    conn.execute("DELETE FROM mastery WHERE student_id LIKE 'S\\_S%' ESCAPE '\\' "
                 "OR student_id IN ('S_DS01','S_FS01','S_IO01','S_CD01','S_SE01')")

    # ── classes: CN + the five Semester VI subjects, one teacher ──
    classes = [CN_CLASS] + sem6_classes()
    for cls in classes:
        db.upsert(conn, "classes", cls)
    db.upsert(conn, "users", {
        "id": FACULTY_ID, "email": FACULTY_EMAIL, "name": FACULTY_NAME,
        "role": "faculty",
        "password_hash": hash_password(FACULTY_EMAIL, PASSWORD),
        "student_id": None, "class_id": "CLS_CN5",
        "scenario": None, "scenario_note": None,
    })

    # ── CN students: query-mapped to the seeded cohort ──
    cn_slots = pick_cn_scenarios(conn)
    missing = [s["scenario"] for s in cn_slots if not s["sid"]]
    if missing:
        print(f"  !! FAILED — no CN cohort student matches: {missing}")
        sys.exit(1)

    all_slots: list[dict] = []
    u = 0
    for slot, (name, email) in zip(cn_slots, CN_IDENTITIES):
        u += 1
        db.upsert(conn, "users", {
            "id": f"U_S{u:02d}", "email": email, "name": name,
            "role": "student",
            "password_hash": hash_password(email, PASSWORD),
            "student_id": slot["sid"], "class_id": "CLS_CN5",
            "scenario": slot["scenario"], "scenario_note": slot["note"],
        })
        all_slots.append({**slot, "class_id": "CLS_CN5",
                          "name": name, "email": email})

    # ── Semester VI students: one per subject, records authored here ──
    for student in SEM6_STUDENTS:
        u += 1
        db.upsert(conn, "users", {
            "id": f"U_S{u:02d}", "email": student["email"],
            "name": student["name"], "role": "student",
            "password_hash": hash_password(student["email"], PASSWORD),
            "student_id": student["sid"], "class_id": student["class_id"],
            "scenario": student["scenario"],
            "scenario_note": student["note"],
        })
        seed_sem6_student_records(conn, student)
        all_slots.append({"sid": student["sid"],
                          "class_id": student["class_id"],
                          "scenario": student["scenario"],
                          "name": student["name"], "email": student["email"]})

    # ── questioned topics: CN cohort + a synthetic cohort per subject ──
    cn_students = [r["student_id"] for r in conn.execute(
        "SELECT DISTINCT student_id FROM mastery WHERE student_id LIKE 'S\\_0%' "
        "ESCAPE '\\' ORDER BY student_id").fetchall()]
    nq = seed_topic_plan(conn, rng, "CLS_CN5", CN_TOPIC_PLAN,
                         cn_students, None)
    own_by_class = {s["class_id"]: s["sid"] for s in all_slots}
    for class_id, plan in SEM6_TOPIC_PLANS.items():
        code = next(c["course"] for c in classes if c["id"] == class_id)
        pool = [f"S_{code}X{i:02d}" for i in range(1, 15)]
        nq += seed_topic_plan(conn, rng, class_id, plan, pool,
                              own_by_class.get(class_id))

    ns, nm = seed_chats(conn, all_slots)

    # ── S8: every student is enrolled in EVERY subject ────────────────
    # users.class_id stays their home class (the one their session opens
    # on, and the one whose story their seeded data tells). Enrolment is
    # what the subject switcher reads, so each student can move between
    # all six and get a genuinely different graph, taxonomy and roadmap.
    conn.execute("DELETE FROM enrollments")
    students = db.rows_to_dicts(conn.execute(
        "SELECT id FROM users WHERE role = 'student'").fetchall())
    n_enrol = 0
    for u in students:
        for c in classes:
            db.upsert(conn, "enrollments",
                      {"user_id": u["id"], "class_id": c["id"]})
            n_enrol += 1
    conn.commit()

    # ── report + assert the stories hold ──
    print(f"{len(classes)} classes · 1 faculty · {len(all_slots)} students "
          f"(password: {PASSWORD})")
    print(f"enrolments: {n_enrol}  "
          f"({len(students)} students x {len(classes)} subjects each)")
    by_class = {c["id"]: c for c in classes}
    for s in all_slots:
        print(f"  {s['sid']:7} {s['name']:22} {s['email']:26} "
              f"{by_class[s['class_id']]['code']:9} {s['scenario']}")
    print(f"topic questions seeded: {nq}   chat: {ns} sessions, "
          f"{nm} messages")

    ok = True
    for class_id, want_hidden in [("CLS_CN5", "C12"), ("CLS_SE6", "SE_C6"),
                                  ("CLS_DS6", "DS_C3"), ("CLS_FCS6", "FS_C7"),
                                  ("CLS_IOT6", "IO_C6"), ("CLS_CD6", "CD_C6")]:
        rows = {r["concept_id"]: r["n"] for r in conn.execute(
            "SELECT concept_id, COUNT(DISTINCT student_id) n "
            "FROM topic_questions WHERE class_id = ? GROUP BY concept_id",
            (class_id,)).fetchall()}
        surfaced = [c for c, n in rows.items() if n >= 5]
        hidden_ok = rows.get(want_hidden, 99) < 5
        line_ok = bool(surfaced) and hidden_ok
        ok = ok and line_ok
        mark = "OK " if line_ok else "!! "
        print(f"  {mark}{by_class[class_id]['code']:9} surfaced: "
              f"{len(surfaced)} topics · {want_hidden} below k "
              f"({rows.get(want_hidden)}) hidden")
    if not ok:
        print("  !! FAILED — a class's questioned-topics story does not hold")
        sys.exit(1)
    print("  OK — six classes, roster, chat log and questioned topics live")


if __name__ == "__main__":
    main()
