const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

// middlewares

app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cn37c5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const tutorialCollection = client.db("BiLang").collection("tutorials");
    const bookingCollection = client.db("BiLang").collection("bookings");
    app.get("/all-tutorials", async (req, res) => {
      const result = await tutorialCollection.find().toArray();
      res.send(result);
    });

    app.get("/my-tutorials", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await tutorialCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/tutor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorialCollection.findOne(query);

      res.send(result);
    });

    app.get("/booking/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/add-tutorials", async (req, res) => {
      const data = req.body;

      const query = { email: data.email, language: data.language };
      const isAlreadyHasThisLanguage = await tutorialCollection
        .find(query)
        .toArray();
      console.log(isAlreadyHasThisLanguage.length);
      if (isAlreadyHasThisLanguage.length > 0) {
        return res
          .status(400)
          .json({ error: "You already added a tutorial for this language." });
      } else {
        const result = await tutorialCollection.insertOne(data);

        res.send(result);
      }
    });
    app.post("/booking", async (req, res) => {
      const body = req.body;
      const result = await bookingCollection.insertOne(body);
      res.send(result);
    });

    app.patch("/add-tutorials", async (req, res) => {
      const tutorialId = req.body.jobId;
      const query = { _id: new ObjectId(tutorialId) };

      const updateDoc = {
        $inc: {
          review: 1,
        },
      };
      const result = await tutorialCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BiLang server is running.");
});

app.listen(port, () => {
  console.log("This server is running :", port);
});
