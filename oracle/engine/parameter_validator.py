"""
APEX HUMANITY — SATIN Parameter Integrity Validator
====================================================
v2.0.0 — Deep Description-vs-Visual Cross-Examination Engine

ARSITEKTUR VERIFIKASI 3-FASE:

  FASE 1 — Visual Witness (LLaVA: lihat foto tanpa tahu deskripsi)
    Oracle melihat foto dalam keadaan BUTA terhadap klaim user.
    Menghasilkan: visual_report (apa yang benar-benar terlihat).
    Prinsip: seperti saksi mata yang netral.

  FASE 2 — Claim Interrogation (LLaVA: baca klaim, bandingkan dengan visual_report)
    Oracle membaca deskripsi user + semua parameter yang diklaim.
    Membandingkan dengan visual_report dari Fase 1.
    Menghasilkan: cross_examination_verdict, claim_accuracy_score, discrepancies.
    Prinsip: seperti hakim yang mendengar kesaksian lalu mencocokkan fakta.

  FASE 3 — Integrity Synthesis (Logic-based final scoring)
    Menggabungkan Fase 1 + Fase 2 + YOLO data + constraint matrix.
    Menghasilkan: final verdict, final penalty, deduced parameters.
    Prinsip: seperti juri yang mempertimbangkan semua bukti.

LAPISAN TAMBAHAN (Layer A–F):
  Layer A: Action Constraint Matrix (caps realistis per action type)
  Layer B: Description NLP Cross-Validator (keyword presence/absence)
  Layer C: YOLO Triangulation (person count vs claimed)
  Layer D: Effort-to-People Ratio (anomali fisik)
  Layer F: Urgency-Action Compatibility Matrix
"""

from __future__ import annotations

import logging
import math
import os
import re
import json
import base64
import requests
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger("satin.param_validator")


# ═══════════════════════════════════════════════════════════════════════════════
# LOCAL AI CLIENT (LLaVA via Ollama)
# ═══════════════════════════════════════════════════════════════════════════════

class LocalMultimodalOracle:
    """
    Client untuk LLaVA model via Ollama.
    Mendukung 2 mode: vision-only (blind) dan vision+text (cross-examination).
    """
    def __init__(self, model_name: str = "llava", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url   = base_url
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=2)
            # Check if our model is actually available
            models = [m.get("name", "") for m in r.json().get("models", [])]
            self.available = any(self.model_name in m for m in models)
            if not self.available:
                logger.warning(
                    f"[LocalAI] Ollama running but model '{model_name}' not found. "
                    f"Available: {models}. Run: ollama pull {model_name}"
                )
            else:
                logger.info(f"[LocalAI] ✅ Model '{model_name}' ready at {base_url}")
        except Exception:
            self.available = False
            logger.warning(f"[LocalAI] Ollama not detected at {base_url}")

    def analyze(
        self,
        image_bytes: bytes,
        prompt: str,
        temperature: float = 0.1,   # Low temp = more deterministic/consistent
        timeout: int = 90,
    ) -> dict:
        """
        Kirim foto + prompt ke LLaVA. Return parsed JSON atau error dict.
        temperature=0.1 → deterministic, tidak bias ke jawaban "baik".
        """
        if not self.available:
            return {"__error": "Local AI unavailable"}
        try:
            img_b64 = base64.b64encode(image_bytes).decode("utf-8")
            payload = {
                "model":   self.model_name,
                "prompt":  prompt,
                "stream":  False,
                "images":  [img_b64],
                "format":  "json",
                "options": {"temperature": temperature},
            }
            resp = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=timeout,
            )
            resp.raise_for_status()
            raw = resp.json().get("response", "{}")

            # Clean potential markdown fences
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()

            return json.loads(raw)

        except json.JSONDecodeError as e:
            logger.error(f"[LocalAI] JSON parse failed: {e} | raw={raw[:200]}")
            return {"__error": f"JSON parse error: {e}", "__raw": raw[:500]}
        except Exception as e:
            logger.error(f"[LocalAI] Request failed: {e}")
            return {"__error": str(e)}


_LOCAL_AI = LocalMultimodalOracle()


# ═══════════════════════════════════════════════════════════════════════════════
# ACTION CONSTRAINT MATRIX
# Berdasarkan data real NGO/disaster response ground truth
# ═══════════════════════════════════════════════════════════════════════════════

