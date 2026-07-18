import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import storesRouter from './routes/stores';
import teamRouter from './routes/team';
import transactionsRouter from './routes/transactions';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/stores', storesRouter);
app.use('/team', teamRouter);
app.use('/transactions', transactionsRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`YapLin backend listening on :${port}`));
