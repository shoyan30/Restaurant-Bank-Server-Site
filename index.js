const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const port = process.env.PORT || 5000

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

        app.get('/menu', async(req, res) =>{
            const result = await menuCollection.find().toArray();
            res.send(result)
        })

        app.get('/review', async(req, res) =>{
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        app.post('/carts', async(req, res) =>{
            const cartItem = req.body;
            console.log(cartItem);
            const result = await cartsCollection.insertOne(cartItem)
            res.send(result);
        })
        
        app.get('/carts', async(req, res) =>{
            const email = req.query.email 
            const query = {email:email};
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id) }
            const result = cartsCollection.deleteOne(query);
            res.send(result);

        })

        app.post('/message', async(req, res) =>{
            const messages = req.body;
            console.log(messages);
            const result = await messageCollection.insertOne(messages);
            res.send(result)
        })

        app.post('/users', async(req, res) =>{
            const users = req.body;
            const query = {email:users.email}
            const userVarification = await usersCollection.findOne(query)
            if(userVarification){
                return res.send({ message: "User already exists" });
            }
            else{
            const result = await usersCollection.insertOne(users);
            res.send(result);
            }
            
        })

        app.get('/users', async(req, res) =>{
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.delete('/users/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id) }
            const result = usersCollection.deleteOne(query);
            res.send(result);
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