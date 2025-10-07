from sqlalchemy .ext .asyncio import AsyncSession 
from .import models ,schemas 
from sqlalchemy import select ,delete 
from sqlalchemy .exc import IntegrityError 
from sqlalchemy .orm import selectinload 
from typing import List ,Optional 
from datetime import datetime 


async def get_category_by_name (db :AsyncSession ,name :str ,user_id :int )->Optional [models .ProductCategory ]:
    """Get category by name for a specific user"""
    stmt =select (models .ProductCategory ).where (
    models .ProductCategory .name ==name ,
    models .ProductCategory .user_id ==user_id 
    )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def get_supplier_by_name (db :AsyncSession ,name :str ,user_id :int )->Optional [models .Supplier ]:
    """Get supplier by name for a specific user"""
    stmt =select (models .Supplier ).where (
    models .Supplier .name ==name ,
    models .Supplier .user_id ==user_id 
    )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def record_stock_movement_crud (
db :AsyncSession ,
product :models .Product ,
movement_type :str ,
quantity_change :int ,
user_id :Optional [int ]=None ,
reference_id :Optional [int ]=None ,
reference_type :Optional [str ]=None ,
notes :Optional [str ]=None ,
transaction_date :Optional [datetime ]=None ,
quantity_before :Optional [int ]=None 
):
    """Helper function to record stock movements in crud operations"""
    if quantity_before is None :
        quantity_before =product .quantity -quantity_change 
        quantity_after =product .quantity 
    else :
        quantity_after =quantity_before +quantity_change 

    if transaction_date is None :
        transaction_date =datetime .now ()

    movement =models .StockMovement (
    product_id =product .id ,
    user_id =user_id ,
    movement_type =movement_type ,
    quantity_change =quantity_change ,
    quantity_before =quantity_before ,
    quantity_after =quantity_after ,
    reference_id =reference_id ,
    reference_type =reference_type ,
    notes =notes ,
    transaction_date =transaction_date 
    )

    db .add (movement )
    return movement 


async def get_product_by_sku (db :AsyncSession ,sku :str ,user_id :Optional [int ]=None )->Optional [models .Product ]:
    """Lookup a product by SKU. If user_id provided, scope lookup to that user."""
    if not sku :
        return None 
    stmt =select (models .Product ).where (models .Product .sku ==sku )
    if user_id is not None :
        stmt =stmt .where (models .Product .user_id ==user_id )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def get_product (db :AsyncSession ,product_id :int ,user_id :Optional [int ]=None )->Optional [models .Product ]:
    stmt =select (models .Product ).where (models .Product .id ==product_id )
    if user_id is not None :
        stmt =stmt .where (models .Product .user_id ==user_id )
    stmt =stmt .options (
    selectinload (models .Product .supplier ),
    selectinload (models .Product .category ),
    )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def get_products (db :AsyncSession ,skip :int =0 ,limit :int =100 ,user_id :Optional [int ]=None )->List [models .Product ]:
    stmt =select (models .Product )
    if user_id is not None :
        stmt =stmt .where (models .Product .user_id ==user_id )
    stmt =stmt .options (
    selectinload (models .Product .supplier ),
    selectinload (models .Product .category ),
    ).offset (skip ).limit (limit )
    result =await db .execute (stmt )
    return result .scalars ().all ()


async def create_product (db :AsyncSession ,product :schemas .ProductCreate )->models .Product :
    data =product .model_dump ()

    sku =data .get ("sku")
    user_id =data .get ("user_id")
    if sku and user_id :
        stmt =select (models .Product ).where (
        models .Product .sku ==sku ,
        models .Product .user_id ==user_id 
        )
        result =await db .execute (stmt )
        if result .scalars ().first ():
            raise ValueError ("SKU already exists for this user")
    db_product =models .Product (**data )
    db .add (db_product )
    try :
        await db .commit ()
        await db .refresh (db_product )
    except IntegrityError as e :

        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )

        if 'sku'in msg .lower ():
            raise ValueError ("SKU already exists for this user")

        raise ValueError (f"Database integrity error: {msg }")

    stmt =select (models .Product ).where (models .Product .id ==db_product .id ).options (
    selectinload (models .Product .supplier ),
    selectinload (models .Product .category ),
    )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def create_category (db :AsyncSession ,category :schemas .ProductCategoryCreate )->models .ProductCategory :
    data =category .model_dump ()

    stmt =select (models .ProductCategory ).where (models .ProductCategory .name ==data .get ('name'))
    if data .get ('user_id')is not None :
        stmt =stmt .where (models .ProductCategory .user_id ==data .get ('user_id'))
    result =await db .execute (stmt )
    if result .scalars ().first ():
        raise ValueError ('Category name already exists')
    db_cat =models .ProductCategory (**data )

    if data .get ('user_id')is not None :
        db_cat .user_id =data .get ('user_id')
    db .add (db_cat )
    try :
        await db .commit ()
        await db .refresh (db_cat )
    except IntegrityError as e :
        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )
        if 'name'in msg .lower ():
            raise ValueError ('Category name already exists')
        raise ValueError (f"Database integrity error: {msg }")
    return db_cat 