ACTION_CONSTRAINTS: dict[str, dict] = {
    "FOOD_DISTRIBUTION": {
        "max_people_per_hour": 80,
        "max_effort_hours":    16,
        "max_people_abs":      1000,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "require_any_keyword": [
            # Formal
            "makan", "food", "distribusi", "nasi", "sembako", "makanan",
            "meal", "rice", "ration", "package", "paket", "logistik", "pangan",
            "dapur", "kitchen", "hunger", "lapar", "nutrisi", "nutrition", "box",
            "kotak", "plastic bag", "kantong", "bungkus", "catering", "soto",
            # Everyday Indonesian (very common but missing before)
            "bagi", "bagikan", "berbagi", "kasih", "kasih makan", "membagikan",
            "memberikan", "berikan", "kasih", "mau kasih", "ngasih", "ngasi",
            "bantu makan", "bantu pangan", "kasi makan", "kasih makanan",
            "minuman", "minum", "drink", "water", "air minum", "jus", "susu",
            "roti", "bread", "snack", "camilan", "kue", "biskuit",
            "sayur", "vegetable", "lauk", "gulai", "rendang", "sate",
            "distrubusikan", "bawa makanan", "bawa makan", "deliver food",
            "charity food", "sedekah", "sodaqoh", "zakat", "infaq",
        ],
        "critical_requires_keyword": [
            "bencana", "disaster", "darurat", "emergency", "pengungsi", "refugee",
            "banjir", "flood", "gempa", "earthquake", "crisis", "krisis",
        ],
        "typical_people_min":  5,
        # Objek yang diharapkan ada di foto untuk action ini
        "expected_visual_objects": ["food", "people", "box", "container", "bag"],
        # Elemen visual yang HARUS terlihat untuk klaim diverifikasi
        "visual_must_contain_one": ["food", "person", "crowd", "bag", "box", "container"],
    },
    "MEDICAL_AID": {
        "max_people_per_hour": 12,
        "max_effort_hours":    24,
        "max_people_abs":      200,
        "urgency_allowed":     ["MEDIUM", "HIGH", "CRITICAL"],
        "require_any_keyword": [
            "medis", "medical", "obat", "medicine", "sakit", "sick", "luka", "wound",
            "dokter", "doctor", "nurse", "perawat", "health", "kesehatan", "clinic",
            "klinik", "patient", "pasien", "injury", "cedera", "treatment", "pengobatan",
            "first aid", "p3k", "ambulan", "ambulance", "hospital", "rumah sakit",
            "cek", "check", "tensi", "blood pressure", "vaksin", "vaccine", "suntik",
        ],
        "critical_requires_keyword": None,
        "typical_people_min":  1,
        "expected_visual_objects": ["person", "medical equipment", "uniform"],
        "visual_must_contain_one": ["person", "medical"],
    },
    "SHELTER_CONSTRUCTION": {
        "max_people_per_hour": 5,
        "max_effort_hours":    72,
        "max_people_abs":      100,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "require_any_keyword": [
            "shelter", "rumah", "house", "bangunan", "building", "tenda", "tent",
            "konstruksi", "construction", "bangun", "build", "atap", "roof",
            "tempat tinggal", "hunian", "terpal", "tarpaulin", "fondasi", "foundation",
            "renovasi", "renovation", "perbaikan", "repair", "dinding", "wall",
            "kayu", "wood", "bata", "brick", "semen", "cement", "besi", "steel",
        ],
        "critical_requires_keyword": [
            "bencana", "disaster", "darurat", "emergency", "pengungsi",
        ],
        "typical_people_min":  1,
        "expected_visual_objects": ["building", "construction", "material"],
        "visual_must_contain_one": ["building", "construction", "house", "tent"],
    },
    "EDUCATION_SESSION": {
        "max_people_per_hour": 100,
        "max_effort_hours":    10,
        "max_people_abs":      300,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH"],
        "require_any_keyword": [
            "belajar", "learn", "mengajar", "teach", "sekolah", "school", "kelas", "class",
            "edukasi", "education", "siswa", "student", "murid", "pelatihan", "training",
            "workshop", "seminar", "literacy", "literasi", "book", "buku", "skill",
            "keterampilan", "tutoring", "les", "mengaji", "reading", "whiteboard",
            "papan tulis", "materi", "pelajaran", "kurikulum",
        ],
        "critical_requires_keyword": [],  # CRITICAL banned for education
        "typical_people_min":  2,
        "expected_visual_objects": ["person", "classroom", "book"],
        "visual_must_contain_one": ["student", "classroom", "whiteboard", "book", "person"],
    },
    "DISASTER_RELIEF": {
        "max_people_per_hour": 50,
        "max_effort_hours":    72,
        "max_people_abs":      2000,
        "urgency_allowed":     ["HIGH", "CRITICAL"],
        "require_any_keyword": [
            "bencana", "disaster", "gempa", "earthquake", "banjir", "flood",
            "tsunami", "kebakaran", "fire", "longsor", "landslide", "evakuasi",
            "evacuation", "darurat", "emergency", "korban", "victim", "rescue",
            "penyelamatan", "bantuan darurat", "relief", "tanggap darurat",
            "rubuhan", "collapsed", "reruntuhan", "debris",
        ],
        "critical_requires_keyword": None,
        "typical_people_min":  5,
        "expected_visual_objects": ["damage", "person", "debris"],
        "visual_must_contain_one": ["damage", "flood", "debris", "disaster", "evacuation"],
    },
    "CLEAN_WATER_PROJECT": {
        "max_people_per_hour": 30,
        "max_effort_hours":    48,
        "max_people_abs":      500,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "require_any_keyword": [
            "air", "water", "sumur", "well", "sanitasi", "sanitation", "bersih", "clean",
            "minum", "drinking", "filter", "pompa", "pump", "sumber air", "water source",
            "irigasi", "irrigation", "toilet", "MCK", "hygiene", "kebersihan",
            "gallon", "galon", "jerigen", "drum", "tandon", "tank",
        ],
        "critical_requires_keyword": [
            "kekeringan", "drought", "darurat", "emergency", "kontaminasi", "contamination",
        ],
        "typical_people_min":  5,
        "expected_visual_objects": ["water", "pipe", "well", "container"],
        "visual_must_contain_one": ["water", "well", "pump", "pipe", "container"],
    },
    "MENTAL_HEALTH_SUPPORT": {
        "max_people_per_hour": 8,
        "max_effort_hours":    12,
        "max_people_abs":      50,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "require_any_keyword": [
            "mental", "psikologi", "psychology", "trauma", "counseling", "konseling",
            "stress", "anxiety", "depresi", "depression", "emotion", "emosi",
            "jiwa", "wellbeing", "kesehatan mental", "support group", "therapy",
            "terapi", "healing", "pemulihan", "grief", "dukacita", "curhat",
        ],
        "critical_requires_keyword": [
            "trauma", "bencana", "disaster", "krisis", "crisis", "suicide", "bunuh diri",
        ],
        "typical_people_min":  1,
        "expected_visual_objects": ["person", "group", "indoor setting"],
        "visual_must_contain_one": ["person", "group"],
    },
    "ENVIRONMENTAL_ACTION": {
        "max_people_per_hour": 40,
        "max_effort_hours":    16,
        "max_people_abs":      300,
        "urgency_allowed":     ["LOW", "MEDIUM", "HIGH"],
        "require_any_keyword": [
            "lingkungan", "environment", "sampah", "trash", "garbage", "plastic",
            "plastik", "bersih", "clean", "tanam", "plant", "pohon", "tree",
            "recycle", "daur ulang", "polusi", "pollution", "pantai", "beach",
            "sungai", "river", "hutan", "forest", "mangrove", "solar", "energi",
            "karung", "sack", "sapuan", "broom", "sapu",
        ],
        "critical_requires_keyword": [
            "kebakaran hutan", "forest fire", "tumpahan minyak", "oil spill",
            "bencana lingkungan", "environmental disaster", "toxic", "beracun",
        ],
        "typical_people_min":  1,
        "expected_visual_objects": ["trash", "nature", "person"],
        "visual_must_contain_one": ["trash", "nature", "outdoor", "person"],
    },
}

PHYSICAL_IMPOSSIBILITY_RATIOS: dict[str, float] = {
    "FOOD_DISTRIBUTION":     120.0,
    "MEDICAL_AID":           20.0,
    "SHELTER_CONSTRUCTION":  8.0,
    "EDUCATION_SESSION":     150.0,
    "DISASTER_RELIEF":       80.0,
    "CLEAN_WATER_PROJECT":   50.0,
    "MENTAL_HEALTH_SUPPORT": 12.0,
    "ENVIRONMENTAL_ACTION":  60.0,
}


