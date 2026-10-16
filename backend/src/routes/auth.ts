import { Router } from 'express';
import { register, login } from '../services/authService.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const user = await register(validatedData.email, validatedData.password, validatedData.name);
    res.status(201).json(user);
  } catch (error: any) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await login(validatedData.email, validatedData.password);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

export default router;
