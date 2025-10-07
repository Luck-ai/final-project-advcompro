from fastapi import APIRouter ,Depends ,HTTPException ,UploadFile ,File ,Form 
from sqlalchemy .ext .asyncio import AsyncSession 
from typing import List ,Optional 
from ..utils .csv_upload import CSVUploadError ,read_csv_rows 
from datetime import datetime 
from ..import models ,schemas ,crud 
from ..database import get_db 
from ..security import get_current_user 
from sqlalchemy import select 
from sqlalchemy import func 

router =APIRouter (prefix ="/sales",tags =["sales"])




@router .post ("/",response_model =schemas .ProductSaleOut )
async def record_sale (
sale :schemas .ProductSaleCreate ,
product_id :int ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user ),
):

    product =await db .get (models .Product ,product_id )
    if not product :
        raise HTTPException (status_code =404 ,detail ="Product not found")
    if product .quantity <sale .quantity :
        raise HTTPException (status_code =400 ,detail ="Insufficient stock")

    db_sale =models .ProductSale (
    product_id =product_id ,
    user_id =current_user .id ,
    quantity =sale .quantity ,
    sale_price =product .price ,
    sale_date =sale .sale_date or datetime .now ()
    )
    db .add (db_sale )
    await db .flush ()

    quantity_before =product .quantity 
    await crud .record_stock_movement_crud (
    db =db ,
    product =product ,
    movement_type ="sale",
    quantity_change =-sale .quantity ,
    user_id =current_user .id ,
    reference_id =db_sale .id ,
    reference_type ="sale",
    notes =f"Sale of {sale .quantity } units at ${product .price } each",
    transaction_date =sale .sale_date ,
    quantity_before =quantity_before 
    )
    product .quantity =quantity_before -sale .quantity 

    await db .commit ()
    await db .refresh (db_sale )
    return db_sale 


