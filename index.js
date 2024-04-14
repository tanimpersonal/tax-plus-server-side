const express = require("express");
const app = express();
const port = 8080;
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
    // employee routes
    app.get("/employee", async (req, res) => {
      const employee = employeeCollection.find();
      const employeeArray = await employee.toArray(employee);
      console.log(employeeArray);
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
    app.post("/admin/employee", async (req, res) => {
      const body = req.body;
      try {
        const response = await employeeCollection.insertOne(body);
        if (response.acknowledged) {
          res.json("employee added");
        } else {
          res.json("error");
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
      const foundUser = await employeeCollection.findOne({ email: email });
      const rebuildUser = { ...foundUser, availableDateTimes, createdAt };
      const replacedUser = await employeeCollection.replaceOne(
        { email: email },
        rebuildUser
      );
      console.log(replacedUser);
    });

    //public-user routes
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
          res.json(response.email);
        } else {
          res.json(false);
        }
      } catch (error) {
        console.error(error);
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