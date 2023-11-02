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

app.post('/api/login', async(req, res) => {
    const { username, password } = req.body
    const user = await findUserByUsername(username)
    if (!user || user.password !== password) {
        return res.status(400).send("Некорректная пара логин/пароль");
    }
    const sessionId = await createSession(user.id)
    res.cookie('sessionId', sessionId, {
        httpOnly: true
    });
    res.status(200).json({ message: 'Аутентификация успешна' });
})


app.post("/api/masters", async(req, res) => {
    try {
        const { nickname } = req.body
        const client = await pool.connect()
        client.query("INSERT INTO masters (nickname) VALUES ($1) RETURNING id", [
            nickname,
        ], (err, result) => {
            if (err) {
                res.status(500).send('Ошибка сервера');
            } else {
                const insertedId = result.rows[0].id;
                client.query("INSERT INTO password_data (person_id, password) VALUES ($1, $2)", [
                    insertedId,
                    insertedId,
                ], (err, result) => {
                    if (err) {
                        console.log(err)
                        console.log('ОШИБКА')
                    } else {
                        console.log(result)
                        console.log('ПОЛУЧИЛОСЬ')

                    }
                })
                res.status(200).send('регистрация успешна');
            }
        })

        client.release()

    } catch (err) {
        console.error(err)
    }
})


app.post("/api/lead", async(req, res) => {
    try {
        const { master_nickname, cliet_name, client_phone, tatoo_width, tatoo_height } = req.body
        const client = await pool.connect()
        const result = await client.query("SELECT id FROM masters WHERE nickname = $1", [
            master_nickname,
        ])
        if (result.rows.length === 0) {
            client.release()
            return res.status(404).send("Запись в базе данных отсутствует");
        } else {
            console.log(req.body, result.rows[0].id)
            const masterId = result.rows[0].id;
            client.query("insert into leads (master_id, cliet_name, client_phone, tatoo_width, tatoo_height) VALUES($1, $2, $3, $4, $5)", [
                masterId,
                cliet_name,
                client_phone,
                tatoo_width,
                tatoo_height
            ], (err, result) => {
                if (err) {
                    console.log(err)
                    console.log('ОШИБКА')
                } else {
                    console.log(result)
                    console.log('ПОЛУЧИЛОСЬ')

                }
            })
            res.status(200).send('Вы отправили заявку, скоро вами свяжутся');
            client.release()
            return
        }
    } catch (err) {
        res.status(501).send("Ошибка сервера");
        console.error(err)
    }
})


app.get("/api", (req, res) => {
    res.send(`Say "Hallo", my little Friend`)
})

app.get("/api/masters/:nickname", async(req, res) => {
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

app.get("/api/leads/:nickname", async(req, res) => {
    try {
        const nickname = req.params.nickname
        const client = await pool.connect()
        const result = await client.query("SELECT id FROM masters WHERE nickname = $1", [
            nickname,
        ])
        
        if (result.rows.length === 0) {
            client.release()
            return res.status(404).send("Запись в базе данных отсутствует");
        } else {
            const masterId = result.rows[0].id;
            const leads = await client.query("SELECT * FROM leads WHERE master_id = $1", [
                masterId,
            ])
            res.json(leads.rows)
            client.release()
            return
        }
    } catch (err) {
        console.error(err)
    }
})

app.patch("/api/masters/:nickname", async(req, res) => {
    try {
        const nickname = req.params.nickname
        const { first_name, avatar_link, last_name, description } = req.body
        const client = await pool.connect()
        await client.query("UPDATE masters SET first_name = $1, avatar_link = $3, last_name = $4, description = $5 WHERE nickname = $2", [
            first_name,
            nickname,
            avatar_link,
            last_name,
            description
        ])
        res.sendStatus(204)
        client.release()
    } catch (err) {
        console.error(err)
    }
})

app.get("/api/masters", async(req, res) => {
    try {
        const client = await pool.connect()
        const result = await client.query("SELECT * FROM masters")
        res.cookie("test", "123")
        res.json(result.rows)
        client.release()

    } catch (err) {
        console.error(err)
    }
})

const port = process.env.PORT || 3000
app.listen(port)