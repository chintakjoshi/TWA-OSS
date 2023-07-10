import snowflake.connector
from tkinter import *

def connect_to_database():
    try:
        con_eb = snowflake.connector.connect(
            user='NavyaNelluri',
            password='Navya.c@698',
            account='ujlmjrs-rx06772.snowflakecomputing.com',
            database='PROJECT_TWA',
            schema='PROJECT_TWA_SCHEMA'
        )
        return con_eb
    except Exception as e:
        print(str(e))
        return None

def fetch_details():
    con_eb = connect_to_database()
    if con_eb is not None:
        cursor = con_eb.cursor()
        jobSeeker_result = fetch_job_seekers(cursor)
        JobDetails_result = fetch_job_details(cursor)
        cursor.close()
        con_eb.close()

        if jobSeeker_result and JobDetails_result:
            # Display the job seeker and job details
            print("Job Seeker: ", jobSeeker_result)
            print("Job Details: ", JobDetails_result)
        else:
            print("No data found.")

def fetch_job_seekers(cursor):
    cursor.execute("SELECT * FROM PROJECT_TWA.PROJECT_TWA_SCHEMA.JobSeeker")
    return cursor.fetchall()

def fetch_job_details(cursor):
    cursor.execute("SELECT * FROM PROJECT_TWA.PROJECT_TWA_SCHEMA.JOBDETAILS")
    return cursor.fetchall()

master = Tk()
master.geometry("400x300")
master.title("Project_TWA")

fetch_button = Button(master, text="Fetch Details", command=fetch_details)
fetch_button.pack()

mainloop()
