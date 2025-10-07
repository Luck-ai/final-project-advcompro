from fastapi import APIRouter ,Depends ,HTTPException ,UploadFile ,File 
from sqlalchemy .ext .asyncio import AsyncSession 
from typing import List 
from sqlalchemy import select 
from ..import crud ,schemas 
from ..database import get_db 
from ..security import get_current_user 
from ..import models 
from ..utils .csv_upload import CSVUploadError ,read_csv_rows 


router =APIRouter (prefix ="/products",tags =["products"])


@router .post ("/",response_model =schemas .ProductOut )
async def create_product (product :schemas .ProductCreate ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    try :
        user_id =current_user .id 
        data =product .model_dump ()
        data ['user_id']=user_id 
        p_schema =schemas .ProductCreate .model_validate (data )
        return await crud .create_product (db ,p_schema )
    except ValueError as e :
        raise HTTPException (status_code =400 ,detail =str (e ))


@router .get ("/",response_model =List [schemas .ProductOut ])
async def list_products (skip :int =0 ,limit :int =100 ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    return await crud .get_products (db ,skip =skip ,limit =limit ,user_id =current_user .id )


@router .delete ("/all")
async def delete_all_products (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Delete all products for the current user."""
    count =await crud .delete_all_products (db ,user_id =current_user .id )
    return {"deleted":count }


@router .get ("/{product_id}",response_model =schemas .ProductOut )
async def get_product (product_id :int ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    p =await crud .get_product (db ,product_id ,user_id =current_user .id )
    if not p :
        raise HTTPException (status_code =404 ,detail ="Product not found")
    return p 


@router .put ("/{product_id}",response_model =schemas .ProductOut )
async def update_product (product_id :int ,updates :schemas .ProductUpdate ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    try :
        p =await crud .update_product (db ,product_id ,updates ,user_id =current_user .id )
    except ValueError as e :
        raise HTTPException (status_code =400 ,detail =str (e ))
    if not p :
        raise HTTPException (status_code =404 ,detail ="Product not found")
    return p 


@router .delete ("/{product_id}")
async def delete_product (product_id :int ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    ok =await crud .delete_product (db ,product_id ,user_id =current_user .id )
    if not ok :
        raise HTTPException (status_code =404 ,detail ="Product not found")
    return {"ok":True }


@router .post ("/upload")
async def upload_products_csv (file :UploadFile =File (...),db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Upload a CSV file (bytes) containing product rows. Returns per-row results.

    Expected CSV headers (any order): name, sku, category, description, price, quantity, low_stock_threshold, supplier
    
    Note: category and supplier are names (not IDs) and must exist for the current user.
    If a category or supplier name doesn't exist, an error will be raised for that row.
    """
    user_id =current_user .id 

    try :
        rows =await read_csv_rows (file )
    except CSVUploadError as exc :
        raise HTTPException (status_code =400 ,detail =str (exc ))

    results =[]
    for row_no ,row in rows :
        data =dict (row )

        bad =False 
        for int_field in ['price','quantity','low_stock_threshold']:
            if data .get (int_field )is not None :
                try :
                    data [int_field ]=int (float (data [int_field ]))
                except Exception :
                    results .append ({"row":row_no ,"ok":False ,"error":f"Invalid integer for {int_field }: {data .get (int_field )}"})
                    bad =True 
                    break 
        if bad :
            continue 

        category_id =None 
        supplier_id =None 

        if data .get ('category'):
            category =await crud .get_category_by_name (db ,data ['category'],user_id )
            if not category :
                results .append ({"row":row_no ,"ok":False ,"error":f"Category '{data ['category']}' not found for current user"})
                continue 
            category_id =category .id 

        if data .get ('supplier'):
            supplier =await crud .get_supplier_by_name (db ,data ['supplier'],user_id )
            if not supplier :
                results .append ({"row":row_no ,"ok":False ,"error":f"Supplier '{data ['supplier']}' not found for current user"})
                continue 
            supplier_id =supplier .id 

        product_data ={
        'name':data .get ('name'),
        'sku':data .get ('sku'),
        'category_id':category_id ,
        'description':data .get ('description'),
        'price':data .get ('price'),
        'quantity':data .get ('quantity',0 ),
        'low_stock_threshold':data .get ('low_stock_threshold',0 ),
        'supplier_id':supplier_id ,
        'user_id':user_id 
        }

        try :
            p_schema =schemas .ProductCreate .model_validate (product_data )
        except Exception as e :
            results .append ({"row":row_no ,"ok":False ,"error":f"Validation error: {e }"})
            continue 

        try :
            created =await crud .create_product (db ,p_schema )
            results .append ({"row":row_no ,"ok":True ,"product_id":created .id })
        except ValueError as e :
            results .append ({"row":row_no ,"ok":False ,"error":str (e )})
        except Exception as e :
            results .append ({"row":row_no ,"ok":False ,"error":f"Unexpected error: {e }"})

    return {"results":results }


@router .get ("/{product_id}/sales",response_model =List [schemas .ProductSaleOut ])
async def get_product_sales (
product_id :int ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user ),
):
    """Get all sales for a specific product"""

    product =await db .get (models .Product ,product_id )
    if not product :
        raise HTTPException (status_code =404 ,detail ="Product not found")

    stmt =select (models .ProductSale ).where (
    models .ProductSale .product_id ==product_id ,
    models .ProductSale .user_id ==current_user .id 
    ).order_by (models .ProductSale .sale_date .desc ())
    result =await db .execute (stmt )
    return result .scalars ().all ()


@router .get ("/{product_id}/stock-movements",response_model =List [schemas .StockMovementOut ])
async def get_product_stock_movements (
product_id :int ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user ),
):
    """Get all stock movements for a specific product"""

    product =await db .get (models .Product ,product_id )
    if not product :
        raise HTTPException (status_code =404 ,detail ="Product not found")

    stmt =select (models .StockMovement ).where (
    models .StockMovement .product_id ==product_id ,
    models .StockMovement .user_id ==current_user .id 
    ).order_by (models .StockMovement .created_at .desc ())
    result =await db .execute (stmt )
    return result .scalars ().all ()
    return result .scalars ().all ()
