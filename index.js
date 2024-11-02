const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
app.use(cors());
app.use(express());

app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.14fjl5a.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const menuCollection = client.db('restaurantDB').collection("menu");
        const reviewCollection = client.db('restaurantDB').collection("reviews");
        const cartsCollection = client.db('restaurantDB').collection("carts");
        const messageCollection = client.db('restaurantDB').collection("messages");
        const usersCollection = client.db('restaurantDB').collection("users");
        const paymentsCollection = client.db('restaurantDB').collection("payments");


        //jwt api call start

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            res.send({ token });
        })

        //Verify the Token

        const verifyToken = (req, res, next) => {
            console.log("Insite Verify Token", req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ Message: "Forbidden access" });
            }

            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ Message: "Forbidden access" })
                }
                req.decoded = decoded;
                next()
            })

            //  next();
        }

        //verify admin

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next()
        }


        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result)
        })

        // add item api from Admin
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item)
            res.send(result)
        })

        // Delete item api from Admin
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query);
            console.log(result)
            res.send(result);
        })


        //get api for update
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = {
                $or: [
                    { _id: new ObjectId(id) },   // Check if _id is an ObjectId
                    { _id: id }                  // Check if _id is a string
                ]
            };
            const result = await menuCollection.findOne(query);
            console.log(result);
            res.send(result)
        })

        // patch api for update

        app.patch('/menu/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const query = {
                $or: [
                    { _id: new ObjectId(id) },
                    { _id: id }
                ]
            };

            const updateDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image

                },
            };

            const result = await menuCollection.updateOne(query, updateDoc)
            res.send(result)
        })



        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            console.log(cartItem);
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result);
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email };
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = cartsCollection.deleteOne(query);
            res.send(result);
        })

        app.post('/message', async (req, res) => {
            const messages = req.body;
            console.log(messages);
            const result = await messageCollection.insertOne(messages);
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const users = req.body;
            const query = { email: users.email }
            const userVarification = await usersCollection.findOne(query)
            if (userVarification) {
                return res.send({ message: "User already exists" });
            }
            else {
                const result = await usersCollection.insertOne(users);
                res.send(result);
            }

        })
        //admin user data get
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = usersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };

            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result);
        })

        // api for find out Admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (!email == req.decoded.email) {
                res.status(403).send({ message: 'Unauthorized Access' })
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false
            if (user) {
                admin = user?.role === "admin"
            }
            res.send({ admin })

        })


        //api for payment handler
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)
            console.log(amount)
            console.log(amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            })

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        //payment history api

        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentsCollection.insertOne(payment);
            console.log(paymentResult)

            const query = {
                _id: {
                    $in: payment.cartId.map(id => new ObjectId(id))
                }
            };

            const deleteResult = await cartsCollection.deleteMany(query);
            console.log(deleteResult)
            res.send({ paymentResult, deleteResult });

        })

        app.get('/payment/:email', verifyToken, async (req, res) => {
            console.log(req.params.email)
            const query = { email: req.params.email }
            const result = await paymentsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/admin-stats', async (req, res) => {
            const users = await usersCollection.estimatedDocumentCount();
            const menuItems = await menuCollection.estimatedDocumentCount();
            const order = await paymentsCollection.estimatedDocumentCount();

            const payments = await paymentsCollection.find().toArray();
            console.log(payments);

            const revenue = payments.reduce((total, payment) => {
                // Convert the price to a number and add it to the total
                return total + Number(payment.price);
            }, 0).toFixed(2);;

            console.log("Total Revenue:", revenue);

            res.send({
                users,
                menuItems,
                order,
                revenue
            })
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Restaurant Side is Running')
})

app.listen(port, () => {
    console.log(`Restaurant Site Is Running on port ${port}`)
})