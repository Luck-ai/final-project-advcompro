import csv 
import io 
from typing import Dict ,List ,Optional ,Tuple 

from fastapi import UploadFile 


class CSVUploadError (RuntimeError ):
    """Raised when a CSV upload cannot be parsed."""


async def read_csv_rows (file :UploadFile )->List [Tuple [int ,Dict [str ,Optional [str ]]]]:
    """Return CSV rows paired with their 1-based line numbers (header counted as row 1)."""
    try :
        raw =await file .read ()
    except Exception as exc :
        raise CSVUploadError ("Unable to read uploaded file")from exc 
    try :
        stream =io .StringIO (raw .decode ("utf-8"))
    except Exception as exc :
        raise CSVUploadError ("Unable to decode uploaded file as UTF-8")from exc 

    reader =csv .DictReader (stream )
    if reader .fieldnames is None :
        raise CSVUploadError ("CSV file must have a header row")

    rows :List [Tuple [int ,Dict [str ,Optional [str ]]]]=[]
    for row_index ,row in enumerate (reader ,start =2 ):
        normalized ={
        key :(value if value not in ("",None )else None )
        for key ,value in row .items ()
        }
        rows .append ((row_index ,normalized ))
    return rows 