async def create_supplier (db :AsyncSession ,supplier :schemas .SupplierCreate )->models .Supplier :
    data =supplier .model_dump ()

    stmt =select (models .Supplier ).where (models .Supplier .name ==data .get ('name'))
    if data .get ('user_id')is not None :
        stmt =stmt .where (models .Supplier .user_id ==data .get ('user_id'))
    result =await db .execute (stmt )
    if result .scalars ().first ():
        raise ValueError ('Supplier name already exists')
    db_sup =models .Supplier (**data )

    if data .get ('user_id')is not None :
        db_sup .user_id =data .get ('user_id')
    db .add (db_sup )
    try :
        await db .commit ()
        await db .refresh (db_sup )
    except IntegrityError as e :
        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )
        if 'name'in msg .lower ():
            raise ValueError ('Supplier name already exists')
        raise ValueError (f"Database integrity error: {msg }")
    return db_sup 


async def update_product (db :AsyncSession ,product_id :int ,updates :schemas .ProductUpdate ,user_id :Optional [int ]=None )->Optional [models .Product ]:

    stmt =select (models .Product ).where (models .Product .id ==product_id )
    if user_id is not None :
        stmt =stmt .where (models .Product .user_id ==user_id )
    stmt =stmt .options (
    selectinload (models .Product .supplier ),
    selectinload (models .Product .category ),
    )
    result =await db .execute (stmt )
    db_product =result .scalars ().first ()
    if not db_product :
        return None 

    updated_items =updates .model_dump (exclude_unset =True )


    old_quantity =db_product .quantity 
    new_quantity =updated_items .get ('quantity',old_quantity )
    quantity_change =new_quantity -old_quantity 


    if 'supplier_id'in updated_items and updated_items .get ('supplier_id')is not None :
        stmt =select (models .Supplier ).where (models .Supplier .id ==updated_items .get ('supplier_id'))
        if user_id is not None :
            stmt =stmt .where (models .Supplier .user_id ==user_id )
        result =await db .execute (stmt )
        if not result .scalars ().first ():
            raise ValueError ('Invalid supplier_id')
    if 'category_id'in updated_items and updated_items .get ('category_id')is not None :
        stmt =select (models .ProductCategory ).where (models .ProductCategory .id ==updated_items .get ('category_id'))
        if user_id is not None :
            stmt =stmt .where (models .ProductCategory .user_id ==user_id )
        result =await db .execute (stmt )
        if not result .scalars ().first ():
            raise ValueError ('Invalid category_id')

    if "sku"in updated_items :
        new_sku =updated_items .get ("sku")
        if new_sku :
            stmt =select (models .Product ).where (
            models .Product .sku ==new_sku ,
            models .Product .id !=product_id ,
            models .Product .user_id ==user_id 
            )
            result =await db .execute (stmt )
            if result .scalars ().first ():
                raise ValueError ("SKU already exists for this user")


    for k ,v in updated_items .items ():
        setattr (db_product ,k ,v )


    if quantity_change !=0 :
        movement_type ="adjustment"
        notes =f"Manual {movement_type } via product edit: {abs (quantity_change )} units"

        await record_stock_movement_crud (
        db =db ,
        product =db_product ,
        movement_type =movement_type ,
        quantity_change =quantity_change ,
        user_id =user_id ,
        reference_type ="product_edit",
        notes =notes 
        )

    db .add (db_product )
    try :
        await db .commit ()
        await db .refresh (db_product )
    except IntegrityError as e :
        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )
        if 'sku'in msg .lower ():
            raise ValueError ("SKU already exists for this user")
        raise ValueError (f"Database integrity error: {msg }")
    stmt =select (models .Product ).where (models .Product .id ==db_product .id ).options (
    selectinload (models .Product .supplier ),
    selectinload (models .Product .category ),
    )
    result =await db .execute (stmt )
    return result .scalars ().first ()


async def delete_product (db :AsyncSession ,product_id :int ,user_id :Optional [int ]=None )->bool :

    if user_id is not None :
        stmt =select (models .Product ).where (models .Product .id ==product_id ,models .Product .user_id ==user_id )
    else :
        stmt =select (models .Product ).where (models .Product .id ==product_id )
    result =await db .execute (stmt )
    db_product =result .scalars ().first ()
    if not db_product :
        return False 
    await db .delete (db_product )
    await db .commit ()
    return True 


async def delete_all_products (db :AsyncSession ,user_id :Optional [int ]=None )->int :
    """Delete all products optionally scoped to a user. Returns number deleted."""

    if user_id is not None :
        stmt =select (models .Product .id ).where (models .Product .user_id ==user_id )
    else :
        stmt =select (models .Product .id )
    result =await db .execute (stmt )
    product_ids =result .scalars ().all ()
    if not product_ids :
        return 0 



    await db .execute (delete (models .ProductSale ).where (models .ProductSale .product_id .in_ (product_ids )))
    await db .execute (delete (models .StockMovement ).where (models .StockMovement .product_id .in_ (product_ids )))
    await db .execute (delete (models .PurchaseOrder ).where (models .PurchaseOrder .product_id .in_ (product_ids )))


    await db .execute (delete (models .Product ).where (models .Product .id .in_ (product_ids )))
    await db .commit ()
    return len (product_ids )