# ═══════════════════════════════════════════════════════════════════════════════
# RESULT DATACLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    passed:              bool
    hard_blocked:        bool       = False
    block_reason:        str        = ""
    penalties:           list[dict] = field(default_factory=list)
    warnings:            list[str]  = field(default_factory=list)
    total_penalty:       float      = 0.0

    # AI Deduced Parameters
    deduced_action_type:   Optional[str]   = None
    deduced_urgency:       Optional[str]   = None
    deduced_effort_hours:  float           = 0.0
    deduced_people_helped: int             = 0

    # Verdict
    llm_verdict:          Optional[str] = None   # "consistent" | "suspicious" | "fabricated"
    llm_reason:           Optional[str] = None
    visual_description:   Optional[str] = None   # Fase 1: apa yang AI lihat di foto
    claim_accuracy_score: float         = 1.0    # 0.0–1.0: seberapa akurat klaim vs visual
    discrepancies:        list[str]     = field(default_factory=list)  # daftar ketidakcocokan spesifik
    integrity_score:      float         = 1.0

    # Raw AI data untuk debugging/transparency
    phase1_report:        Optional[dict] = None
    phase2_report:        Optional[dict] = None

    def add_penalty(self, code: str, amount: float, reason: str):
        self.penalties.append({"code": code, "amount": amount, "reason": reason})
        self.total_penalty = min(1.0, self.total_penalty + amount)
        self.warnings.append(code)
        logger.warning(f"[ParamValidator] PENALTY +{amount:.0%} | {code}: {reason}")

    def hard_block(self, reason: str):
        self.hard_blocked = True
        self.passed       = False
        self.block_reason = reason
        logger.error(f"[ParamValidator] HARD BLOCK: {reason}")


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS — Disusun untuk memaksimalkan netralitas dan akurasi LLaVA
# ═══════════════════════════════════════════════════════════════════════════════

# FASE 1: LLaVA melihat foto tanpa tahu klaim user sama sekali
PHASE1_VISUAL_WITNESS_PROMPT = """You are a neutral technical visual auditor for a humanitarian impact verification system.

Your task: Describe ONLY what you can OBJECTIVELY see in this image. Do NOT guess. Do NOT invent.

Respond ONLY with this exact JSON format, no other text:
{
  "scene_type": "outdoor_field" | "indoor" | "disaster_zone" | "construction" | "classroom" | "medical" | "water_source" | "environmental_cleanup" | "unclear" | "digital_screen" | "screenshot",
  "people_visible": <exact integer count of people you can clearly see, 0 if none>,
  "people_count_confidence": "high" | "medium" | "low",
  "main_objects": ["list", "of", "clearly", "visible", "objects"],
  "activity_happening": "short factual description of what is happening in the image, max 20 words, no interpretation",
  "setting": "urban" | "rural" | "indoor" | "mixed" | "unclear",
  "lighting": "daylight" | "artificial" | "dark" | "mixed",
  "image_authenticity": "real_photo" | "likely_screenshot" | "likely_digital_art" | "possibly_manipulated" | "unclear",
  "authenticity_confidence": "high" | "medium" | "low",
  "visual_quality": "clear" | "blurry" | "partial" | "obscured",
  "red_flags": ["any suspicious visual elements, empty array if none"],
  "raw_visual_summary": "one sentence: the most accurate description of what this image actually shows"
}"""


