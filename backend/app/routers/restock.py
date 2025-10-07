from fastapi import APIRouter ,Depends ,HTTPException 
from sqlalchemy .ext .asyncio import AsyncSession 
from sqlalchemy import select ,and_ 
from sqlalchemy .orm import selectinload 
from typing import List 
from ..import crud ,schemas ,models 
import asyncio 
from ..routers .email import send_batch_order_summary 
from ..database import get_db 
from ..security import get_current_user 
import uuid 

router =APIRouter (prefix ="/restock",tags =["restock"])

@router .get ("/summary",response_model =schemas .RestockSummary )
async def get_restock_summary (
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Get summary statistics for restock dashboard"""


    pending_orders_stmt =select (models .PurchaseOrder ).where (
    and_ (
    models .PurchaseOrder .user_id ==current_user .id ,
    models .PurchaseOrder .status =='pending'
    )
    )
    pending_orders_result =await db .execute (pending_orders_stmt )
    pending_orders =pending_orders_result .scalars ().all ()
    pending_orders_count =len (pending_orders )


    total_pending_value =0 
    for order in pending_orders :
        product =await db .get (models .Product ,order .product_id )
        if product :
            total_pending_value +=(product .price )*order .quantity_ordered 


    low_stock_stmt =select (models .Product ).where (
    and_ (
    models .Product .user_id ==current_user .id ,
    models .Product .quantity <=models .Product .low_stock_threshold ,
    models .Product .quantity >0 
    )
    )
    low_stock_result =await db .execute (low_stock_stmt )
    low_stock_count =len (low_stock_result .scalars ().all ())


    out_of_stock_stmt =select (models .Product ).where (
    and_ (
    models .Product .user_id ==current_user .id ,
    models .Product .quantity ==0 
    )
    )
    out_of_stock_result =await db .execute (out_of_stock_stmt )
    out_of_stock_count =len (out_of_stock_result .scalars ().all ())

    return schemas .RestockSummary (
    pending_orders =pending_orders_count ,
    low_stock_items =low_stock_count ,
    out_of_stock_items =out_of_stock_count ,
    total_pending_value =float (total_pending_value )
    )





@router .get ("/orders",response_model =List [schemas .PurchaseOrderOut ])
async def get_purchase_orders (
status :str =None ,
skip :int =0 ,
limit :int =100 ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Get purchase order history, optionally filtered by status"""

    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    models .PurchaseOrder .user_id ==current_user .id 
    )

    if status :
        stmt =stmt .where (models .PurchaseOrder .status ==status )

    stmt =stmt .order_by (models .PurchaseOrder .order_date .desc ()).offset (skip ).limit (limit )

    result =await db .execute (stmt )
    orders =result .scalars ().all ()
    return orders 



@router .post ("/orders/batch",response_model =List [schemas .PurchaseOrderOut ])
async def create_purchase_orders_batch (
batch :schemas .PurchaseOrderBatchCreate ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Create multiple purchase orders in one transaction and send a single email summary for those that requested notification."""

    created_orders =[]

    batch_group_id =str (uuid .uuid4 ())

    try :
        for order in batch .orders :

            product =await db .get (models .Product ,order .product_id )
            if not product or product .user_id !=current_user .id :
                raise HTTPException (status_code =404 ,detail =f"Product {order .product_id } not found")

            if order .supplier_id :
                supplier =await db .get (models .Supplier ,order .supplier_id )
                if not supplier or supplier .user_id !=current_user .id :
                    raise HTTPException (status_code =404 ,detail =f"Supplier {order .supplier_id } not found")


            db_order =models .PurchaseOrder (
            user_id =current_user .id ,
            supplier_id =order .supplier_id ,
            product_id =order .product_id ,
            quantity_ordered =order .quantity_ordered ,
            status =order .status ,
            notes =order .notes ,
            notify_by_email =getattr (order ,'notify_by_email',False ),
            group_id =batch_group_id 
            )

            db .add (db_order )

            await db .flush ()
            await db .refresh (db_order )
            created_orders .append (db_order )


        await db .commit ()
    except Exception :

        try :
            await db .rollback ()
        except Exception :
            pass 
        raise 


    orders_with_rel =[]
    for o in created_orders :
        stmt =select (models .PurchaseOrder ).options (
        selectinload (models .PurchaseOrder .supplier ),
        selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
        selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
        ).where (models .PurchaseOrder .id ==o .id )
        res =await db .execute (stmt )
        orders_with_rel .append (res .scalar_one ())


    try :
        notify_orders =[o for o in orders_with_rel if getattr (o ,'notify_by_email',False )]
        if notify_orders and getattr (current_user ,'email',None ):
            asyncio .create_task (send_batch_order_summary (current_user .email ,notify_orders ,current_user .full_name ))
    except Exception :

        pass 

    return orders_with_rel 


@router .get ("/orders/{order_id}",response_model =schemas .PurchaseOrderOut )
async def get_purchase_order (
order_id :int ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Get a specific purchase order"""

    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    and_ (
    models .PurchaseOrder .id ==order_id ,
    models .PurchaseOrder .user_id ==current_user .id 
    )
    )

    result =await db .execute (stmt )
    order =result .scalar_one_or_none ()

    if not order :
        raise HTTPException (status_code =404 ,detail ="Purchase order not found")

    return order 