@router .get ("/",response_model =List [schemas .ProductSaleOut ])
async def list_sales (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    stmt =select (models .ProductSale ).where (models .ProductSale .user_id ==current_user .id )
    result =await db .execute (stmt )
    return result .scalars ().all ()


@router .get ("/product/{product_id}",response_model =List [schemas .ProductSaleOut ])
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


@router .post ("/upload")
async def upload_sales_csv (
file :UploadFile =File (...),
product_id :Optional [int ]=Form (None ),
sku :Optional [str ]=Form (None ),
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user ),
):

    if not file .filename .endswith ('.csv'):
        raise HTTPException (status_code =400 ,detail ="File must be a CSV")

    try :
        rows =await read_csv_rows (file )
    except CSVUploadError as exc :
        raise HTTPException (status_code =400 ,detail =str (exc ))

    sales_created =0 
    errors :List [str ]=[]
    total_rows =len (rows )

    try :
        for row_no ,row in rows :
            cleaned_row ={
            (k .strip ()if isinstance (k ,str )else k ):
            (v .strip ()if isinstance (v ,str )else v )
            for k ,v in row .items ()
            }

            try :
                row_product_id =None 
                row_sku =(
                cleaned_row .get ('sku')
                or cleaned_row .get ('SKU')
                or cleaned_row .get ('Sku')
                or cleaned_row .get ('sku_id')
                or cleaned_row .get ('SKU_ID')
                or cleaned_row .get ('product_sku')
                or cleaned_row .get ('productSKU')
                )
                if row_sku :
                    product_obj =await crud .get_product_by_sku (db ,row_sku ,current_user .id )
                    if not product_obj :
                        errors .append (f"Row {row_no }: Product with SKU '{row_sku }' not found for user")
                        continue 
                    row_product_id =product_obj .id 
                elif product_id :
                    row_product_id =product_id 
                elif sku :
                    product_obj =await crud .get_product_by_sku (db ,sku ,current_user .id )
                    if not product_obj :
                        errors .append (f"Row {row_no }: Product with SKU '{sku }' not found for user (form sku)")
                        continue 
                    row_product_id =product_obj .id 
                else :
                    errors .append (f"Row {row_no }: No SKU in CSV and no product_id/sku provided in upload request")
                    continue 

                if not cleaned_row .get ('quantity'):
                    errors .append (f"Row {row_no }: Missing 'quantity' column")
                    continue 

                try :
                    quantity =int (cleaned_row ['quantity'])
                except (ValueError ,TypeError ):
                    errors .append (f"Row {row_no }: Invalid quantity '{cleaned_row ['quantity']}' - must be a number")
                    continue 

                if quantity <=0 :
                    errors .append (f"Row {row_no }: Quantity must be positive, got {quantity }")
                    continue 

                sale_date =None 
                date_field =cleaned_row .get ('sale_date')or cleaned_row .get ('date')
                if date_field :
                    try :
                        sale_date =datetime .fromisoformat (date_field .replace ('Z','+00:00'))
                    except ValueError :
                        for fmt in ('%Y-%m-%d','%m/%d/%Y','%d/%m/%Y'):
                            try :
                                sale_date =datetime .strptime (date_field ,fmt )
                                break 
                            except ValueError :
                                continue 
                        if sale_date is None :
                            errors .append (f"Row {row_no }: Invalid date format '{date_field }'. Use YYYY-MM-DD format.")
                            continue 

                product =await db .get (models .Product ,row_product_id )
                if not product :
                    errors .append (f"Row {row_no }: Product with ID {row_product_id } not found")
                    continue 

                if product .quantity <quantity :
                    errors .append (f"Row {row_no }: Insufficient stock (available: {product .quantity }, requested: {quantity })")
                    continue 

                db_sale =models .ProductSale (
                product_id =row_product_id ,
                user_id =current_user .id ,
                quantity =quantity ,
                sale_price =product .price ,
                sale_date =sale_date or datetime .now ()
                )
                db .add (db_sale )
                await db .flush ()

                quantity_before =product .quantity 
                await crud .record_stock_movement_crud (
                db =db ,
                product =product ,
                movement_type ="sale",
                quantity_change =-quantity ,
                user_id =current_user .id ,
                reference_id =db_sale .id ,
                reference_type ="sale",
                notes =f"CSV upload sale of {quantity } units at ${product .price } each",
                transaction_date =sale_date ,
                quantity_before =quantity_before 
                )
                product .quantity =quantity_before -quantity 

                sales_created +=1 

            except (ValueError ,KeyError )as e :
                errors .append (f"Row {row_no }: Invalid data - {str (e )}")
                continue 
            except Exception as e :
                errors .append (f"Row {row_no }: Unexpected error - {str (e )}")
                continue 

        await db .commit ()
    except HTTPException :
        raise 
    except Exception as e :
        await db .rollback ()
        raise HTTPException (status_code =500 ,detail =f"Error processing CSV: {str (e )}")

    return {
    "message":f"Successfully uploaded {sales_created } sales records",
    "sales_created":sales_created ,
    "errors":errors ,
    "total_rows_processed":total_rows 
    }



@router .get ("/summary")
async def sales_summary (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Return aggregated sales summary (total revenue and total units sold) for the current user."""

    stmt =select (
    func .coalesce (func .sum (models .ProductSale .sale_price *models .ProductSale .quantity ),0 ).label ('total_revenue'),
    func .coalesce (func .sum (models .ProductSale .quantity ),0 ).label ('total_units')
    ).where (models .ProductSale .user_id ==current_user .id )

    result =await db .execute (stmt )
    row =result .first ()
    total_revenue =float (row .total_revenue )if row and row .total_revenue is not None else 0.0 
    total_units =int (row .total_units )if row and row .total_units is not None else 0 


    top_cat_stmt =(
    select (
    models .ProductCategory .name .label ('category_name'),
    func .coalesce (func .sum (models .ProductSale .quantity ),0 ).label ('units')
    )
    .select_from (models .ProductSale )
    .join (models .Product ,models .Product .id ==models .ProductSale .product_id )
    .join (models .ProductCategory ,models .ProductCategory .id ==models .Product .category_id )
    .where (models .ProductSale .user_id ==current_user .id )
    .group_by (models .ProductCategory .id )
    .order_by (func .sum (models .ProductSale .quantity ).desc ())
    .limit (1 )
    )
    top_result =await db .execute (top_cat_stmt )
    top_row =top_result .first ()
    top_category =top_row .category_name if top_row and top_row .category_name else None 

    return {
    "total_revenue":total_revenue ,
    "total_units":total_units ,
    "top_category":top_category ,
    }
