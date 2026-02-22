from __future__ import annotations

from enum import StrEnum


class MobiSlonEvent(StrEnum):
    START_QUIZ = "start_quiz"
    BLOCK1_COMPLETED = "block1_completed"
    BLOCK2_COMPLETED = "block2_completed"
    BLOCK3_COMPLETED = "block3_completed"
    BLOCK4_COMPLETED = "block4_completed"
    BLOCK5_COMPLETED = "block5_completed"
    BLOCK6_COMPLETED = "block6_completed"
    BLOCK7_COMPLETED = "block7_completed"
    TRANSITION_TO_PAYMENT = "transition_to_payment"
    PAY_SUCCESS = "pay_success"


MOBI_SLON_EVENT_SET: frozenset[str] = frozenset(event.value for event in MobiSlonEvent)
