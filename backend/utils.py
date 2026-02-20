import pandas as pd
from io import BytesIO
from fastapi import UploadFile, HTTPException

async def parse_csv(file: UploadFile) -> pd.DataFrame:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    try:
        df = pd.read_csv(BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    
    df['sender_id'] = df['sender_id'].astype(str).str.strip()
    df['receiver_id'] = df['receiver_id'].astype(str).str.strip()
    df['transaction_id'] = df['transaction_id'].astype(str).str.strip()
    
    # helper for export sanitization
    def sanitize_for_csv(s: str) -> str:
        if not isinstance(s, str) or not s:
            return s
        if s[0] in ('=', '+', '-', '@'):
            return "'" + s
        return s

    # Validate required columns
    required_cols = {'sender_id', 'receiver_id', 'amount', 'timestamp', 'transaction_id'}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")
        
    # Validation
    if df['transaction_id'].duplicated().any():
        raise HTTPException(status_code=400, detail="Duplicate transaction IDs found")
        
    # Ensure amount is numeric
    try:
        df['amount'] = pd.to_numeric(df['amount'])
    except Exception:
        raise HTTPException(status_code=400, detail="Amount column must be numeric")

    try:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid timestamp format. use YYYY-MM-DD HH:MM:SS")
        
    return df
