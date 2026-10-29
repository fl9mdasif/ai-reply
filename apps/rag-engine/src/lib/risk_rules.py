import re

from src.models.risk_score import RiskFlag, RiskScoreRequest

# Bangladesh mobile: 01 + [3-9] + 8 digits
_BD_PHONE_RE = re.compile(r"^01[3-9]\d{8}$")

# Addresses this short are too vague to deliver to
_MIN_ADDRESS_WORDS = 3

# COD orders over this quantity are unusually risky
_HIGH_QTY_THRESHOLD = 10


def check_malformed_phone(req: RiskScoreRequest) -> RiskFlag | None:
    digits = re.sub(r"[\s\-\+]", "", req.phone)
    if not _BD_PHONE_RE.match(digits):
        return RiskFlag(
            code="malformed_phone",
            reason=f"Phone '{req.phone}' does not match Bangladesh mobile format (01[3-9]XXXXXXXX).",
        )
    return None


def check_high_quantity(req: RiskScoreRequest) -> RiskFlag | None:
    if req.quantity > _HIGH_QTY_THRESHOLD:
        return RiskFlag(
            code="high_quantity",
            reason=f"Quantity {req.quantity} exceeds the COD risk threshold of {_HIGH_QTY_THRESHOLD}.",
        )
    return None


def check_suspicious_address(req: RiskScoreRequest) -> RiskFlag | None:
    words = [w for w in req.address.split() if w]
    if len(words) < _MIN_ADDRESS_WORDS:
        return RiskFlag(
            code="suspicious_address",
            reason=f"Address '{req.address}' is too vague (fewer than {_MIN_ADDRESS_WORDS} words).",
        )
    return None


ALL_RULES = [check_malformed_phone, check_high_quantity, check_suspicious_address]


def evaluate(req: RiskScoreRequest) -> tuple[list[RiskFlag], float]:
    flags = [flag for rule in ALL_RULES if (flag := rule(req)) is not None]
    score = len(flags) / len(ALL_RULES)
    return flags, round(score, 4)
