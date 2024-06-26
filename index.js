const express = require("express");
const app = express();
const port = 8080;
const nodemailer = require("nodemailer");
// import admin, { credential } from "firebase-admin";
const admin = require("firebase-admin");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { App, Credentials } = require("realm-web");

// realm
const REALM_APP_ID = "application-0-kufrn";
const appRealm = new App({ id: REALM_APP_ID });

// middleware
require("dotenv").config();
app.use(cors());
app.use(express.json());

//nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "movingwithkoushik@gmail.com",
    pass: `${process.env.SMTP_PASS}`,
  },
});
//initialize firebase admin

const serviceAccount = require("./serviceAccountKey.json");
const { getAuth } = require("firebase-admin/auth");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// database connection
const connectionString = process.env.DB_URL || "";
const client = new MongoClient(connectionString);
async function run() {
  try {
    const user = await appRealm.logIn(Credentials.anonymous()); // Authenticate anonymously

    if (!user) {
      console.log("Failed to authenticate user");
    }
    let conn = await client.connect();
    // collections
    const database = client.db("tax-plus");
    const adminCollection = database.collection("admin");
    const employeeCollection = database.collection("employee");
    const publicUserCollection = database.collection("publicUser");
    const chatCollection = database.collection("chats");
    const bookingCollection = database.collection("bookings");
    const companyCollection = database.collection("company");
    const taskCollection = database.collection("task");
    const sentEmailCollection = database.collection("sent-email");
    const fileCollection = database.collection("file");
    //chats
    app.post("/chat", async (req, res) => {
      const message = req.body;
      try {
        console.log(message);
        /* const result = await chatCollection.insertOne(message);
        res.status(200).json(result); */
      } catch (error) {}
    });
    app.get("/chat/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id);
      try {
        /*  const messages = await ChatMessage.find().sort({ timestamp: "asc" });
        res.json(messages); */
      } catch (error) {
        console.log(error);
      }
    });
    // admin routes
    app.get("/admin/:email", async (req, res) => {
      const { email } = req.params;

      const admin = await adminCollection.findOne({ email: email });

      if (admin?.email) {
        res.json(admin);
      } else {
        res.json("no admin");
      }
    });
    //create-task
    app.post("/create-task", async (req, res) => {
      const body = req.body;
      try {
        const result = await taskCollection.insertOne(body);
        if (result.acknowledged) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        console.log(error);
      }
    });

    // employee routes
    app.get("/employee", async (req, res) => {
      const employee = employeeCollection.find();
      const employeeArray = await employee.toArray(employee);

      res.json(employeeArray);
    });
    // employee find by id
    app.get("/employee/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await employeeCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });
    // employee-find-by-mail
    app.get("/employee/find-by/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await employeeCollection.findOne({ email: email });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.post("/admin/employee", async (req, res) => {
      const body = req.body;
      try {
        const response = await employeeCollection.insertOne(body);
        if (response.acknowledged) {
          res.json(true);
        } else {
          res.json(false);
        }
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/admin/employee/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const response = await employeeCollection.findOne({ email: email });
        if (response?.email) {
          res.json(email);
        } else {
          res.json("not found employee");
        }
      } catch (error) {}
    });
    app.post("/employee-create-slot", async (req, res) => {
      const { email, availableDateTimes, createdAt } = req.body;

      const foundEmployee = await employeeCollection.findOne({ email: email });

      const filter = { email: email };
      const options = { upsert: false };
      let updateDoc;
      let iterable;
      try {
        iterable = foundEmployee?.availableDateTimes?.filter(
          (availableDateTime) =>
            availableDateTime.date == availableDateTimes[0].date
        );

        if (iterable?.length > 0) {
          const index = foundEmployee?.availableDateTimes.indexOf(iterable[0]);
          foundEmployee?.availableDateTimes[index].times.push(
            ...availableDateTimes[0].times
          );
          const result = await employeeCollection.replaceOne(
            filter,
            foundEmployee
          );
          if (result.modifiedCount > 0) {
            res.json("Successful");
          } else {
            res.json("Failed");
          }
        } else if (iterable.length == 0) {
          iterable = foundEmployee?.availableDateTimes;

          iterable.push(...availableDateTimes);
          updateDoc = {
            $set: {
              availableDateTimes: iterable,
            },
          };
          const result = await employeeCollection.updateOne(
            filter,
            updateDoc,
            options
          );
          if (result.modifiedCount > 0) {
            res.json("Successful");
          } else {
            res.json("Failed");
          }
        }
      } catch (error) {
        console.log(error);
      }
    });
    // employee slot update
    app.put("/employee-slot-update", async (req, res) => {
      const { email, indexDate, index } = req.body;

      try {
        const foundEmployee = await employeeCollection.findOne({
          email: email,
        });

        if (foundEmployee.email !== "") {
          foundEmployee.availableDateTimes[indexDate].times.splice(index, 1);
          if (foundEmployee.availableDateTimes[indexDate].times.length == 0) {
            foundEmployee.availableDateTimes.splice(indexDate, 1);
          }
          const result = await employeeCollection.replaceOne(
            { email: email },
            foundEmployee
          );
          if (result.modifiedCount > 0) {
            res.json("Successful");
          } else {
            res.json("Failed");
          }
        }
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/employee-list-users", (req, res) => {
      const listAllUsers = (nextPageToken) => {
        // List batch of users, 1000 at a time.
        getAuth()
          .listUsers(1000, nextPageToken)
          .then((listUsersResult) => {
            res.json(listUsersResult?.users);
            /* listUsersResult.users.forEach((userRecord) => {
              console.log("user", userRecord.toJSON());
            }); */
            if (listUsersResult.pageToken) {
              // List next batch of users.
              listAllUsers(listUsersResult.pageToken);
            }
          })
          .catch((error) => {
            console.log("Error listing users:", error);
          });
      };
      // Start listing users from the beginning, 1000 at a time.
      listAllUsers();
    });
    //update firebase user
    app.put("/employee-update-user", async (req, res) => {
      const body = req.body;
      const { uid, email, displayName, password, verified, phone } = body;

      getAuth()
        .updateUser(uid, {
          email: email,
          phoneNumber: phone,
          emailVerified: verified,
          password: password?.length > 0 && password,
          displayName: displayName,
        })
        .then(async (userRecord) => {
          const filter = { email: email };
          const options = { upsert: false };
          const updateDoc = {
            $set: {
              email: email,
              phoneNumber: phone,
              emailVerified: verified,
              // password: password?.length > 0 && password,
              displayName: displayName,
            },
          };
          const result = await publicUserCollection.updateOne(
            filter,
            updateDoc,
            options
          );
          if (result.modifiedCount > 0) {
            res.status(200).json("Successful");
          } else {
            res.json("Failed");
          }
        })
        .catch((error) => {
          console.log("Error updating user:", error);
          res.json(error?.errorInfo?.code);
        });
      const filter = { email: email };
      const options = { upsert: false };
      const updateDoc = {
        $set: {
          email: email,
          phoneNumber: phone,
          emailVerified: verified,
          // password: password?.length > 0 && password,
          displayName: displayName,
        },
      };
    });
    // create company
    app.post("/create-company", async (req, res) => {
      try {
        const result = await companyCollection.insertOne(req.body);
        if (result.acknowledged) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        res.json("Failed");
      }
    });
    //get company
    app.get("/company", async (req, res) => {
      try {
        const result = companyCollection.find();
        const resultArray = await result.toArray();
        if (resultArray.length > 0) {
          res.json(resultArray);
        } else {
          res.json("No company found");
        }
      } catch (error) {
        res.json(error);
      }
    });
    app.put("/company-update", async (req, res) => {
      const {
        id,
        annualAccountsDone,
        annualAccountsDue,
        annualReturnDone,
        annualReturnDue,
      } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: false };
      try {
        const updateDoc = {
          $set: {
            annualAccountsDone: annualAccountsDone,
            annualAccountsDue: annualAccountsDue,
            annualReturnDone: annualReturnDone,
            annualReturnDue: annualReturnDue,
          },
        };
        const result = await companyCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        if (result.modifiedCount > 0) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        console.log(error);
      }
    });
    //send email
    app.post("/send-email", async (req, res) => {
      const body = req.body;
      const foundClients = await sentEmailCollection.find();
      const foundClientsArray = await foundClients.toArray();
      if (body.length > 0) {
        try {
          body.forEach(
            ({
              clientEmail,
              companyRegistration,
              companyName,
              annualReturnDue,
            }) => {
              const mailOptions = {
                from: "movingwithkoushik@gmail.com",
                to: clientEmail,
                subject: `Annual return due of your company: ${companyName}`,
                text: `Your company registered with ${companyRegistration}, annual return due date is 15 days left. Your annual return due date is: ${annualReturnDue}`,
              };
              const foundClient = foundClientsArray.filter(
                (found) =>
                  found?.clientEmail == clientEmail &&
                  found?.companyRegistration
              );
              if (foundClient.length == 0) {
                transporter.sendMail(mailOptions, async (error, info) => {
                  if (error) {
                    console.error(
                      `Error sending mail to ${clientEmail}`,
                      error
                    );
                  } else {
                    console.log(`Email sent to ${clientEmail}`, info.response);
                    const result = await sentEmailCollection.insertOne({
                      clientEmail: clientEmail,
                      companyRegistration: companyRegistration,
                    });
                  }
                });
              }
            }
          );
        } catch (error) {
          console.log(error);
        }
      }
    });
    // task find by email
    app.get("/employee-task/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await taskCollection.find({ employee: email }).toArray();
        if (result.length > 0) {
          res.json(result);
        } else {
          res.json("No tasks assigned");
        }
      } catch (error) {
        console.log(error);
      }
    });
    app.put("/employee-task/status/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: false };
        const updateDoc = {
          $set: {
            status: status,
          },
        };
        const result = await taskCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        if (result?.modifiedCount > 0) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        console.log(error);
      }
    });
    //public-user routes
    // client upload file
    app.post("/upload-file", async (req, res) => {
      try {
        const result = await fileCollection.insertOne(req.body);
        if (result.acknowledged) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        console.log(error);
      }
    });

    // file by email
    app.get("/file/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await fileCollection
          .find({ uploadedBy: email })
          .toArray();
        if (result.length > 0) {
          res.json(result);
        } else {
          res.json([]);
        }
      } catch (error) {
        console.log(error);
      }
    });
    // file delete by location
    app.post("/file/delete", async (req, res) => {
      console.log(req);
      const { location } = req.body;
      console.log(location);
      try {
        const result = await fileCollection.deleteOne({ location: location });

        if (result.deletedCount > 0) {
          res.json("Successful");
        } else {
          res.json("Failed");
        }
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/public-user", async (req, res) => {
      try {
        const response = await publicUserCollection.insertOne(req.body);

        if (response?.acknowledged) {
          res.json(true);
        } else {
          res.json(false);
        }
      } catch (error) {
        console.error(error);
      }
    });
    app.get("/public-user", async (req, res) => {
      try {
        const result = await publicUserCollection.find();
        const arrayResult = await result.toArray();
        res.status(200).json(arrayResult);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/public-user/find-by/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await publicUserCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });
    app.get("/public-user/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const response = await publicUserCollection.findOne({ email: email });
        if (response?.email) {
          res.json(response);
        } else {
          res.json(false);
        }
      } catch (error) {
        console.error(error);
      }
    });

    // booking api
    app.post("/booking", async (req, res) => {
      const body = req.body;
      try {
        const result = await bookingCollection.insertOne(body);
        if (result.acknowledged) {
          res.status(200).json("We have succesfully got your request");
        } else {
          res.json("failed to get your request");
        }
      } catch (error) {
        console.log(error);
      }
    });
    // get all bookings
    app.get("/booking", async (req, res) => {
      try {
        const result = await bookingCollection.find().toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
      }
    });
    //find company by email
    app.get("/public-user/company/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await companyCollection
          .find({ clientEmail: email })
          .toArray();

        if (result.length > 0) {
          res.json(result);
        } else {
          res.json([]);
        }
      } catch (error) {}
    });
    // employee-user session list
    app.get("/booking/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const sessionArray = await bookingCollection.find().toArray();
        const matchedArray = sessionArray.filter(
          (session) =>
            session.userEmail == email || session.employeeEmail == email
        );
        if (matchedArray.length > 0) {
          res.json(matchedArray);
        } else {
          res.json([]);
        }
      } catch (error) {}
    });
    // session find by id
    app.get("/booking/by-time/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const session = await bookingCollection.findOne({
          _id: new ObjectId(id),
        });
        res.json(session);
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

// routes
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
