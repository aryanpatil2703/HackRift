from pydantic import BaseModel, Field
from typing import List, Optional

class SuspiciousAccount(BaseModel):
    account_id: str
    suspicion_score: float = Field(..., description="0-100 score, rounded to 1 decimal")
    detected_patterns: List[str]
    ring_id: Optional[str] = None

class FraudRing(BaseModel):
    ring_id: str
    member_accounts: List[str]
    pattern_type: str
    risk_score: float = Field(..., description="0-100 score, rounded to 1 decimal")

class AnalysisSummary(BaseModel):
    total_accounts_analyzed: int
    suspicious_accounts_flagged: int
    fraud_rings_detected: int
    processing_time_seconds: float

class DetectionResponse(BaseModel):
    suspicious_accounts: List[SuspiciousAccount]
    fraud_rings: List[FraudRing]
    summary: AnalysisSummary
    graph_data: dict # nodes: [], edges: []

