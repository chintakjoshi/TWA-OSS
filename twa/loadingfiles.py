import snowflake.connector
from tkinter import *

def connect_to_database():
    try:
        connection = snowflake.connector.connect(
            user='NavyaNelluri',
            password='Navya.c@698',
            account='ujlmjrs-rx06772.snowflakecomputing.com',
            database='PROJECT_TWA',
            schema='PROJECT_TWA_SCHEMA'
        )
        return connection
    except Exception as e:
        print(str(e))
        return None

def fetch_details():
    connection = connect_to_database()
    if connection is not None:
        cursor = connection.cursor()
        jobSeeker_result = fetch_job_seekers(cursor)
        jobDetails_result = fetch_job_details(cursor)
        cursor.close()
        connection.close()

        if jobSeeker_result and jobDetails_result:
            # Display the job seeker and job details
            print("Job Seeker: ", jobSeeker_result)
            print("Job Details: ", jobDetails_result)
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
