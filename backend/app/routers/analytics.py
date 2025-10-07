from fastapi import APIRouter ,Depends ,HTTPException 
from sqlalchemy .ext .asyncio import AsyncSession 
from sqlalchemy import select ,func 
from ..import models 
from ..database import get_db 
from ..security import get_current_user 
from datetime import datetime ,timedelta 
import calendar 

router =APIRouter (prefix ="/analytics",tags =["analytics"])


@router .get ('/categories-revenue')
async def categories_revenue (db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Return revenue, units sold and inventory aggregated by category for the current user."""

    stmt =(
    select (
    models .ProductCategory .id .label ('category_id'),
    models .ProductCategory .name .label ('category'),
    func .coalesce (func .sum (models .ProductSale .sale_price *models .ProductSale .quantity ),0 ).label ('revenue'),
    func .coalesce (func .sum (models .ProductSale .quantity ),0 ).label ('sales_units')
    )
    .select_from (models .ProductSale )
    .join (models .Product ,models .Product .id ==models .ProductSale .product_id )
    .join (models .ProductCategory ,models .ProductCategory .id ==models .Product .category_id )
    .where (models .ProductSale .user_id ==current_user .id )
    .group_by (models .ProductCategory .id )
    )

    result =await db .execute (stmt )
    rows =result .all ()


    inv_stmt =(
    select (
    models .ProductCategory .id .label ('category_id'),
    func .coalesce (func .sum (models .Product .quantity ),0 ).label ('inventory')
    )
    .select_from (models .Product )
    .join (models .ProductCategory ,models .ProductCategory .id ==models .Product .category_id )
    .where (models .Product .user_id ==current_user .id )
    .group_by (models .ProductCategory .id )
    )
    inv_res =await db .execute (inv_stmt )
    inv_rows ={r .category_id :int (r .inventory )for r in inv_res .all ()}

    out =[]
    for r in rows :
        out .append ({
        'category_id':int (r .category_id ),
        'category':r .category ,
        'revenue':float (r .revenue )if r .revenue is not None else 0.0 ,
        'salesUnits':int (r .sales_units )if r .sales_units is not None else 0 ,
        'inventory':inv_rows .get (int (r .category_id ),0 )
        })



    cat_stmt =select (models .ProductCategory .id ,models .ProductCategory .name ).where (models .ProductCategory .user_id ==current_user .id )
    cat_res =await db .execute (cat_stmt )
    for cid ,cname in cat_res .all ():
        if not any (item ['category_id']==cid for item in out ):
            out .append ({
            'category_id':int (cid ),
            'category':cname ,
            'revenue':0.0 ,
            'salesUnits':0 ,
            'inventory':inv_rows .get (int (cid ),0 )
            })

    return out 


@router .get ('/inventory-trend')
async def inventory_trend (months :int =6 ,db :AsyncSession =Depends (get_db ),current_user :models .User =Depends (get_current_user )):
    """Return monthly inventory snapshots for the past `months` months (default 6)."""
    if months <1 :
        months =1 
    if months >24 :
        months =24 

    now =datetime .utcnow ()

    months_list =[]
    for i in range (months -1 ,-1 ,-1 ):

        y =now .year 
        m =now .month -i 

        while m <=0 :
            m +=12 
            y -=1 
        months_list .append ((y ,m ))

    out =[]
    sm =models .StockMovement 
    p =models .Product 
    ps =models .ProductSale 

    for (y ,m )in months_list :
        last_day =calendar .monthrange (y ,m )[1 ]
        month_start =datetime (y ,m ,1 )
        month_end =datetime (y ,m ,last_day ,23 ,59 ,59 )


        subq =(
        select (
        sm .product_id .label ('product_id'),
        sm .quantity_after .label ('quantity_after'),
        func .row_number ().over (partition_by =sm .product_id ,order_by =sm .transaction_date .desc ()).label ('rn')
        )
        .where (sm .transaction_date <=month_end ,sm .user_id ==current_user .id )
        ).subquery ()

        latest =select (subq .c .product_id ,subq .c .quantity_after ).where (subq .c .rn ==1 ).subquery ()


        stmt =(
        select (
        func .coalesce (func .sum (func .coalesce (latest .c .quantity_after ,p .quantity )*p .price ),0 ).label ('total_value'),
        func .coalesce (func .sum (func .coalesce (latest .c .quantity_after ,p .quantity )),0 ).label ('total_items')
        )
        .select_from (p )
        .outerjoin (latest ,latest .c .product_id ==p .id )
        .where (p .user_id ==current_user .id )
        )

        res =await db .execute (stmt )
        row =res .first ()
        total_value =float (row .total_value )if row and row .total_value is not None else 0.0 
        total_items =int (row .total_items )if row and row .total_items is not None else 0 


        sales_stmt =(
        select (func .coalesce (func .sum (ps .quantity ),0 ).label ('units_sold'))
        .where (ps .user_id ==current_user .id ,ps .sale_date >=month_start ,ps .sale_date <=month_end )
        )
        sales_res =await db .execute (sales_stmt )
        sold_row =sales_res .first ()
        units_sold =int (sold_row .units_sold )if sold_row and sold_row .units_sold is not None else 0 

        turnover =round ((units_sold /total_items )*100 )if total_items >0 else 0 

        out .append ({
        'yearMonth':f"{y }-{m :02d}",
        'totalValue':float (round (total_value ,2 )),
        'totalItems':int (total_items ),
        'unitsSold':int (units_sold ),
        'turnoverRate':int (turnover ),
        })

    return out 