async def delete_category (db :AsyncSession ,category_id :int ,user_id :Optional [int ]=None )->bool :

    stmt =select (models .ProductCategory ).where (models .ProductCategory .id ==category_id )
    if user_id is not None :
        stmt =stmt .where (models .ProductCategory .user_id ==user_id )
    result =await db .execute (stmt )
    db_cat =result .scalars ().first ()
    if not db_cat :
        return False 



    stmt =select (models .Product ).where (models .Product .category_id ==category_id )
    result =await db .execute (stmt )
    if result .scalars ().first ():
        raise ValueError ('Category has products and cannot be deleted')
    await db .delete (db_cat )
    await db .commit ()
    return True 


async def delete_all_categories (db :AsyncSession ,user_id :Optional [int ]=None )->dict :
    """Attempt to delete all categories owned by user (or all). Returns summary."""
    if user_id is not None :
        stmt =select (models .ProductCategory ).where (models .ProductCategory .user_id ==user_id )
    else :
        stmt =select (models .ProductCategory )
    result =await db .execute (stmt )
    cats =result .scalars ().all ()
    deleted =0 
    failed :list [dict ]=[]
    for c in cats :
        try :

            await delete_category (db ,c .id ,user_id )
            deleted +=1 
        except ValueError as e :
            failed .append ({"id":c .id ,"name":getattr (c ,'name',None ),"error":str (e )})
    return {"deleted":deleted ,"failed":failed }


async def delete_supplier (db :AsyncSession ,supplier_id :int ,user_id :Optional [int ]=None )->bool :
    stmt =select (models .Supplier ).where (models .Supplier .id ==supplier_id )
    if user_id is not None :
        stmt =stmt .where (models .Supplier .user_id ==user_id )
    result =await db .execute (stmt )
    db_sup =result .scalars ().first ()
    if not db_sup :
        return False 



    stmt =select (models .Product ).where (models .Product .supplier_id ==supplier_id )
    result =await db .execute (stmt )
    if result .scalars ().first ():
        raise ValueError ('Supplier has products and cannot be deleted')
    await db .delete (db_sup )
    await db .commit ()
    return True 


async def delete_all_suppliers (db :AsyncSession ,user_id :Optional [int ]=None )->dict :
    """Attempt to delete all suppliers owned by user (or all). Returns summary."""
    if user_id is not None :
        stmt =select (models .Supplier ).where (models .Supplier .user_id ==user_id )
    else :
        stmt =select (models .Supplier )
    result =await db .execute (stmt )
    sups =result .scalars ().all ()
    deleted =0 
    failed :list [dict ]=[]
    for s in sups :
        try :
            await delete_supplier (db ,s .id ,user_id )
            deleted +=1 
        except ValueError as e :
            failed .append ({"id":s .id ,"name":getattr (s ,'name',None ),"error":str (e )})
    return {"deleted":deleted ,"failed":failed }


async def update_category (db :AsyncSession ,category_id :int ,updates :schemas .ProductCategoryCreate ,user_id :Optional [int ]=None )->Optional [models .ProductCategory ]:
    stmt =select (models .ProductCategory ).where (models .ProductCategory .id ==category_id )
    if user_id is not None :
        stmt =stmt .where (models .ProductCategory .user_id ==user_id )
    result =await db .execute (stmt )
    db_cat =result .scalars ().first ()
    if not db_cat :
        return None 
    updated =updates .model_dump (exclude_unset =True )
    for k ,v in updated .items ():
        setattr (db_cat ,k ,v )
    db .add (db_cat )
    try :
        await db .commit ()
        await db .refresh (db_cat )
    except IntegrityError as e :
        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )
        if 'name'in msg .lower ():
            raise ValueError ('Category name already exists')
        raise ValueError (f"Database integrity error: {msg }")
    return db_cat 


async def update_supplier (db :AsyncSession ,supplier_id :int ,updates :schemas .SupplierCreate ,user_id :Optional [int ]=None )->Optional [models .Supplier ]:
    stmt =select (models .Supplier ).where (models .Supplier .id ==supplier_id )
    if user_id is not None :
        stmt =stmt .where (models .Supplier .user_id ==user_id )
    result =await db .execute (stmt )
    db_sup =result .scalars ().first ()
    if not db_sup :
        return None 
    updated =updates .model_dump (exclude_unset =True )
    for k ,v in updated .items ():
        setattr (db_sup ,k ,v )
    db .add (db_sup )
    try :
        await db .commit ()
        await db .refresh (db_sup )
    except IntegrityError as e :
        await db .rollback ()
        msg =str (e .orig )if getattr (e ,'orig',None )else str (e )
        if 'name'in msg .lower ():
            raise ValueError ('Supplier name already exists')
        raise ValueError (f"Database integrity error: {msg }")
    return db_sup 
