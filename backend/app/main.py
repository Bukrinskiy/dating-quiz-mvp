import hashlib
import os
import re
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse

app = FastAPI(title="quiz-backend")

SAFE_CLICK_ID_RE = re.compile(r"[^a-zA-Z0-9_.-]")


class PaymentSettings:
    merchant_id: str
    secret_1: str
    currency: str
    pay_url: str
    amount: str

    def __init__(self) -> None:
        self.merchant_id = os.getenv("FK_MERCHANT_ID", "YOUR_MERCHANT_ID")
        self.secret_1 = os.getenv("FK_SECRET_1", "YOUR_SECRET_WORD_1")
        self.currency = os.getenv("FK_CURRENCY", "USD")
        self.pay_url = os.getenv("FK_PAY_URL", "https://pay.fk.money/")
        self.amount = os.getenv("FK_AMOUNT", "9.99")


def sanitize_clickid(raw_clickid: str) -> str:
    return SAFE_CLICK_ID_RE.sub("", raw_clickid)


def build_signature(
    merchant_id: str,
    amount: str,
    secret_1: str,
    currency: str,
    order_id: str,
) -> str:
    payload = f"{merchant_id}:{amount}:{secret_1}:{currency}:{order_id}"
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/payment/redirect")
def payment_redirect(clickid: str = Query(min_length=1)) -> RedirectResponse:
    settings = PaymentSettings()
    order_id = sanitize_clickid(clickid.strip())

    if not order_id:
        raise HTTPException(status_code=400, detail="Invalid clickid")

    sign = build_signature(
        merchant_id=settings.merchant_id,
        amount=settings.amount,
        secret_1=settings.secret_1,
        currency=settings.currency,
        order_id=order_id,
    )

    params = {
        "m": settings.merchant_id,
        "oa": settings.amount,
        "currency": settings.currency,
        "o": order_id,
        "s": sign,
    }

    target_url = f"{settings.pay_url}?{urlencode(params)}"
    return RedirectResponse(url=target_url, status_code=302)