def _build_phase2_prompt(
    phase1_report: dict,
    user_description: str,
    claimed_action_type: str,
    claimed_people_helped: int,
    claimed_effort_hours: float,
    claimed_urgency: str,
    yolo_person_count: Optional[int],
    yolo_objects: Optional[list],
) -> str:
    """
    Bangun prompt Fase 2: cross-examination antara visual_report (Fase 1)
    dengan semua klaim user. LLaVA harus jadi hakim yang adil.
    """
    return f"""You are a strict but fair humanitarian impact auditor conducting cross-examination.

VISUAL EVIDENCE (what was objectively seen in the photo):
{json.dumps(phase1_report, indent=2)}

YOLO Computer Vision Data:
- People detected by YOLO: {yolo_person_count if yolo_person_count is not None else "not available"}
- Objects detected: {yolo_objects or "not available"}

USER'S CLAIMS:
- Description: "{user_description}"
- Action Type: {claimed_action_type}
- People Helped: {claimed_people_helped}
- Effort Hours: {claimed_effort_hours}
- Urgency Level: {claimed_urgency}

YOUR TASK:
1. Compare the visual evidence with the user's claims.
2. Identify specific discrepancies (what was claimed vs what was actually seen).
3. For "deduced_action_type": STRONGLY PREFER the user's claimed action type unless the visual evidence CLEARLY and UNAMBIGUOUSLY contradicts it. Many humanitarian actions look similar visually.
4. Give a claim accuracy score: how much of the user's claim matches the visual evidence.

CRITICAL FAIRNESS RULES:
- Give user the BENEFIT OF THE DOUBT for action_type_matches_visual. Mark false ONLY if the visual is clearly, unambiguously a DIFFERENT activity.
- "Two people interacting" is consistent with FOOD_DISTRIBUTION, MEDICAL_AID, DISASTER_RELIEF, MENTAL_HEALTH_SUPPORT. Do NOT mark action_type_matches_visual as false just because you cannot 100% confirm.
- A person giving something to another person is CONSISTENT with food distribution. Do not require visible food packaging.
- If the visual shows genuine human interaction and user claims a social action, mark as "consistent" unless there is a CLEAR CONTRADICTION.
- Only mark "fabricated" if: image is clearly not humanitarian, is a screenshot/digital art, or completely unrelated to ANY humanitarian claim.
- Do NOT penalize for language differences (Indonesian/English are both valid).
- Do NOT require perfect match — real field photos are imperfect.
- When uncertain about action type from ambiguous photo, ALWAYS defer to user's claimed action type.

Respond ONLY with this exact JSON, no other text:
{{
  "verdict": "consistent" | "suspicious" | "fabricated",
  "claim_accuracy_score": 0.0-1.0,
  "description_matches_visual": true | false,
  "action_type_matches_visual": true | false,
  "people_count_plausible": true | false,
  "effort_hours_plausible": true | false,
  "discrepancies": [
    "specific discrepancy 1 in plain language",
    "specific discrepancy 2"
  ],
  "deduced_action_type": "FOOD_DISTRIBUTION" | "MEDICAL_AID" | "SHELTER_CONSTRUCTION" | "EDUCATION_SESSION" | "DISASTER_RELIEF" | "CLEAN_WATER_PROJECT" | "MENTAL_HEALTH_SUPPORT" | "ENVIRONMENTAL_ACTION",
  "deduced_people_helped": <integer based on visual evidence>,
  "deduced_effort_hours": <float based on visual evidence>,
  "deduced_urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "integrity_score": 0.0-1.0,
  "reasoning": "2-3 sentences explaining your verdict, citing specific visual vs claimed evidence",
  "key_match_elements": ["what matched between claim and visual"],
  "key_mismatch_elements": ["what did NOT match between claim and visual"]
}}"""


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN VALIDATOR CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class ParameterValidator:
    """
    Entry point tunggal untuk validasi. Dipanggil dari main.py sebelum oracle evaluation.

    Flow:
        1. Fase 1 — Visual Witness: LLaVA lihat foto TANPA tahu klaim
        2. Fase 2 — Cross-Examination: LLaVA bandingkan visual vs klaim
        3. Fase 3 — Synthesis: gabungkan semua data, buat final verdict
        4. Layer A–F: constraint matrix, keyword, YOLO, ratio, urgency checks
    """

    def __init__(self):
        self._ai_available = _LOCAL_AI.available
        logger.info(
            f"ParameterValidator v2.0 initialized | "
            f"3-Phase Cross-Examination: {'ACTIVE' if self._ai_available else 'OFF — check Ollama'}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # PUBLIC ENTRY POINT
    # ─────────────────────────────────────────────────────────────────────────
    def validate(
        self,
        description:        str,
        image_bytes:        Optional[bytes]     = None,
        detected_objects:   Optional[list[str]] = None,
        person_count_yolo:  Optional[int]       = None,
        # Optional hints dari frontend (hanya sebagai referensi, AI yang memutuskan)
        action_hint:        Optional[str] = None,
        urgency_hint:       Optional[str] = None,
        people_hint:        Optional[int] = None,
        effort_hint:        Optional[float] = None,
    ) -> ValidationResult:

        result = ValidationResult(passed=True)

        # Image wajib ada
        if not image_bytes:
            result.hard_block(
                "Bukti visual (foto) wajib ada untuk verifikasi APEX. "
                "Tidak ada gambar yang diterima."
            )
            return result

        # AI harus aktif
        if not self._ai_available:
            result.hard_block(
                "AI Oracle (LLaVA) tidak aktif. "
                "Jalankan: ollama pull llava — lalu restart server."
            )
            return result

        # ── FASE 1: Visual Witness ────────────────────────────────────────────
        phase1 = self._phase1_visual_witness(image_bytes)
        if phase1.get("__error"):
            result.hard_block(f"AI Visual Analysis gagal: {phase1['__error']}")
            return result

        result.phase1_report    = phase1
        result.visual_description = phase1.get("raw_visual_summary", "")

        # Hard block: screenshot / digital content
        authenticity = phase1.get("image_authenticity", "real_photo")
        auth_confidence = phase1.get("authenticity_confidence", "low")
        if authenticity in ("likely_screenshot", "likely_digital_art") and auth_confidence != "low":
            result.hard_block(
                f"Foto terdeteksi sebagai '{authenticity}' (confidence: {auth_confidence}). "
                f"Bukti harus berupa foto nyata dari lapangan, bukan screenshot atau gambar digital. "
                f"AI melihat: {result.visual_description}"
            )
            return result

        # ── FASE 2: Cross-Examination ─────────────────────────────────────────
        phase2 = self._phase2_cross_examination(
            image_bytes          = image_bytes,      # ← WAJIB: LLaVA stateless, harus re-send
            phase1_report        = phase1,
            user_description     = description or "",
            claimed_action_type  = action_hint or "UNKNOWN",
            claimed_people       = people_hint or 0,
            claimed_effort       = effort_hint or 0.0,
            claimed_urgency      = urgency_hint or "MEDIUM",
            yolo_people          = person_count_yolo,
            yolo_objects         = detected_objects,
        )

        if phase2.get("__error"):
            logger.warning(f"[Phase2] Failed: {phase2['__error']} — falling back to Phase1 only")
            phase2 = self._phase2_fallback(phase1, action_hint, urgency_hint)

        result.phase2_report     = phase2
        result.llm_verdict       = phase2.get("verdict", "suspicious")
        result.llm_reason        = phase2.get("reasoning", "")
        result.claim_accuracy_score = float(phase2.get("claim_accuracy_score", 0.5))
        result.integrity_score   = float(phase2.get("integrity_score", 0.5))
        result.discrepancies     = phase2.get("discrepancies", [])

        # Deduced parameters (dari visual, BUKAN dari klaim user)
        result.deduced_action_type   = phase2.get("deduced_action_type") or action_hint or "ENVIRONMENTAL_ACTION"
        result.deduced_urgency       = phase2.get("deduced_urgency") or urgency_hint or "LOW"
        result.deduced_people_helped = int(phase2.get("deduced_people_helped") or 1)
        result.deduced_effort_hours  = float(phase2.get("deduced_effort_hours") or 0.5)

        # ── FASE 3: Synthesis & Penalty Calculation ───────────────────────────
        self._phase3_synthesis(result, phase1, phase2, description, detected_objects, person_count_yolo)

        # Hard block jika fabricated dengan confidence tinggi
        is_fabricated = (
            result.llm_verdict == "fabricated"
            and result.integrity_score < 0.5
        )
        if is_fabricated:
            result.hard_block(
                f"REJECTED — AI Verifikasi: Klaim tidak sesuai dengan bukti visual. "
                f"Claim Accuracy: {result.claim_accuracy_score:.0%}. "
                f"AI melihat: '{result.visual_description}'. "
                f"Alasan: {result.llm_reason}. "
                f"Ketidakcocokan: {'; '.join(result.discrepancies[:3])}"
            )
            return result

        # Hard block jika total penalty sudah sangat tinggi
        if result.total_penalty >= 0.80:
            result.hard_block(
                f"Skor anomali terlalu tinggi ({result.total_penalty:.0%}). "
                f"Flags: {', '.join(result.warnings[:5])}. "
                f"AI Verdict: {result.llm_verdict}."
            )

        return result

    # ─────────────────────────────────────────────────────────────────────────
    # FASE 1 — VISUAL WITNESS
    # ─────────────────────────────────────────────────────────────────────────
    def _phase1_visual_witness(self, image_bytes: bytes) -> dict:
        """
        LLaVA melihat foto dalam keadaan blind — tidak tahu klaim user.
        Hasilnya adalah laporan saksi mata yang netral.
        """
        logger.info("[Phase1] Visual Witness — LLaVA analyzing image blind (no user claim)")
        result = _LOCAL_AI.analyze(
            image_bytes,
            PHASE1_VISUAL_WITNESS_PROMPT,
            temperature=0.05,   # Very low: maksimalkan konsistensi
            timeout=60,
        )
        logger.info(
            f"[Phase1] scene={result.get('scene_type')} "
            f"people={result.get('people_visible')} "
            f"authenticity={result.get('image_authenticity')} "
            f"summary='{result.get('raw_visual_summary', '')[:80]}'"
        )
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # FASE 2 — CROSS-EXAMINATION
    # ─────────────────────────────────────────────────────────────────────────
    def _phase2_cross_examination(
        self,
        image_bytes:          bytes,
        phase1_report:        dict,
        user_description:     str,
        claimed_action_type:  str,
        claimed_people:       int,
        claimed_effort:       float,
        claimed_urgency:      str,
        yolo_people:          Optional[int],
        yolo_objects:         Optional[list],
    ) -> dict:
        """
        LLaVA membaca semua klaim user + melihat foto lagi untuk cross-examination.
        Image WAJIB di-resend — LLaVA tidak punya memory antar request.
        """
        prompt = _build_phase2_prompt(
            phase1_report        = phase1_report,
            user_description     = user_description,
            claimed_action_type  = claimed_action_type,
            claimed_people_helped= claimed_people,
            claimed_effort_hours = claimed_effort,
            claimed_urgency      = claimed_urgency,
            yolo_person_count    = yolo_people,
            yolo_objects         = yolo_objects,
        )
        logger.info(
            f"[Phase2] Cross-Examination — "
            f"claim='{user_description[:60]}...' | "
            f"claimed_action={claimed_action_type} | "
            f"claimed_people={claimed_people}"
        )
        result = _LOCAL_AI.analyze(
            image_bytes = image_bytes,   # WAJIB re-send — LLaVA stateless
            prompt      = prompt,
            temperature = 0.1,
            timeout     = 90,
        )
        logger.info(
            f"[Phase2] verdict={result.get('verdict')} "
            f"accuracy={result.get('claim_accuracy_score', 0):.0%} "
            f"integrity={result.get('integrity_score', 0):.2f} "
            f"deduced_action={result.get('deduced_action_type')} "
            f"deduced_people={result.get('deduced_people_helped')} "
            f"deduced_effort={result.get('deduced_effort_hours')}"
        )
        return result

    def _phase2_fallback(self, phase1: dict, action_hint: Optional[str], urgency_hint: Optional[str] = None) -> dict:
        """Fallback Phase 2 berdasarkan Phase 1 saja jika cross-examination gagal."""
        scene = phase1.get("scene_type", "unclear")
        people = phase1.get("people_visible", 0)
        authenticity = phase1.get("image_authenticity", "unclear")

        # Infer verdict from phase1 alone
        if authenticity in ("likely_screenshot", "likely_digital_art"):
            verdict = "fabricated"
            integrity = 0.2
        elif scene == "unclear" or phase1_report.get("visual_quality") == "obscured":
            verdict = "suspicious"
            integrity = 0.4
        else:
            verdict = "suspicious"
            integrity = 0.5

        return {
            "verdict": verdict,
            "claim_accuracy_score": 0.5,
            "integrity_score": integrity,
            "deduced_action_type": action_hint or "ENVIRONMENTAL_ACTION",
            "deduced_people_helped": people,
            "deduced_effort_hours": 1.0,
            "deduced_urgency": "LOW",
            "discrepancies": ["Phase 2 cross-examination unavailable — using Phase 1 only"],
            "reasoning": f"Fallback: visual shows {scene}, {people} people, authenticity={authenticity}",
            "key_match_elements": [],
            "key_mismatch_elements": [],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # FASE 3 — SYNTHESIS & PENALTY ENGINE
    # ─────────────────────────────────────────────────────────────────────────
    def _phase3_synthesis(
        self,
        result:           ValidationResult,
        phase1:           dict,
        phase2:           dict,
        description:      str,
        detected_objects: Optional[list],
        person_count_yolo: Optional[int],
    ):
        """
        Sintesis semua data: AI phases + YOLO + constraint matrix.
        Assign penalties berdasarkan temuan lintas sumber.
        """
        # — Dari Phase 2: claim_accuracy_score —
        acc = result.claim_accuracy_score
        if acc < 0.3:
            result.add_penalty(
                "claim_vs_visual_severe_mismatch",
                0.50,
                f"Klaim sangat tidak sesuai dengan bukti visual "
                f"(accuracy {acc:.0%}). Perbedaan: {', '.join(result.discrepancies[:2])}"
            )
        elif acc < 0.5:
            result.add_penalty(
                "claim_vs_visual_moderate_mismatch",
                0.25,
                f"Klaim sebagian tidak sesuai dengan bukti visual "
                f"(accuracy {acc:.0%}). Perbedaan: {', '.join(result.discrepancies[:2])}"
            )
        elif acc < 0.7 and result.llm_verdict == "suspicious":
            result.add_penalty(
                "claim_vs_visual_minor_mismatch",
                0.10,
                f"Klaim cukup sesuai tapi ada inkonsistensi kecil (accuracy {acc:.0%})."
            )

        # — Dari Phase 1: image authenticity —
        auth = phase1.get("image_authenticity", "real_photo")
        auth_conf = phase1.get("authenticity_confidence", "low")
        if auth == "possibly_manipulated" and auth_conf in ("high", "medium"):
            result.add_penalty(
                "image_possibly_manipulated",
                0.40,
                "AI mendeteksi kemungkinan manipulasi pada gambar."
            )
        elif auth == "likely_screenshot" and auth_conf == "low":
            # Low confidence screenshot — penalty ringan
            result.add_penalty(
                "image_screenshot_low_confidence",
                0.20,
                "Kemungkinan lemah bahwa foto adalah screenshot — perlu review."
            )

        # — Red flags dari Phase 1 —
        red_flags = phase1.get("red_flags", [])
        if red_flags:
            result.add_penalty(
                "visual_red_flags",
                min(0.30, len(red_flags) * 0.10),
                f"Visual red flags terdeteksi: {', '.join(red_flags[:3])}"
            )

        # — Description minimal check —
        desc = description or ""
        if len(desc.strip()) < 20:
            result.add_penalty(
                "description_too_short",
                0.25,
                f"Deskripsi terlalu pendek ({len(desc)} karakter). Minimal 20 karakter diperlukan."
            )

        # — YOLO cross-check —
        if person_count_yolo is not None:
            phase1_people = phase1.get("people_visible", 0)
            # Konsistensi antara YOLO dan Phase1 vision
            if abs(person_count_yolo - phase1_people) > max(5, phase1_people * 2) and phase1_people > 0:
                result.add_penalty(
                    "yolo_vs_llava_people_count_discrepancy",
                    0.10,
                    f"YOLO melihat {person_count_yolo} orang, AI melihat {phase1_people} orang — ada perbedaan besar."
                )

        # — Specific mismatch check dari Phase 2 —
        action_match  = phase2.get("action_type_matches_visual", True)
        people_plaus  = phase2.get("people_count_plausible", True)
        effort_plaus  = phase2.get("effort_hours_plausible", True)
        desc_match    = phase2.get("description_matches_visual", True)

        if not action_match:
            # Only penalize if AI is also confident (claim_accuracy < 0.6) AND verdict not consistent
            # This prevents false positives when LLaVA wrongly deduces action type from ambiguous photos
            ai_confident_mismatch = (
                result.claim_accuracy_score < 0.6
                and result.llm_verdict in ("suspicious", "fabricated")
                and result.deduced_action_type != action_type_hint
            )
            if ai_confident_mismatch:
                result.add_penalty(
                    "action_type_not_matching_visual",
                    0.15,  # Reduced from 0.30 — AI can be wrong about action type from ambiguous photos
                    f"Action type yang diklaim mungkin tidak sesuai visual. "
                    f"AI menyimpulkan: {result.deduced_action_type}, kamu klaim: {action_type_hint}"
                )
        if not people_plaus:
            result.add_penalty(
                "people_count_implausible",
                0.20,
                f"Jumlah orang yang diklaim tidak masuk akal berdasarkan bukti visual. "
                f"AI estimate: {result.deduced_people_helped}"
            )
        if not effort_plaus:
            result.add_penalty(
                "effort_hours_implausible",
                0.15,
                f"Jam usaha yang diklaim tidak sesuai dengan konteks visual. "
                f"AI estimate: {result.deduced_effort_hours:.1f}h"
            )
        if not desc_match:
            result.add_penalty(
                "description_vs_visual_mismatch",
                0.25,
                "Deskripsi yang diberikan tidak menggambarkan apa yang sebenarnya terlihat di foto."
            )

        logger.info(
            f"[Phase3] Final | verdict={result.llm_verdict} "
            f"accuracy={result.claim_accuracy_score:.0%} "
            f"integrity={result.integrity_score:.2f} "
            f"total_penalty={result.total_penalty:.0%} "
            f"discrepancies={len(result.discrepancies)}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # LAYER CHECKS (A, B, C, D, F) — dipanggil dari validate() di main.py
    # untuk validasi tambahan non-AI
    # ─────────────────────────────────────────────────────────────────────────
    def check_constraints(
        self,
        result:        ValidationResult,
        action_type:   str,
        urgency_level: str,
        effort_hours:  float,
        people_helped: int,
        description:   str,
        person_count_yolo: Optional[int] = None,
        detected_objects:  Optional[list] = None,
    ):
        """
        Validasi Layer A–F: constraint matrix, keyword, YOLO, ratio, urgency.
        Dipanggil secara terpisah dari validate() untuk modularitas.
        """
        constraint = ACTION_CONSTRAINTS.get(action_type.upper(), {})
        if not constraint:
            result.add_penalty(
                "unknown_action_type", 0.30,
                f"Action type '{action_type}' tidak dikenali."
            )
            return

        self._check_effort_hours(result, constraint, effort_hours, action_type)
        self._check_people_helped(result, constraint, people_helped, action_type)
        self._check_effort_people_ratio(result, action_type, effort_hours, people_helped)
        self._check_urgency(result, constraint, urgency_level, description, action_type)
        self._check_description_keywords(result, constraint, description, action_type, urgency_level)
        if detected_objects:
            self._check_yolo_objects_vs_action(result, detected_objects, action_type)
        if person_count_yolo is not None:
            self._check_yolo_count_vs_claimed(result, person_count_yolo, people_helped, action_type)

    # ── Layer A: Effort Hours ────────────────────────────────────────────────
    def _check_effort_hours(self, result, constraint, effort_hours, action_type):
        max_hours = constraint.get("max_effort_hours", 24)
        if effort_hours > max_hours * 2:
            result.hard_block(
                f"effort_hours={effort_hours:.1f}h jauh melampaui batas fisik untuk "
                f"{action_type} (max={max_hours}h). Mustahil secara fisik."
            )
            return
        if effort_hours > max_hours:
            pct = (effort_hours - max_hours) / max_hours
            result.add_penalty(
                "effort_hours_inflated",
                min(0.35, 0.15 + pct * 0.20),
                f"{action_type} effort={effort_hours:.1f}h melebihi batas {max_hours}h ({pct:.0%} overshoot)"
            )
        if effort_hours < 0.5 and action_type in (
            "DISASTER_RELIEF", "SHELTER_CONSTRUCTION", "CLEAN_WATER_PROJECT"
        ):
            result.add_penalty(
                "effort_too_low_for_action", 0.25,
                f"{action_type} tidak mungkin selesai dalam {effort_hours:.1f}h."
            )

    # ── Layer A: People Helped ───────────────────────────────────────────────
    def _check_people_helped(self, result, constraint, people_helped, action_type):
        max_abs = constraint.get("max_people_abs", 500)
        if people_helped > max_abs * 3:
            result.hard_block(
                f"people_helped={people_helped} jauh melampaui batas absolut untuk "
                f"{action_type} (max={max_abs}). Data tidak bisa benar."
            )
            return
        if people_helped > max_abs:
            pct = (people_helped - max_abs) / max_abs
            result.add_penalty(
                "people_helped_inflated",
                min(0.40, 0.20 + pct * 0.15),
                f"{action_type}: {people_helped} melebihi batas {max_abs} ({pct:.0%} overshoot)"
            )

    # ── Layer D: Effort-People Ratio ─────────────────────────────────────────
    def _check_effort_people_ratio(self, result, action_type, effort_hours, people_helped):
        if effort_hours <= 0:
            return
        ratio = people_helped / effort_hours
        impossible = PHYSICAL_IMPOSSIBILITY_RATIOS.get(action_type.upper(), 100.0)
        if ratio > impossible * 3:
            result.hard_block(
                f"Rasio {people_helped}/{effort_hours:.1f}h = {ratio:.0f}/jam MUSTAHIL "
                f"untuk {action_type} (batas: {impossible:.0f}/jam)."
            )
            return
        if ratio > impossible:
            pct = (ratio - impossible) / impossible
            result.add_penalty(
                "effort_people_ratio_anomaly",
                min(0.40, 0.20 + pct * 0.10),
                f"Rasio {ratio:.0f}/jam tidak realistis untuk {action_type} (max {impossible:.0f}/jam)"
            )

    # ── Layer F: Urgency-Action Compatibility ────────────────────────────────
    def _check_urgency(self, result, constraint, urgency_level, description, action_type):
        allowed = constraint.get("urgency_allowed", ["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        desc_lower = (description or "").lower()
        if urgency_level not in allowed:
            result.add_penalty(
                "urgency_incompatible_with_action", 0.35,
                f"URGENCY={urgency_level} tidak valid untuk {action_type}. "
                f"Diperbolehkan: {allowed}"
            )
            return
        if urgency_level == "CRITICAL":
            critical_kw = constraint.get("critical_requires_keyword")
            if critical_kw is not None:
                if len(critical_kw) == 0:
                    result.add_penalty(
                        "critical_urgency_banned_for_action", 0.40,
                        f"URGENCY=CRITICAL tidak valid untuk {action_type}."
                    )
                elif not any(kw in desc_lower for kw in critical_kw):
                    result.add_penalty(
                        "critical_urgency_without_context", 0.30,
                        f"CRITICAL untuk {action_type} butuh konteks darurat di deskripsi. "
                        f"Contoh: {critical_kw[:3]}"
                    )

    # ── Layer B: Description Keywords ────────────────────────────────────────
    def _check_description_keywords(
        self, result, constraint, description, action_type, urgency_level
    ):
        if len(description or "") < 20:
            return   # sudah dicek di phase3
        desc_lower = description.lower()

        # Check BOTH: the original action_type AND any alternative we might have deduced
        # Use the most FAVORABLE result — user should not be penalized for AI misidentifying action
        action_types_to_check = [action_type]

        # Also check against the user's originally submitted action type hint (from main.py context)
        # This is already in action_type when called correctly

        required = constraint.get("require_any_keyword", [])

        # No keyword match on primary action type
        if required and not any(kw in desc_lower for kw in required):
            # Before penalizing, do a general humanitarian check:
            # If description has ANY positive humanitarian signals, skip keyword penalty
            GENERAL_HUMANITARIAN_SIGNALS = [
                "membantu", "bantu", "help", "beri", "berikan", "kasih", "memberi",
                "sedekah", "sosial", "relawan", "volunteer", "komunitas", "community",
                "warga", "masyarakat", "people", "orang", "korban", "victim",
                "peduli", "care", "share", "berbagi", "tolong",
                "interaksi", "interact", "bertemu", "meet", "datang", "visit",
                "kegiatan", "activity", "program", "acara", "event",
            ]
            has_humanitarian_signal = any(sig in desc_lower for sig in GENERAL_HUMANITARIAN_SIGNALS)

            if has_humanitarian_signal:
                # Soft warning only — don't penalize, just note
                result.warnings.append(
                    f"description_could_be_more_specific: Deskripsi valid tapi lebih baik sebutkan "
                    f"secara eksplisit jenis kegiatan ({action_type.lower().replace('_',' ')})"
                )
            else:
                # Hard penalty only if no humanitarian signal at all in description
                result.add_penalty(
                    "description_keyword_mismatch", 0.15,  # Reduced from 0.45
                    f"Deskripsi tidak mengandung kata kunci relevan untuk {action_type}. "
                    f"Contoh: {required[:4]}"
                )

        cross = self._detect_cross_action_contamination(desc_lower, action_type)
        if cross:
            result.add_penalty(
                "description_action_mismatch", 0.15,  # Reduced from 0.35
                f"Deskripsi lebih cocok untuk: {', '.join(cross)} daripada {action_type}."
            )

    def _detect_cross_action_contamination(self, desc_lower: str, claimed: str) -> list[str]:
        STRONG_SIGS = {
            "ENVIRONMENTAL_ACTION": ["pungut sampah", "bersih pantai", "tanam pohon", "daur ulang"],
            "FOOD_DISTRIBUTION":    ["distribusi makanan", "bagi nasi", "dapur umum", "sembako"],
            "EDUCATION_SESSION":    ["mengajar", "belajar", "kelas", "sekolah", "workshop"],
            "MEDICAL_AID":          ["obati", "rawat pasien", "periksa kesehatan", "first aid"],
            "SHELTER_CONSTRUCTION": ["bangun rumah", "renovasi", "pasang tenda", "perbaikan rumah"],
        }
        flags = []
        for action, sigs in STRONG_SIGS.items():
            if action == claimed:
                continue
            if any(s in desc_lower for s in sigs):
                flags.append(action)
        return flags

    # ── Layer C: YOLO Person Count vs Claimed ────────────────────────────────
    def _check_yolo_count_vs_claimed(self, result, person_count_yolo, people_helped, action_type):
        if person_count_yolo is None or person_count_yolo < 0:
            return
        if person_count_yolo == 0 and people_helped > 5:
            result.add_penalty(
                "no_people_visible_but_high_claimed", 0.30,
                f"YOLO tidak mendeteksi orang di foto, tapi people_helped={people_helped}."
            )
            return
        if person_count_yolo > 0:
            max_plausible = person_count_yolo * 25
            if people_helped > max_plausible and people_helped > 50:
                ratio = people_helped / max(person_count_yolo, 1)
                result.add_penalty(
                    "yolo_count_vs_claimed_mismatch",
                    min(0.35, 0.10 + (ratio / 100) * 0.05),
                    f"YOLO melihat {person_count_yolo} orang tapi klaim {people_helped} (rasio {ratio:.0f}x)."
                )

    # ── Layer C: YOLO Objects vs Action ──────────────────────────────────────
    def _check_yolo_objects_vs_action(self, result, detected_objects, action_type):
        detected_lower = [o.lower() for o in detected_objects]
        SUSPICIOUS_COMBO = {
            "DISASTER_RELIEF":   ["tv", "monitor", "laptop", "couch", "bed"],
            # Note: car/motorcycle removed from FOOD_DISTRIBUTION — volunteers commonly use vehicles to deliver food
        }
        suspicious = SUSPICIOUS_COMBO.get(action_type, [])
        found = [o for o in detected_lower if o in suspicious]
        has_person = "person" in detected_lower
        if not has_person and action_type in (
            "FOOD_DISTRIBUTION", "MEDICAL_AID", "EDUCATION_SESSION", "DISASTER_RELIEF"
        ):
            result.add_penalty(
                "no_person_detected_for_people_action", 0.20,
                f"YOLO tidak mendeteksi manusia untuk {action_type} yang butuh interaksi manusia."
            )
        if found:
            result.add_penalty(
                "suspicious_objects_detected", 0.15,
                f"Objek mencurigakan terdeteksi: {found} untuk {action_type}."
            )


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION HELPER — dipanggil dari main.py
# ═══════════════════════════════════════════════════════════════════════════════

def run_full_validation(
    validator:         "ParameterValidator",
    description:       str,
    image_bytes:       Optional[bytes],
    detected_objects:  Optional[list],
    person_count_yolo: Optional[int],
    action_type_hint:  str,
    urgency_hint:      str,
    people_hint:       int,
    effort_hint:       float,
) -> ValidationResult:
    """
    Entry point lengkap yang menjalankan SEMUA layer:
    1. 3-phase AI cross-examination (Fase 1 + 2 + 3)
    2. Constraint matrix checks (Layer A–F)

    Dipanggil dari main.py sebagai pengganti param_validator.validate()
    """
    # Phase 1-3: AI cross-examination
    result = validator.validate(
        description       = description,
        image_bytes       = image_bytes,
        detected_objects  = detected_objects,
        person_count_yolo = person_count_yolo,
        action_hint       = action_type_hint,
        urgency_hint      = urgency_hint,
        people_hint       = people_hint,
        effort_hint       = effort_hint,
    )

    # Layer A-F: constraint checks (skip jika sudah hard_blocked)
    if not result.hard_blocked:
        # IMPORTANT: Use user's original hint as primary for constraint checks.
        # AI deduction can be wrong (especially for ambiguous photos).
        # Only fall back to deduced if hint is missing.
        validator.check_constraints(
            result         = result,
            action_type    = action_type_hint or result.deduced_action_type,
            urgency_level  = urgency_hint or result.deduced_urgency,
            effort_hours   = effort_hint or result.deduced_effort_hours,
            people_helped  = people_hint or result.deduced_people_helped,
            description    = description,
            person_count_yolo = person_count_yolo,
            detected_objects  = detected_objects,
        )

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2 WITH IMAGE RE-SUBMISSION — dipanggil dari main.py jika image tersedia
# ═══════════════════════════════════════════════════════════════════════════════

def run_full_validation_with_image(
    validator:         "ParameterValidator",
    description:       str,
    image_bytes:       bytes,                  # WAJIB ada
    detected_objects:  Optional[list],
    person_count_yolo: Optional[int],
    action_type_hint:  str,
    urgency_hint:      str,
    people_hint:       int,
    effort_hint:       float,
) -> ValidationResult:
    """
    Versi lengkap dengan image re-submission untuk Phase 2 (akurasi maksimal).
    Gunakan ini jika memory/bandwidth tersedia.
    """
    result = ValidationResult(passed=True)

    if not image_bytes:
        result.hard_block("Image bytes diperlukan untuk run_full_validation_with_image.")
        return result

    if not validator._ai_available:
        result.hard_block("AI Oracle (LLaVA) tidak aktif.")
        return result

    # Phase 1: blind visual witness
    phase1 = validator._phase1_visual_witness(image_bytes)
    if phase1.get("__error"):
        result.hard_block(f"AI Visual Analysis gagal: {phase1['__error']}")
        return result

    result.phase1_report    = phase1
    result.visual_description = phase1.get("raw_visual_summary", "")

    auth = phase1.get("image_authenticity", "real_photo")
    auth_conf = phase1.get("authenticity_confidence", "low")
    if auth in ("likely_screenshot", "likely_digital_art") and auth_conf != "low":
        result.hard_block(
            f"Foto terdeteksi sebagai '{auth}' (confidence: {auth_conf}). "
            f"Gunakan foto nyata dari lapangan. AI melihat: {result.visual_description}"
        )
        return result

    # Phase 2: cross-examination WITH image re-sent
    phase2 = validator._phase2_cross_examination(
        image_bytes          = image_bytes,
        phase1_report        = phase1,
        user_description     = description or "",
        claimed_action_type  = action_type_hint,
        claimed_people       = people_hint,
        claimed_effort       = effort_hint,
        claimed_urgency      = urgency_hint,
        yolo_people          = person_count_yolo,
        yolo_objects         = detected_objects,
    )
    if phase2.get("__error"):
        logger.warning(f"[Phase2-Full] Failed: {phase2['__error']} — fallback")
        phase2 = validator._phase2_fallback(phase1, action_type_hint, urgency_hint)

    result.phase2_report     = phase2
    result.llm_verdict       = phase2.get("verdict", "suspicious")
    result.llm_reason        = phase2.get("reasoning", "")
    result.claim_accuracy_score = float(phase2.get("claim_accuracy_score", 0.5))
    result.integrity_score   = float(phase2.get("integrity_score", 0.5))
    result.discrepancies     = phase2.get("discrepancies", [])
    result.deduced_action_type   = phase2.get("deduced_action_type") or action_type_hint
    result.deduced_urgency       = phase2.get("deduced_urgency") or urgency_hint
    result.deduced_people_helped = int(phase2.get("deduced_people_helped") or 1)
    result.deduced_effort_hours  = float(phase2.get("deduced_effort_hours") or 0.5)

    # Phase 3: synthesis
    validator._phase3_synthesis(
        result, phase1, phase2, description, detected_objects, person_count_yolo
    )

    # Fabrication hard block
    if result.llm_verdict == "fabricated" and result.integrity_score < 0.5:
        result.hard_block(
            f"REJECTED — Klaim tidak sesuai bukti visual. "
            f"Claim Accuracy: {result.claim_accuracy_score:.0%}. "
            f"AI melihat: '{result.visual_description}'. "
            f"Alasan: {result.llm_reason}. "
            f"Ketidakcocokan: {'; '.join(result.discrepancies[:3])}"
        )
        return result

    # Layer A-F
    if not result.hard_blocked:
        # IMPORTANT: User's hint is primary. AI deduction is secondary.
        # This prevents false blocks when LLaVA misidentifies action type from ambiguous photos.
        validator.check_constraints(
            result         = result,
            action_type    = action_type_hint or result.deduced_action_type,
            urgency_level  = urgency_hint or result.deduced_urgency,
            effort_hours   = effort_hint or result.deduced_effort_hours,
            people_helped  = people_hint or result.deduced_people_helped,
            description    = description,
            person_count_yolo = person_count_yolo,
            detected_objects  = detected_objects,
        )

    if result.total_penalty >= 0.80 and not result.hard_blocked:
        result.hard_block(
            f"Anomali score terlalu tinggi ({result.total_penalty:.0%}). "
            f"Flags: {', '.join(result.warnings[:5])}"
        )

    return result


if __name__ == "__main__":
    print("APEX ParameterValidator v2.0 — 3-Phase Cross-Examination Engine")
    print(f"AI Status: {'READY' if _LOCAL_AI.available else 'OFFLINE — run: ollama pull llava'}")