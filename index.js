const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

// middlewares

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://bilang-57fe9.web.app",
      "https://bilang-57fe9.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cn37c5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access." });
  }
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;

    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const tutorialCollection = client.db("BiLang").collection("tutorials");
    const bookingCollection = client.db("BiLang").collection("bookings");
    const categoriesCollection = client.db("BiLang").collection("categories");

    // Auth related apis.
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign({ user }, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ message: true });
    });

    app.post("/logout", (req, res) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });
      return res.status(200).send({ message: "Logged out successfully" });
    });

    app.get("/all-tutorials", async (req, res) => {
      const result = await tutorialCollection.find().toArray();
      res.send(result);
    });

    app.get("/my-tutorials", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      if (req.user.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbiden access" });
      }
      const result = await tutorialCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/tutor/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log("tutor", req.body);
      const query = { _id: new ObjectId(id) };

      const result = await tutorialCollection.findOne(query);

      res.send(result);
    });

    app.get("/booking/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      if (req.user.user.email === req.params.email) {
        console.log("matched");
      }
      if (req.user.user.email !== req.params.email) {
        console.log("not matched");
        return res.status(403).send({ message: "Forbiden access" });
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/categories", async (req, res) => {
      const categories = await categoriesCollection.find().toArray();
      res.send(categories);
    });

    app.get("/category/:category", async (req, res) => {
      const category = req.params.category;
      const query = { language: category };
      const result = await tutorialCollection.find(query).toArray();
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

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          image: data.image,
          language: data.language,
          price: data.price,
          description: data.description,
        },
      };
      const result = await tutorialCollection.updateOne(query, updateDoc);
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

    app.delete("/all-tutorials/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorialCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
