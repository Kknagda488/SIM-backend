
import express from "express"

const app = express()

app.use(express.json());



//routes import
// import testRoutes from "./routes/test/index.routes"

// app.use('/api/v1/test', testRoutes);

app.get('/', (req, res) => {
    res.send('Hello baby!, ')
})
app.get('/new', (req, res) => {
    res.send('Hello Krishna! and , KRishnkantn')
})
app.post('/post', (req, res) => {
    const { name, age, amount } = req.body
    res.json({
        
        name,
        age,
        amount
    })
})

app.get('/test',(req,res) => {
    res.json([
        {
            "id": "0001",
            "type": "donut",
            "name": "Cake",
            "ppu": 0.55,
            "batters":
                {
                    "batter":
                        [
                            { "id": "1001", "type": "Regular" },
                            { "id": "1002", "type": "Chocolate" },
                            { "id": "1003", "type": "Blueberry" },
                            { "id": "1004", "type": "Devil's Food" }
                        ]
                },
            "topping":
                [
                    { "id": "5001", "type": "None" },
                    { "id": "5002", "type": "Glazed" },
                    { "id": "5005", "type": "Sugar" },
                    { "id": "5007", "type": "Powdered Sugar" },
                    { "id": "5006", "type": "Chocolate with Sprinkles" },
                    { "id": "5003", "type": "Chocolate" },
                    { "id": "5004", "type": "Maple" }
                ]
        },
        {
            "id": "0002",
            "type": "donut",
            "name": "Raised",
            "ppu": 0.55,
            "batters":
                {
                    "batter":
                        [
                            { "id": "1001", "type": "Regular" }
                        ]
                },
            "topping":
                [
                    { "id": "5001", "type": "None" },
                    { "id": "5002", "type": "Glazed" },
                    { "id": "5005", "type": "Sugar" },
                    { "id": "5003", "type": "Chocolate" },
                    { "id": "5004", "type": "Maple" }
                ]
        },
        {
            "id": "0003",
            "type": "donut",
            "name": "Old Fashioned",
            "ppu": 0.55,
            "batters":
                {
                    "batter":
                        [
                            { "id": "1001", "type": "Regular" },
                            { "id": "1002", "type": "Chocolate" }
                        ]
                },
            "topping":
                [
                    { "id": "5001", "type": "None" },
                    { "id": "5002", "type": "Glazed" },
                    { "id": "5003", "type": "Chocolate" },
                    { "id": "5004", "type": "Maple" }
                ]
        }
    ])
})
export { app }