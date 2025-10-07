from fastapi import APIRouter ,Depends ,UploadFile ,File ,HTTPException 
from sqlalchemy .ext .asyncio import AsyncSession 
from typing import List 
from ..import models ,schemas ,crud 
from ..database import get_db 
from sqlalchemy import select 
from ..security import get_current_user 
from ..utils .csv_upload import CSVUploadError ,read_csv_rows 

router =APIRouter (prefix ="/categories",tags =["categories"])


@router .delete ("/all")
async def delete_all_categories (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Attempt to delete all categories for the current user. Returns summary."""
    res =await crud .delete_all_categories (db ,user_id =current_user .id )
    return res 


@router .delete ("/{category_id}")
async def delete_category (category_id :int ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    try :
        ok =await crud .delete_category (db ,category_id ,current_user .id )
    except ValueError as e :
        msg =str (e )
        if 'has products'in msg .lower ():
            raise HTTPException (status_code =409 ,detail =msg )
        raise HTTPException (status_code =400 ,detail =msg )
    if not ok :
        raise HTTPException (status_code =404 ,detail ="Category not found")
    return {"ok":True }


@router .put ("/{category_id}",response_model =schemas .ProductCategoryOut )
async def update_category (category_id :int ,updates :schemas .ProductCategoryCreate ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    try :
        c =await crud .update_category (db ,category_id ,updates ,user_id =current_user .id )
    except ValueError as e :
        raise HTTPException (status_code =400 ,detail =str (e ))
    if not c :
        raise HTTPException (status_code =404 ,detail ="Category not found")
    return c 


@router .post ("/",response_model =schemas .ProductCategoryOut )
async def create_category (cat :schemas .ProductCategoryCreate ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):

    user_id =current_user .id 
    data =cat .model_dump ()
    data ['user_id']=user_id 
    c_schema =schemas .ProductCategoryCreate .model_validate (data )
    try :
        return await crud .create_category (db ,c_schema )
    except ValueError as e :
        raise HTTPException (status_code =400 ,detail =str (e ))


@router .get ("/",response_model =List [schemas .ProductCategoryOut ])
async def list_categories (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    result =await db .execute (select (models .ProductCategory ).where (models .ProductCategory .user_id ==current_user .id ))
    return result .scalars ().all ()

@router .post ("/upload")
async def upload_categories_csv (file :UploadFile =File (...),db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Upload a CSV file with category rows. Expected headers: name, description"""

    user_id =current_user .id 

    try :
        rows =await read_csv_rows (file )
    except CSVUploadError as exc :
        raise HTTPException (status_code =400 ,detail =str (exc ))

    results =[]
    for row_no ,row in rows :
        data =dict (row )
        data ['user_id']=user_id 
        try :
            c_schema =schemas .ProductCategoryCreate .model_validate (data )
        except Exception as e :
            results .append ({"row":row_no ,"ok":False ,"error":f"Validation error: {e }"})
            continue 
        try :
            created =await crud .create_category (db ,c_schema )
            results .append ({"row":row_no ,"ok":True ,"category_id":created .id ,"user_id":user_id })
        except ValueError as e :
            results .append ({"row":row_no ,"ok":False ,"error":str (e )})
        except Exception as e :
            results .append ({"row":row_no ,"ok":False ,"error":f"Unexpected error: {e }"})

    return {"results":results }
