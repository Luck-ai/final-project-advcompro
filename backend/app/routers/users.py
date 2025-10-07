from fastapi import APIRouter ,Depends ,HTTPException ,BackgroundTasks 
from sqlalchemy .ext .asyncio import AsyncSession 
from sqlalchemy import select 
from typing import List 
from ..import models ,schemas 
from ..database import get_db 
import hashlib 
import logging 
from ..security import create_access_token ,ACCESS_TOKEN_EXPIRE_MINUTES 
from ..security import get_current_user
from datetime import timedelta ,datetime ,timezone 
import secrets 
from ..routers .email import send_verification_email_sync 
from ..routers.email import send_password_reset_email_sync
import re

router =APIRouter (prefix ="/users",tags =["users"])


def _hash_password (password :str )->str :
    return hashlib .sha256 (password .encode ('utf-8')).hexdigest ()


def _validate_password_policy(password: str) -> None:
    """Enforce: min 8 chars, at least one uppercase letter, and at least one special character."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail='Password must contain at least one uppercase letter')
    if not re.search(r'[\W_]', password):
        raise HTTPException(status_code=400, detail='Password must contain at least one special character')


@router .post ("/",response_model =schemas .UserOut )
async def create_user (user :schemas .UserCreate ,db :AsyncSession =Depends (get_db )):
    # validate password strength
    _validate_password_policy(user.password)
    hashed =_hash_password (user .password )

    token =secrets .token_urlsafe (32 )
    db_user =models .User (full_name =user .full_name ,email =user .email ,password_hash =hashed ,
    is_verified =False ,verification_token =token ,
    verification_sent_at =datetime .now (timezone .utc ))
    db .add (db_user )
    await db .commit ()
    await db .refresh (db_user )
    return db_user 


@router .get ("/",response_model =List [schemas .UserOut ])
async def list_users (db :AsyncSession =Depends (get_db )):
        result =await db .execute (select (models .User ))
        users =result .scalars ().all ()
        return users 

@router .post ('/login',response_model =schemas .Token )
async def login (data :schemas .UserLogin ,db :AsyncSession =Depends (get_db )):
    hashed =_hash_password (data .password )
    result =await db .execute (select (models .User ).where (models .User .email ==data .email ))
    user =result .scalars ().first ()
    if not user or user .password_hash !=hashed :
        raise HTTPException (status_code =401 ,detail ='Invalid credentials')
    if not getattr (user ,'is_verified',False ):
        raise HTTPException (status_code =403 ,detail ='Email not verified')

    access_token_expires =timedelta (minutes =ACCESS_TOKEN_EXPIRE_MINUTES )
    token =create_access_token (data ={"sub":str (user .id )},expires_delta =access_token_expires )
    return {"access_token":token ,"token_type":"bearer"}

@router .post ('/send-verification')
async def send_verification (request :schemas .VerifyRequest ,background_tasks :BackgroundTasks ,db :AsyncSession =Depends (get_db )):

    result =await db .execute (select (models .User ).where (models .User .email ==request .email ))
    user =result .scalars ().first ()
    if not user :
        raise HTTPException (status_code =404 ,detail ='User not found')
    if getattr (user ,'is_verified',False ):
        return {"status":"ok","detail":"Already verified"}


    if not user .verification_token :
        user .verification_token =secrets .token_urlsafe (32 )
        user .verification_sent_at =datetime .now (timezone .utc )
        db .add (user )
        await db .commit ()
        await db .refresh (user )


    verify_link =f"http://localhost:3000/verify?token={user .verification_token }&email={user .email }"
    background_tasks .add_task (send_verification_email_sync ,user .email ,verify_link ,user .full_name )
    return {"status":"ok","detail":"Verification email queued"}



@router.post('/forgot-password')
async def forgot_password(request: schemas.ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == request.email))
    user = result.scalars().first()
    if not user:
        # don't reveal user existence
        return {"status": "ok", "detail": "If that email exists, a password reset email was queued"}

    # create reset token
    user.password_reset_token = secrets.token_urlsafe(32)
    user.password_reset_sent_at = datetime.now(timezone.utc)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    reset_link = f"http://localhost:3000/reset-password?token={user.password_reset_token}&email={user.email}"
    background_tasks.add_task(send_password_reset_email_sync, user.email, reset_link, user.full_name)
    return {"status": "ok", "detail": "Password reset queued"}


@router.post('/reset-password')
async def reset_password(request: schemas.ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == request.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if not user.password_reset_token or user.password_reset_token != request.token:
        raise HTTPException(status_code=400, detail='Invalid or expired token')

    # validate new password
    _validate_password_policy(request.new_password)
    # set new password
    user.password_hash = _hash_password(request.new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    db.add(user)
    await db.commit()
    return {"status": "ok", "detail": "Password has been reset"}


@router .get ('/verify')
async def verify_email (token :str ,email :str ,db :AsyncSession =Depends (get_db )):
    result =await db .execute (select (models .User ).where (models .User .email ==email ))
    user =result .scalars ().first ()
    if not user :
        raise HTTPException (status_code =404 ,detail ='User not found')
    if user .is_verified :
        return {"status":"ok","detail":"Already verified"}
    if not user .verification_token or user .verification_token !=token :
        raise HTTPException (status_code =400 ,detail ='Invalid token')
    user .is_verified =True 
    user .verification_token =None 
    db .add (user )
    await db .commit ()
    return {"status":"ok","detail":"Email verified"}



@router.post('/change-password')
async def change_password(request: schemas.ChangePasswordRequest, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # verify current password
    hashed_current = _hash_password(request.current_password)
    if current_user.password_hash != hashed_current:
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    # validate new password
    _validate_password_policy(request.new_password)
    # set new password
    current_user.password_hash = _hash_password(request.new_password)
    db.add(current_user)
    await db.commit()
    return {'status': 'ok', 'detail': 'Password changed'}


@router.delete('/')
async def delete_account(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # delete the user record
    await db.delete(current_user)
    await db.commit()
    return {'status': 'ok', 'detail': 'Account deleted'}
