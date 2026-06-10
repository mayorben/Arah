from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from core.security import authenticate_admin, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_admin(form.username, form.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": form.username})
    return {"access_token": token, "token_type": "bearer"}
