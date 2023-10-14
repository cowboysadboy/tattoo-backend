const express = require("express")
const { nanoid } = require("nanoid")
const { Pool } = require("pg")
const cors = require('cors')
require("dotenv").config()

const app = express()
app.use(cors({
    credentials: true,
}), );
app.use(express.json());
const DB = {
        users: [{ id: 1, username: "admin", password: "123456" }],
        session: []
    }
    // метод для поиска юзера в DB по юзернейму 
const findUserByUsername = async(username) => DB.users.find(u => u.username === username)

const findUserBySessionId = async sessionId => {
    const userId = DB.session[sessionId]
    if (!userId) {
        return
    }
    return DB.users.find((u) => u.id === userId)
}
const createSession = async userId => {
    const sessionId = nanoid()
    DB.session[sessionId] = userId
    return sessionId
}
const deleteSession = async(sessionId) => {
    delete DB.session[sessionId]
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
})

app.post('/login', async(req, res) => {
    const { username, password } = req.body
    const user = await findUserByUsername(username)
    if (!user || user.password !== password) {
        return res.status(400).send("Некорректная пара логин/пароль");
    }
    const sessionId = await createSession(user.id)
    console.log(sessionId)
    res.cookie('sessionId', sessionId, {
        httpOnly: true
    });
    res.status(200).json({ message: 'Аутентификация успешна' });
})

app.get("/", (req, res) => {
    res.send(`Say "Hallo", my little Friend`)
})

app.get("/masters/:nickname", async(req, res) => {
    try {
        const nickname = req.params.nickname
        const client = await pool.connect()
        const result = await client.query("SELECT * FROM masters WHERE nickname = $1", [
            nickname,
        ])
        if (result.rows.length === 0) {
            client.release()
            return res.status(404).send("Запись в базе данных отсутствует");
        } else {
            res.json(result.rows)
            client.release()
            return
        }
    } catch (err) {
        console.error(err)
    }
})

app.get("/masters", async(req, res) => {
    try {
        const client = await pool.connect()
        const result = await client.query("SELECT * FROM masters")
        res.json(result.rows)
        client.release()

    } catch (err) {
        console.error(err)
    }
})

const port = process.env.PORT || 3000
app.listen(port)