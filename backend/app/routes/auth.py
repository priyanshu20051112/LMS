from flask import Flask,request,Blueprint,redirect,jsonify,current_app
from app.db import get_connection
from datetime import datetime,timedelta
import jwt

auth = Blueprint("auth",__name__)
def get_user_by_moodle_id(moodle_id,password):
    conn=get_connection()
    cursor=conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id,password FROM Users WHERE id=%s AND password = %s",(moodle_id,password)
    )
    user=cursor.fetchone()
    conn.close()
    return user
def TokenGenerator(moodle_id,):
        token = jwt.encode(
        {
            "moodle_id": moodle_id,
            "exp":datetime.utcnow()+timedelta(hours=8)
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )
        return token
def username(moodle_id):
     conn = get_connection()
     cursor = conn.cursor(dictionary=True)
     cursor.execute(
          "SELECT fullname FROM users WHERE id=%s",(moodle_id,)
     )
     user = cursor.fetchone()
     conn.close()
     return user["fullname"] if user else None


@auth.route("/login",methods=["POST"])
def login ():
    data=request.get_json()
    if not data:
        return jsonify(
            {
                "success":False,
                "message": "data not recived"
            }
        ),400
    moodle_id= data.get("moodle_id", "")
    password=data.get("password", "")
    
    if not moodle_id or not password:
        return jsonify(
            {
                "success":False,
                "message":"missing fields"
            }
        ),400
    
    if moodle_id=="28106191" and password=="28106191@APSHAH":
        token=TokenGenerator(moodle_id="28106191")
        return jsonify(
            {
                "success":True,
                "message":"admin login",
                "token":token,
                "role":"admin"
            }
        ),200
    
    
    user=get_user_by_moodle_id(moodle_id,password)
    if not user :
        return jsonify(
            {
                "success":False,
                "message":"invalid credientials"
            }
        ),401
    token=TokenGenerator(moodle_id)
    name= username(moodle_id)
    return jsonify(
            {
                "success":True,
                "username":name,
                "message":"correct credientials",
                "token":token,
                "role":"user"
            }
        ),200