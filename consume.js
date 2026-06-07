import { Redis } from '@upstash/redis';

// Initialisation de Redis avec les variables d'environnement
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, ttl } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid id' });
  }

  // Durée de vie (secondes) fournie par le client, par défaut 30s
  const ttlSeconds = Number(ttl) || 30;

  try {
    // Clé Redis : "msg:" + id
    const key = `msg:${id}`;

    // setnx = "set if not exists" -> retourne 1 si la clé n'existait pas, 0 sinon
    const result = await redis.setnx(key, 'consumed');

    if (result === 1) {
      // Le message n'a jamais été lu → on le marque "consommé" avec une expiration
      await redis.expire(key, ttlSeconds);
      return res.status(200).json({ allowed: true });
    } else {
      // La clé existe déjà → message déjà lu ou destruction en cours
      return res.status(200).json({ allowed: false });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}