@router .put ("/orders/group/{group_id}",response_model =List [schemas .PurchaseOrderOut ])
async def update_orders_by_group (
group_id :str ,
order_update :schemas .PurchaseOrderUpdate ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Update all purchase orders in a group (useful for batch operations like marking all as completed)"""


    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    and_ (
    models .PurchaseOrder .group_id ==group_id ,
    models .PurchaseOrder .user_id ==current_user .id 
    )
    )

    result =await db .execute (stmt )
    orders =result .scalars ().all ()

    if not orders :
        raise HTTPException (status_code =404 ,detail ="No orders found in this group")


    update_data =order_update .model_dump (exclude_unset =True )
    for order in orders :
        for field ,value in update_data .items ():
            setattr (order ,field ,value )


        if order_update .status =="completed":
            product =await db .get (models .Product ,order .product_id )
            if product :
                old_quantity =product .quantity 
                product .quantity +=order .quantity_ordered 


                stock_movement =models .StockMovement (
                product_id =product .id ,
                user_id =current_user .id ,
                movement_type ='restock',
                quantity_change =order .quantity_ordered ,
                quantity_before =old_quantity ,
                quantity_after =product .quantity ,
                reference_id =order .id ,
                reference_type ='purchase_order',
                notes =f"Restock from purchase order #{order .id } (group {group_id })"
                )

                db .add (stock_movement )

    await db .commit ()



    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    and_ (
    models .PurchaseOrder .group_id ==group_id ,
    models .PurchaseOrder .user_id ==current_user .id 
    )
    ).order_by (models .PurchaseOrder .order_date .desc ())

    result =await db .execute (stmt )
    fresh_orders =result .scalars ().all ()
    return fresh_orders 


@router .put ("/orders/{order_id}",response_model =schemas .PurchaseOrderOut )
async def update_purchase_order (
order_id :int ,
order_update :schemas .PurchaseOrderUpdate ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Update a purchase order (e.g., mark as completed)"""


    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    and_ (
    models .PurchaseOrder .id ==order_id ,
    models .PurchaseOrder .user_id ==current_user .id 
    )
    )

    result =await db .execute (stmt )
    order =result .scalar_one_or_none ()

    if not order :
        raise HTTPException (status_code =404 ,detail ="Purchase order not found")


    update_data =order_update .model_dump (exclude_unset =True )
    for field ,value in update_data .items ():
        setattr (order ,field ,value )

    await db .commit ()
    await db .refresh (order )


    if order_update .status =="completed":
        product =await db .get (models .Product ,order .product_id )
        if product :
            old_quantity =product .quantity 
            product .quantity +=order .quantity_ordered 


            stock_movement =models .StockMovement (
            product_id =product .id ,
            user_id =current_user .id ,
            movement_type ='restock',
            quantity_change =order .quantity_ordered ,
            quantity_before =old_quantity ,
            quantity_after =product .quantity ,
            reference_id =order .id ,
            reference_type ='purchase_order',
            notes =f"Restock from purchase order #{order .id }"
            )

            db .add (stock_movement )
            await db .commit ()



    stmt =select (models .PurchaseOrder ).options (
    selectinload (models .PurchaseOrder .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .supplier ),
    selectinload (models .PurchaseOrder .product ).selectinload (models .Product .category )
    ).where (
    and_ (
    models .PurchaseOrder .id ==order .id ,
    models .PurchaseOrder .user_id ==current_user .id 
    )
    )

    result =await db .execute (stmt )
    fresh_order =result .scalar_one ()
    return fresh_order 


@router .delete ("/orders/{order_id}")
async def delete_purchase_order (
order_id :int ,
db :AsyncSession =Depends (get_db ),
current_user :models .User =Depends (get_current_user )
):
    """Delete a purchase order"""

    order =await db .get (models .PurchaseOrder ,order_id )
    if not order or order .user_id !=current_user .id :
        raise HTTPException (status_code =404 ,detail ="Purchase order not found")

    await db .delete (order )
    await db .commit ()

    return {"ok":True }