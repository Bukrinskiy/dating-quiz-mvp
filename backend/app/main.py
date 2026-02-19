import re

from fastapi import FastAPI, HTTPException, Query

app = FastAPI(title="quiz-backend")

SAFE_CLICK_ID_RE = re.compile(r"[^a-zA-Z0-9_.-]")

def sanitize_clickid(raw_clickid: str) -> str:
    return SAFE_CLICK_ID_RE.sub("", raw_clickid)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/payment/redirect")
def payment_redirect(clickid: str = Query(min_length=1)) -> None:
    order_id = sanitize_clickid(clickid.strip())

    if not order_id:
        raise HTTPException(status_code=400, detail="Invalid clickid")

    raise HTTPException(status_code=503, detail="Payment system is not connected")
