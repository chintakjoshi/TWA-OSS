import snowflake.connector
from tkinter import *
from tkinter import ttk

# Connection to the database established with credentials
# encapsulating these credentials will be next task

try:
    con_eb = snowflake.connector.connect(user='NavyaNelluri',
                                         password='Navya.c@698',
                                         account='ujlmjrs-rx06772',
                                         database='PROJECT_TWA',
                                         schema="PROJECT_TWA_SCHEMA"
                                         )
except Exception as e:
    print(str(e))

cs = con_eb.cursor()
print(cs)
cs.execute("SELECT * FROM PROJECT_TWA.PROJECT_TWA_SCHEMA.JobSeeker")
jobSeeker_results = cs.fetchone()
print(jobSeeker_results)
cs.execute("SELECT * FROM PROJECT_TWA.PROJECT_TWA_SCHEMA.JOBDETAILS")
JobDetails_result = cs.fetchone()
print(JobDetails_result)


def option_selected(*args):
    selected_option = variable.get()
    if selected_option != "select jobseeker":
        label1.config(text="Selected Job Seeker: " + selected_option)
        label2.config(text="Available Jobs: " + JobDetails_result[4])
    else:
        label1.config(text="")
        label2.config(text="Sorry! No matching jobs")
def fetching_details(*args):
    master1 = Tk()
    master1.geometry("400x300")
    master1.title("Fetching Details")

    label_JsName = Label(master1, text="Please Select Job Seeker Name!", bg="lightgray", pady=10, font=("Arial", 12))
    label_JsName.pack()

    label1 = Label(master1, text="", font=("Arial", 12))
    label1.pack()

    label2 = Label(master1, text="", font=("Arial", 12))
    label2.pack()

    style = ttk.Style()
    style.configure('TMenubutton', background='white', font=("Arial", 10))

    variable = StringVar(master1)
    variable.set("select jobseeker")  # default value
    # variable.trace("w")

    def update_labels(*args):
        selected_option = variable.get()
        if selected_option != "select jobseeker":
            label1.config(text="Selected Job Seeker: " + jobSeeker_results[0])
            label2.config(text="Available Jobs: " + JobDetails_result[4])
        else:
            label1.config(text="")
            label2.config(text="Sorry! No matching jobs")

    variable.trace("w", update_labels)

    w = OptionMenu(master1, variable, jobSeeker_results[0])
    w.pack()

    master1.mainloop()

    master.withdraw()
    master.destroy()



master = Tk()
master.geometry("400x300")  # Set the default size to 400 pixels wide and 300 pixels high
master.title("Project_TWA")

#variable = StringVar(master)
#variable.set("select jobseeker")  # default value
#variable.trace("w", option_selected)

# Colors and spacing
master.configure(bg="lightgray")

label_info = Label(master, text="Select one of the categories below!", bg="lightgray", pady=10, font=("Arial", 12))
label_info.pack()

button1 = Button(master, text="Load JobSeeker Details", bg="lightblue", fg="white", padx=10, pady=5, font=("Arial", 10, "bold"))
button1.pack()

button2 = Button(master, text="Load Employer Details", bg="lightblue", fg="white", padx=10, pady=5, font=("Arial", 10, "bold"))
button2.pack()

button3 = Button(master, text="Fetch Details", bg="lightblue", fg="white", padx=10, pady=5, font=("Arial", 10, "bold"), command=fetching_details)
button3.pack()


master.mainloop()
